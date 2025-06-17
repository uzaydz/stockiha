import React from "react";
import * as Sentry from "@sentry/react";
import type { FallbackRender } from "@sentry/react";
import { reportHookError, resetAndReload } from "@/lib/utils/storage-helper";

const ErrorFallback: FallbackRender = (props) => {
  const { error, resetError } = props;
  
  const errorMessage = error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : 'خطأ غير معروف';

  // التحقق من نوع الخطأ
  const isHookError = errorMessage.includes('hooks') || errorMessage.includes('Rendered fewer hooks');
  const isRenderError = errorMessage.includes('Cannot read properties of undefined') || errorMessage.includes('Cannot access before initialization');

  // تقرير الخطأ بدون hooks
  if (error && typeof error === 'object' && 'message' in error) {
    try {
      reportHookError(error as Error);
    } catch (reportError) {
    }
  }

  const handleReset = () => {
    if (isHookError || isRenderError) {
      // للأخطاء الخطيرة، نظف كل شيء وأعد التحميل
      resetAndReload();
    } else {
      // للأخطاء العادية، جرب إعادة التعيين العادي
      resetError();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="max-w-md p-8 bg-card rounded-lg shadow-lg border">
        <h2 className="mb-4 text-2xl font-bold text-destructive">عذراً! حدث خطأ ما</h2>
        {isHookError ? (
          <p className="mb-4 text-muted-foreground">
            حدث خطأ في تحميل البيانات. سيتم تنظيف البيانات المؤقتة وإعادة تحميل الصفحة تلقائياً.
          </p>
        ) : (
          <p className="mb-4 text-muted-foreground">
            نعتذر عن هذا الخطأ. يمكنك محاولة إعادة تحميل الصفحة أو العودة للصفحة السابقة.
          </p>
        )}
        <pre className="p-4 mb-4 text-sm bg-muted rounded">
          {errorMessage}
        </pre>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-primary-foreground bg-primary rounded hover:bg-primary/90"
          >
            {isHookError ? 'إعادة تعيين وتحميل' : 'حاول مرة أخرى'}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-muted-foreground bg-secondary rounded hover:bg-secondary/90"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
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
