import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Database, 
  BarChart3, 
  RefreshCw,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAllProductsForScanner } from '@/hooks/useAllProductsForScanner';

interface ScannerStatsProps {
  onRefresh?: () => void;
  className?: string;
}

export const ScannerStats: React.FC<ScannerStatsProps> = ({ 
  onRefresh, 
  className 
}) => {
  const { 
    stats, 
    isLoading, 
    error, 
    isReady, 
    totalCount, 
    refetch 
  } = useAllProductsForScanner();

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-500" />
          بيانات السكانر
          <Badge 
            variant={isReady ? "default" : error ? "destructive" : "secondary"}
            className="ml-auto"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                جاري التحميل
              </>
            ) : error ? (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                خطأ
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                جاهز
              </>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* الإحصائيات الرئيسية */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                إجمالي المنتجات
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {stats.totalProducts.toLocaleString()}
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900 dark:text-green-200">
                مع باركود
              </span>
            </div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {stats.productsWithBarcode.toLocaleString()}
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-200">
                مع متغيرات
              </span>
            </div>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {stats.productsWithVariants.toLocaleString()}
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900 dark:text-orange-200">
                إجمالي المتغيرات
              </span>
            </div>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {stats.totalVariants.toLocaleString()}
            </div>
          </div>
        </div>

        {/* نسبة المنتجات مع باركود */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">نسبة المنتجات مع باركود</span>
            <span className="text-sm text-muted-foreground">
              {stats.totalProducts > 0 
                ? Math.round((stats.productsWithBarcode / stats.totalProducts) * 100)
                : 0
              }%
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
              style={{ 
                width: stats.totalProducts > 0 
                  ? `${(stats.productsWithBarcode / stats.totalProducts) * 100}%`
                  : '0%'
              }}
            />
          </div>
        </div>

        {/* زر التحديث */}
        <Button 
          onClick={handleRefresh}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          تحديث البيانات
        </Button>

        {/* رسالة الخطأ */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800 dark:text-red-200">
                <div className="font-medium mb-1">خطأ في تحميل البيانات</div>
                <div className="text-red-600 dark:text-red-300">
                  {error.message || 'حدث خطأ غير متوقع'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* معلومات إضافية */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>حالة البيانات:</span>
            <span className={isReady ? 'text-green-600' : 'text-orange-600'}>
              {isReady ? 'متاحة للسكانر' : 'غير متاحة'}
            </span>
          </div>
          {totalCount > 0 && (
            <div className="flex justify-between">
              <span>البيانات المحملة:</span>
              <span>{totalCount.toLocaleString()} منتج</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 