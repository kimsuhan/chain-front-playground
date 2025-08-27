"use client";

import { TokenInfo, getTokensFromAPI } from "@/lib/web3";
import { ChevronDown, Coins, Loader, Search } from "lucide-react";
import { useEffect, useState } from "react";

interface TokenSelectorProps {
  selectedToken?: TokenInfo;
  onTokenSelect: (token: TokenInfo) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function TokenSelector({
  selectedToken,
  onTokenSelect,
  disabled = false,
  placeholder = "토큰을 선택하세요"
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadTokens();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTokens(tokens);
    } else {
      const filtered = tokens.filter(
        token =>
          token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTokens(filtered);
    }
  }, [searchQuery, tokens]);

  const loadTokens = async () => {
    setLoading(true);
    try {
      const { tokens: tokenList } = await getTokensFromAPI(100, 0);
      setTokens(tokenList);
      setFilteredTokens(tokenList);
    } catch (error) {
      console.error("토큰 목록 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSelect = (token: TokenInfo) => {
    onTokenSelect(token);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {selectedToken ? (
            <>
              <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                <Coins className="h-3 w-3 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {selectedToken.name}
                </div>
                <div className="text-xs text-gray-500">
                  {selectedToken.symbol}
                </div>
              </div>
            </>
          ) : (
            <div className="text-gray-500 text-sm">{placeholder}</div>
          )}
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="토큰 이름, 심볼 또는 주소로 검색..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader className="w-5 h-5 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-gray-500">토큰 로딩중...</span>
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">
                {searchQuery.trim() !== "" ? "검색 결과가 없습니다" : "사용 가능한 토큰이 없습니다"}
              </div>
            ) : (
              <div className="py-1">
                {filteredTokens.map((token, index) => (
                  <button
                    key={index}
                    onClick={() => handleTokenSelect(token)}
                    className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Coins className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {token.name}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                          {token.symbol}
                        </span>
                        <span className="text-xs text-gray-500 font-mono truncate">
                          {token.address.slice(0, 8)}...{token.address.slice(-6)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}