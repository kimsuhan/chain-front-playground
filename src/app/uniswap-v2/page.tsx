"use client";

import { useWallet } from "@/contexts/WalletContext";
import { ArrowRightLeft, ArrowDown, Settings, Info } from "lucide-react";
import { useState } from "react";

export default function UniswapV2() {
  const { isConnected: isWalletConnected } = useWallet();
  
  // 스왑 상태
  const [fromToken, setFromToken] = useState("ETH");
  const [toToken, setToToken] = useState("");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");

  // 토큰 리스트 (예시)
  const tokens = [
    { symbol: "ETH", name: "Ethereum", balance: "0.0" },
    { symbol: "USDC", name: "USD Coin", balance: "0.0" },
    { symbol: "USDT", name: "Tether", balance: "0.0" },
    { symbol: "DAI", name: "Dai Stablecoin", balance: "0.0" },
  ];

  const swapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          {/* 메인 타이틀 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent mb-4">
              언제어디서나 스왑하세요.
            </h1>
            <p className="text-gray-600 text-lg">
              탈중앙화된 토큰 거래소에서 안전하게 토큰을 교환하세요
            </p>
          </div>

          {/* 스왑 카드 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">스왑</h2>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* From Token */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">팔기</span>
                  <span className="text-sm text-gray-600">
                    잔액: {tokens.find(t => t.symbol === fromToken)?.balance || "0.0"}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    placeholder="0.0"
                    className="flex-1 bg-transparent text-2xl font-semibold outline-none"
                  />
                  <button className="flex items-center space-x-2 bg-white rounded-full px-4 py-2 border border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {fromToken?.slice(0, 1)}
                      </span>
                    </div>
                    <span className="font-medium">{fromToken}</span>
                    <ArrowDown className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* 스왑 버튼 */}
              <div className="flex justify-center">
                <button
                  onClick={swapTokens}
                  className="p-2 bg-white border-4 border-gray-100 rounded-full hover:border-gray-200 transition-colors"
                >
                  <ArrowRightLeft className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* To Token */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">구매</span>
                  <span className="text-sm text-gray-600">
                    잔액: {tokens.find(t => t.symbol === toToken)?.balance || "0.0"}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    value={toAmount}
                    onChange={(e) => setToAmount(e.target.value)}
                    placeholder="0.0"
                    className="flex-1 bg-transparent text-2xl font-semibold outline-none"
                  />
                  <button className="flex items-center space-x-2 bg-white rounded-full px-4 py-2 border border-gray-200 hover:border-gray-300 transition-colors">
                    {toToken ? (
                      <>
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {toToken?.slice(0, 1)}
                          </span>
                        </div>
                        <span className="font-medium">{toToken}</span>
                      </>
                    ) : (
                      <span className="text-gray-500">토큰 선택</span>
                    )}
                    <ArrowDown className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* 스왑 실행 버튼 */}
            <div className="mt-6">
              {!isWalletConnected ? (
                <div className="bg-gray-100 rounded-2xl p-4 text-center">
                  <p className="text-gray-600 mb-2">지갑을 연결해주세요</p>
                  <p className="text-sm text-gray-500">상단 우측의 "지갑 연결" 버튼을 클릭하세요</p>
                </div>
              ) : !toToken ? (
                <button
                  disabled
                  className="w-full bg-gray-200 text-gray-500 py-4 rounded-2xl font-semibold text-lg cursor-not-allowed"
                >
                  토큰을 선택하세요
                </button>
              ) : !fromAmount || parseFloat(fromAmount) === 0 ? (
                <button
                  disabled
                  className="w-full bg-gray-200 text-gray-500 py-4 rounded-2xl font-semibold text-lg cursor-not-allowed"
                >
                  금액을 입력하세요
                </button>
              ) : (
                <button
                  className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-4 rounded-2xl font-semibold text-lg hover:opacity-90 transition-opacity"
                >
                  스왑
                </button>
              )}
            </div>

            {/* 스왑 정보 */}
            {fromAmount && toAmount && (
              <div className="mt-4 p-4 bg-blue-50 rounded-2xl">
                <div className="flex items-center space-x-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">스왑 정보</span>
                </div>
                <div className="space-y-1 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>예상 수수료:</span>
                    <span>0.3%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>최소 수령량:</span>
                    <span>{(parseFloat(toAmount) * 0.995).toFixed(6)} {toToken}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>슬리패지 허용치:</span>
                    <span>0.5%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 안내 사항 */}
          <div className="mt-8 bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="font-semibold text-gray-900 mb-3">주의사항</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>• 스왑 시 네트워크 수수료(가스비)가 발생합니다</li>
              <li>• 토큰 가격은 실시간으로 변동될 수 있습니다</li>
              <li>• 슬리패지로 인해 예상 수령량과 다를 수 있습니다</li>
              <li>• 현재 테스트넷에서만 사용 가능합니다</li>
              <li>• 거래 전 토큰 정보를 반드시 확인하세요</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}