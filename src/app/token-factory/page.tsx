"use client";

import { useWallet } from "@/contexts/WalletContext";
import { ethers } from "ethers";
import {
  AlertCircle,
  CheckCircle,
  Coins,
  Copy,
  ExternalLink,
  Loader,
  RefreshCw,
  Send,
  Star,
  Wallet as WalletIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const TOKEN_FACTORY_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "symbol",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "initialSupply",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "TokenDeployed",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "string",
        name: "symbol",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "initialSupply",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "deployToken",
    outputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    name: "tokenAddresses",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "tokenSymbols",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// TODO: 실제 Token Factory 컨트랙트 주소로 교체 필요
const TOKEN_FACTORY_ADDRESS = "0xCfEB869F69431e42cdB54A4F4f105C19C080A601";

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

interface DeployedToken {
  symbol: string;
  name: string;
  address: string;
  initialSupply: string;
  owner: string;
  txHash: string;
  balance?: string; // 내 잔액
  balanceLoading?: boolean; // 잔액 로딩 상태
}

interface ToastNotification {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
  duration?: number;
}

export default function TokenFactory() {
  // 전역 지갑 상태 사용
  const { isConnected: isWalletConnected, address: walletAddress } =
    useWallet();

  // 토큰 발행 폼 상태
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [initialSupply, setInitialSupply] = useState("");

  // 트랜잭션 상태
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [deploymentMessage, setDeploymentMessage] = useState("");
  const [deployedTokens, setDeployedTokens] = useState<DeployedToken[]>([]);
  
  // 토큰별 잔액 로딩 상태 관리
  const [balanceLoadingStates, setBalanceLoadingStates] = useState<{[address: string]: boolean}>({});

  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTokens, setTotalTokens] = useState(0);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const TOKENS_PER_PAGE = 10;

  // 전송 모달 상태
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<DeployedToken | null>(
    null
  );
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  // 토스트 알림 상태
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

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

    // 자동으로 제거
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // 주소 복사 함수
  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      showToast(
        "success",
        "복사 완료",
        "컨트랙트 주소가 클립보드에 복사되었습니다!"
      );
    } catch (error) {
      console.error("복사 실패:", error);
      showToast("error", "복사 실패", "클립보드 복사에 실패했습니다.");
    }
  };

  // 토큰 잔액 조회 함수
  const getTokenBalance = async (tokenAddress: string): Promise<string> => {
    if (
      !isWalletConnected ||
      !walletAddress ||
      typeof window === "undefined" ||
      !window.ethereum
    ) {
      return "0";
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        provider
      );
      const balance = await tokenContract.balanceOf(walletAddress);

      // 잔액을 ether 형식으로 변환하여 과학적 표기법 방지
      const formattedBalance = ethers.formatEther(balance);
      return formattedBalance;
    } catch (error) {
      console.error("토큰 잔액 조회 실패:", error);
      return "0";
    }
  };

  // 토큰 전송 함수
  const transferToken = async () => {
    if (
      !selectedToken ||
      !transferTo ||
      !transferAmount ||
      !isWalletConnected
    ) {
      showToast("error", "입력 확인", "모든 필드를 입력해주세요.");
      return;
    }

    setIsTransferring(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(
        selectedToken.address,
        ERC20_ABI,
        signer
      );

      const amount = ethers.parseEther(transferAmount);
      const tx = await tokenContract.transfer(transferTo, amount);

      showToast(
        "info",
        "트랜잭션 전송",
        `트랜잭션이 블록체인에 전송되었습니다. 해시: ${tx.hash.slice(
          0,
          10
        )}...`,
        8000
      );

      await tx.wait();
      showToast(
        "success",
        "전송 완료",
        `${transferAmount} ${selectedToken.symbol} 토큰이 성공적으로 전송되었습니다!`
      );

      // 모달 닫고 잔액 새로고침
      setShowTransferModal(false);
      setTransferTo("");
      setTransferAmount("");
      loadTokensFromAPI(currentPage);
    } catch (error: any) {
      console.error("토큰 전송 실패:", error);
      showToast(
        "error",
        "전송 실패",
        error.message || "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setIsTransferring(false);
    }
  };

  // 토큰 목록 로딩 (초기 로딩과 지갑 변경 시)
  useEffect(() => {
    loadTokensFromAPI(1);
  }, []);

  // 지갑 연결 상태 또는 주소 변경 시 잔액 갱신
  useEffect(() => {
    if (isWalletConnected && walletAddress && deployedTokens.length > 0) {
      // 기존 토큰들의 잔액 새로고침 (비동기 처리)
      loadTokenBalances(deployedTokens);
    }
  }, [isWalletConnected, walletAddress]);

  // API에서 토큰 목록 로딩 (페이징 지원)
  const loadTokensFromAPI = async (page: number = 1) => {
    try {
      setIsLoadingTokens(true);

      const offset = (page - 1) * TOKENS_PER_PAGE;
      const limit = TOKENS_PER_PAGE;

      const response = await fetch(
        `${
          process.env.API_URL || "http://localhost:4000"
        }/token-factory/tokens?limit=${limit}&offset=${offset}`
      );

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const responseData = await response.json();

      // 표준 응답 형식 확인 (data, total)
      const tokensData = responseData.data || responseData;
      const total = responseData.total || tokensData.length;

      // API 응답을 DeployedToken 형태로 변환 (잔액 조회 제외)
      const formattedTokens: DeployedToken[] = tokensData.map((token: any) => {
        // BigInt 형태의 totalSupply를 사람이 읽기 쉬운 형태로 변환
        let formattedSupply = "0";
        const rawSupply = token.totalSupply || token.initialSupply || "0";
        if (rawSupply && rawSupply !== "0") {
          try {
            const supplyString = rawSupply.toString();
            
            // 이미 소수점 형태인지 확인 (예: "1000.0" 또는 "1000")
            if (supplyString.includes('.') || supplyString.length < 15) {
              // 작은 수이거나 소수점이 있으면 그대로 사용
              formattedSupply = parseFloat(supplyString).toString();
            } else {
              // 큰 수라면 wei에서 ether로 변환
              const supplyInEther = ethers.formatEther(supplyString);
              formattedSupply = supplyInEther;
            }
          } catch (error) {
            console.error("Supply 변환 실패:", error);
            formattedSupply = rawSupply.toString();
          }
        }
        
        return {
          symbol: token.symbol || "N/A",
          name: token.name || "Unknown Token",
          address: token.address || "0x0",
          initialSupply: formattedSupply,
          owner: token.owner || "0x0",
          txHash: token.txHash || token.transactionHash || "0x0",
          balance: undefined, // 초기에는 undefined
          balanceLoading: false, // 초기에는 로딩 중이 아님
        };
      });

      // 토큰 목록 먼저 설정 (빠른 렌더링)
      setDeployedTokens(formattedTokens);
      setTotalTokens(total);
      setCurrentPage(page);
      
      // 지갑이 연결된 경우에만 잔액을 비동기로 조회
      if (isWalletConnected && walletAddress) {
        loadTokenBalances(formattedTokens);
      }

    } catch (error) {
      console.error("토큰 목록 로딩 실패:", error);
      // 에러가 발생해도 기존 로컬 토큰들은 유지
    } finally {
      setIsLoadingTokens(false);
    }
  };

  // 토큰들의 잔액을 비동기로 로드
  const loadTokenBalances = async (tokens: DeployedToken[]) => {
    if (!isWalletConnected || !walletAddress) return;

    // 각 토큰별로 잔액 로딩 상태 설정
    tokens.forEach(token => {
      setDeployedTokens(prevTokens => 
        prevTokens.map(prevToken => 
          prevToken.address === token.address 
            ? { ...prevToken, balanceLoading: true }
            : prevToken
        )
      );
    });

    // 모든 토큰의 잔액을 병렬로 조회
    const balancePromises = tokens.map(async (token) => {
      try {
        const balance = await getTokenBalance(token.address);
        // 개별 토큰 잔액 업데이트
        setDeployedTokens(prevTokens => 
          prevTokens.map(prevToken => 
            prevToken.address === token.address 
              ? { ...prevToken, balance, balanceLoading: false }
              : prevToken
          )
        );
      } catch (error) {
        console.error(`토큰 ${token.symbol} 잔액 조회 실패:`, error);
        // 에러 발생 시에도 로딩 상태 해제
        setDeployedTokens(prevTokens => 
          prevTokens.map(prevToken => 
            prevToken.address === token.address 
              ? { ...prevToken, balance: "0", balanceLoading: false }
              : prevToken
          )
        );
      }
    });

    await Promise.allSettled(balancePromises);
  };

  const deployToken = async () => {
    if (!isWalletConnected || !tokenName || !tokenSymbol || !initialSupply) {
      alert("모든 필드를 입력하고 지갑을 연결해주세요.");
      return;
    }

    setIsDeploying(true);
    setDeploymentStatus("pending");
    setDeploymentMessage("네트워크 확인 중...");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // 현재 네트워크 확인
      const network = await provider.getNetwork();
      const targetChainId = process.env.CHAIN_ID || "1337";
      
      console.log("현재 네트워크 Chain ID:", network.chainId.toString());
      console.log("목표 네트워크 Chain ID:", targetChainId);
      
      // 네트워크가 다르면 변경 요청
      if (network.chainId.toString() !== targetChainId) {
        setDeploymentMessage("올바른 네트워크로 변경 중...");
        
        try {
          // 네트워크 변경 요청
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${parseInt(targetChainId).toString(16)}` }],
          });
          
          // 네트워크 변경 후 잠시 대기
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (switchError: any) {
          // 네트워크가 추가되지 않은 경우 추가 시도
          if (switchError.code === 4902) {
            try {
              const rpcUrl = process.env.RPC_URL || "http://forlong.io:8545";
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${parseInt(targetChainId).toString(16)}`,
                  chainName: 'Local Testnet',
                  rpcUrls: [rpcUrl],
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18
                  }
                }],
              });
            } catch (addError) {
              setDeploymentStatus("error");
              setDeploymentMessage("네트워크 추가에 실패했습니다. MetaMask에서 수동으로 네트워크를 설정해주세요.");
              return;
            }
          } else {
            setDeploymentStatus("error");
            setDeploymentMessage("네트워크 변경이 취소되었습니다. 올바른 네트워크에서 다시 시도해주세요.");
            return;
          }
        }
      }
      
      setDeploymentMessage("토큰 배포 중...");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        TOKEN_FACTORY_ADDRESS,
        TOKEN_FACTORY_ABI,
        signer
      );

      // 초기 공급량을 wei 단위로 변환 (18 decimals)
      const initialSupplyWei = ethers.parseEther(initialSupply);

      const tx = await contract.deployToken(
        tokenName,
        tokenSymbol,
        initialSupplyWei,
        walletAddress
      );

      setDeploymentMessage(`트랜잭션 전송됨: ${tx.hash}`);

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        // 이벤트에서 토큰 주소 추출
        const event = receipt.logs.find((log: any) => {
          try {
            const parsedLog = contract.interface.parseLog(log);
            return parsedLog && parsedLog.name === "TokenDeployed";
          } catch {
            return false;
          }
        });

        let tokenAddress = "주소 조회 실패";
        if (event) {
          const parsedLog = contract.interface.parseLog(event);
          // deployToken 함수의 반환값으로 토큰 주소를 얻을 수 있어야 하지만,
          // 여기서는 이벤트에서 가져오거나 토큰 심볼로 조회
          try {
            tokenAddress = await contract.tokenAddresses(tokenSymbol);
          } catch (error) {
            console.error("토큰 주소 조회 실패:", error);
          }
        }

        const newToken: DeployedToken = {
          symbol: tokenSymbol,
          name: tokenName,
          address: tokenAddress,
          initialSupply: initialSupply,
          owner: walletAddress,
          txHash: tx.hash,
        };

        setDeployedTokens((prev) => [newToken, ...prev]);
        setDeploymentStatus("success");
        setDeploymentMessage(
          `토큰이 성공적으로 배포되었습니다! 주소: ${tokenAddress}`
        );

        // 폼 초기화
        setTokenName("");
        setTokenSymbol("");
        setInitialSupply("");

        // API에서 최신 토큰 목록 다시 로딩
        setTimeout(() => {
          loadTokensFromAPI(1); // 첫 페이지로 이동하면서 새로고침
        }, 2000); // 2초 후 API에서 업데이트된 목록을 가져옴
      } else {
        setDeploymentStatus("error");
        setDeploymentMessage("토큰 배포에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("토큰 배포 오류:", error);
      setDeploymentStatus("error");
      setDeploymentMessage(`배포 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setIsDeploying(false);
    }
  };

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

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center space-x-3">
            <Coins className="w-8 h-8 text-blue-600" />
            <span>토큰 팩토리</span>
          </h1>
          <p className="text-gray-600">
            새로운 ERC-20 토큰을 간편하게 발행하세요
          </p>
        </div>

        {/* 토큰 발행 폼 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            빠른 토큰 발행
          </h2>

          {/* 지갑 미연결 시에만 안내 메시지 표시 */}
          {!isWalletConnected && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
              <p className="text-yellow-800">
                토큰을 발행하려면 상단 우측의 &quot;지갑 연결&quot; 버튼을
                클릭하세요
              </p>
            </div>
          )}

          {/* 토큰 정보 입력 폼 - 한 줄로 배치 */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:space-x-4 space-y-4 lg:space-y-0">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                토큰 이름
              </label>
              <input
                type="text"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="예: My Token"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isWalletConnected || isDeploying}
              />
            </div>

            <div className="lg:w-32">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                심볼
              </label>
              <input
                type="text"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                placeholder="MTK"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isWalletConnected || isDeploying}
              />
            </div>

            <div className="lg:w-40">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                발행량
              </label>
              <input
                type="number"
                value={initialSupply}
                onChange={(e) => setInitialSupply(e.target.value)}
                placeholder="1000000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isWalletConnected || isDeploying}
              />
            </div>

            <div className="lg:w-36">
              <button
                onClick={deployToken}
                disabled={
                  !isWalletConnected ||
                  isDeploying ||
                  !tokenName ||
                  !tokenSymbol ||
                  !initialSupply
                }
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeploying ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>발행중</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    <span>발행</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3 text-center">
            토큰은 ERC-20 표준을 따르며, 18자리 소수점을 지원합니다
          </p>

          {/* 배포 상태 메시지 */}
          {deploymentStatus !== "idle" && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                deploymentStatus === "success"
                  ? "bg-green-50 border border-green-200"
                  : deploymentStatus === "error"
                  ? "bg-red-50 border border-red-200"
                  : "bg-blue-50 border border-blue-200"
              }`}
            >
              <div className="flex items-start space-x-2">
                {deploymentStatus === "success" && (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                )}
                {deploymentStatus === "error" && (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                {deploymentStatus === "pending" && (
                  <Loader className="w-5 h-5 text-blue-600 animate-spin mt-0.5" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      deploymentStatus === "success"
                        ? "text-green-800"
                        : deploymentStatus === "error"
                        ? "text-red-800"
                        : "text-blue-800"
                    }`}
                  >
                    {deploymentMessage}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 발행된 토큰 목록 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">발행된 토큰</h2>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600">
                총 {totalTokens}개 토큰 (페이지 {currentPage} /{" "}
                {Math.ceil(totalTokens / TOKENS_PER_PAGE) || 1})
              </div>
              <button
                onClick={() => loadTokensFromAPI(currentPage)}
                disabled={isLoadingTokens}
                className="bg-blue-100 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors flex items-center space-x-2 disabled:opacity-50"
                title="토큰 목록 새로고침"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoadingTokens ? "animate-spin" : ""}`}
                />
                <span>{isLoadingTokens ? "로딩..." : "새로고침"}</span>
              </button>
            </div>
          </div>

          {deployedTokens.length === 0 ? (
            <div className="text-center py-12">
              <Coins className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                아직 발행된 토큰이 없습니다
              </p>
              <p className="text-sm text-gray-400 mt-2">
                토큰을 발행하면 여기에 표시됩니다
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      토큰 정보
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      발행량
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      내 잔액
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      트랜잭션
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deployedTokens.map((token, index) => {
                    // 내 소유 토큰 확인
                    const isMyToken =
                      isWalletConnected &&
                      walletAddress.toLowerCase() === token.owner.toLowerCase();

                    return (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {/* 토큰 정보 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 relative">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Coins className="h-5 w-5 text-blue-600" />
                              </div>
                              {/* 내 소유 토큰 표시 */}
                              {isMyToken && (
                                <div className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-400 rounded-full flex items-center justify-center">
                                  <Star className="h-2.5 w-2.5 text-yellow-800 fill-current" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {token.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                  {token.symbol}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 발행량 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {parseFloat(token.initialSupply).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">tokens</div>
                        </td>

                        {/* 내 잔액 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isWalletConnected ? (
                            <div className="flex items-center space-x-2">
                              <WalletIcon className="w-4 h-4 text-green-600" />
                              <div>
                                {token.balanceLoading ? (
                                  <div className="flex items-center space-x-2">
                                    <Loader className="w-4 h-4 animate-spin text-blue-500" />
                                    <div className="text-sm text-gray-500">로딩중...</div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-sm text-gray-900 font-medium">
                                      {token.balance !== undefined
                                        ? parseFloat(token.balance || "0") > 0
                                          ? parseFloat(token.balance || "0").toLocaleString("ko-KR", {
                                              minimumFractionDigits: 0,
                                              maximumFractionDigits: 6,
                                            })
                                          : "0"
                                        : "-"}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {token.symbol}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">
                              지갑 연결 필요
                            </div>
                          )}
                        </td>

                        {/* 트랜잭션 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/transactions/${token.txHash}`}
                            className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <span className="text-sm font-mono">
                              {token.txHash.slice(0, 8)}...
                              {token.txHash.slice(-6)}
                            </span>
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </td>

                        {/* 액션 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {/* 주소 복사 버튼 */}
                            <button
                              onClick={() => copyToClipboard(token.address)}
                              className="inline-flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium transition-colors"
                              title={`컨트랙트 주소 복사: ${token.address}`}
                            >
                              <Copy className="w-3 h-3" />
                              <span>복사</span>
                            </button>

                            {/* 전송 버튼 */}
                            {isWalletConnected &&
                              !token.balanceLoading &&
                              token.balance !== undefined &&
                              parseFloat(token.balance || "0") > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedToken(token);
                                    setShowTransferModal(true);
                                  }}
                                  className="inline-flex items-center space-x-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs font-medium transition-colors"
                                  title="토큰 전송"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>전송</span>
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 페이지네이션 */}
          {totalTokens > TOKENS_PER_PAGE && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  총 {totalTokens.toLocaleString()}개 토큰 중{" "}
                  <span className="font-medium">
                    {(currentPage - 1) * TOKENS_PER_PAGE + 1}-
                    {Math.min(currentPage * TOKENS_PER_PAGE, totalTokens)}
                  </span>
                  번째 표시
                </div>

                <div className="flex items-center space-x-2">
                  {/* 이전 페이지 버튼 */}
                  <button
                    onClick={() => loadTokensFromAPI(currentPage - 1)}
                    disabled={currentPage === 1 || isLoadingTokens}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      currentPage === 1 || isLoadingTokens
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    이전
                  </button>

                  {/* 페이지 번호들 */}
                  <div className="flex items-center space-x-1">
                    {(() => {
                      const totalPages = Math.ceil(
                        totalTokens / TOKENS_PER_PAGE
                      );
                      const maxVisiblePages = 5;
                      const startPage = Math.max(
                        1,
                        currentPage - Math.floor(maxVisiblePages / 2)
                      );
                      const endPage = Math.min(
                        totalPages,
                        startPage + maxVisiblePages - 1
                      );

                      return Array.from(
                        { length: endPage - startPage + 1 },
                        (_, i) => {
                          const pageNum = startPage + i;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => loadTokensFromAPI(pageNum)}
                              disabled={isLoadingTokens}
                              className={`px-3 py-2 rounded-md text-sm font-medium ${
                                pageNum === currentPage
                                  ? "bg-blue-600 text-white"
                                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      );
                    })()}
                  </div>

                  {/* 다음 페이지 버튼 */}
                  <button
                    onClick={() => loadTokensFromAPI(currentPage + 1)}
                    disabled={
                      currentPage >= Math.ceil(totalTokens / TOKENS_PER_PAGE) ||
                      isLoadingTokens
                    }
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      currentPage >= Math.ceil(totalTokens / TOKENS_PER_PAGE) ||
                      isLoadingTokens
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    다음
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 토큰 전송 모달 */}
        {showTransferModal && selectedToken && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedToken.name} ({selectedToken.symbol}) 전송
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    받는 주소
                  </label>
                  <input
                    type="text"
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    전송 수량
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="0.0"
                      step="0.0001"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">
                      {selectedToken.symbol}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    보유량:{" "}
                    {parseFloat(selectedToken.balance || "0") > 0
                      ? parseFloat(selectedToken.balance || "0").toLocaleString(
                          "ko-KR",
                          {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 6,
                          }
                        )
                      : "0"}{" "}
                    {selectedToken.symbol}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferTo("");
                    setTransferAmount("");
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={isTransferring}
                >
                  취소
                </button>
                <button
                  onClick={transferToken}
                  disabled={isTransferring || !transferTo || !transferAmount}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTransferring ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>전송 중...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>전송</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 안내 사항 */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">주의사항</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 토큰 발행 시 가스비가 소모됩니다</li>
            <li>• 토큰 심볼은 중복될 수 있으니 주의하세요</li>
            <li>• 발행된 토큰은 ERC-20 표준을 따릅니다</li>
            <li>• 현재 테스트넷에서만 사용 가능합니다</li>
            <li>• 별표(⭐)가 있는 토큰은 내가 발행한 토큰입니다</li>
            <li>• 내 잔액이 있는 토큰은 전송할 수 있습니다</li>
            <li>• 토큰 전송 시에도 가스비가 소모됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
