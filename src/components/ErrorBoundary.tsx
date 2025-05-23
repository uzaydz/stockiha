import * as Sentry from "@sentry/react";
import type { FallbackRender } from "@sentry/react";

const ErrorFallback: FallbackRender = (props) => {
  const { error, resetError } = props;
  
  const errorMessage = error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : 'خطأ غير معروف';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      <div className="max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h2 className="mb-4 text-2xl font-bold text-red-600">عذراً! حدث خطأ ما</h2>
        <p className="mb-4 text-gray-600">
          نعتذر عن هذا الخطأ. يمكنك محاولة إعادة تحميل الصفحة أو العودة للصفحة السابقة.
        </p>
        <pre className="p-4 mb-4 text-sm bg-gray-100 rounded">
          {errorMessage}
        </pre>
        <button
          onClick={resetError}
          className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          حاول مرة أخرى
        </button>
      </div>
    </div>
  );
};

export const SentryErrorBoundary = Sentry.withErrorBoundary(
  ({ children }) => children,
  {
    fallback: ErrorFallback,
  }
); 