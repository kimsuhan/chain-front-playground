// 에러 메시지 표시 컴포넌트
import { AlertTriangle, Lightbulb } from 'lucide-react';

interface ErrorMessageProps {
  message: string; // 표시할 에러 메시지
  onRetry?: () => void; // 재시도 버튼 클릭 시 실행할 함수 (선택사항)
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      {/* 에러 아이콘 */}
      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      
      {/* 에러 메시지 */}
      <h3 className="text-lg font-semibold text-red-800 mb-2">
        오류가 발생했습니다
      </h3>
      <p className="text-red-600 mb-4">{message}</p>
      
      {/* 재시도 버튼 (onRetry 함수가 있을 때만 표시) */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          다시 시도
        </button>
      )}
      
      {/* 도움말 메시지 */}
      <div className="mt-4 text-sm text-gray-600">
        <p className="flex items-center justify-center space-x-1">
          <Lightbulb className="w-4 h-4" />
          <span>팁: 테스트넷 RPC URL과 네트워크 연결 상태를 확인해보세요.</span>
        </p>
        <div className="mt-2 space-y-1">
          <div>RPC URL: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{process.env.RPC_URL}</code></div>
          <div>Chain ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{process.env.CHAIN_ID}</code></div>
        </div>
      </div>
    </div>
  );
}