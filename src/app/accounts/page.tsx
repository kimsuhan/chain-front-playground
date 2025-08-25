// 계정 검색 및 잔액 조회 페이지 - 이더리움 주소로 잔액과 트랜잭션 이력 검색
"use client";

import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getAccountBalance, getDefaultAccounts, provider } from "@/lib/web3";
import { ChartBar, Copy, DollarSign, FileText, Lightbulb, Search } from "lucide-react";
import { useState } from "react";

// 계정 정보 타입 정의
interface AccountInfo {
  address: string;
  balance: string;
  transactionCount: number;
}

export default function AccountsPage() {
  // 상태 관리
  const [searchAddress, setSearchAddress] = useState<string>("");
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // 주소 유효성 검사 함수
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // 계정 정보를 가져오는 함수
  const searchAccount = async (address: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // 주소 유효성 검사
      if (!isValidAddress(address)) {
        setError("올바른 이더리움 주소 형식이 아닙니다. (0x로 시작하는 40자리 16진수)");
        return;
      }

      // 계정 잔액과 트랜잭션 수를 동시에 가져오기
      const [balance, txCount] = await Promise.all([
        getAccountBalance(address),
        provider.getTransactionCount(address),
      ]);

      if (balance === null) {
        setError("계정 정보를 가져올 수 없습니다.");
        return;
      }

      // 계정 정보 설정
      setAccountInfo({
        address: address,
        balance: balance,
        transactionCount: txCount,
      });

      // 검색 기록에 추가 (중복 제거)
      setSearchHistory((prev) => {
        const filtered = prev.filter((addr) => addr !== address);
        return [address, ...filtered].slice(0, 5); // 최근 5개만 유지
      });
    } catch (err) {
      console.error("계정 검색 실패:", err);
      setError("계정 정보를 검색하는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 검색 버튼 클릭 핸들러
  const handleSearch = () => {
    if (searchAddress.trim()) {
      searchAccount(searchAddress.trim());
    }
  };

  // Enter 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // 검색 기록 클릭 핸들러
  const handleHistoryClick = (address: string) => {
    setSearchAddress(address);
    searchAccount(address);
  };

  // 주소를 짧게 표시하는 함수
  const formatAddress = (address: string) => {
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  // 기본 테스트 계정들
  const defaultAccounts = getDefaultAccounts();

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">계정 검색</h1>
        <p className="text-gray-600">이더리움 주소를 입력하여 잔액과 트랜잭션 정보를 확인하세요</p>
      </div>

      {/* 검색 입력 폼 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              이더리움 주소 (0x로 시작하는 42자리)
            </label>
            <div className="flex space-x-3">
              <input
                id="address"
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="0x742d35Cc6634C0532925a3b8D65C966Ccce"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleSearch}
                disabled={isLoading || !searchAddress.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  "검색 중..."
                ) : (
                  <span className="flex items-center">
                    <Search className="w-4 h-4 mr-1" />
                    검색
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 검색 기록 */}
          {searchHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">최근 검색</h3>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((address, index) => (
                  <button
                    key={index}
                    onClick={() => handleHistoryClick(address)}
                    className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg text-sm font-mono transition-colors"
                  >
                    {formatAddress(address)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 기본 테스트 계정들 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2" />
              기본 테스트 계정들
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {defaultAccounts.map((address, index) => (
                <button
                  key={index}
                  onClick={() => handleHistoryClick(address)}
                  className="bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg text-sm font-mono text-blue-700 transition-colors text-left"
                  title={address}
                >
                  Account {index}: {formatAddress(address)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoading && <LoadingSpinner message="계정 정보를 검색하는 중..." />}

      {/* 에러 메시지 */}
      {error && (
        <ErrorMessage
          message={error}
          onRetry={() => searchAddress.trim() && searchAccount(searchAddress.trim())}
        />
      )}

      {/* 계정 정보 표시 */}
      {accountInfo && !isLoading && (
        <div className="space-y-6">
          {/* 계정 요약 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <ChartBar className="w-6 h-6 mr-2" />
              계정 정보
            </h2>

            {/* 주소 표시 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">계정 주소:</span>
                <button
                  onClick={() => navigator.clipboard.writeText(accountInfo.address)}
                  className="bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200 transition-colors flex-shrink-0 flex items-center"
                  title="복사"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  복사
                </button>
              </div>
              <div className="mt-2 font-mono text-sm break-all text-gray-800">
                {accountInfo.address}
              </div>
            </div>

            {/* 잔액 및 트랜잭션 수 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-500 p-2 rounded-full">
                    <span className="text-white text-lg">
                      <DollarSign className="w-5 h-5" />
                    </span>
                  </div>
                  <div>
                    <div className="text-sm text-green-600 font-medium">잔액</div>
                    <div className="text-2xl font-bold text-green-800">
                      {parseFloat(accountInfo.balance).toFixed(6)} ETH
                    </div>
                    <div className="text-sm text-green-600">
                      ({(parseFloat(accountInfo.balance) * 1e18).toLocaleString()} Wei)
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-500 p-2 rounded-full">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-blue-600 font-medium">트랜잭션 수</div>
                    <div className="text-2xl font-bold text-blue-800">
                      {accountInfo.transactionCount.toLocaleString()}
                    </div>
                    <div className="text-sm text-blue-600">(Nonce)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 계정 활동 상태 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <ChartBar className="w-6 h-6 mr-2" />
              계정 활동
            </h3>

            <div className="space-y-4">
              {/* 잔액 상태 */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      parseFloat(accountInfo.balance) > 0 ? "bg-green-400" : "bg-gray-400"
                    }`}
                  ></span>
                  <span className="font-medium">계정 상태</span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    parseFloat(accountInfo.balance) > 0
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {parseFloat(accountInfo.balance) > 0 ? "활성" : "비어있음"}
                </span>
              </div>

              {/* 트랜잭션 활동 */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      accountInfo.transactionCount > 0 ? "bg-blue-400" : "bg-gray-400"
                    }`}
                  ></span>
                  <span className="font-medium">트랜잭션 활동</span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    accountInfo.transactionCount > 0
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {accountInfo.transactionCount > 0
                    ? `${accountInfo.transactionCount}개 트랜잭션`
                    : "트랜잭션 없음"}
                </span>
              </div>

              {/* 계정 타입 추정 */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="w-3 h-3 rounded-full bg-purple-400"></span>
                  <span className="font-medium">계정 타입</span>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  {accountInfo.transactionCount === 0 && parseFloat(accountInfo.balance) > 0
                    ? "새 계정 (받기만 함)"
                    : accountInfo.transactionCount > 0
                      ? "활성 계정"
                      : "미사용 계정"}
                </span>
              </div>
            </div>
          </div>

          {/* 계정 분석 */}
          {parseFloat(accountInfo.balance) > 0 && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center space-x-2">
                <Lightbulb className="w-5 h-5" />
                <span>계정 분석</span>
              </h3>
              <div className="space-y-2 text-sm text-yellow-700">
                {parseFloat(accountInfo.balance) >= 10 && (
                  <div>
                    • 이 계정은 상당한 양의 ETH를 보유하고 있습니다 (
                    {parseFloat(accountInfo.balance).toFixed(2)} ETH)
                  </div>
                )}
                {accountInfo.transactionCount === 0 && parseFloat(accountInfo.balance) > 0 && (
                  <div>• 이 계정은 ETH를 받았지만 아직 트랜잭션을 보낸 적이 없습니다</div>
                )}
                {accountInfo.transactionCount > 10 && (
                  <div>
                    • 이 계정은 활발하게 사용되고 있습니다 ({accountInfo.transactionCount}개
                    트랜잭션)
                  </div>
                )}
                {parseFloat(accountInfo.balance) === 0 && accountInfo.transactionCount > 0 && (
                  <div>• 이 계정은 모든 ETH를 소진했거나 다른 곳으로 전송했습니다</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 도움말 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center space-x-2">
          <Lightbulb className="w-5 h-5" />
          <span>계정 검색 사용법</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <h4 className="font-medium mb-2">검색 방법:</h4>
            <ul className="space-y-1">
              <li>• 0x로 시작하는 42자리 이더리움 주소를 입력하세요</li>
              <li>• 기본 테스트 계정들을 클릭해서 테스트해보세요</li>
              <li>• 최근 검색한 주소들은 자동으로 저장됩니다</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">표시 정보:</h4>
            <ul className="space-y-1">
              <li>
                • <strong>잔액</strong>: 계정이 보유한 ETH 양
              </li>
              <li>
                • <strong>트랜잭션 수</strong>: 보낸 트랜잭션의 총 개수 (Nonce)
              </li>
              <li>
                • <strong>계정 상태</strong>: 활성/비활성 상태
              </li>
              <li>
                • <strong>계정 타입</strong>: 사용 패턴에 따른 분류
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
