import React from 'react';
import { Link } from 'react-router-dom';
import { useDashboardProducts } from '@/context/DashboardDataContext';
import LowStockCard from '@/components/dashboard/LowStockCard';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// مكون التحميل للمخزون
const InventoryLoader = () => (
  <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
    <div className="flex items-center justify-between mb-4">
      <div className="h-6 w-40 bg-muted animate-pulse rounded"></div>
      <div className="h-4 w-20 bg-muted animate-pulse rounded"></div>
    </div>
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>
      ))}
    </div>
  </div>
);

// مكون الخطأ للمخزون
const InventoryError = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
    <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
      <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-foreground">
          فشل في تحميل بيانات المخزون
        </h3>
        <p className="text-sm text-muted-foreground">
          {error}
        </p>
      </div>
      
      <Button
        onClick={onRetry}
        variant="outline"
        className="bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
      >
        إعادة المحاولة
      </Button>
    </div>
  </div>
);

const OptimizedInventorySection: React.FC = () => {
  const { products, isLoading, error } = useDashboardProducts();

  if (isLoading) {
    return <InventoryLoader />;
  }

  if (error) {
    return <InventoryError error={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          المنتجات منخفضة المخزون
        </h2>
        <Link to="/dashboard/inventory" className="text-xs text-primary hover:underline">
          إدارة المخزون
        </Link>
      </div>
      <LowStockCard products={products} />
    </div>
  );
};

export default OptimizedInventorySection;
