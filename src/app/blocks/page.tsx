// 블록 목록 페이지 - 모든 블록을 페이지네이션과 함께 표시
"use client";

import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useSocket } from "@/hooks/useSocket";
import { BlockInfo, getBlocksFromAPI } from "@/lib/web3";
import { Blocks, Lightbulb, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function BlocksPage() {
  // 상태 관리
  const [blocks, setBlocks] = useState<BlockInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalBlocks, setTotalBlocks] = useState<number>(0);

  // Socket 연결
  const { lastBlocks } = useSocket();

  // 새로 추가된 블록 추적 (애니메이션용)
  const [newBlockNumbers, setNewBlockNumbers] = useState<Set<number>>(new Set());

  // 페이지당 표시할 블록 수
  const BLOCKS_PER_PAGE = 20;

  // 데이터를 불러오는 함수
  const loadBlocks = async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      // API에서 블록 정보 가져오기
      const offset = (page - 1) * BLOCKS_PER_PAGE;
      const { blocks, total } = await getBlocksFromAPI(BLOCKS_PER_PAGE, offset);

      // API에서 받은 total 값 사용
      setTotalBlocks(total);

      if (blocks.length === 0) {
        // 첫 페이지가 아닌데 블록이 없다면 첫 페이지로 이동
        if (page > 1 && total > 0) {
          setCurrentPage(1);
          return;
        }
        setBlocks([]);
        return;
      }

      // 블록 번호 순으로 정렬 (최신 블록 먼저)
      blocks.sort((a, b) => b.number - a.number);

      setBlocks(blocks);
    } catch (err) {
      console.error("블록 데이터 로딩 실패:", err);
      setError("블록 데이터를 불러오는데 실패했습니다. API 서버 연결 상태를 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트가 처음 렌더링될 때 데이터 로드
  useEffect(() => {
    loadBlocks(currentPage);
  }, [currentPage]);

  // 새 블록들이 도착했을 때 첫 페이지라면 블록 목록에 추가
  useEffect(() => {
    if (lastBlocks && lastBlocks.length > 0 && currentPage === 1) {
      console.log("새 블록들 감지, 목록에 추가:", lastBlocks);

      setBlocks((prevBlocks) => {
        // 기존 블록들과 새 블록들을 합치고 중복 제거
        const allBlocks = [...lastBlocks, ...prevBlocks];
        const uniqueBlocks = allBlocks.filter((block, index, self) => 
          index === self.findIndex(b => b.number === block.number)
        );
        
        // 블록 번호 기준으로 내림차순 정렬하고 최대 BLOCKS_PER_PAGE 개만 유지
        const sortedBlocks = uniqueBlocks
          .sort((a, b) => b.number - a.number)
          .slice(0, BLOCKS_PER_PAGE);

        // 새 블록 애니메이션을 위해 추가
        const newNumbers = new Set(lastBlocks.map(block => block.number));
        setNewBlockNumbers((prev) => new Set([...prev, ...newNumbers]));

        // 3초 후 애니메이션 제거
        setTimeout(() => {
          setNewBlockNumbers((prev) => {
            const next = new Set(prev);
            lastBlocks.forEach(block => next.delete(block.number));
            return next;
          });
        }, 3000);

        return sortedBlocks;
      });

      // 총 블록 수 업데이트 (가장 최신 블록 기준)
      const latestBlock = lastBlocks[0];
      setTotalBlocks((prev) => Math.max(prev, latestBlock.number + 1));
    }
  }, [lastBlocks, currentPage]);

  // 페이지 변경 함수
  const handlePageChange = (newPage: number) => {
    const totalPages = Math.ceil(totalBlocks / BLOCKS_PER_PAGE);
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // 총 페이지 수 계산
  const totalPages = Math.ceil(totalBlocks / BLOCKS_PER_PAGE);

  // 시간을 읽기 쉬운 형태로 변환
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString("ko-KR");
  };

  // 해시를 짧게 표시 (처음 10자 + ... + 마지막 10자)
  const formatHash = (hash: string) => {
    if (hash.length <= 20) return hash;
    return `${hash.slice(0, 10)}...${hash.slice(-10)}`;
  };

  // 큰 숫자 포맷팅
  const formatNumber = (num: string) => {
    return parseFloat(num).toLocaleString();
  };

  if (isLoading) {
    return <LoadingSpinner message="블록 목록을 불러오는 중..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={() => loadBlocks(currentPage)} />;
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <Blocks className="w-6 h-6 mr-2" />
            블록 목록
          </h1>
          <p className="text-gray-600 mt-2">
            총 {totalBlocks.toLocaleString()}개의 블록 (페이지 {currentPage} / {totalPages})
          </p>
        </div>

        {/* 새로고침 버튼 */}
        <button
          onClick={() => loadBlocks(currentPage)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>새로고침</span>
        </button>
      </div>

      {/* 블록 목록 테이블 */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  블록 번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  블록 해시
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  트랜잭션 수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  마이너
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  가스 사용량
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생성 시간
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {blocks.map((block) => (
                <tr
                  key={block.number}
                  className={`hover:bg-gray-50 transition-all duration-500 ${
                    newBlockNumbers.has(block.number) ? "bg-green-50 border-l-4 border-green-500 animate-pulse" : ""
                  }`}
                >
                  {/* 블록 번호 (클릭하면 상세 페이지로) */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/blocks/${block.number}`}
                      className="text-blue-600 hover:text-blue-800 font-medium text-lg"
                    >
                      #{block.number}
                    </Link>
                  </td>

                  {/* 블록 해시 */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                    <span
                      className="cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors"
                      title={`전체 해시: ${block.hash}`}
                    >
                      {formatHash(block.hash)}
                    </span>
                  </td>

                  {/* 트랜잭션 수 */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        {block.transactionCount}개
                      </span>
                    </div>
                  </td>

                  {/* 마이너 */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                    <span
                      className="cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors"
                      title={`마이너 주소: ${block.miner}`}
                    >
                      {formatHash(block.miner)}
                    </span>
                  </td>

                  {/* 가스 사용량 */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="text-right">
                      <div className="font-medium">{formatNumber(block.gasUsed)}</div>
                      <div className="text-xs text-gray-500">/ {formatNumber(block.gasLimit)}</div>
                    </div>
                  </td>

                  {/* 생성 시간 */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>{formatTime(block.timestamp)}</div>
                      <div className="text-xs text-gray-400">
                        ({Math.floor((Date.now() - block.timestamp * 1000) / 1000)}초 전)
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 빈 상태 */}
        {blocks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📪</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">블록이 없습니다</h3>
            <p className="text-gray-500">아직 생성된 블록이 없거나 데이터를 불러올 수 없습니다.</p>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              총 {totalBlocks.toLocaleString()}개 블록 중{" "}
              <span className="font-medium">
                {(currentPage - 1) * BLOCKS_PER_PAGE + 1}-{Math.min(currentPage * BLOCKS_PER_PAGE, totalBlocks)}
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
                {/* 첫 페이지 */}
                {currentPage > 3 && (
                  <>
                    <button
                      onClick={() => handlePageChange(1)}
                      className="px-3 py-2 rounded-md text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      1
                    </button>
                    {currentPage > 4 && <span className="text-gray-400">...</span>}
                  </>
                )}

                {/* 현재 페이지 주변 페이지들 */}
                {Array.from({ length: 5 }, (_, i) => {
                  const pageNum = currentPage - 2 + i;
                  if (pageNum < 1 || pageNum > totalPages) return null;

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

                {/* 마지막 페이지 */}
                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && <span className="text-gray-400">...</span>}
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      className="px-3 py-2 rounded-md text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center space-x-1">
          <Lightbulb className="w-4 h-4" />
          <span>팁</span>
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 블록 번호를 클릭하면 해당 블록의 상세 정보를 볼 수 있습니다</li>
          <li>• 가스 사용량은 &quot;사용된 가스 / 가스 한도&quot; 형태로 표시됩니다</li>
          <li>• 마우스를 올리면 전체 해시와 주소를 확인할 수 있습니다</li>
          <li>• 페이지는 최신 블록부터 오래된 블록 순으로 정렬됩니다</li>
          <li>• 실시간 연결 시 새 블록이 자동으로 업데이트됩니다</li>
        </ul>
      </div>
    </div>
  );
}
