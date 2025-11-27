import React, { Suspense, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { useSuperUnifiedData } from '../../../context/SuperUnifiedDataContext';
import LowStockCard from '@/components/dashboard/LowStockCard';
import { Button } from '@/components/ui/button';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

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
  const { products, isLoading, error } = useSuperUnifiedData();
  const { currentOrganization } = useTenant();
  const [localProducts, setLocalProducts] = useState<any[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // جلب المنتجات من SQLite عند عدم الاتصال أو وجود خطأ
  useEffect(() => {
    const loadLocalProducts = async () => {
      if ((error || !navigator.onLine) && currentOrganization?.id) {
        setIsLoadingLocal(true);
        try {
          const localData = await deltaWriteService.getAll<any>(
            'products',
            currentOrganization.id
          );
          setLocalProducts(localData || []);
          console.log('[OptimizedInventorySection] ✅ تم جلب المنتجات من SQLite:', localData.length);
        } catch (err) {
          console.error('[OptimizedInventorySection] ❌ فشل جلب المنتجات من SQLite:', err);
        } finally {
          setIsLoadingLocal(false);
        }
      }
    };

    loadLocalProducts();

    // مراقبة حالة الاتصال
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error, currentOrganization?.id]);

  // استخدام المنتجات المحلية إذا كان هناك خطأ أو أوفلاين
  const displayProducts = (error || isOffline) && localProducts.length > 0
    ? localProducts
    : products;

  if (isLoading || isLoadingLocal) {
    return <InventoryLoader />;
  }

  // إظهار رسالة خطأ فقط إذا لم تكن هناك بيانات محلية
  if (error && localProducts.length === 0) {
    return <InventoryError error={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          المنتجات منخفضة المخزون
          {isOffline && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground font-normal">
              <WifiOff className="h-3 w-3" />
              (أوفلاين)
            </span>
          )}
        </h2>
        <Link to="/dashboard/inventory" className="text-xs text-primary hover:underline">
          إدارة المخزون
        </Link>
      </div>
      <LowStockCard products={displayProducts} />
    </div>
  );
};

export default OptimizedInventorySection;
