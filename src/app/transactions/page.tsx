// 트랜잭션 목록 페이지 - 최신 트랜잭션들을 페이지네이션과 함께 표시
"use client";

import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { TransactionInfo } from "@/lib/web3";
import { CreditCard, Lightbulb, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function TransactionsPage() {
  // 상태 관리
  const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);

  // 페이지당 표시할 트랜잭션 수
  const TRANSACTIONS_PER_PAGE = 25;

  // 트랜잭션 데이터를 API에서 불러오는 함수
  const loadTransactions = async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const offset = (page - 1) * TRANSACTIONS_PER_PAGE;
      const limit = TRANSACTIONS_PER_PAGE;

      // API에서 트랜잭션 데이터 가져오기
      const response = await fetch(
        `${process.env.API_URL || "http://localhost:4000"}/block/transactions?limit=${limit}&offset=${offset}`
      );

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const data = await response.json();

      // API 응답에서 data와 total 추출
      const transactionsData = data.data || [];
      const totalCount = data.total || 0;

      // API 데이터를 TransactionInfo 형태로 변환
      const formattedTransactions: TransactionInfo[] = transactionsData.map((tx: any) => ({
        hash: tx.hash,
        blockNumber: tx.blockNumber,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice,
        status: tx.status,
        timestamp: tx.timestamp,
        nonce: tx.nonce,
        transactionIndex: tx.transactionIndex,
      }));

      setTransactions(formattedTransactions);
      setTotalTransactions(totalCount);
    } catch (err) {
      console.error("트랜잭션 데이터 로딩 실패:", err);
      setError("트랜잭션 데이터를 불러오는데 실패했습니다. API 서버 연결 상태를 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트가 처음 렌더링될 때 데이터 로드
  useEffect(() => {
    loadTransactions(currentPage);
  }, [currentPage]);

  // 페이지 변경 함수
  const handlePageChange = (newPage: number) => {
    const totalPages = Math.ceil(totalTransactions / TRANSACTIONS_PER_PAGE);
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // 시간을 읽기 쉬운 형태로 변환
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "-";
    return new Date(timestamp * 1000).toLocaleString("ko-KR");
  };

  // 해시를 짧게 표시
  const formatHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  // 주소를 짧게 표시
  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  // ETH 값 포맷팅
  const formatEther = (value: string) => {
    const num = parseFloat(value);
    return num === 0 ? "0" : num.toFixed(4);
  };

  // 가스 값 포맷팅
  const formatGas = (gas?: string) => {
    if (!gas) return "-";
    return parseFloat(gas).toLocaleString();
  };

  if (isLoading) {
    return <LoadingSpinner message="트랜잭션 목록을 불러오는 중..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={() => loadTransactions(currentPage)} />;
  }

  const totalPages = Math.ceil(totalTransactions / TRANSACTIONS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <CreditCard className="w-6 h-6 mr-2" />
            트랜잭션 목록
          </h1>
          <p className="text-gray-600 mt-2">
            총 {totalTransactions.toLocaleString()}개의 트랜잭션 (페이지 {currentPage} / {totalPages})
          </p>
        </div>

        {/* 새로고침 버튼 */}
        <button
          onClick={() => loadTransactions(currentPage)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>새로고침</span>
        </button>
      </div>

      {/* 트랜잭션 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">총 트랜잭션</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{totalTransactions.toLocaleString()}</div>
          <div className="text-sm text-gray-500 mt-1">API에서 조회</div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">현재 페이지</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{transactions.length}</div>
          <div className="text-sm text-gray-500 mt-1">표시 중인 트랜잭션</div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">성공한 트랜잭션</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">
            {transactions.filter((tx) => tx.status === 1).length}
          </div>
          <div className="text-sm text-gray-500 mt-1">현재 페이지 기준</div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">총 전송량</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {transactions.reduce((total, tx) => total + parseFloat(tx.value), 0).toFixed(2)} ETH
          </div>
          <div className="text-sm text-gray-500 mt-1">현재 페이지 기준</div>
        </div>
      </div>

      {/* 트랜잭션 목록 테이블 */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  트랜잭션 해시
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">블록</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  보내는 곳
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  받는 곳
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  금액 (ETH)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  가스 사용
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시간</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((tx) => (
                <tr key={tx.hash} className="hover:bg-gray-50 transition-colors">
                  {/* 트랜잭션 해시 */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/transactions/${tx.hash}`}
                      className="text-blue-600 hover:text-blue-800 font-medium font-mono text-sm"
                    >
                      {formatHash(tx.hash)}
                    </Link>
                  </td>

                  {/* 블록 번호 */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/blocks/${tx.blockNumber}`} className="text-gray-600 hover:text-blue-600 font-medium">
                      #{tx.blockNumber}
                    </Link>
                  </td>

                  {/* 보내는 주소 */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                    <span className="cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors" title={tx.from}>
                      {formatAddress(tx.from)}
                    </span>
                  </td>

                  {/* 받는 주소 */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                    {tx.to ? (
                      <span className="cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors" title={tx.to}>
                        {formatAddress(tx.to)}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">컨트랙트 생성</span>
                    )}
                  </td>

                  {/* 전송 금액 */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center">
                      <span className={`font-medium ${parseFloat(tx.value) > 0 ? "text-green-600" : "text-gray-600"}`}>
                        {formatEther(tx.value)} ETH
                      </span>
                    </div>
                  </td>

                  {/* 가스 사용량 */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatGas(tx.gasUsed)}</td>

                  {/* 트랜잭션 상태 */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        tx.status === 1
                          ? "bg-green-100 text-green-800"
                          : tx.status === 0
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {tx.status === 1 ? "✓ 성공" : tx.status === 0 ? "✗ 실패" : "⏳ 대기중"}
                    </span>
                  </td>

                  {/* 시간 */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>{formatTime(tx.timestamp)}</div>
                      {tx.timestamp && (
                        <div className="text-xs text-gray-400">
                          ({Math.floor((Date.now() - tx.timestamp * 1000) / 1000)}초 전)
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 빈 상태 */}
        {transactions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📪</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">트랜잭션이 없습니다</h3>
            <p className="text-gray-500">아직 생성된 트랜잭션이 없거나 데이터를 불러올 수 없습니다.</p>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              총 {totalTransactions.toLocaleString()}개 트랜잭션 중{" "}
              <span className="font-medium">
                {(currentPage - 1) * TRANSACTIONS_PER_PAGE + 1}-
                {Math.min(currentPage * TRANSACTIONS_PER_PAGE, totalTransactions)}
              </span>
              번째 표시
            </div>

            <div className="flex items-center space-x-2">
              {/* 이전 페이지 버튼 */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                이전
              </button>

              {/* 페이지 번호들 */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  if (pageNum > totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        pageNum === currentPage
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* 다음 페이지 버튼 */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === totalPages
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

      {/* 도움말 */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center space-x-1">
          <Lightbulb className="w-4 h-4" />
          <span>트랜잭션 이해하기</span>
        </h3>
        <ul className="text-sm text-green-700 space-y-1">
          <li>
            • <strong>트랜잭션 해시</strong>: 각 트랜잭션의 고유 식별자입니다
          </li>
          <li>
            • <strong>보내는 곳/받는 곳</strong>: 이더를 보내는 주소와 받는 주소입니다
          </li>
          <li>
            • <strong>가스 사용</strong>: 트랜잭션 처리에 사용된 가스 양입니다
          </li>
          <li>
            • <strong>상태</strong>: ✓ 성공 = 정상 처리, ✗ 실패 = 처리 실패, ⏳ 대기중 = 아직 처리 중
          </li>
          <li>
            • <strong>컨트랙트 생성</strong>: 새로운 스마트 컨트랙트가 배포된 트랜잭션입니다
          </li>
        </ul>
      </div>
    </div>
  );
}
