// 개별 트랜잭션 상세 페이지 - 특정 트랜잭션의 모든 정보 표시
"use client";

import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getTransactionByHash, provider, TransactionInfo } from "@/lib/web3";
import { TransactionReceipt, Log, Interface, ethers } from "ethers";
import { CreditCard, Lightbulb, Search, FileText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function TransactionDetailPage() {
  const params = useParams();
  const txHash = params?.hash as string;

  // 상태 관리
  const [transaction, setTransaction] = useState<TransactionInfo | null>(null);
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null);
  const [eventLogs, setEventLogs] = useState<ParsedEventLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 이벤트 로그 인터페이스
  interface ParsedEventLog {
    address: string;
    topics: string[];
    data: string;
    blockNumber: number;
    transactionHash: string;
    logIndex: number;
    removed: boolean;
    decoded?: {
      name: string;
      signature: string;
      args: any;
    };
  }

  // 트랜잭션 데이터 로딩 함수
  const loadTransactionData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!txHash) {
        setError("트랜잭션 해시가 제공되지 않았습니다.");
        return;
      }

      // 트랜잭션 정보와 영수증을 동시에 가져오기
      const [txInfo, txReceipt] = await Promise.all([
        getTransactionByHash(txHash),
        provider.getTransactionReceipt(txHash),
      ]);

      if (!txInfo) {
        setError(`트랜잭션 ${txHash}를 찾을 수 없습니다.`);
        return;
      }

      setTransaction(txInfo);
      setReceipt(txReceipt);
      
      // 이벤트 로그 파싱
      if (txReceipt && txReceipt.logs) {
        const parsedLogs = parseEventLogs(txReceipt.logs);
        setEventLogs(parsedLogs);
      }
    } catch (err) {
      console.error("트랜잭션 데이터 로딩 실패:", err);
      setError("트랜잭션 데이터를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (txHash) {
      loadTransactionData();
    }
  }, [txHash]);

  // 이벤트 로그 파싱 함수
  const parseEventLogs = (logs: readonly Log[]): ParsedEventLog[] => {
    return logs.map((log, index) => {
      const parsedLog: ParsedEventLog = {
        address: log.address,
        topics: log.topics,
        data: log.data,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.index,
        removed: log.removed,
      };

      // 알려진 이벤트 시그니처와 매칭하여 디코딩 시도
      try {
        const decoded = decodeEventLog(log);
        if (decoded) {
          parsedLog.decoded = decoded;
        }
      } catch (error) {
        console.warn(`이벤트 로그 디코딩 실패 (인덱스 ${index}):`, error);
      }

      return parsedLog;
    });
  };

  // 이벤트 로그 디코딩 함수
  const decodeEventLog = (log: Log) => {
    // 디버깅: 실제 이벤트 시그니처 출력
    console.log('이벤트 로그 디코딩 시도:', {
      address: log.address,
      signature: log.topics[0],
      topics: log.topics,
      data: log.data
    });

    // 알려진 이벤트 시그니처들
    const knownEvents = {
      // ERC-20 Transfer
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": {
        name: "Transfer",
        signature: "Transfer(address,address,uint256)",
        inputs: ["address", "address", "uint256"],
        inputNames: ["from", "to", "value"]
      },
      // ERC-20 Approval
      "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925": {
        name: "Approval",
        signature: "Approval(address,address,uint256)",
        inputs: ["address", "address", "uint256"],
        inputNames: ["owner", "spender", "value"]
      },
      // Token Factory TokenDeployed
      "0x167f2b06d5846856e477204ded4d541878475ead9f560674c189d13261a26ca8": {
        name: "TokenDeployed",
        signature: "TokenDeployed(string,string,uint256,address)",
        inputs: ["string", "string", "uint256", "address"],
        inputNames: ["name", "symbol", "initialSupply", "owner"]
      }
    };

    const eventSignature = log.topics[0];
    console.log('찾는 시그니처:', eventSignature);
    console.log('알려진 시그니처들:', Object.keys(knownEvents));
    
    const eventInfo = knownEvents[eventSignature as keyof typeof knownEvents];

    if (eventInfo) {
      console.log('일치하는 이벤트 정보 찾음:', eventInfo);
      try {
        // ethers.js를 사용하여 디코딩
        const iface = new Interface([
          `event ${eventInfo.signature}`
        ]);
        
        const decodedLog = iface.parseLog({
          topics: log.topics,
          data: log.data
        });

        if (decodedLog) {
          console.log('디코딩 성공:', decodedLog);
          return {
            name: eventInfo.name,
            signature: eventInfo.signature,
            args: decodedLog.args
          };
        }
      } catch (error) {
        console.warn("이벤트 디코딩 실패:", error, eventInfo);
      }
    } else {
      console.log('알려진 이벤트가 아님:', eventSignature);
      
      // 범용 디코딩 시도 - 일반적인 ERC-20 이벤트들
      try {
        // Transfer 이벤트 시도
        if (log.topics.length === 3) {
          const transferIface = new Interface([
            "event Transfer(address indexed from, address indexed to, uint256 value)"
          ]);
          const decoded = transferIface.parseLog({ topics: log.topics, data: log.data });
          if (decoded) {
            console.log('Transfer 이벤트로 디코딩 성공:', decoded);
            return {
              name: "Transfer",
              signature: "Transfer(address,address,uint256)",
              args: decoded.args
            };
          }
        }
      } catch (e) {
        console.log('범용 디코딩 실패:', e);
      }
    }

    return null;
  };

  // 시간 포맷팅
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "알 수 없음";
    const date = new Date(timestamp * 1000);
    return {
      full: date.toLocaleString("ko-KR"),
      relative: `${Math.floor((Date.now() - timestamp * 1000) / 1000)}초 전`,
    };
  };

  // 큰 숫자 포맷팅
  const formatNumber = (num: string | number) => {
    return parseFloat(num.toString()).toLocaleString();
  };

  // Wei를 Gwei로 변환
  const weiToGwei = (wei: string) => {
    const gwei = parseFloat(wei) / 1e9;
    return gwei.toFixed(2);
  };

  // 복사 함수
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("클립보드에 복사되었습니다!");
  };

  // 이벤트 값 포맷팅 함수
  const formatEventValue = (value: any, key: string): string => {
    if (value === null || value === undefined) {
      return "null";
    }

    // BigInt 처리
    if (typeof value === 'bigint') {
      // 토큰 금액인 경우 (value, amount, supply 등)
      if (key.toLowerCase().includes('value') || 
          key.toLowerCase().includes('amount') || 
          key.toLowerCase().includes('supply')) {
        try {
          return ethers.formatEther(value.toString()) + " tokens";
        } catch {
          return value.toString();
        }
      }
      return value.toString();
    }

    // 주소인 경우
    if (typeof value === 'string' && value.startsWith('0x') && value.length === 42) {
      return value;
    }

    // 일반 문자열
    if (typeof value === 'string') {
      return value;
    }

    // 객체나 배열인 경우
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  };

  if (isLoading) {
    return <LoadingSpinner message={`트랜잭션 ${txHash?.slice(0, 16)}... 정보를 불러오는 중...`} />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadTransactionData} />;
  }

  if (!transaction) {
    return <ErrorMessage message="트랜잭션 정보를 찾을 수 없습니다." />;
  }

  const timeInfo = transaction.timestamp ? formatTime(transaction.timestamp) : null;

  return (
    <div className="space-y-6">
      {/* 트랜잭션 헤더 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center space-x-3 mb-4">
              <CreditCard className="w-5 h-5" />
              <span>트랜잭션 상세 정보</span>
            </h1>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">트랜잭션 해시:</span>
                <button
                  onClick={() => copyToClipboard(transaction.hash)}
                  className="bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200 transition-colors flex-shrink-0 ml-4"
                  title="복사"
                >
                  📋 복사
                </button>
              </div>
              <div className="mt-2 font-mono text-sm break-all text-gray-800">
                {transaction.hash}
              </div>
            </div>

            {timeInfo && typeof timeInfo === "object" && (
              <div className="mt-4 text-gray-600">
                <div>{timeInfo.full}</div>
                <div className="text-sm text-gray-500">{timeInfo.relative}</div>
              </div>
            )}
          </div>

          {/* 상태 표시 */}
          <div className="ml-6">
            <div
              className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${
                transaction.status === 1
                  ? "bg-green-100 text-green-800"
                  : transaction.status === 0
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {transaction.status === 1
                ? "✓ 성공"
                : transaction.status === 0
                  ? "✗ 실패"
                  : "⏳ 대기중"}
            </div>
          </div>
        </div>
      </div>

      {/* 트랜잭션 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">블록 번호</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            <Link
              href={`/blocks/${transaction.blockNumber}`}
              className="text-blue-600 hover:text-blue-800"
            >
              #{transaction.blockNumber}
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">전송 금액</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {parseFloat(transaction.value).toFixed(4)} ETH
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            가스 사용량
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {transaction.gasUsed ? formatNumber(transaction.gasUsed) : "-"}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">가스 가격</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {weiToGwei(transaction.gasPrice)} Gwei
          </div>
        </div>
      </div>

      {/* 트랜잭션 상세 정보 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
          <Search className="w-6 h-6" />
          <span>상세 정보</span>
        </h2>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">기본 정보</h3>

            <div className="grid grid-cols-1 gap-4">
              {/* 보내는 주소 */}
              <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="font-medium text-gray-600 w-32 mb-2 sm:mb-0">보내는 곳:</div>
                <div className="flex items-center flex-1 space-x-2">
                  <span className="font-mono text-sm bg-gray-100 p-2 rounded flex-1 break-all">
                    {transaction.from}
                  </span>
                  <button
                    onClick={() => copyToClipboard(transaction.from)}
                    className="bg-blue-100 text-blue-600 px-3 py-2 rounded hover:bg-blue-200 transition-colors flex-shrink-0"
                    title="복사"
                  >
                    📋
                  </button>
                </div>
              </div>

              {/* 받는 주소 */}
              <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="font-medium text-gray-600 w-32 mb-2 sm:mb-0">받는 곳:</div>
                <div className="flex items-center flex-1 space-x-2">
                  {transaction.to ? (
                    <>
                      <span className="font-mono text-sm bg-gray-100 p-2 rounded flex-1 break-all">
                        {transaction.to}
                      </span>
                      <button
                        onClick={() => copyToClipboard(transaction.to!)}
                        className="bg-blue-100 text-blue-600 px-3 py-2 rounded hover:bg-blue-200 transition-colors flex-shrink-0"
                        title="복사"
                      >
                        📋
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-500 italic bg-gray-100 p-2 rounded flex-1">
                      컨트랙트 생성 트랜잭션
                    </span>
                  )}
                </div>
              </div>

              {/* 전송 금액 */}
              <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="font-medium text-gray-600 w-32 mb-2 sm:mb-0">전송 금액:</div>
                <div className="flex-1">
                  <div className="text-lg font-semibold text-green-600">
                    {parseFloat(transaction.value).toFixed(6)} ETH
                  </div>
                  <div className="text-sm text-gray-500">
                    ({formatNumber((parseFloat(transaction.value) * 1e18).toString())} Wei)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 가스 정보 */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">가스 정보</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="font-medium text-gray-600 mb-1">가스 사용량</div>
                <div className="text-lg font-semibold">
                  {transaction.gasUsed ? formatNumber(transaction.gasUsed) : "알 수 없음"}
                </div>
              </div>

              <div>
                <div className="font-medium text-gray-600 mb-1">가스 가격</div>
                <div className="space-y-1">
                  <div className="text-lg font-semibold">
                    {weiToGwei(transaction.gasPrice)} Gwei
                  </div>
                  <div className="text-sm text-gray-500">
                    ({formatNumber(transaction.gasPrice)} Wei)
                  </div>
                </div>
              </div>

              {transaction.gasUsed && (
                <div className="md:col-span-2">
                  <div className="font-medium text-gray-600 mb-1">총 가스 비용</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {(
                      (parseFloat(transaction.gasUsed) * parseFloat(transaction.gasPrice)) /
                      1e18
                    ).toFixed(8)}{" "}
                    ETH
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 영수증 정보 (Receipt) */}
          {receipt && (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">영수증 정보</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="font-medium text-gray-600 mb-1">트랜잭션 인덱스</div>
                  {/* <div className="text-lg">{receipt.transactionIndex}</div> */}
                </div>

                <div>
                  <div className="font-medium text-gray-600 mb-1">가스 사용 효율성</div>
                  <div className="text-lg">
                    {receipt.gasUsed && receipt.cumulativeGasUsed
                      ? `${((parseFloat(receipt.gasUsed.toString()) / parseFloat(receipt.cumulativeGasUsed.toString())) * 100).toFixed(2)}%`
                      : "N/A"}
                  </div>
                </div>

                {receipt.contractAddress && (
                  <div className="md:col-span-2">
                    <div className="font-medium text-gray-600 mb-1">생성된 컨트랙트 주소</div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm bg-green-100 p-2 rounded flex-1 break-all">
                        {receipt.contractAddress}
                      </span>
                      <button
                        onClick={() => copyToClipboard(receipt.contractAddress ?? "")}
                        className="bg-blue-100 text-blue-600 px-3 py-2 rounded hover:bg-blue-200 transition-colors flex-shrink-0"
                        title="복사"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                )}

                <div className="md:col-span-2">
                  <div className="font-medium text-gray-600 mb-1">이벤트 로그</div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">
                      {eventLogs.length}개의 이벤트 로그가 발생했습니다.
                      {eventLogs.length > 0 && (
                        <span className="ml-2 text-blue-600">
                          (자세한 내용은 아래 이벤트 로그 섹션 참조)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 이벤트 로그 섹션 */}
      {eventLogs.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
            <FileText className="w-6 h-6" />
            <span>이벤트 로그</span>
            <span className="text-sm font-normal text-gray-500">
              ({eventLogs.length}개)
            </span>
          </h2>

          <div className="space-y-4">
            {eventLogs.map((log, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                      Log #{log.logIndex}
                    </span>
                    {log.decoded && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                        {log.decoded.name}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => copyToClipboard(log.address)}
                    className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors"
                    title="컨트랙트 주소 복사"
                  >
                    📋 주소 복사
                  </button>
                </div>

                {/* 디코딩된 이벤트 정보 */}
                {log.decoded ? (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      {log.decoded.name} 이벤트
                    </h4>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm text-gray-600 mb-2">
                        함수 시그니처: <span className="font-mono">{log.decoded.signature}</span>
                      </div>
                      
                      {/* 이벤트 파라미터들 */}
                      <div className="space-y-2">
                        {Object.entries(log.decoded.args).map(([key, value], argIndex) => {
                          // 숫자 키는 건너뛰고 이름이 있는 키만 표시
                          if (!isNaN(Number(key))) return null;
                          
                          return (
                            <div key={argIndex} className="flex items-start space-x-2">
                              <span className="font-medium text-gray-600 min-w-0 flex-shrink-0">
                                {key}:
                              </span>
                              <span className="font-mono text-sm break-all">
                                {formatEventValue(value, key)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      알 수 없는 이벤트
                    </h4>
                    <div className="text-sm text-gray-600">
                      이 이벤트는 알려진 시그니처와 일치하지 않아 디코딩할 수 없습니다.
                    </div>
                  </div>
                )}

                {/* 원시 로그 데이터 */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">원시 로그 데이터</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">컨트랙트 주소:</span>
                      <span className="font-mono ml-2 text-xs break-all">{log.address}</span>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-600">Topics:</span>
                      <div className="mt-1 space-y-1">
                        {log.topics.map((topic, topicIndex) => (
                          <div key={topicIndex} className="font-mono text-xs bg-white p-2 rounded border break-all">
                            <span className="text-gray-500">[{topicIndex}]</span> {topic}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {log.data && log.data !== '0x' && (
                      <div>
                        <span className="font-medium text-gray-600">Data:</span>
                        <div className="font-mono text-xs bg-white p-2 rounded border break-all mt-1">
                          {log.data}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 이벤트 로그 도움말 */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">이벤트 로그 이해하기</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Log Index</strong>: 트랜잭션 내에서 이벤트의 순서</li>
              <li>• <strong>Topics</strong>: 이벤트 시그니처와 인덱싱된 파라미터들</li>
              <li>• <strong>Data</strong>: 인덱싱되지 않은 이벤트 파라미터들의 인코딩된 데이터</li>
              <li>• <strong>디코딩된 이벤트</strong>: 알려진 ABI로 해석된 이벤트 정보</li>
            </ul>
          </div>
        </div>
      )}

      {/* 네비게이션 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <Link
            href="/transactions"
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← 트랜잭션 목록으로
          </Link>

          <Link
            href={`/blocks/${transaction.blockNumber}`}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            블록 #{transaction.blockNumber} 보기 →
          </Link>
        </div>
      </div>

      {/* 도움말 */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center space-x-1">
          <Lightbulb className="w-4 h-4" />
          <span>트랜잭션 정보 이해하기</span>
        </h3>
        <ul className="text-sm text-green-700 space-y-1">
          <li>
            • <strong>가스 사용량</strong>: 트랜잭션 실행에 실제로 소모된 가스양
          </li>
          <li>
            • <strong>가스 가격</strong>: 가스 1단위당 지불한 가격 (Wei 또는 Gwei 단위)
          </li>
          <li>
            • <strong>총 가스 비용</strong>: 가스 사용량 × 가스 가격 = 실제 수수료
          </li>
          <li>
            • <strong>트랜잭션 인덱스</strong>: 블록 내에서 이 트랜잭션의 순서
          </li>
          <li>
            • <strong>컨트랙트 생성</strong>: 받는 곳이 없는 경우 새 스마트 컨트랙트 생성을 의미
          </li>
        </ul>
      </div>
    </div>
  );
}
