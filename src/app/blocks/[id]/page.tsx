// 개별 블록 상세 페이지 - 특정 블록의 모든 정보와 트랜잭션 표시
"use client";

import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import MerkleTreeVisualization from "@/components/MerkleTreeVisualization";
import { BlockInfo, getBlockFromAPI, getTransactionsFromBlock, TransactionInfo } from "@/lib/web3";
import { Copy, CreditCard, Package, Search } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function BlockDetailPage() {
  const params = useParams();
  const blockId = params?.id as string;

  // 상태 관리
  const [block, setBlock] = useState<BlockInfo | null>(null);
  const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState<boolean>(false);

  // 한 번에 보여줄 트랜잭션 수
  const TRANSACTIONS_PREVIEW_COUNT = 10;

  // 데이터 로딩 함수
  const loadBlockData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const blockNumber = parseInt(blockId);

      if (isNaN(blockNumber)) {
        setError("올바르지 않은 블록 번호입니다.");
        return;
      }

      // 블록 정보와 트랜잭션을 동시에 가져오기
      const [blockData, transactionData] = await Promise.all([
        getBlockFromAPI(blockNumber),
        getTransactionsFromBlock(blockNumber),
      ]);

      if (!blockData) {
        setError(`블록 #${blockNumber}을 찾을 수 없습니다.`);
        return;
      }

      setBlock(blockData);
      setTransactions(transactionData);
    } catch (err) {
      console.error("블록 데이터 로딩 실패:", err);
      setError("블록 데이터를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (blockId) {
      loadBlockData();
    }
  }, [blockId]);

  // 시간 포맷팅
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return {
      full: date.toLocaleString("ko-KR"),
      relative: `${Math.floor((Date.now() - timestamp * 1000) / 1000)}초 전`,
    };
  };

  // 큰 숫자 포맷팅
  const formatNumber = (num: string) => {
    return parseFloat(num).toLocaleString();
  };

  // 해시 복사 함수
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // 간단한 피드백 (실제 프로젝트에서는 toast 등을 사용)
    alert("클립보드에 복사되었습니다!");
  };

  if (isLoading) {
    return <LoadingSpinner message={`블록 #${blockId} 정보를 불러오는 중...`} />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadBlockData} />;
  }

  if (!block) {
    return <ErrorMessage message="블록 정보를 찾을 수 없습니다." />;
  }

  const timeInfo = formatTime(block.timestamp);
  const displayedTransactions = showAllTransactions ? transactions : transactions.slice(0, TRANSACTIONS_PREVIEW_COUNT);

  return (
    <div className="space-y-6">
      {/* 블록 헤더 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
              <Package className="w-5 h-5" />
              <span>블록 #{block.number}</span>
            </h1>
            <p className="text-gray-600 mt-2">
              {timeInfo.full} ({timeInfo.relative})
            </p>
          </div>

          {/* 네비게이션 버튼 */}
          <div className="flex items-center space-x-2">
            {block.number > 0 && (
              <Link
                href={`/blocks/${block.number - 1}`}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                ← 이전 블록
              </Link>
            )}
            <Link
              href={`/blocks/${block.number + 1}`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              다음 블록 →
            </Link>
          </div>
        </div>

        {/* 블록 요약 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">트랜잭션</div>
            <div className="text-2xl font-bold text-blue-800">{block.transactionCount}</div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-medium">가스 사용률</div>
            <div className="text-2xl font-bold text-green-800">
              {((parseFloat(block.gasUsed) / parseFloat(block.gasLimit)) * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">가스 사용량</div>
            <div className="text-2xl font-bold text-purple-800">{formatNumber(block.gasUsed)}</div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-orange-600 font-medium">가스 한도</div>
            <div className="text-2xl font-bold text-orange-800">{formatNumber(block.gasLimit)}</div>
          </div>
        </div>
      </div>

      {/* 블록 상세 정보 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
          <Search className="w-6 h-6" />
          <span>블록 상세 정보</span>
        </h2>

        <div className="space-y-4">
          {/* 블록 해시 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-b border-gray-200">
            <div className="font-medium text-gray-600">블록 해시</div>
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm bg-gray-100 p-2 rounded flex-1 break-all">{block.hash}</span>
                <button
                  onClick={() => copyToClipboard(block.hash)}
                  className="bg-blue-100 text-blue-600 px-3 py-2 rounded hover:bg-blue-200 transition-colors flex-shrink-0"
                  title="복사"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 이전 블록 해시 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-b border-gray-200">
            <div className="font-medium text-gray-600">이전 블록 해시</div>
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <Link
                  href={`/blocks/${block.number - 1}`}
                  className="font-mono text-sm bg-gray-100 p-2 rounded flex-1 break-all hover:bg-gray-200 transition-colors text-blue-600"
                >
                  {block.parentHash}
                </Link>
                <button
                  onClick={() => copyToClipboard(block.parentHash)}
                  className="bg-blue-100 text-blue-600 px-3 py-2 rounded hover:bg-blue-200 transition-colors flex-shrink-0"
                  title="복사"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 마이너 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-b border-gray-200">
            <div className="font-medium text-gray-600">마이너 (채굴자)</div>
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm bg-gray-100 p-2 rounded flex-1 break-all">{block.miner}</span>
                <button
                  onClick={() => copyToClipboard(block.miner)}
                  className="bg-blue-100 text-blue-600 px-3 py-2 rounded hover:bg-blue-200 transition-colors flex-shrink-0"
                  title="복사"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 타임스탬프 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-b border-gray-200">
            <div className="font-medium text-gray-600">타임스탬프</div>
            <div className="md:col-span-2">
              <div className="space-y-1">
                <div>{timeInfo.full}</div>
                <div className="text-sm text-gray-500">
                  Unix: {block.timestamp} ({timeInfo.relative})
                </div>
              </div>
            </div>
          </div>

          {/* 가스 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3">
            <div className="font-medium text-gray-600">가스 정보</div>
            <div className="md:col-span-2">
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-500">사용량: </span>
                  <span className="font-mono">{formatNumber(block.gasUsed)}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">한도: </span>
                  <span className="font-mono">{formatNumber(block.gasLimit)}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">사용률: </span>
                  <span className="font-semibold text-blue-600">
                    {((parseFloat(block.gasUsed) / parseFloat(block.gasLimit)) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 머클트리 시각화 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <MerkleTreeVisualization transactionHashes={transactions.map((tx) => tx.hash)} title="머클트리 시각화" />
      </div>

      {/* 트랜잭션 목록 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
            <CreditCard className="w-6 h-6 mr-2" />
            <span>트랜잭션 ({transactions.length}개)</span>
          </h2>

          {transactions.length > TRANSACTIONS_PREVIEW_COUNT && (
            <button
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showAllTransactions
                ? "접기"
                : `모든 트랜잭션 보기 (+${transactions.length - TRANSACTIONS_PREVIEW_COUNT})`}
            </button>
          )}
        </div>

        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">해시</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">보내는 곳</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">받는 곳</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">금액 (ETH)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">가스 사용</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedTransactions.map((tx) => (
                  <tr key={tx.hash} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                      <Link href={`/transactions/${tx.hash}`} className="hover:text-blue-800">
                        {tx.hash.slice(0, 16)}...
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      {tx.from.slice(0, 8)}...{tx.from.slice(-6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      {tx.to ? `${tx.to.slice(0, 8)}...${tx.to.slice(-6)}` : "컨트랙트 생성"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {parseFloat(tx.value).toFixed(4)} ETH
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tx.gasUsed ? formatNumber(tx.gasUsed) : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tx.status === 1
                            ? "bg-green-100 text-green-800"
                            : tx.status === 0
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {tx.status === 1 ? "성공" : tx.status === 0 ? "실패" : "대기중"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📪</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">트랜잭션이 없습니다</h3>
            <p className="text-gray-500">이 블록에는 트랜잭션이 포함되어 있지 않습니다.</p>
          </div>
        )}
      </div>

      {/* 네비게이션 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <Link
            href="/blocks"
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← 블록 목록으로
          </Link>

          <div className="flex items-center space-x-4">
            {block.number > 0 && (
              <Link
                href={`/blocks/${block.number - 1}`}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                이전 블록 (#${block.number - 1})
              </Link>
            )}

            <Link
              href={`/blocks/${block.number + 1}`}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              다음 블록 (#${block.number + 1})
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
