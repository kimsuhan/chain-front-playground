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
  Activity,
  RefreshCw
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
  date: string; // 차트 표시용
}

interface PoolHistoryResponse {
  id: number;
  txHash: string;
  poolId: number;
  amountA: string;
  amountB: string;
  liquidity: string;
  timestamp: string; // Unix timestamp (초)
  createdAt: string;
  updatedAt: string;
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

  // 스왕 관련
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapFromToken, setSwapFromToken] = useState<Token | null>(null);
  const [swapToToken, setSwapToToken] = useState<Token | null>(null);
  const [swapAmountIn, setSwapAmountIn] = useState("");
  const [swapAmountOut, setSwapAmountOut] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [isApprovingForSwap, setIsApprovingForSwap] = useState(false);
  const [swapCalculation, setSwapCalculation] = useState({
    outputAmount: "",
    slippage: 0,
    priceImpact: 0,
    isUnreasonable: false,
    warning: ""
  });

  // 유동성 추가 계산 및 경고
  const [liquidityCalculation, setLiquidityCalculation] = useState({
    expectedLP: "",
    poolShare: 0,
    priceImpact: 0,
    ratioImbalance: 0,
    isUnreasonable: false,
    warning: ""
  });

  // 청산 관련
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedPoolForRemove, setSelectedPoolForRemove] = useState<LiquidityPool | null>(null);
  const [removeLiquidityAmount, setRemoveLiquidityAmount] = useState("");
  const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false);

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

  // 토큰 목록 로딩 (지갑 연결과 무관하게 기본 데이터만 로드)
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

      console.log("기본 토큰 목록 로드 완료:", formattedTokens.length, "개");
      setTokens(formattedTokens);
    } catch (error) {
      console.error("토큰 목록 로딩 실패:", error);
      showToast("error", "로딩 실패", "토큰 목록을 불러올 수 없습니다.");
    } finally {
      setIsLoadingTokens(false);
    }
  };

  // 토큰 잔액 로딩
  const loadTokenBalances = async (tokenList: Token[]) => {
    console.log("토큰 잔액 로딩 조건 확인:");
    console.log("- isWalletConnected:", isWalletConnected);
    console.log("- walletAddress:", walletAddress);
    console.log("- tokenList 길이:", tokenList.length);
    
    if (!isWalletConnected || !walletAddress || typeof window === "undefined" || !window.ethereum) {
      console.log("지갑 미연결 또는 환경 문제로 토큰 잔액 조회 스킵");
      return;
    }

    try {
      console.log("토큰 잔액 조회 시작:", tokenList.length, "개 토큰");
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
      console.log("토큰 잔액 조회 완료");
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

      // 유동성 풀 목록 새로고침 (사용자 유동성 정보 포함)
      await loadLiquidityPools();

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

  // 사용자의 유동성 조회
  const loadMyLiquidityForPools = async (pools: LiquidityPool[]) => {
    console.log("유동성 조회 조건 확인:");
    console.log("- isWalletConnected:", isWalletConnected);
    console.log("- walletAddress:", walletAddress);
    console.log("- typeof window:", typeof window);
    console.log("- window.ethereum:", typeof window !== "undefined" ? !!window.ethereum : "undefined");
    
    if (!isWalletConnected || !walletAddress || typeof window === "undefined" || !window.ethereum) {
      console.log("지갑 미연결 또는 환경 문제로 유동성 조회 스킵");
      return pools;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const dexContract = new ethers.Contract(DEX_CONTRACT_ADDRESS, DEX_ABI, signer);

      console.log("유동성 조회 시작, 풀 개수:", pools.length);
      console.log("연결된 지갑 주소:", walletAddress);

      const poolsWithMyLiquidity = await Promise.all(
        pools.map(async (pool) => {
          try {
            console.log(`풀 ${pool.tokenA.symbol}/${pool.tokenB.symbol} 유동성 조회 중...`);
            console.log(`토큰 A 주소: ${pool.tokenA.address}`);
            console.log(`토큰 B 주소: ${pool.tokenB.address}`);
            
            const myLiquidity = await dexContract.getMyLiquidity(pool.tokenA.address, pool.tokenB.address);
            const formattedMyLiquidity = ethers.formatEther(myLiquidity);
            
            console.log(`풀 ${pool.tokenA.symbol}/${pool.tokenB.symbol} 유동성 결과:`, myLiquidity.toString(), "=>", formattedMyLiquidity);
            
            return {
              ...pool,
              myLiquidity: parseFloat(formattedMyLiquidity) > 0 ? formattedMyLiquidity : undefined,
              // 24시간 데이터 보존
              volume24h: pool.volume24h,
              fees24h: pool.fees24h
            };
          } catch (error) {
            console.error(`풀 ${pool.tokenA.symbol}/${pool.tokenB.symbol}의 유동성 조회 실패:`, error);
            return pool; // 오류 시 기존 pool 데이터 유지
          }
        })
      );

      console.log("유동성 조회 완료");
      return poolsWithMyLiquidity;
    } catch (error) {
      console.error("유동성 조회 실패:", error);
      return pools; // 오류 시 기존 pools 반환
    }
  };

  // 유동성 풀 목록 로딩 (지갑 연결과 무관하게 기본 데이터만 로드)
  const loadLiquidityPools = async () => {
    try {
      const response = await fetch(
        `${process.env.API_URL || "http://localhost:4000"}/simple-dex/pools`
      );

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const poolsData = await response.json();
      
      const formattedPools: LiquidityPool[] = poolsData.map((pool: any) => {
        // 기존 풀 데이터에서 myLiquidity, volume24h, fees24h 찾기
        const existingPool = liquidityPools.find(p => p.id === pool.id.toString());
        
        return {
          id: pool.id.toString(),
          tokenA: { 
            symbol: pool.tokenASymbol, 
            name: pool.tokenAName, 
            address: pool.tokenA 
          },
          tokenB: { 
            symbol: pool.tokenBSymbol, 
            name: pool.tokenBName, 
            address: pool.tokenB 
          },
          reserveA: ethers.formatEther(pool.amountA),
          reserveB: ethers.formatEther(pool.amountB),
          totalLiquidity: ethers.formatEther(pool.totalLiquidity),
          // 기존 myLiquidity 정보 보존
          myLiquidity: existingPool?.myLiquidity,
          // 환율 계산 (tokenA당 tokenB 가격)
          rate: (parseFloat(ethers.formatEther(pool.amountB)) / parseFloat(ethers.formatEther(pool.amountA))).toString(),
          // 기존 24시간 데이터 보존
          volume24h: existingPool?.volume24h || "0",
          fees24h: existingPool?.fees24h || "0"
        };
      });

      console.log("기본 풀 데이터 로드 완료:", formattedPools.length, "개");
      setLiquidityPools(formattedPools);
      
      // 24시간 데이터 업데이트 (백그라운드에서, 현재 풀 데이터를 매개변수로 전달)
      setTimeout(() => {
        updateAll24hData(formattedPools);
      }, 1000); // 1초 후 실행하여 기본 데이터 로드와 분리
    } catch (error) {
      console.error("유동성 풀 목록 로딩 실패:", error);
      showToast("error", "로딩 실패", "유동성 풀 목록을 불러올 수 없습니다.");
      // 오류 시 빈 배열로 설정
      setLiquidityPools([]);
    }
  };

  // 24시간 거래량 및 수수료 계산
  const calculate24hData = (historyData: PoolHistoryResponse[]) => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000); // 24시간 전

    // 24시간 내 거래만 필터링
    const recent24h = historyData.filter(item => {
      const timestamp = parseInt(item.timestamp) * 1000;
      return timestamp >= oneDayAgo;
    });

    // 총 거래량 계산 (amountA + amountB 기준으로 USD 추정)
    let totalVolume = 0;
    recent24h.forEach(item => {
      const amountA = parseFloat(ethers.formatEther(item.amountA));
      const amountB = parseFloat(ethers.formatEther(item.amountB));
      // 단순히 amountA + amountB로 거래량 추정 (실제로는 USD 가치로 계산해야 함)
      totalVolume += amountA + amountB;
    });

    // 수수료 계산 (0.3% 고정)
    const totalFees = totalVolume * 0.003; // 0.3%

    return {
      volume24h: totalVolume.toString(),
      fees24h: totalFees.toString()
    };
  };

  // 모든 풀의 24시간 데이터 업데이트 (myLiquidity 정보는 건드리지 않음)
  const updateAll24hData = async (pools?: LiquidityPool[]) => {
    const poolsToUpdate = pools || liquidityPools;
    
    if (!poolsToUpdate || poolsToUpdate.length === 0) {
      console.log("업데이트할 풀이 없습니다");
      return;
    }

    try {
      console.log("24시간 데이터 계산 시작:", poolsToUpdate.length, "개 풀");
      
      // 24시간 데이터만 계산하고 풀 상태는 건드리지 않음
      const volume24hData: { [poolId: string]: { volume24h: string, fees24h: string } } = {};
      
      await Promise.all(
        poolsToUpdate.map(async (pool) => {
          try {
            const response = await fetch(
              `${process.env.API_URL || "http://localhost:4000"}/simple-dex/pools/${pool.id}/history`
            );

            if (!response.ok) {
              console.log(`풀 ${pool.id} 히스토리 로드 실패`);
              return;
            }

            const historyData: PoolHistoryResponse[] = await response.json();
            const { volume24h, fees24h } = calculate24hData(historyData);

            console.log(`풀 ${pool.id} 24시간 데이터: 거래량=${volume24h}, 수수료=${fees24h}`);
            
            volume24hData[pool.id] = { volume24h, fees24h };
          } catch (error) {
            console.error(`풀 ${pool.id} 24시간 데이터 계산 실패:`, error);
          }
        })
      );

      // 기존 풀 상태를 유지하면서 24시간 데이터만 업데이트
      console.log("24시간 데이터 적용 중...");
      setLiquidityPools(prevPools => 
        prevPools.map(pool => {
          const newData = volume24hData[pool.id];
          if (newData) {
            console.log(`풀 ${pool.id} - 기존 myLiquidity: ${pool.myLiquidity || 'undefined'}, 24h 데이터 업데이트`);
            return {
              ...pool,
              volume24h: newData.volume24h,
              fees24h: newData.fees24h
            };
          }
          return pool;
        })
      );
      
      console.log("24시간 데이터 업데이트 완료");
    } catch (error) {
      console.error("24시간 데이터 업데이트 실패:", error);
    }
  };

  // 실제 환율 히스토리 로딩
  const loadRateHistory = async (pool: LiquidityPool) => {
    try {
      const response = await fetch(
        `${process.env.API_URL || "http://localhost:4000"}/simple-dex/pools/${pool.id}/history`
      );

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const historyData: PoolHistoryResponse[] = await response.json();
      
      // API 응답을 차트용 데이터로 변환
      const rateHistoryData: RateHistory[] = [];
      let cumulativeAmountA = 0;
      let cumulativeAmountB = 0;

      historyData.forEach((item, index) => {
        // 누적 풀 상태 계산 (각 거래마다 누적)
        cumulativeAmountA += parseFloat(ethers.formatEther(item.amountA));
        cumulativeAmountB += parseFloat(ethers.formatEther(item.amountB));
        
        // 누적 상태를 기반으로 환율 계산
        const rate = cumulativeAmountB / cumulativeAmountA; // tokenA당 tokenB 가격
        const timestamp = parseInt(item.timestamp) * 1000; // 밀리초로 변환
        const date = new Date(timestamp).toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        rateHistoryData.push({
          timestamp,
          rate,
          date
        });
      });

      // 현재 풀 상태를 마지막 포인트로 추가
      if (rateHistoryData.length > 0) {
        const currentRate = parseFloat(pool.rate);
        const now = Date.now();
        const currentDate = new Date(now).toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        rateHistoryData.push({
          timestamp: now,
          rate: currentRate,
          date: currentDate + ' (현재)'
        });
      }

      // 시간순으로 정렬
      rateHistoryData.sort((a, b) => a.timestamp - b.timestamp);
      
      console.log("환율 히스토리 로드 완료:", rateHistoryData.length, "개");
      setRateHistory(rateHistoryData);
    } catch (error) {
      console.error("환율 히스토리 로딩 실패:", error);
      showToast("error", "로딩 실패", "환율 히스토리를 불러올 수 없습니다.");
      // 오류 시 빈 배열로 설정
      setRateHistory([]);
    }
  };

  // 청산 모달 열기
  const openRemoveModal = (pool: LiquidityPool) => {
    if (!pool.myLiquidity) {
      showToast("error", "청산 불가", "청산할 유동성이 없습니다.");
      return;
    }
    setSelectedPoolForRemove(pool);
    setRemoveLiquidityAmount("");
    setShowRemoveModal(true);
  };

  // 유동성 청산 함수
  const handleRemoveLiquidity = async () => {
    if (!selectedPoolForRemove || !removeLiquidityAmount) {
      showToast("error", "입력 확인", "청산할 유동성 양을 입력해주세요.");
      return;
    }

    if (!isWalletConnected || !walletAddress) {
      showToast("error", "지갑 연결", "지갑을 연결해주세요.");
      return;
    }

    const removeAmount = parseFloat(removeLiquidityAmount);
    const maxAmount = parseFloat(selectedPoolForRemove.myLiquidity || "0");
    
    if (removeAmount <= 0 || removeAmount > maxAmount) {
      showToast("error", "입력 오류", `0 ~ ${maxAmount} 범위의 값을 입력해주세요.`);
      return;
    }

    try {
      setIsRemovingLiquidity(true);
      showToast("info", "청산 준비", "청산 가능 여부 확인 중...", 3000);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const dexContract = new ethers.Contract(DEX_CONTRACT_ADDRESS, DEX_ABI, signer);

      // 1. 실제 보유 LP 토큰 확인
      console.log("청산 시도 정보:");
      console.log("- 토큰 A:", selectedPoolForRemove.tokenA.address);
      console.log("- 토큰 B:", selectedPoolForRemove.tokenB.address);
      console.log("- 청산할 양:", removeLiquidityAmount);
      
      const actualMyLiquidity = await dexContract.getMyLiquidity(
        selectedPoolForRemove.tokenA.address,
        selectedPoolForRemove.tokenB.address
      );
      const actualFormattedLiquidity = ethers.formatEther(actualMyLiquidity);
      console.log("- 실제 보유 LP:", actualFormattedLiquidity);
      
      if (parseFloat(actualFormattedLiquidity) < parseFloat(removeLiquidityAmount)) {
        throw new Error(`실제 보유 LP 토큰(${actualFormattedLiquidity})이 청산하려는 양(${removeLiquidityAmount})보다 적습니다.`);
      }

      // 2. 풀 상태 확인
      const poolInfo = await dexContract.pools(
        selectedPoolForRemove.tokenA.address,
        selectedPoolForRemove.tokenB.address
      );
      console.log("풀 상태:", {
        tokenAReserve: ethers.formatEther(poolInfo.tokenAReserve),
        tokenBReserve: ethers.formatEther(poolInfo.tokenBReserve),
        totalLiquidity: ethers.formatEther(poolInfo.totalLiquidity)
      });

      if (poolInfo.totalLiquidity === 0n) {
        throw new Error("해당 풀이 존재하지 않거나 유동성이 없습니다.");
      }

      showToast("info", "청산 중", "유동성을 청산하는 중...", 5000);
      const liquidityToRemove = ethers.parseEther(removeLiquidityAmount);

      const tx = await dexContract.removeLiquidity(
        selectedPoolForRemove.tokenA.address,
        selectedPoolForRemove.tokenB.address,
        liquidityToRemove
      );

      await tx.wait();
      
      showToast("success", "성공", `${removeLiquidityAmount} LP 토큰이 성공적으로 청산되었습니다!`);

      // 잔액 및 풀 정보 새로고침
      await loadTokenBalances(tokens);
      await loadLiquidityPools();
      
      // 모달 닫기
      setShowRemoveModal(false);
      
    } catch (error: any) {
      console.error("유동성 청산 실패:", error);
      showToast("error", "실패", error.message || "유동성 청산에 실패했습니다.");
    } finally {
      setIsRemovingLiquidity(false);
    }
  };

  // 스왑 모달 열기
  const openSwapModal = (pool: LiquidityPool) => {
    // 풀의 토큰들을 스왑 토큰으로 설정
    const tokenA = tokens.find(t => t.address === pool.tokenA.address);
    const tokenB = tokens.find(t => t.address === pool.tokenB.address);
    
    setSwapFromToken(tokenA || pool.tokenA);
    setSwapToToken(tokenB || pool.tokenB);
    setSwapAmountIn("");
    setSwapAmountOut("");
    setSwapCalculation({
      outputAmount: "",
      slippage: 0,
      priceImpact: 0,
      isUnreasonable: false,
      warning: ""
    });
    setShowSwapModal(true);
  };

  // 스왑 방향 전환
  const flipSwapDirection = () => {
    const temp = swapFromToken;
    setSwapFromToken(swapToToken);
    setSwapToToken(temp);
    setSwapAmountIn("");
    setSwapAmountOut("");
  };

  // AMM 공식을 사용한 정확한 출력량 및 슬리피지 계산
  const calculateSwapOutput = (inputAmount: string) => {
    if (!swapFromToken || !swapToToken || !inputAmount || parseFloat(inputAmount) <= 0) {
      return { outputAmount: "", slippage: 0, priceImpact: 0, isUnreasonable: false, warning: "" };
    }

    // 현재 풀을 찾기
    const currentPool = liquidityPools.find(pool => 
      (pool.tokenA.address === swapFromToken.address && pool.tokenB.address === swapToToken.address) ||
      (pool.tokenB.address === swapFromToken.address && pool.tokenA.address === swapToToken.address)
    );

    if (!currentPool) {
      return { outputAmount: "", slippage: 0, priceImpact: 0, isUnreasonable: false, warning: "" };
    }

    try {
      const inputAmountFloat = parseFloat(inputAmount);
      let reserveIn: number, reserveOut: number;
      let isTokenAToB = false;

      // 스왑 방향 확인 및 리저브 설정
      if (currentPool.tokenA.address === swapFromToken.address) {
        reserveIn = parseFloat(currentPool.reserveA);
        reserveOut = parseFloat(currentPool.reserveB);
        isTokenAToB = true;
      } else {
        reserveIn = parseFloat(currentPool.reserveB);
        reserveOut = parseFloat(currentPool.reserveA);
        isTokenAToB = false;
      }

      // AMM 공식: x * y = k
      // 수수료 적용된 입력량
      const fee = 0.003; // 0.3%
      const amountInWithFee = inputAmountFloat * (1 - fee);
      
      // 출력량 계산: amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
      const numerator = amountInWithFee * reserveOut;
      const denominator = reserveIn + amountInWithFee;
      const outputAmount = numerator / denominator;

      // 현재 환율 기준 이론적 출력량 (슬리피지 없는 경우)
      const currentRate = isTokenAToB ? parseFloat(currentPool.rate) : (1 / parseFloat(currentPool.rate));
      const theoreticalOutput = inputAmountFloat * currentRate * (1 - fee);

      // 슬리피지 계산
      const slippage = ((theoreticalOutput - outputAmount) / theoreticalOutput) * 100;

      // 가격 영향 계산 (풀 대비 거래량 비율)
      const priceImpact = (inputAmountFloat / reserveIn) * 100;

      // 불합리한 거래 판단
      let isUnreasonable = false;
      let warning = "";

      if (slippage > 5) {
        isUnreasonable = true;
        warning = `높은 슬리피지 (${slippage.toFixed(2)}%)로 인해 손실이 클 수 있습니다.`;
      } else if (priceImpact > 10) {
        isUnreasonable = true;
        warning = `거래량이 풀의 ${priceImpact.toFixed(1)}%로 너무 커서 가격에 큰 영향을 줍니다.`;
      } else if (outputAmount / inputAmountFloat < 0.001) {
        isUnreasonable = true;
        warning = "받을 수 있는 토큰이 너무 적습니다. 환율을 확인해주세요.";
      } else if (inputAmountFloat > reserveIn * 0.5) {
        isUnreasonable = true;
        warning = "거래량이 풀의 50% 이상입니다. 거래가 실패할 수 있습니다.";
      }

      // 경고 레벨 추가
      if (!isUnreasonable) {
        if (slippage > 1) {
          warning = `주의: 슬리피지가 ${slippage.toFixed(2)}%입니다.`;
        } else if (priceImpact > 3) {
          warning = `주의: 가격 영향이 ${priceImpact.toFixed(1)}%입니다.`;
        }
      }

      return {
        outputAmount: outputAmount.toFixed(6),
        slippage: slippage,
        priceImpact: priceImpact,
        isUnreasonable: isUnreasonable,
        warning: warning
      };
    } catch (error) {
      console.error("스왑 계산 실패:", error);
      return { outputAmount: "", slippage: 0, priceImpact: 0, isUnreasonable: false, warning: "" };
    }
  };

  // 유동성 추가 계산 및 경고
  const calculateLiquidityAddition = (tokenA: Token | null, tokenB: Token | null, amountAInput: string, amountBInput: string) => {
    if (!tokenA || !tokenB || !amountAInput || !amountBInput || parseFloat(amountAInput) <= 0 || parseFloat(amountBInput) <= 0) {
      return {
        expectedLP: "",
        poolShare: 0,
        priceImpact: 0,
        ratioImbalance: 0,
        isUnreasonable: false,
        warning: ""
      };
    }

    // 현재 풀 찾기 (대소문자 구분 없이)
    const currentPool = liquidityPools.find(pool => 
      (pool.tokenA.address.toLowerCase() === tokenA.address.toLowerCase() && pool.tokenB.address.toLowerCase() === tokenB.address.toLowerCase()) ||
      (pool.tokenB.address.toLowerCase() === tokenA.address.toLowerCase() && pool.tokenA.address.toLowerCase() === tokenB.address.toLowerCase())
    );

    const amountA = parseFloat(amountAInput);
    const amountB = parseFloat(amountBInput);

    try {
      let expectedLP = "";
      let poolShare = 0;
      let priceImpact = 0;
      let ratioImbalance = 0;
      let isUnreasonable = false;
      let warning = "";

      if (currentPool && currentPool.totalLiquidity && parseFloat(currentPool.totalLiquidity) > 0) {
        // 기존 풀에 유동성 추가
        let reserveA: number, reserveB: number;
        let userAmountA: number, userAmountB: number;

        // 토큰 순서 맞추기
        if (currentPool.tokenA.address === tokenA.address) {
          reserveA = parseFloat(currentPool.reserveA);
          reserveB = parseFloat(currentPool.reserveB);
          userAmountA = amountA;
          userAmountB = amountB;
        } else {
          reserveA = parseFloat(currentPool.reserveB);
          reserveB = parseFloat(currentPool.reserveA);
          userAmountA = amountB;
          userAmountB = amountA;
        }

        // 현재 풀 비율
        const currentRatio = reserveA / reserveB;
        const userRatio = userAmountA / userAmountB;

        // 비율 불균형 계산 (%)
        ratioImbalance = Math.abs((userRatio - currentRatio) / currentRatio) * 100;

        // 최적 비율로 LP 토큰 계산
        const totalSupply = parseFloat(currentPool.totalLiquidity);
        
        // 두 토큰 기준으로 각각 LP 계산하여 더 작은 값 사용
        const lpByTokenA = (userAmountA / reserveA) * totalSupply;
        const lpByTokenB = (userAmountB / reserveB) * totalSupply;
        const lpAmount = Math.min(lpByTokenA, lpByTokenB);
        
        expectedLP = lpAmount.toFixed(6);

        // 풀 점유율 계산
        poolShare = (lpAmount / (totalSupply + lpAmount)) * 100;

        // 가격 영향 계산 (전체 풀 대비 추가 유동성 비율)
        priceImpact = Math.max(
          (userAmountA / reserveA) * 100,
          (userAmountB / reserveB) * 100
        );

        // 불합리한 거래 판단
        if (ratioImbalance > 15) {
          isUnreasonable = true;
          warning = `토큰 비율이 현재 풀 비율과 ${ratioImbalance.toFixed(1)}% 차이납니다. 일부 토큰이 낭비될 수 있습니다.`;
        } else if (priceImpact > 20) {
          isUnreasonable = true;
          warning = `추가하려는 유동성이 풀의 ${priceImpact.toFixed(1)}%로 너무 큽니다. 가격에 큰 영향을 줄 수 있습니다.`;
        } else if (poolShare > 50) {
          isUnreasonable = true;
          warning = `추가 후 풀의 ${poolShare.toFixed(1)}%를 소유하게 됩니다. 너무 큰 비중입니다.`;
        }

        // 경고 레벨
        if (!isUnreasonable) {
          if (ratioImbalance > 5) {
            warning = `주의: 토큰 비율이 ${ratioImbalance.toFixed(1)}% 차이납니다.`;
          } else if (priceImpact > 10) {
            warning = `주의: 가격 영향이 ${priceImpact.toFixed(1)}%입니다.`;
          } else if (poolShare > 25) {
            warning = `주의: 풀의 ${poolShare.toFixed(1)}% 점유율을 가지게 됩니다.`;
          }
        }

      } else {
        // 새로운 풀 생성 또는 유동성이 없는 풀
        // 초기 유동성의 경우 LP = sqrt(amountA * amountB) 공식 사용
        const lpAmount = Math.sqrt(amountA * amountB);
        expectedLP = lpAmount.toFixed(6);
        poolShare = 100; // 새 풀이므로 100%
        
        if (currentPool) {
          warning = `기존 풀이지만 유동성이 없습니다 (현재 유동성: ${currentPool.totalLiquidity}). 초기 비율을 설정합니다.`;
        } else {
          warning = "새로운 유동성 풀을 생성합니다. 초기 비율이 중요합니다.";
        }
      }

      return {
        expectedLP,
        poolShare,
        priceImpact,
        ratioImbalance,
        isUnreasonable,
        warning
      };
    } catch (error) {
      console.error("유동성 계산 실패:", error);
      return {
        expectedLP: "",
        poolShare: 0,
        priceImpact: 0,
        ratioImbalance: 0,
        isUnreasonable: false,
        warning: ""
      };
    }
  };

  // 스왑 실행
  const handleSwap = async () => {
    if (!swapFromToken || !swapToToken || !swapAmountIn) {
      showToast("error", "입력 확인", "모든 필드를 입력해주세요.");
      return;
    }

    if (!isWalletConnected || !walletAddress) {
      showToast("error", "지갑 연결", "지갑을 연결해주세요.");
      return;
    }

    try {
      setIsApprovingForSwap(true);

      // 1. 토큰 approve
      showToast("info", "승인 중", `${swapFromToken.symbol} 토큰 승인 중...`, 3000);
      const approveTx = await approveToken(swapFromToken.address, DEX_CONTRACT_ADDRESS);
      await approveTx.wait();

      setIsApprovingForSwap(false);
      setIsSwapping(true);

      // 2. 스왑 실행
      showToast("info", "스왑 중", "토큰 스왑을 실행하는 중...", 5000);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const dexContract = new ethers.Contract(DEX_CONTRACT_ADDRESS, DEX_ABI, signer);

      const amountInWei = ethers.parseEther(swapAmountIn);

      const tx = await dexContract.swap(
        swapFromToken.address,
        swapToToken.address,
        amountInWei
      );

      const receipt = await tx.wait();
      
      showToast("success", "성공", "스왑이 성공적으로 완료되었습니다!");

      // 잔액 새로고침
      await loadTokenBalances(tokens);

      // 유동성 풀 목록 새로고침
      await loadLiquidityPools();

      // 모달 닫기
      setShowSwapModal(false);
      
    } catch (error: any) {
      console.error("스왑 실패:", error);
      showToast("error", "실패", error.message || "스왑에 실패했습니다.");
    } finally {
      setIsApprovingForSwap(false);
      setIsSwapping(false);
    }
  };

  // Y축 범위 계산 (더 나은 시각화를 위해)
  const calculateYAxisDomain = (data: RateHistory[]) => {
    if (!data || data.length === 0) return ['auto', 'auto'];
    
    const rates = data.map(item => item.rate);
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);
    const range = maxRate - minRate;
    
    // 범위가 매우 작은 경우 (거의 일정한 환율)
    if (range < maxRate * 0.01) { // 1% 미만 변동
      const center = (minRate + maxRate) / 2;
      const padding = center * 0.05; // 중심값의 5%
      return [center - padding, center + padding];
    }
    
    // 일반적인 경우: 최소/최대값에서 적절한 여백 추가
    const padding = range * 0.15; // 범위의 15%를 여백으로
    const yMin = Math.max(0, minRate - padding); // 0 이하로 내려가지 않도록
    const yMax = maxRate + padding;
    
    return [yMin, yMax];
  };

  // 환율 차트 표시
  const showRateChartModal = (pool: LiquidityPool) => {
    setSelectedPool(pool);
    loadRateHistory(pool);
    setShowRateChart(true);
  };

  // 컴포넌트 마운트시 데이터 로딩
  useEffect(() => {
    loadTokens();
    loadLiquidityPools(); // API에서 실제 풀 데이터 로딩
  }, []);

  // 지갑 연결 변경시 토큰 잔액 새로고침
  useEffect(() => {
    const updateTokenBalances = async () => {
      if (isWalletConnected && walletAddress && tokens.length > 0) {
        console.log("지갑 연결 감지, 토큰 잔액 업데이트 시작");
        await loadTokenBalances(tokens);
      }
    };
    
    updateTokenBalances();
  }, [isWalletConnected, walletAddress]); // tokens.length 제거하여 무한 루프 방지

  // 지갑 연결 후 유동성 정보 별도 업데이트
  useEffect(() => {
    const updateLiquidityInfo = async () => {
      if (isWalletConnected && walletAddress && liquidityPools.length > 0) {
        console.log("지갑 연결 감지, 유동성 정보 업데이트 시작");
        const updatedPools = await loadMyLiquidityForPools(liquidityPools);
        setLiquidityPools(updatedPools);
      }
    };
    
    updateLiquidityInfo();
  }, [isWalletConnected, walletAddress]); // liquidityPools.length 제거하여 무한 루프 방지

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
              유동성을 추가하려면 상단 우측의 &ldquo;지갑 연결&rdquo; 버튼을 클릭하세요
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
                            // 토큰 변경 후 계산 재실행
                            setTimeout(() => {
                              if (amountA && amountB) {
                                const calculation = calculateLiquidityAddition(token, selectedTokenB, amountA, amountB);
                                setLiquidityCalculation(calculation);
                              }
                            }, 0);
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
                              // 토큰 변경 후 계산 재실행
                              setTimeout(() => {
                                if (amountA && amountB) {
                                  const calculation = calculateLiquidityAddition(selectedTokenA, token, amountA, amountB);
                                  setLiquidityCalculation(calculation);
                                }
                              }, 0);
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
                  onChange={(e) => {
                    const value = e.target.value;
                    setAmountA(value);
                    // 유동성 추가 계산
                    const calculation = calculateLiquidityAddition(selectedTokenA, selectedTokenB, value, amountB);
                    setLiquidityCalculation(calculation);
                  }}
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
                  onChange={(e) => {
                    const value = e.target.value;
                    setAmountB(value);
                    // 유동성 추가 계산
                    const calculation = calculateLiquidityAddition(selectedTokenA, selectedTokenB, amountA, value);
                    setLiquidityCalculation(calculation);
                  }}
                  placeholder={`${selectedTokenB.symbol} 수량`}
                  step="0.0001"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={!isWalletConnected || isApproving || isAddingLiquidity}
                />
              </div>
            </div>
          )}

          {/* 유동성 추가 계산 결과 */}
          {selectedTokenA && selectedTokenB && amountA && amountB && liquidityCalculation.expectedLP && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900">예상 결과</div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>예상 LP 토큰: {liquidityCalculation.expectedLP}</div>
                  {liquidityCalculation.poolShare > 0 && (
                    <div className="text-blue-600">
                      풀 점유율: {liquidityCalculation.poolShare.toFixed(2)}%
                    </div>
                  )}
                  {liquidityCalculation.ratioImbalance > 0.1 && (
                    <div className="text-orange-600">
                      비율 차이: {liquidityCalculation.ratioImbalance.toFixed(1)}%
                    </div>
                  )}
                  {liquidityCalculation.priceImpact > 0.1 && (
                    <div className="text-purple-600">
                      가격 영향: {liquidityCalculation.priceImpact.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 경고 메시지 */}
          {liquidityCalculation.warning && (
            <div className={`p-3 rounded-lg mb-4 ${
              liquidityCalculation.isUnreasonable 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-start space-x-2">
                {liquidityCalculation.isUnreasonable ? (
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                )}
                <p className={`text-sm ${
                  liquidityCalculation.isUnreasonable ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  {liquidityCalculation.warning}
                </p>
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
              selectedTokenA.address === selectedTokenB.address ||
              liquidityCalculation.isUnreasonable
            }
            className={`w-full py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium ${
              liquidityCalculation.isUnreasonable 
                ? 'bg-gray-400 text-gray-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
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
                            {parseFloat(pool.volume24h) > 0 
                              ? `${parseFloat(pool.volume24h).toFixed(2)} 토큰` 
                              : "계산중..."}
                          </div>
                          <div className="text-xs text-gray-500">
                            수수료 (0.3%): {parseFloat(pool.fees24h) > 0 
                              ? `${parseFloat(pool.fees24h).toFixed(4)} 토큰` 
                              : "계산중..."}
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
                              onClick={() => openRemoveModal(pool)}
                              className="inline-flex items-center space-x-1 bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded text-xs font-medium transition-colors"
                              title="유동성 청산"
                            >
                              <Minus className="w-3 h-3" />
                              <span>청산</span>
                            </button>
                          )}

                          {/* 스왑 버튼 */}
                          <button
                            onClick={() => openSwapModal(pool)}
                            className="inline-flex items-center space-x-1 bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded text-xs font-medium transition-colors"
                            title="토큰 스왑"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>스왑</span>
                          </button>

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
                    1 {selectedPool.tokenA.symbol} 당 가격 히스토리
                  </div>
                </div>

                {/* 환율 차트 */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  {rateHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg mb-2">환율 히스토리 로딩 중...</p>
                      <p className="text-sm text-gray-400">
                        거래 히스토리를 불러오고 있습니다
                      </p>
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={rateHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                            domain={calculateYAxisDomain(rateHistory)}
                            tickFormatter={(value) => value.toFixed(6)}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #ccc',
                              borderRadius: '4px'
                            }}
                            labelStyle={{ color: '#666' }}
                            formatter={(value: number) => [
                              `${value.toFixed(6)} ${selectedPool.tokenB.symbol}`,
                              `1 ${selectedPool.tokenA.symbol} =`
                            ]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="rate" 
                            stroke="#3B82F6" 
                            strokeWidth={2}
                            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2, fill: '#FFFFFF' }}
                            connectNulls={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                  
                {/* 풀 정보 요약 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-xs text-gray-500">현재 환율</div>
                    <div className="font-semibold">{selectedPool.rate}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-xs text-gray-500">24h 거래량</div>
                    <div className="font-semibold">
                      {parseFloat(selectedPool.volume24h) > 0 
                        ? `${parseFloat(selectedPool.volume24h).toFixed(2)} 토큰` 
                        : "계산중..."}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-xs text-gray-500">24h 수수료 (0.3%)</div>
                    <div className="font-semibold">
                      {parseFloat(selectedPool.fees24h) > 0 
                        ? `${parseFloat(selectedPool.fees24h).toFixed(4)} 토큰` 
                        : "계산중..."}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-xs text-gray-500">총 유동성</div>
                    <div className="font-semibold">${parseFloat(selectedPool.totalLiquidity).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 스왑 모달 */}
        {showSwapModal && swapFromToken && swapToToken && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  토큰 스왑
                </h3>
                <button
                  onClick={() => setShowSwapModal(false)}
                  className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* From 토큰 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      보낼 토큰
                    </label>
                    {swapFromToken.balance && (
                      <span className="text-xs text-gray-500">
                        보유: {parseFloat(swapFromToken.balance).toFixed(4)} {swapFromToken.symbol}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-800">
                          {swapFromToken.symbol.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{swapFromToken.symbol}</div>
                        <div className="text-xs text-gray-500">{swapFromToken.name}</div>
                      </div>
                    </div>
                    <input
                      type="number"
                      value={swapAmountIn}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSwapAmountIn(value);
                        // 스왑 계산 (출력량, 슬리피지, 경고 등)
                        const calculation = calculateSwapOutput(value);
                        setSwapCalculation(calculation);
                        setSwapAmountOut(calculation.outputAmount);
                      }}
                      placeholder="수량"
                      step="0.0001"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isApprovingForSwap || isSwapping}
                    />
                  </div>
                </div>

                {/* 스왑 방향 전환 버튼 */}
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      flipSwapDirection();
                      // 방향 전환 후 재계산
                      setTimeout(() => {
                        if (swapAmountIn) {
                          const calculation = calculateSwapOutput(swapAmountIn);
                          setSwapCalculation(calculation);
                          setSwapAmountOut(calculation.outputAmount);
                        }
                      }, 0);
                    }}
                    disabled={isApprovingForSwap || isSwapping}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeftRight className="w-5 h-5 text-gray-600 transform rotate-90" />
                  </button>
                </div>

                {/* To 토큰 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      받을 토큰
                    </label>
                    {swapToToken.balance && (
                      <span className="text-xs text-gray-500">
                        보유: {parseFloat(swapToToken.balance).toFixed(4)} {swapToToken.symbol}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-green-800">
                          {swapToToken.symbol.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{swapToToken.symbol}</div>
                        <div className="text-xs text-gray-500">{swapToToken.name}</div>
                      </div>
                    </div>
                    <div className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg">
                      {swapCalculation.outputAmount ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            ~{swapCalculation.outputAmount} {swapToToken.symbol}
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>예상 수령량</div>
                            {swapCalculation.slippage > 0.01 && (
                              <div className="text-orange-600">
                                슬리피지: {swapCalculation.slippage.toFixed(2)}%
                              </div>
                            )}
                            {swapCalculation.priceImpact > 0.1 && (
                              <div className="text-blue-600">
                                가격 영향: {swapCalculation.priceImpact.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm">
                          예상 수령량이 계산됩니다
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 경고 메시지 */}
                {swapCalculation.warning && (
                  <div className={`p-3 rounded-lg ${
                    swapCalculation.isUnreasonable 
                      ? 'bg-red-50 border border-red-200' 
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}>
                    <div className="flex items-start space-x-2">
                      {swapCalculation.isUnreasonable ? (
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                      )}
                      <p className={`text-sm ${
                        swapCalculation.isUnreasonable ? 'text-red-700' : 'text-yellow-700'
                      }`}>
                        {swapCalculation.warning}
                      </p>
                    </div>
                  </div>
                )}

                {/* 스왑 버튼 */}
                <button
                  onClick={handleSwap}
                  disabled={
                    !swapFromToken ||
                    !swapToToken ||
                    !swapAmountIn ||
                    isApprovingForSwap ||
                    isSwapping ||
                    parseFloat(swapAmountIn) <= 0 ||
                    swapCalculation.isUnreasonable
                  }
                  className={`w-full py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium ${
                    swapCalculation.isUnreasonable 
                      ? 'bg-gray-400 text-gray-700' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isApprovingForSwap ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>토큰 승인 중...</span>
                    </>
                  ) : isSwapping ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>스왑 실행 중...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      <span>스왑 실행</span>
                    </>
                  )}
                </button>

                {/* 안내 사항 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    • 예상 수령량은 현재 환율 기준으로 계산됩니다<br/>
                    • 실제 스왑 시 수수료(0.3%)와 슬리피지가 적용됩니다<br/>
                    • 거래량이 클수록 실제 받는 양은 더 적을 수 있습니다<br/>
                    • 토큰 승인은 처음 한 번만 필요합니다
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 청산 모달 */}
        {showRemoveModal && selectedPoolForRemove && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  유동성 청산
                </h3>
                <button
                  onClick={() => setShowRemoveModal(false)}
                  className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* 풀 정보 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">대상 풀</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-800">
                          {selectedPoolForRemove.tokenA.symbol.charAt(0)}
                        </span>
                      </div>
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center -ml-1">
                        <span className="text-xs font-semibold text-green-800">
                          {selectedPoolForRemove.tokenB.symbol.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-medium">
                      {selectedPoolForRemove.tokenA.symbol}/{selectedPoolForRemove.tokenB.symbol}
                    </span>
                  </div>
                </div>

                {/* 보유 유동성 정보 */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-700 mb-1">보유 LP 토큰</div>
                  <div className="text-lg font-semibold text-blue-800">
                    {parseFloat(selectedPoolForRemove.myLiquidity || "0").toFixed(6)} LP
                  </div>
                </div>

                {/* 청산할 양 입력 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    청산할 LP 토큰 수량
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={removeLiquidityAmount}
                      onChange={(e) => setRemoveLiquidityAmount(e.target.value)}
                      placeholder="청산할 수량 입력"
                      step="0.000001"
                      max={selectedPoolForRemove.myLiquidity}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isRemovingLiquidity}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setRemoveLiquidityAmount((parseFloat(selectedPoolForRemove.myLiquidity || "0") * 0.25).toString())}
                        className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        disabled={isRemovingLiquidity}
                      >
                        25%
                      </button>
                      <button
                        onClick={() => setRemoveLiquidityAmount((parseFloat(selectedPoolForRemove.myLiquidity || "0") * 0.5).toString())}
                        className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        disabled={isRemovingLiquidity}
                      >
                        50%
                      </button>
                      <button
                        onClick={() => setRemoveLiquidityAmount((parseFloat(selectedPoolForRemove.myLiquidity || "0") * 0.75).toString())}
                        className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        disabled={isRemovingLiquidity}
                      >
                        75%
                      </button>
                      <button
                        onClick={() => setRemoveLiquidityAmount(selectedPoolForRemove.myLiquidity || "0")}
                        className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        disabled={isRemovingLiquidity}
                      >
                        전체
                      </button>
                    </div>
                  </div>
                </div>

                {/* 청산 버튼 */}
                <button
                  onClick={handleRemoveLiquidity}
                  disabled={
                    !removeLiquidityAmount ||
                    parseFloat(removeLiquidityAmount) <= 0 ||
                    parseFloat(removeLiquidityAmount) > parseFloat(selectedPoolForRemove.myLiquidity || "0") ||
                    isRemovingLiquidity
                  }
                  className="w-full bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isRemovingLiquidity ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>청산 중...</span>
                    </>
                  ) : (
                    <>
                      <Minus className="w-5 h-5" />
                      <span>유동성 청산</span>
                    </>
                  )}
                </button>

                {/* 안내 사항 */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-700">
                    • 청산 시 입력한 LP 토큰만큼 소각됩니다<br/>
                    • 그에 상응하는 {selectedPoolForRemove.tokenA.symbol}과 {selectedPoolForRemove.tokenB.symbol}을 받습니다<br/>
                    • 부분 청산도 가능하며, 언제든지 나머지를 청산할 수 있습니다
                  </p>
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