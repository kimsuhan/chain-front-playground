"use client";

import { useWallet } from "@/contexts/WalletContext";
import { DEX_CONTRACT_ADDRESS, DEX_ABI } from "@/lib/dex";
import { ethers } from "ethers";
import { 
  Plus, 
  Loader, 
  CheckCircle, 
  AlertCircle,
  ChevronDown,
  Droplets,
  X,
  ArrowLeftRight,
  TrendingUp,
  Minus,
  Activity
} from "lucide-react";
import { useEffect, useState } from "react";

// ERC-20 토큰 ABI (기본 함수들)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
];

interface Token {
  symbol: string;
  name: string;
  address: string;
  balance?: string;
}

interface ToastNotification {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
  duration?: number;
}

interface LiquidityPool {
  id: string;
  tokenA: Token;
  tokenB: Token;
  reserveA: string;
  reserveB: string;
  totalLiquidity: string;
  myLiquidity?: string;
  rate: string;
  volume24h: string;
  fees24h: string;
}

interface RateHistory {
  timestamp: number;
  rate: number;
}

export default function DexPage() {
  const { isConnected: isWalletConnected, address: walletAddress } = useWallet();
  
  // 토큰 관련 상태
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedTokenA, setSelectedTokenA] = useState<Token | null>(null);
  const [selectedTokenB, setSelectedTokenB] = useState<Token | null>(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  
  // 입력 금액
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  
  // 드롭다운 상태
  const [showTokenADropdown, setShowTokenADropdown] = useState(false);
  const [showTokenBDropdown, setShowTokenBDropdown] = useState(false);
  
  // 거래 상태
  const [isApproving, setIsApproving] = useState(false);
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);
  const [step, setStep] = useState<"input" | "approve" | "addLiquidity" | "success">("input");
  
  // 토스트 알림
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  
  // 유동성 풀 관련
  const [liquidityPools, setLiquidityPools] = useState<LiquidityPool[]>([]);
  const [showRateChart, setShowRateChart] = useState(false);
  const [selectedPool, setSelectedPool] = useState<LiquidityPool | null>(null);
  const [rateHistory, setRateHistory] = useState<RateHistory[]>([]);

  // 토스트 알림 함수
  const showToast = (
    type: "success" | "error" | "info",
    title: string,
    message: string,
    duration = 5000
  ) => {
    const id = Date.now().toString();
    const newToast: ToastNotification = { id, type, title, message, duration };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // 토큰 목록 로딩
  const loadTokens = async () => {
    try {
      setIsLoadingTokens(true);
      
      const response = await fetch(
        `${process.env.API_URL || "http://localhost:4000"}/token-factory/tokens?limit=100&offset=0`
      );

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const responseData = await response.json();
      const tokensData = responseData.data || responseData;

      const formattedTokens: Token[] = tokensData.map((token: any) => ({
        symbol: token.symbol || "N/A",
        name: token.name || "Unknown Token",
        address: token.address || "0x0",
      }));

      setTokens(formattedTokens);

      // 지갑 연결시 잔액 로딩
      if (isWalletConnected && walletAddress) {
        loadTokenBalances(formattedTokens);
      }
    } catch (error) {
      console.error("토큰 목록 로딩 실패:", error);
      showToast("error", "로딩 실패", "토큰 목록을 불러올 수 없습니다.");
    } finally {
      setIsLoadingTokens(false);
    }
  };

  // 토큰 잔액 로딩
  const loadTokenBalances = async (tokenList: Token[]) => {
    if (!isWalletConnected || !walletAddress || typeof window === "undefined" || !window.ethereum) {
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const balancePromises = tokenList.map(async (token) => {
        try {
          const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const balance = await tokenContract.balanceOf(walletAddress);
          const formattedBalance = ethers.formatEther(balance);
          return { ...token, balance: formattedBalance };
        } catch (error) {
          console.error(`토큰 ${token.symbol} 잔액 조회 실패:`, error);
          return { ...token, balance: "0" };
        }
      });

      const tokensWithBalances = await Promise.all(balancePromises);
      setTokens(tokensWithBalances);
    } catch (error) {
      console.error("잔액 로딩 실패:", error);
    }
  };

  // 토큰 approve 함수
  const approveToken = async (tokenAddress: string, spenderAddress: string) => {
    if (!isWalletConnected || !walletAddress || typeof window === "undefined" || !window.ethereum) {
      throw new Error("지갑이 연결되지 않았습니다.");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    
    // MAX 값으로 approve (2^256 - 1)
    const maxAmount = ethers.MaxUint256;
    const tx = await tokenContract.approve(spenderAddress, maxAmount);
    
    return tx;
  };

  // 유동성 추가 함수
  const handleAddLiquidity = async () => {
    if (!selectedTokenA || !selectedTokenB || !amountA || !amountB) {
      showToast("error", "입력 확인", "모든 필드를 입력해주세요.");
      return;
    }

    if (!isWalletConnected || !walletAddress) {
      showToast("error", "지갑 연결", "지갑을 연결해주세요.");
      return;
    }

    try {
      setStep("approve");
      setIsApproving(true);

      // 1. 두 토큰 모두 approve
      showToast("info", "승인 중", `${selectedTokenA.symbol} 토큰 승인 중...`, 3000);
      const approveATx = await approveToken(selectedTokenA.address, DEX_CONTRACT_ADDRESS);
      await approveATx.wait();

      showToast("info", "승인 중", `${selectedTokenB.symbol} 토큰 승인 중...`, 3000);
      const approveBTx = await approveToken(selectedTokenB.address, DEX_CONTRACT_ADDRESS);
      await approveBTx.wait();

      setIsApproving(false);
      setStep("addLiquidity");
      setIsAddingLiquidity(true);

      // 2. 유동성 추가
      showToast("info", "유동성 추가", "유동성을 풀에 추가하는 중...", 5000);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const dexContract = new ethers.Contract(DEX_CONTRACT_ADDRESS, DEX_ABI, signer);

      const amountAWei = ethers.parseEther(amountA);
      const amountBWei = ethers.parseEther(amountB);

      const tx = await dexContract.addLiquidity(
        selectedTokenA.address,
        selectedTokenB.address,
        amountAWei,
        amountBWei
      );

      await tx.wait();

      setStep("success");
      showToast("success", "성공", "유동성이 성공적으로 추가되었습니다!");

      // 잔액 새로고침
      await loadTokenBalances(tokens);

      // 입력 필드 리셋
      setAmountA("");
      setAmountB("");
      
    } catch (error: any) {
      console.error("유동성 추가 실패:", error);
      showToast("error", "실패", error.message || "유동성 추가에 실패했습니다.");
      setStep("input");
    } finally {
      setIsApproving(false);
      setIsAddingLiquidity(false);
    }
  };

  // TODO: 백엔드 구현 후 실제 데이터로 교체
  const loadSamplePools = () => {
    const samplePools: LiquidityPool[] = [
      {
        id: "1",
        tokenA: { symbol: "USDT", name: "Tether USD", address: "0x1" },
        tokenB: { symbol: "USDC", name: "USD Coin", address: "0x2" },
        reserveA: "150000.50",
        reserveB: "149876.23", 
        totalLiquidity: "299876.73",
        myLiquidity: "1250.45",
        rate: "1.0008",
        volume24h: "45672.12",
        fees24h: "123.45"
      },
      {
        id: "2", 
        tokenA: { symbol: "ETH", name: "Ethereum", address: "0x3" },
        tokenB: { symbol: "USDT", name: "Tether USD", address: "0x1" },
        reserveA: "85.75",
        reserveB: "234567.89",
        totalLiquidity: "234653.64",
        rate: "2736.45",
        volume24h: "98234.56", 
        fees24h: "267.89"
      },
      {
        id: "3",
        tokenA: { symbol: "BTC", name: "Bitcoin", address: "0x4" },
        tokenB: { symbol: "ETH", name: "Ethereum", address: "0x3" },
        reserveA: "12.45",
        reserveB: "203.67",
        totalLiquidity: "216.12",
        myLiquidity: "5.32",
        rate: "16.36",
        volume24h: "56789.12",
        fees24h: "156.78"
      }
    ];
    setLiquidityPools(samplePools);
  };

  // TODO: 백엔드 구현 후 실제 데이터로 교체
  const loadSampleRateHistory = (pool: LiquidityPool) => {
    const now = Date.now();
    const sampleHistory: RateHistory[] = [];
    const baseRate = parseFloat(pool.rate);
    
    // 지난 30일 데이터 생성
    for (let i = 30; i >= 0; i--) {
      const timestamp = now - (i * 24 * 60 * 60 * 1000);
      const variation = (Math.random() - 0.5) * 0.1; // ±5% 변동
      const rate = baseRate * (1 + variation);
      sampleHistory.push({ timestamp, rate });
    }
    
    setRateHistory(sampleHistory);
  };

  // 유동성 청산 함수 (TODO: 실제 컨트랙트 연동)
  const handleRemoveLiquidity = async (pool: LiquidityPool) => {
    showToast("info", "개발 중", "유동성 청산 기능은 향후 구현 예정입니다.");
  };

  // 환율 차트 표시
  const showRateChartModal = (pool: LiquidityPool) => {
    setSelectedPool(pool);
    loadSampleRateHistory(pool);
    setShowRateChart(true);
  };

  // 컴포넌트 마운트시 데이터 로딩
  useEffect(() => {
    loadTokens();
    loadSamplePools(); // 샘플 풀 데이터 로딩
  }, []);

  // 지갑 연결 변경시 잔액 새로고침
  useEffect(() => {
    if (isWalletConnected && walletAddress && tokens.length > 0) {
      loadTokenBalances(tokens);
    }
  }, [isWalletConnected, walletAddress]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 토스트 알림 컨테이너 */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 transition-all duration-300 transform translate-x-0 animate-in slide-in-from-right
              ${toast.type === "success" ? "border-l-4 border-green-500" : ""}
              ${toast.type === "error" ? "border-l-4 border-red-500" : ""}
              ${toast.type === "info" ? "border-l-4 border-blue-500" : ""}
            `}
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start flex-1 min-w-0">
                  <div className="flex-shrink-0 mr-3">
                    {toast.type === "success" && (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    )}
                    {toast.type === "error" && (
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    )}
                    {toast.type === "info" && (
                      <Loader className="h-5 w-5 text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {toast.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 break-words">
                      {toast.message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="ml-4 flex-shrink-0 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center space-x-3">
            <Droplets className="w-8 h-8 text-blue-600" />
            <span>유동성 풀</span>
          </h1>
          <p className="text-gray-600">
            두 토큰을 풀에 추가하여 유동성을 제공하세요
          </p>
        </div>

        {/* 지갑 미연결 안내 */}
        {!isWalletConnected && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
            <p className="text-yellow-800">
              유동성을 추가하려면 상단 우측의 "지갑 연결" 버튼을 클릭하세요
            </p>
          </div>
        )}

        {/* 유동성 추가 폼 - 컴팩트 버전 */}
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
            유동성 추가
          </h2>

          {/* 토큰 선택과 금액 입력을 한 줄로 */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
            {/* 토큰 A 선택 */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                토큰 A
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowTokenADropdown(!showTokenADropdown)}
                  disabled={!isWalletConnected || isLoadingTokens}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <span>
                    {selectedTokenA ? (
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{selectedTokenA.symbol}</span>
                        {selectedTokenA.balance && (
                          <span className="text-xs text-gray-400">
                            ({parseFloat(selectedTokenA.balance).toFixed(2)})
                          </span>
                        )}
                      </div>
                    ) : (
                      "토큰 선택"
                    )}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* 토큰 A 드롭다운 */}
                {showTokenADropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {tokens.length === 0 ? (
                      <div className="p-3 text-center text-gray-500 text-sm">
                        {isLoadingTokens ? "로딩중..." : "토큰 없음"}
                      </div>
                    ) : (
                      tokens.map((token, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSelectedTokenA(token);
                            setShowTokenADropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{token.symbol}</div>
                            </div>
                            {token.balance && (
                              <div className="text-xs text-gray-400">
                                {parseFloat(token.balance).toFixed(4)}
                              </div>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 화살표 */}
            <div className="lg:col-span-1 flex items-end justify-center pb-8 lg:pb-2.5">
              <ArrowLeftRight className="w-5 h-5 text-gray-400" />
            </div>

            {/* 토큰 B 선택 */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                토큰 B
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowTokenBDropdown(!showTokenBDropdown)}
                  disabled={!isWalletConnected || isLoadingTokens}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <span>
                    {selectedTokenB ? (
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{selectedTokenB.symbol}</span>
                        {selectedTokenB.balance && (
                          <span className="text-xs text-gray-400">
                            ({parseFloat(selectedTokenB.balance).toFixed(2)})
                          </span>
                        )}
                      </div>
                    ) : (
                      "토큰 선택"
                    )}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* 토큰 B 드롭다운 */}
                {showTokenBDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {tokens.length === 0 ? (
                      <div className="p-3 text-center text-gray-500 text-sm">
                        {isLoadingTokens ? "로딩중..." : "토큰 없음"}
                      </div>
                    ) : (
                      tokens
                        .filter(token => token.address !== selectedTokenA?.address)
                        .map((token, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setSelectedTokenB(token);
                              setShowTokenBDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0 text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{token.symbol}</div>
                              </div>
                              {token.balance && (
                                <div className="text-xs text-gray-400">
                                  {parseFloat(token.balance).toFixed(4)}
                                </div>
                              )}
                            </div>
                          </button>
                        ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 금액 입력을 한 줄로 */}
          {selectedTokenA && selectedTokenB && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
              <div className="lg:col-span-2">
                <input
                  type="number"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                  placeholder={`${selectedTokenA.symbol} 수량`}
                  step="0.0001"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={!isWalletConnected || isApproving || isAddingLiquidity}
                />
              </div>
              <div className="lg:col-span-1"></div>
              <div className="lg:col-span-2">
                <input
                  type="number"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                  placeholder={`${selectedTokenB.symbol} 수량`}
                  step="0.0001"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={!isWalletConnected || isApproving || isAddingLiquidity}
                />
              </div>
            </div>
          )}

          {/* 추가 버튼 */}
          <button
            onClick={handleAddLiquidity}
            disabled={
              !isWalletConnected ||
              !selectedTokenA ||
              !selectedTokenB ||
              !amountA ||
              !amountB ||
              isApproving ||
              isAddingLiquidity ||
              selectedTokenA.address === selectedTokenB.address
            }
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isApproving ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>토큰 승인 중...</span>
              </>
            ) : isAddingLiquidity ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>유동성 추가 중...</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>유동성 추가</span>
              </>
            )}
          </button>

          {/* 진행 단계 표시 - 컴팩트 */}
          {step !== "input" && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center space-x-6 text-sm">
                <div className={`flex items-center space-x-2 ${
                  step === "approve" ? "text-blue-600" : step === "addLiquidity" || step === "success" ? "text-green-600" : "text-gray-400"
                }`}>
                  {step === "approve" ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>승인</span>
                </div>
                <div className={`flex items-center space-x-2 ${
                  step === "addLiquidity" ? "text-blue-600" : step === "success" ? "text-green-600" : "text-gray-400"
                }`}>
                  {step === "addLiquidity" ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : step === "success" ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span>유동성 추가</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 현재 유동성 풀 목록 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">활성 유동성 풀</h2>
            <div className="text-sm text-gray-500">
              총 {liquidityPools.length}개 풀
            </div>
          </div>

          {liquidityPools.length === 0 ? (
            <div className="text-center py-12">
              <Droplets className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">활성 유동성 풀이 없습니다</p>
              <p className="text-sm text-gray-400 mt-2">
                첫 번째 유동성을 추가해보세요
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      토큰 쌍
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      환율
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      유동성
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      24시간 거래량
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      내 유동성
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {liquidityPools.map((pool) => (
                    <tr key={pool.id} className="hover:bg-gray-50 transition-colors">
                      {/* 토큰 쌍 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-semibold text-blue-800">
                                {pool.tokenA.symbol.charAt(0)}
                              </span>
                            </div>
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center -ml-2">
                              <span className="text-xs font-semibold text-green-800">
                                {pool.tokenB.symbol.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {pool.tokenA.symbol}/{pool.tokenB.symbol}
                            </div>
                            <div className="text-xs text-gray-500">
                              {pool.tokenA.name} - {pool.tokenB.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 환율 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          1 {pool.tokenA.symbol} = {parseFloat(pool.rate).toFixed(4)} {pool.tokenB.symbol}
                        </div>
                      </td>

                      {/* 유동성 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">
                            ${parseFloat(pool.totalLiquidity).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {parseFloat(pool.reserveA).toFixed(2)} {pool.tokenA.symbol} + {parseFloat(pool.reserveB).toFixed(2)} {pool.tokenB.symbol}
                          </div>
                        </div>
                      </td>

                      {/* 24시간 거래량 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">
                            ${parseFloat(pool.volume24h).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            수수료: ${parseFloat(pool.fees24h).toFixed(2)}
                          </div>
                        </div>
                      </td>

                      {/* 내 유동성 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {pool.myLiquidity ? (
                          <div className="text-sm text-gray-900">
                            <div className="font-medium text-green-600">
                              ${parseFloat(pool.myLiquidity).toLocaleString()}
                            </div>
                            <div className="text-xs text-green-500">
                              LP 토큰 보유
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">
                            참여 안함
                          </div>
                        )}
                      </td>

                      {/* 액션 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {/* 환율 차트 버튼 */}
                          <button
                            onClick={() => showRateChartModal(pool)}
                            className="inline-flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium transition-colors"
                            title="환율 차트 보기"
                          >
                            <TrendingUp className="w-3 h-3" />
                            <span>환율</span>
                          </button>

                          {/* 유동성 청산 버튼 (내가 유동성을 제공한 경우에만) */}
                          {pool.myLiquidity && (
                            <button
                              onClick={() => handleRemoveLiquidity(pool)}
                              className="inline-flex items-center space-x-1 bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded text-xs font-medium transition-colors"
                              title="유동성 청산"
                            >
                              <Minus className="w-3 h-3" />
                              <span>청산</span>
                            </button>
                          )}

                          {/* 유동성 추가 버튼 */}
                          <button
                            onClick={() => {
                              // 토큰 자동 선택
                              const tokenA = tokens.find(t => t.symbol === pool.tokenA.symbol);
                              const tokenB = tokens.find(t => t.symbol === pool.tokenB.symbol);
                              if (tokenA) setSelectedTokenA(tokenA);
                              if (tokenB) setSelectedTokenB(tokenB);
                              // 페이지 상단으로 스크롤
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="inline-flex items-center space-x-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs font-medium transition-colors"
                            title="유동성 추가"
                          >
                            <Plus className="w-3 h-3" />
                            <span>추가</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 환율 차트 모달 */}
        {showRateChart && selectedPool && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedPool.tokenA.symbol}/{selectedPool.tokenB.symbol} 환율 차트
                </h3>
                <button
                  onClick={() => setShowRateChart(false)}
                  className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {parseFloat(selectedPool.rate).toFixed(4)} {selectedPool.tokenB.symbol}
                  </div>
                  <div className="text-sm text-gray-500">
                    1 {selectedPool.tokenA.symbol} 당 가격 (지난 30일)
                  </div>
                </div>

                {/* TODO: 실제 차트 라이브러리 구현 */}
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg mb-2">환율 차트</p>
                  <p className="text-sm text-gray-400 mb-4">
                    향후 Chart.js 또는 Recharts로 구현 예정
                  </p>
                  
                  {/* 샘플 데이터 표시 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-xs text-gray-500">현재 환율</div>
                      <div className="font-semibold">{selectedPool.rate}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-xs text-gray-500">24h 거래량</div>
                      <div className="font-semibold">${parseFloat(selectedPool.volume24h).toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-xs text-gray-500">24h 수수료</div>
                      <div className="font-semibold">${parseFloat(selectedPool.fees24h).toFixed(2)}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-xs text-gray-500">총 유동성</div>
                      <div className="font-semibold">${parseFloat(selectedPool.totalLiquidity).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 안내 사항 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">안내사항</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 유동성을 추가하면 두 토큰이 풀에 예치되고 LP 토큰을 받습니다</li>
            <li>• 토큰 승인 시 MAX 값으로 설정되어 다음에는 승인이 불필요합니다</li>
            <li>• [환율] 버튼으로 토큰 쌍의 가격 변동 히스토리를 확인할 수 있습니다</li>
            <li>• LP 토큰이 있으면 [청산] 버튼으로 유동성을 회수할 수 있습니다</li>
            <li>• 모든 거래에서 가스비가 소모됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}