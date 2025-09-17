import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface StoreErrorBoundaryProps {
  error: string;
  onRetry: () => void;
}

export const StoreErrorBoundary = React.memo(({
  error,
  onRetry
}: StoreErrorBoundaryProps) => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
    <h1 className="text-2xl font-bold text-red-600 mb-4">حدث خطأ</h1>
    <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
    <Button
      onClick={onRetry}
      aria-label="إعادة المحاولة"
      className="min-w-[120px]"
    >
      <RefreshCw className="w-4 h-4 mr-2" />
      حاول مرة أخرى
    </Button>
  </div>
));

StoreErrorBoundary.displayName = 'StoreErrorBoundary';
