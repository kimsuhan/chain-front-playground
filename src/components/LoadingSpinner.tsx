// 로딩 스피너 컴포넌트 (데이터를 가져올 때 사용)

interface LoadingSpinnerProps {
  message?: string; // 로딩 중 표시할 메시지 (선택사항)
}

export default function LoadingSpinner({ message = "데이터를 불러오는 중..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* 회전하는 스피너 */}
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      
      {/* 로딩 메시지 */}
      <p className="mt-4 text-gray-600 text-center">{message}</p>
    </div>
  );
}