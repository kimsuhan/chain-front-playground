// 메인 대시보드 페이지 - 블록체인 네트워크 정보 및 최신 데이터 표시
"use client";

import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useSocket } from "@/hooks/useSocket";
import { BlockInfo, getLatestBlock, getRecentBlocks, provider } from "@/lib/web3";
import { Home, Lightbulb, Package, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Dashboard() {
  // 상태 관리 (State Management)
  const [latestBlock, setLatestBlock] = useState<BlockInfo | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<BlockInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [networkStats, setNetworkStats] = useState({
    blockHeight: 0,
    gasPrice: "0",
    chainId: 0,
  });

  // Socket 연결
  const { isConnected, lastBlocks } = useSocket();

  // 새로 추가된 블록 추적 (애니메이션용)
  const [newBlockNumbers, setNewBlockNumbers] = useState<Set<number>>(new Set());
  const [isNewBlock, setIsNewBlock] = useState<boolean>(false);

  // 데이터를 불러오는 함수
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 여러 데이터를 동시에 가져오기 (병렬 처리)
      const [latest, recent, gasPrice, network] = await Promise.all([
        getLatestBlock(),
        getRecentBlocks(5),
        provider.getFeeData(),
        provider.getNetwork(),
      ]);

      setLatestBlock(latest);
      setRecentBlocks(recent);
      setNetworkStats({
        blockHeight: latest?.number || 0,
        gasPrice: gasPrice.gasPrice?.toString() || "0",
        chainId: Number(network.chainId),
      });
    } catch (err) {
      console.error("대시보드 데이터 로딩 실패:", err);
      setError("데이터를 불러오는데 실패했습니다. 테스트넷 연결 상태를 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트가 처음 렌더링될 때 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  // 새 블록들이 도착했을 때 블록 목록에 추가
  useEffect(() => {
    console.log("lastBlocks 변화 감지:", lastBlocks);
    if (lastBlocks && lastBlocks.length > 0) {
      console.log("새 블록들 감지, 대시보드에 추가:", lastBlocks);

      // 가장 최신 블록을 첫 번째로 설정 (배열이 최신순으로 정렬되어 있다고 가정)
      const latestNewBlock = lastBlocks[0];
      setLatestBlock(latestNewBlock);

      // 새 블록 애니메이션 트리거
      setIsNewBlock(true);
      const newNumbers = new Set(lastBlocks.map(block => block.number));
      setNewBlockNumbers((prev) => new Set([...prev, ...newNumbers]));

      // 최근 블록 목록에 추가
      setRecentBlocks((prevBlocks) => {
        // 기존 블록들과 새 블록들을 합치고 중복 제거
        const allBlocks = [...lastBlocks, ...prevBlocks];
        const uniqueBlocks = allBlocks.filter((block, index, self) => 
          index === self.findIndex(b => b.number === block.number)
        );
        
        // 블록 번호 기준으로 내림차순 정렬하고 최대 5개만 유지
        return uniqueBlocks
          .sort((a, b) => b.number - a.number)
          .slice(0, 5);
      });

      // 네트워크 통계 업데이트 (가장 최신 블록으로)
      setNetworkStats((prev) => ({
        ...prev,
        blockHeight: latestNewBlock.number,
      }));

      // 3초 후 애니메이션 제거
      setTimeout(() => {
        setIsNewBlock(false);
        setNewBlockNumbers((prev) => {
          const next = new Set(prev);
          lastBlocks.forEach(block => next.delete(block.number));
          return next;
        });
      }, 3000);
    }
  }, [lastBlocks]);

  // 로딩 중일 때 표시
  if (isLoading) {
    return <LoadingSpinner message="네트워크 정보를 불러오는 중..." />;
  }

  // 에러가 발생했을 때 표시
  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  // 시간을 읽기 쉬운 형태로 변환하는 함수
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString("ko-KR");
  };

  // 큰 숫자를 읽기 쉽게 포맷팅하는 함수
  const formatNumber = (num: string) => {
    return parseFloat(num).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* 페이지 제목 */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center space-x-3">
          <Home className="w-10 h-10" />
          <span>블록체인 대시보드</span>
        </h1>
        <p className="text-gray-600">테스트넷의 실시간 정보를 확인하세요</p>
      </div>

      {/* 네트워크 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 최신 블록 높이 */}
        <div
          className={`bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500 transition-all duration-500 ${
            isNewBlock ? "bg-green-50 border-green-500 animate-pulse" : ""
          }`}
        >
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">최신 블록</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">#{networkStats.blockHeight.toLocaleString()}</div>
          <div className="text-sm text-gray-500 mt-1">Block Height</div>
        </div>

        {/* Gas Price */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Gas Price</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{formatNumber(networkStats.gasPrice)}</div>
          <div className="text-sm text-gray-500 mt-1">Wei</div>
        </div>

        {/* Chain ID */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Chain ID</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{networkStats.chainId}</div>
          <div className="text-sm text-gray-500 mt-1">Network ID</div>
        </div>

        {/* 트랜잭션 수 */}
        <div
          className={`bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500 transition-all duration-500 ${
            isNewBlock ? "bg-green-50 border-green-500 animate-pulse" : ""
          }`}
        >
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">최신 블록 트랜잭션</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{latestBlock?.transactionCount || 0}</div>
          <div className="text-sm text-gray-500 mt-1">Transactions</div>
        </div>
      </div>

      {/* 최신 블록 정보 */}
      <div
        className={`bg-white rounded-lg shadow-lg p-6 transition-all duration-500 ${
          isNewBlock ? "bg-green-50 border-2 border-green-500" : ""
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
            <Package className="w-6 h-6" />
            <span>최신 블록 정보</span>
          </h2>
          <Link href="/blocks" className="text-blue-600 hover:text-blue-800 font-medium">
            모든 블록 보기 →
          </Link>
        </div>

        {latestBlock ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">블록 해시:</span>
                  <span className="font-mono text-sm text-gray-800 truncate ml-2">{latestBlock.hash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">이전 해시:</span>
                  <span className="font-mono text-sm text-gray-800 truncate ml-2">{latestBlock.parentHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">마이너:</span>
                  <span className="font-mono text-sm text-gray-800 truncate ml-2">{latestBlock.miner}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">생성 시간:</span>
                  <span className="text-sm text-gray-800">{formatTime(latestBlock.timestamp)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">사용된 가스:</span>
                  <span className="text-sm text-gray-800">{formatNumber(latestBlock.gasUsed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">가스 한도:</span>
                  <span className="text-sm text-gray-800">{formatNumber(latestBlock.gasLimit)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">블록 정보를 불러올 수 없습니다.</p>
        )}
      </div>

      {/* 최근 블록 목록 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
            <RefreshCw className="w-6 h-6" />
            <span>최근 블록들</span>
          </h2>
          <button
            onClick={loadData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            새로고침
          </button>
        </div>

        {recentBlocks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    블록 번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    해시
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    트랜잭션 수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    생성 시간
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentBlocks.map((block) => (
                  <tr
                    key={block.number}
                    className={`hover:bg-gray-50 transition-all duration-500 ${
                      newBlockNumbers.has(block.number) ? "bg-green-50 border-l-4 border-green-500 animate-pulse" : ""
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      <Link href={`/blocks/${block.number}`} className="hover:text-blue-800">
                        #{block.number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {block.hash.slice(0, 16)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{block.transactionCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTime(block.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">블록 데이터를 불러올 수 없습니다.</p>
        )}
      </div>

      {/* 도움말 섹션 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center space-x-2">
          <Lightbulb className="w-5 h-5" />
          <span>사용법 안내</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <h4 className="font-medium mb-2">블록 탐색:</h4>
            <ul className="space-y-1">
              <li>• 블록 번호를 클릭하면 상세 정보를 볼 수 있습니다</li>
              <li>• 모든 블록 목록에서 전체 블록을 탐색할 수 있습니다</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">실시간 업데이트:</h4>
            <ul className="space-y-1">
              <li>• WebSocket 연결을 통해 새 블록이 실시간으로 추가됩니다</li>
              <li>• 새 블록 도착 시 녹색 애니메이션으로 강조 표시됩니다</li>
              <li>• 수동 새로고침을 원하면 새로고침 버튼을 클릭하세요</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
