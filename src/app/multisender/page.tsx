"use client";

import { useWallet } from "@/contexts/WalletContext";
import { ethers } from "ethers";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  FileText,
  Loader,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import TokenSelector from "@/components/TokenSelector";
import { TokenInfo } from "@/lib/web3";

export const MULTI_SENDER_ADDRESS = '0x14c4126A4d31C0B15ABF1572fFD06eBc0Ac672b4';
export const MULTI_SENDER_ABI = [
  {
    inputs: [],
    name: 'EnforcedPause',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ExpectedPause',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidInitialization',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NotInitializing',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'OwnableInvalidOwner',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'OwnableUnauthorizedAccount',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint64',
        name: 'version',
        type: 'uint64',
      },
    ],
    name: 'Initialized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'Paused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address[]',
        name: 'recipients',
        type: 'address[]',
      },
      {
        indexed: false,
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]',
      },
    ],
    name: 'SendMainTokens',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address[]',
        name: 'recipients',
        type: 'address[]',
      },
      {
        indexed: false,
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]',
      },
    ],
    name: 'SendTokens',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'Unpaused',
    type: 'event',
  },
  {
    inputs: [],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: 'recipients',
        type: 'address[]',
      },
      {
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]',
      },
    ],
    name: 'sendMainTokens',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        internalType: 'address[]',
        name: 'recipients',
        type: 'address[]',
      },
      {
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]',
      },
    ],
    name: 'sendTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
];

interface Recipient {
  id: string;
  address: string;
  amount: string;
}

interface ToastNotification {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
  duration?: number;
}

export default function MultiSender() {
  const { isConnected: isWalletConnected, address: walletAddress } = useWallet();

  const [tokenAddress, setTokenAddress] = useState("");
  const [selectedToken, setSelectedToken] = useState<TokenInfo | undefined>();
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: "1", address: "", amount: "" },
  ]);
  const [isETH, setIsETH] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [csvInput, setCsvInput] = useState("");
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [ethBalance, setEthBalance] = useState<string>("0");
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [tokenSymbol, setTokenSymbol] = useState<string>("TOKEN");
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [networkMismatch, setNetworkMismatch] = useState(false);

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

  const loadETHBalance = async () => {
    if (!isWalletConnected || !walletAddress) return;

    try {
      // 먼저 MetaMask의 현재 네트워크 확인
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const targetChainId = process.env.NEXT_PUBLIC_CHAIN_ID || "69923";
      
      console.log("=== 네트워크 디버깅 ===");
      console.log("현재 MetaMask 네트워크 chainId:", network.chainId);
      console.log("현재 MetaMask 네트워크 chainId (string):", network.chainId.toString());
      console.log("현재 MetaMask 네트워크 chainId (number):", Number(network.chainId));
      console.log("목표 네트워크 (env):", targetChainId);
      console.log("목표 네트워크 (env 타입):", typeof targetChainId);
      console.log("NEXT_PUBLIC_CHAIN_ID env 직접:", process.env.NEXT_PUBLIC_CHAIN_ID);
      console.log("비교 결과:", network.chainId.toString() === targetChainId);
      console.log("비교 결과 (Number):", Number(network.chainId) === Number(targetChainId));

      // 네트워크가 다르면 사용자에게 알림 (Number로 비교)
      if (Number(network.chainId) !== Number(targetChainId)) {
        console.warn(`네트워크 불일치! 현재: ${network.chainId}, 목표: ${targetChainId}`);
        setNetworkMismatch(true);
        setEthBalance("0");
        return;
      }

      setNetworkMismatch(false);

      const balance = await provider.getBalance(walletAddress);
      setEthBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error("ETH 잔액 조회 실패:", error);
      setEthBalance("0");
    }
  };

  const loadTokenBalance = async (tokenAddr: string) => {
    if (!isWalletConnected || !walletAddress || !tokenAddr.trim()) {
      setTokenBalance("0");
      setTokenSymbol("TOKEN");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const targetChainId = process.env.NEXT_PUBLIC_CHAIN_ID || "69923";

      // 네트워크 확인 (Number로 비교)
      if (Number(network.chainId) !== Number(targetChainId)) {
        console.warn(`토큰 잔액 조회 - 네트워크 불일치! 현재: ${network.chainId}, 목표: ${targetChainId}`);
        setNetworkMismatch(true);
        setTokenBalance("0");
        setTokenSymbol("TOKEN");
        return;
      }

      setNetworkMismatch(false);

      const tokenContract = new ethers.Contract(tokenAddr, ERC20_ABI, provider);
      
      const [balance, symbol] = await Promise.all([
        tokenContract.balanceOf(walletAddress),
        tokenContract.symbol(),
      ]);

      setTokenBalance(ethers.formatEther(balance));
      setTokenSymbol(symbol);
    } catch (error) {
      console.error("토큰 잔액 조회 실패:", error);
      setTokenBalance("0");
      setTokenSymbol("TOKEN");
    }
  };

  const refreshBalances = async () => {
    setIsLoadingBalance(true);
    await loadETHBalance();
    if (!isETH && tokenAddress.trim()) {
      await loadTokenBalance(tokenAddress);
    }
    setIsLoadingBalance(false);
  };

  const switchNetwork = async () => {
    const targetChainId = process.env.NEXT_PUBLIC_CHAIN_ID || "69923";
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://ily.blockgateway.net";
    
    try {
      // 네트워크 변경 시도
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${parseInt(targetChainId).toString(16)}` }],
      });
      
      showToast("success", "네트워크 변경 완료", "네트워크가 성공적으로 변경되었습니다.");
      
      // 잔액 다시 로드
      setTimeout(() => {
        refreshBalances();
      }, 1000);
      
    } catch (error: any) {
      // 네트워크가 추가되지 않은 경우 추가 시도
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${parseInt(targetChainId).toString(16)}`,
                chainName: 'Custom Network',
                rpcUrls: [rpcUrl],
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                blockExplorerUrls: null,
              },
            ],
          });
          
          showToast("success", "네트워크 추가 완료", "새로운 네트워크가 추가되고 변경되었습니다.");
          
          // 잔액 다시 로드
          setTimeout(() => {
            refreshBalances();
          }, 1000);
          
        } catch (addError) {
          showToast("error", "네트워크 추가 실패", "네트워크 추가에 실패했습니다.");
          console.error("네트워크 추가 실패:", addError);
        }
      } else {
        showToast("error", "네트워크 변경 실패", "네트워크 변경이 취소되었거나 실패했습니다.");
        console.error("네트워크 변경 실패:", error);
      }
    }
  };

  useEffect(() => {
    if (isWalletConnected && walletAddress) {
      loadETHBalance();
    }
  }, [isWalletConnected, walletAddress]);

  useEffect(() => {
    if (!isETH && (tokenAddress.trim() || selectedToken)) {
      const addressToUse = selectedToken ? selectedToken.address : tokenAddress;
      if (addressToUse) {
        loadTokenBalance(addressToUse);
        if (selectedToken) {
          setTokenSymbol(selectedToken.symbol);
        }
      }
    } else if (isETH) {
      setTokenBalance("0");
      setTokenSymbol("TOKEN");
    }
  }, [isETH, tokenAddress, selectedToken, isWalletConnected, walletAddress]);

  const handleTokenSelect = (token: TokenInfo) => {
    setSelectedToken(token);
    setTokenAddress(token.address);
  };

  const addRecipient = () => {
    const newId = Date.now().toString();
    setRecipients([...recipients, { id: newId, address: "", amount: "" }]);
  };

  const removeRecipient = (id: string) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((r) => r.id !== id));
    }
  };

  const updateRecipient = (id: string, field: "address" | "amount", value: string) => {
    setRecipients(
      recipients.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const parseCSV = () => {
    try {
      const lines = csvInput.trim().split("\n");
      const newRecipients: Recipient[] = [];

      lines.forEach((line, index) => {
        const [address, amount] = line.split(",").map((s) => s.trim());
        if (address && amount) {
          newRecipients.push({
            id: `csv-${index}`,
            address,
            amount,
          });
        }
      });

      if (newRecipients.length > 0) {
        setRecipients(newRecipients);
        showToast("success", "CSV 파싱 완료", `${newRecipients.length}개의 수신자가 추가되었습니다.`);
        setShowCsvModal(false);
        setCsvInput("");
      } else {
        showToast("error", "CSV 파싱 실패", "올바른 형식의 데이터를 입력해주세요.");
      }
    } catch (error) {
      showToast("error", "CSV 파싱 실패", "CSV 형식이 올바르지 않습니다.");
    }
  };

  const getTotalAmount = () => {
    return recipients.reduce((total, recipient) => {
      const amount = parseFloat(recipient.amount) || 0;
      return total + amount;
    }, 0);
  };

  const sendTokens = async () => {
    if (!isWalletConnected || !walletAddress) {
      showToast("error", "지갑 연결", "지갑을 먼저 연결해주세요.");
      return;
    }

    const validRecipients = recipients.filter(
      (r) => r.address.trim() && r.amount.trim() && parseFloat(r.amount) > 0
    );

    if (validRecipients.length === 0) {
      showToast("error", "입력 확인", "유효한 수신자 정보를 입력해주세요.");
      return;
    }

    if (!isETH && !tokenAddress.trim() && !selectedToken) {
      showToast("error", "토큰 선택", "토큰을 선택해주세요.");
      return;
    }

    setIsSending(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const multiSenderContract = new ethers.Contract(
        MULTI_SENDER_ADDRESS,
        MULTI_SENDER_ABI,
        signer
      );

      const addresses = validRecipients.map((r) => r.address.trim());
      const amounts = validRecipients.map((r) => ethers.parseEther(r.amount.trim()));

      let tx;

      if (isETH) {
        const totalETH = amounts.reduce((sum, amount) => sum + amount, 0n);
        tx = await multiSenderContract.sendMainTokens(addresses, amounts, {
          value: totalETH,
        });
      } else {
        const finalTokenAddress = selectedToken ? selectedToken.address : tokenAddress;
        const tokenContract = new ethers.Contract(finalTokenAddress, ERC20_ABI, signer);
        
        const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0n);
        const allowance = await tokenContract.allowance(walletAddress, MULTI_SENDER_ADDRESS);
        
        if (allowance < totalAmount) {
          showToast("info", "토큰 승인", "토큰 사용 승인 중...");
          const approveTx = await tokenContract.approve(MULTI_SENDER_ADDRESS, totalAmount);
          await approveTx.wait();
        }

        tx = await multiSenderContract.sendTokens(finalTokenAddress, addresses, amounts);
      }

      showToast(
        "info",
        "트랜잭션 전송",
        `트랜잭션이 블록체인에 전송되었습니다. 해시: ${tx.hash.slice(0, 10)}...`,
        8000
      );

      await tx.wait();

      showToast(
        "success",
        "전송 완료",
        `${validRecipients.length}명에게 ${isETH ? "ETH" : "토큰"} 전송이 완료되었습니다!`
      );

      setRecipients([{ id: "1", address: "", amount: "" }]);
    } catch (error: any) {
      console.error("MultiSender 전송 실패:", error);
      showToast(
        "error",
        "전송 실패",
        error.message || "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
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
            <Send className="w-8 h-8 text-blue-600" />
            <span>멀티 센더</span>
          </h1>
          <p className="text-gray-600">
            여러 주소에 ETH나 토큰을 한 번에 전송하세요
          </p>
        </div>

        {/* 잔액 표시 카드 */}
        {isWalletConnected && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                <span>내 잔액</span>
              </h2>
              <button
                onClick={refreshBalances}
                disabled={isLoadingBalance}
                className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                title="잔액 새로고침"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingBalance ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ETH 잔액 */}
              <div className={`p-4 rounded-lg border-2 transition-colors ${
                isETH ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">ETH 잔액</div>
                    <div className="text-lg font-bold text-gray-900">
                      {isLoadingBalance ? (
                        <div className="flex items-center space-x-2">
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>로딩중...</span>
                        </div>
                      ) : (
                        `${parseFloat(ethBalance).toLocaleString('ko-KR', { 
                          minimumFractionDigits: 0, 
                          maximumFractionDigits: 6 
                        })} ETH`
                      )}
                    </div>
                  </div>
                  {isETH && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>

              {/* 토큰 잔액 */}
              <div className={`p-4 rounded-lg border-2 transition-colors ${
                !isETH ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">토큰 잔액</div>
                    <div className="text-lg font-bold text-gray-900">
                      {!isETH && (tokenAddress.trim() || selectedToken) ? (
                        isLoadingBalance ? (
                          <div className="flex items-center space-x-2">
                            <Loader className="w-4 h-4 animate-spin" />
                            <span>로딩중...</span>
                          </div>
                        ) : (
                          `${parseFloat(tokenBalance).toLocaleString('ko-KR', { 
                            minimumFractionDigits: 0, 
                            maximumFractionDigits: 6 
                          })} ${tokenSymbol}`
                        )
                      ) : (
                        <span className="text-gray-400">토큰을 선택하세요</span>
                      )}
                    </div>
                  </div>
                  {!isETH && (tokenAddress.trim() || selectedToken) && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>
            </div>

            {/* 네트워크 불일치 경고 */}
            {networkMismatch && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <div>
                      <div className="text-sm font-medium text-orange-800">
                        네트워크 불일치
                      </div>
                      <div className="text-sm text-orange-700 mt-1">
                        MetaMask가 다른 네트워크에 연결되어 있습니다. 
                        Chain ID {process.env.NEXT_PUBLIC_CHAIN_ID}로 변경이 필요합니다.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={switchNetwork}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                  >
                    네트워크 변경
                  </button>
                </div>
              </div>
            )}

            {/* 잔액 부족 경고 */}
            {isWalletConnected && !networkMismatch && (
              <div className="mt-4">
                {isETH && parseFloat(ethBalance) === 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-800">
                        ETH 잔액이 부족합니다. 테스트넷에서 ETH를 받아주세요.
                      </span>
                    </div>
                  </div>
                )}
                {!isETH && (tokenAddress.trim() || selectedToken) && parseFloat(tokenBalance) === 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-800">
                        {tokenSymbol} 토큰 잔액이 부족합니다.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          {!isWalletConnected && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
              <p className="text-yellow-800">
                멀티 센더를 사용하려면 상단 우측의 &quot;지갑 연결&quot; 버튼을 클릭하세요
              </p>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              전송할 자산 유형
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={isETH}
                  onChange={() => setIsETH(true)}
                  className="mr-2"
                  disabled={!isWalletConnected}
                />
                <span>ETH (메인 토큰)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!isETH}
                  onChange={() => setIsETH(false)}
                  className="mr-2"
                  disabled={!isWalletConnected}
                />
                <span>ERC-20 토큰</span>
              </label>
            </div>
          </div>

          {!isETH && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                토큰 선택
              </label>
              <TokenSelector
                selectedToken={selectedToken}
                onTokenSelect={handleTokenSelect}
                disabled={!isWalletConnected}
                placeholder="토큰팩토리에서 발행된 토큰을 선택하세요"
              />
              <p className="text-xs text-gray-500 mt-1">
                토큰팩토리에서 발행된 토큰 목록에서 선택할 수 있습니다
              </p>
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">수신자 목록</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowCsvModal(true)}
                  className="bg-green-100 text-green-700 px-3 py-2 rounded-lg hover:bg-green-200 transition-colors flex items-center space-x-2"
                  disabled={!isWalletConnected}
                >
                  <Upload className="w-4 h-4" />
                  <span>CSV 업로드</span>
                </button>
                <button
                  onClick={addRecipient}
                  className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors flex items-center space-x-2"
                  disabled={!isWalletConnected}
                >
                  <Plus className="w-4 h-4" />
                  <span>수신자 추가</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {recipients.map((recipient, index) => (
                <div key={recipient.id} className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 text-center text-sm text-gray-500">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    placeholder="받는 주소 (0x...)"
                    value={recipient.address}
                    onChange={(e) => updateRecipient(recipient.id, "address", e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!isWalletConnected}
                  />
                  <input
                    type="number"
                    placeholder="수량"
                    value={recipient.amount}
                    onChange={(e) => updateRecipient(recipient.id, "amount", e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.0001"
                    disabled={!isWalletConnected}
                  />
                  {recipients.length > 1 && (
                    <button
                      onClick={() => removeRecipient(recipient.id)}
                      className="text-red-500 hover:text-red-700 p-2"
                      disabled={!isWalletConnected}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">총 전송량:</span>
              <span className="text-lg font-bold text-blue-600">
                {getTotalAmount().toLocaleString()} {isETH ? "ETH" : "토큰"}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {recipients.filter(r => r.address.trim() && r.amount.trim()).length}명의 유효한 수신자
            </div>
          </div>

          <button
            onClick={sendTokens}
            disabled={!isWalletConnected || isSending || recipients.length === 0}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>전송 중...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>일괄 전송</span>
              </>
            )}
          </button>
        </div>

        {showCsvModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">CSV 데이터 입력</h3>
                <button
                  onClick={() => setShowCsvModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">CSV 형식:</p>
                    <p>각 줄에 주소,수량 형식으로 입력하세요.</p>
                    <p className="mt-2 font-mono text-xs bg-white px-2 py-1 rounded">
                      예시:<br/>
                      0x1234...abcd,10.5<br/>
                      0x5678...efgh,25.0
                    </p>
                  </div>
                </div>
              </div>

              <textarea
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder="주소,수량&#10;0x1234567890123456789012345678901234567890,10.5&#10;0x9876543210987654321098765432109876543210,25.0"
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />

              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => setShowCsvModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={parseCSV}
                  disabled={!csvInput.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  파싱하기
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">주의사항</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• MultiSender 사용 시 가스비가 소모됩니다</li>
            <li>• ERC-20 토큰 전송 시 먼저 토큰 승인(approve)이 필요할 수 있습니다</li>
            <li>• 대량 전송 시 가스 한도를 초과할 수 있으니 적절히 나누어 전송하세요</li>
            <li>• 주소와 수량을 정확히 확인한 후 전송하세요</li>
            <li>• CSV 업로드 시 주소,수량 형식으로 입력해주세요</li>
            <li>• 현재 테스트넷에서만 사용 가능합니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}