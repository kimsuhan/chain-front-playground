// 블록 탐색기 헤더 컴포넌트
"use client";

import { useWallet } from "@/contexts/WalletContext";
import { useSocket } from "@/hooks/useSocket";
import { checkNetworkConnection } from "@/lib/web3";
import { BarChart3, Blocks, ChevronDown, Coins, CreditCard, Grid3X3, Search, User, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  // 네트워크 연결 상태를 관리하는 state
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  // WebSocket 연결 상태
  const { isConnected: isSocketConnected } = useSocket();

  // 지갑 연결 상태
  const { isConnected: isWalletConnected, address, isConnecting, connectWallet, disconnectWallet } = useWallet();

  // Apps 드롭다운 상태
  const [isAppsOpen, setIsAppsOpen] = useState(false);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".apps-dropdown")) {
        setIsAppsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 컴포넌트가 마운트될 때 네트워크 연결 상태 확인
  useEffect(() => {
    const checkConnection = async () => {
      setIsChecking(true);
      const connected = await checkNetworkConnection();
      setIsConnected(connected);
      setIsChecking(false);
    };

    checkConnection();

    // 30초마다 연결 상태 재확인
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* 로고 및 제목 */}
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-2xl font-bold hover:text-blue-200 transition-colors flex items-center space-x-2"
            >
              <Search className="w-8 h-8" />
              <span>Test Network Block Explorer</span>
            </Link>
            <span className="text-blue-200 text-sm">Test Network</span>
          </div>

          {/* 지갑 연결 및 네트워크 상태 표시 */}
          <div className="flex items-center space-x-4">
            {/* 지갑 연결 버튼 */}
            <div className="flex items-center">
              {!isWalletConnected ? (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>연결 중...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>지갑 연결</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="font-mono text-xs">
                        {address.slice(0, 6)}...{address.slice(-4)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="text-blue-200 hover:text-white text-xs underline"
                    title="지갑 연결 해제"
                  >
                    연결 해제
                  </button>
                </div>
              )}
            </div>

            {/* 네트워크 정보 */}
            <div className="text-sm text-blue-200 space-y-1">
              <div>RPC: {process.env.RPC_URL}</div>
              <div>Chain ID: {process.env.CHAIN_ID}</div>
              <div className="flex items-center space-x-4">
                {/* RPC 연결 상태 */}
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isChecking ? "bg-yellow-400 animate-pulse" : isConnected ? "bg-green-400" : "bg-red-400"
                    }`}
                  />
                  <span>RPC: {isChecking ? "확인중" : isConnected ? "연결됨" : "연결 끊김"}</span>
                </div>

                {/* WebSocket 연결 상태 */}
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isSocketConnected ? "bg-green-400" : "bg-red-400"}`} />
                  <span>WS: {isSocketConnected ? "연결됨" : "연결 끊김"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="mt-4">
          <div className="flex space-x-6">
            <Link href="/" className="hover:text-blue-200 transition-colors font-medium flex items-center space-x-1">
              <BarChart3 className="w-4 h-4" />
              <span>대시보드</span>
            </Link>
            <Link
              href="/blocks"
              className="hover:text-blue-200 transition-colors font-medium flex items-center space-x-1"
            >
              <Blocks className="w-4 h-4" />
              <span>블록</span>
            </Link>
            <Link
              href="/transactions"
              className="hover:text-blue-200 transition-colors font-medium flex items-center space-x-1"
            >
              <CreditCard className="w-4 h-4" />
              <span>트랜잭션</span>
            </Link>
            <Link
              href="/accounts"
              className="hover:text-blue-200 transition-colors font-medium flex items-center space-x-1"
            >
              <User className="w-4 h-4" />
              <span>계정</span>
            </Link>

            {/* Apps 드롭다운 메뉴 */}
            <div className="relative apps-dropdown">
              <button
                onClick={() => setIsAppsOpen(!isAppsOpen)}
                onMouseEnter={() => setIsAppsOpen(true)}
                className="hover:text-blue-200 transition-colors font-medium flex items-center space-x-1"
              >
                <Grid3X3 className="w-4 h-4" />
                <span>Apps</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isAppsOpen ? "rotate-180" : ""}`} />
              </button>

              {/* 드롭다운 메뉴 */}
              {isAppsOpen && (
                <div
                  className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                  onMouseLeave={() => setIsAppsOpen(false)}
                >
                  <Link
                    href="/token-factory"
                    className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    onClick={() => setIsAppsOpen(false)}
                  >
                    <div className="flex items-center space-x-3">
                      <Coins className="w-4 h-4" />
                      <div>
                        <div className="font-medium">토큰 팩토리</div>
                        <div className="text-xs text-gray-500">ERC-20 토큰 발행</div>
                      </div>
                    </div>
                  </Link>

                  {/* 향후 추가될 앱들을 위한 예시 */}
                  <div className="block px-4 py-2 text-gray-400 cursor-not-allowed">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-gray-200 rounded"></div>
                      <div>
                        <div className="font-medium">더 많은 앱</div>
                        <div className="text-xs text-gray-400">곧 출시 예정</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
