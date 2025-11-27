import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Package, 
  TrendingDown, 
  AlertCircle, 
  Eye, 
  ShoppingCart,
  BarChart3,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Zap,
  PlusCircle,
  PackageOpen,
  ArrowDownCircle,
  SquareStack
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Product } from '@/lib/api/products';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LowStockCardProps {
  products: Product[];
  organizationId?: string;
  limit?: number;
}

// مكون عنصر المنتج
const ProductItem = React.memo(({ 
  product, 
  stockLevel, 
  quantity,
  minLevel,
  stockLevelColor,
  stockLevelText,
  stockLevelIcon,
  estimatedValue,
  formatCurrency
}: { 
  product: Product; 
  stockLevel: string;
  quantity: number;
  minLevel: number;
  stockLevelColor: string;
  stockLevelText: string;
  stockLevelIcon: React.ReactNode;
  estimatedValue: number;
  formatCurrency: (amount: number) => string;
}) => {
  return (
    <div 
      className={cn(
        "relative p-4 rounded-xl transition-all duration-300 group",
        "bg-background/80 border border-border/30 shadow-sm",
        "hover:shadow-md hover:scale-[1.01] cursor-pointer",
        "hover:border-primary/20"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* القسم الأيسر - معلومات المنتج */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* صورة المنتج */}
          <div className="h-10 w-10 rounded-lg shrink-0 overflow-hidden border border-border/30 bg-muted/40">
            <img
              src={product.thumbnail_image || '/placeholder.svg'}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          
          {/* معلومات المنتج */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {/* اسم المنتج */}
              <h4 className="text-sm font-bold group-hover:text-primary transition-colors duration-300 line-clamp-1">
                {product.name}
              </h4>
              
              {/* شارة حالة المخزون */}
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium border",
                "bg-gradient-to-br", stockLevelColor
              )}>
                {stockLevelIcon}
                <span>{stockLevelText}</span>
              </div>
            </div>
            
            {/* معلومات المنتج الإضافية */}
            <div className="flex flex-wrap gap-2 text-xs">
              {product.sku && (
                <div className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                  <PackageOpen className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground line-clamp-1">{product.sku}</span>
                </div>
              )}
              
              {product.category && (
                <div className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                  <SquareStack className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground line-clamp-1">
                    {typeof product.category === 'object' && product.category !== null
                      ? (product.category as { name: string }).name
                      : product.category}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* القسم الأيمن - المتبقي والقيمة */}
        <div className="text-right flex flex-col items-end gap-2">
          {/* المتبقي في المخزون */}
          <div className={cn(
            "text-base font-bold",
            stockLevel === 'out-of-stock' ? 'text-gray-900 dark:text-gray-100' :
            stockLevel === 'critical' ? 'text-red-600 dark:text-red-400' :
            stockLevel === 'low' ? 'text-orange-600 dark:text-orange-400' :
            'text-yellow-600 dark:text-yellow-400'
          )}>
            {quantity === 0 ? 'نفاد المخزون' : `${quantity} قطعة`}
          </div>
          
          {/* القيمة */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>القيمة: {formatCurrency(estimatedValue)}</span>
            <DollarSign className="h-3 w-3" />
          </div>
        </div>
      </div>
      
      {/* شريط الإجراءات */}
      <div className="mt-3 pt-3 border-t border-border/20 flex justify-between items-center">
        {/* معلومات الحد الأدنى */}
        <div className="flex items-center gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200/50 dark:border-yellow-700/30">
                  <ArrowDownCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">
                    الحد الأدنى: {minLevel}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">الحد الأدنى للمخزون المطلوب</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* أزرار الإجراءات */}
        <div className="flex items-center gap-2">
          <Link 
            to={`/dashboard/products/${product.id}`}
            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-200"
            title="عرض المنتج"
          >
            <Eye className="h-4 w-4" />
          </Link>
          
          <button 
            className="p-2 rounded-lg bg-green-100/80 hover:bg-green-100 text-green-600 transition-all duration-200 border border-green-200/50"
            title="إعادة طلب"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

ProductItem.displayName = 'ProductItem';

// مكون حالة فارغة
const EmptyLowStockState = () => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-8 text-center space-y-4 rounded-xl",
      "bg-muted/30 border border-border/30"
    )}>
      <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
        <Package className="h-6 w-6 text-primary" />
      </div>
      
      <div className="space-y-1 max-w-xs">
        <h3 className="text-base font-bold text-foreground">
          جميع المنتجات بمخزون جيد
        </h3>
        <p className="text-sm text-muted-foreground">
          لا توجد منتجات تحتاج إعادة تعبئة حالياً
        </p>
      </div>
      
      <Button 
        asChild 
        variant="outline" 
        className="mt-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
      >
        <Link to="/dashboard/inventory" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          عرض تقرير المخزون
          <TrendingDown className="h-4 w-4 opacity-60" />
        </Link>
      </Button>
    </div>
  );
};

// المكون الرئيسي
const LowStockCard = ({ products, organizationId, limit = 5 }: LowStockCardProps) => {
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  // تصفية المنتجات منخفضة المخزون (بما في ذلك نفاد المخزون quantity === 0)
  const lowStockProducts = (products || [])
    .filter(product => {
      const quantity = product.stock_quantity ?? 0;
      const minLevel = product.min_stock_level ?? 5;
      // ✅ تضمين المنتجات التي مخزونها أقل من أو يساوي الحد الأدنى (بما في ذلك 0)
      return quantity <= minLevel;
    })
    .sort((a, b) => {
      const quantityA = a.stock_quantity || 0;
      const quantityB = b.stock_quantity || 0;
      return quantityA - quantityB; // ترتيب تصاعدي (الأقل مخزوناً أولاً)
    })
    .slice(0, limit);

  // تنسيق العملة
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('ar-DZ')} د.ج`;
  };

  // الحصول على مستوى الخطورة
  const getStockLevel = (product: Product) => {
    const quantity = product.stock_quantity || 0;
    const minLevel = product.min_stock_level || 5;
    const reorderLevel = product.reorder_level || 10;
    
    if (quantity === 0) return 'out-of-stock';
    if (quantity <= Math.floor(minLevel / 2)) return 'critical';
    if (quantity <= minLevel) return 'low';
    if (quantity <= reorderLevel) return 'warning';
    return 'normal';
  };

  // الحصول على لون حالة المخزون
  const getStockLevelColor = (level: string) => {
    switch (level) {
      case 'out-of-stock':
        return 'from-gray-900 to-gray-800 dark:from-gray-200 dark:to-gray-100 text-white dark:text-gray-900 border-gray-700 dark:border-gray-300';
      case 'critical':
        return 'from-red-100 to-red-50 dark:from-red-900/20 dark:to-red-800/10 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-700/30';
      case 'low':
        return 'from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-orange-800/10 text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-700/30';
      case 'warning':
        return 'from-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-800/10 text-yellow-600 dark:text-yellow-400 border-yellow-200/50 dark:border-yellow-700/30';
      default:
        return 'from-gray-100 to-gray-50 dark:from-gray-900/20 dark:to-gray-800/10 text-gray-600 dark:text-gray-400 border-gray-200/50 dark:border-gray-700/30';
    }
  };

  // الحصول على نص حالة المخزون
  const getStockLevelText = (level: string) => {
    switch (level) {
      case 'out-of-stock':
        return 'نفاد';
      case 'critical':
        return 'حرج جداً';
      case 'low':
        return 'منخفض';
      case 'warning':
        return 'تحذير';
      default:
        return 'عادي';
    }
  };

  // الحصول على أيقونة حالة المخزون
  const getStockLevelIcon = (level: string) => {
    switch (level) {
      case 'out-of-stock':
        return <PackageOpen className="h-3 w-3" />;
      case 'critical':
        return <AlertCircle className="h-3 w-3" />;
      case 'low':
        return <AlertTriangle className="h-3 w-3" />;
      case 'warning':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Package className="h-3 w-3" />;
    }
  };

  // حساب إجمالي قيمة المنتجات منخفضة المخزون
  const totalValue = lowStockProducts.reduce((sum, product) => {
    const quantity = product.stock_quantity || 0;
    const price = product.price || 0;
    return sum + (quantity * price);
  }, 0);

  // حساب عدد المنتجات الحرجة ونفاد المخزون
  const outOfStockProducts = lowStockProducts.filter(product => getStockLevel(product) === 'out-of-stock').length;
  const criticalProducts = lowStockProducts.filter(product => getStockLevel(product) === 'critical').length;

  // حالة التحميل
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">جاري تحميل بيانات المنتجات...</p>
        </div>
      </div>
    );
  }

  // حالة الخطأ
  if (error) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center space-y-2">
          <AlertCircle className="h-6 w-6 text-red-500 mx-auto" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {lowStockProducts.length === 0 ? (
        <EmptyLowStockState />
      ) : (
        <div className="space-y-4">
          {/* إحصائيات سريعة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className={cn(
              "p-4 rounded-xl transition-all duration-300 group",
              "bg-background/80 border border-border/30 shadow-sm",
              "hover:shadow-md hover:scale-[1.01]"
            )}>
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-lg shrink-0",
                  "bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/20 dark:to-red-800/10 border border-red-200/50 dark:border-red-700/30 shadow-sm"
                )}>
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">منتجات حرجة</p>
                  <h4 className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalProducts}</h4>
                </div>
              </div>
            </div>
            
            <div className={cn(
              "p-4 rounded-xl transition-all duration-300 group",
              "bg-background/80 border border-border/30 shadow-sm",
              "hover:shadow-md hover:scale-[1.01]"
            )}>
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-lg shrink-0",
                  "bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-sm"
                )}>
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">قيمة المخزون</p>
                  <h4 className="text-2xl font-bold text-foreground">{formatCurrency(totalValue)}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* قائمة المنتجات */}
          <div className="space-y-3">
            {lowStockProducts.map((product) => {
              const quantity = product.stock_quantity || 0;
              const minLevel = product.min_stock_level || 5;
              const stockLevel = getStockLevel(product);
              const estimatedValue = quantity * (product.price || 0);
              
              return (
                <ProductItem
                  key={product.id}
                  product={product}
                  stockLevel={stockLevel}
                  quantity={quantity}
                  minLevel={minLevel}
                  stockLevelColor={getStockLevelColor(stockLevel)}
                  stockLevelText={getStockLevelText(stockLevel)}
                  stockLevelIcon={getStockLevelIcon(stockLevel)}
                  estimatedValue={estimatedValue}
                  formatCurrency={formatCurrency}
                />
              );
            })}
          </div>
          
          {/* تحذير نفاد المخزون */}
          {outOfStockProducts > 0 && (
            <div className={cn(
              "p-3 rounded-xl border-l-4 border-gray-800 dark:border-gray-200",
              "bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900"
            )}>
              <div className="flex items-center gap-2">
                <PackageOpen className="h-4 w-4 text-gray-800 dark:text-gray-200" />
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    تنبيه: {outOfStockProducts} منتج نفد مخزونه
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    هذه المنتجات غير متوفرة للبيع حالياً
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* تحذير إضافي للمنتجات الحرجة */}
          {criticalProducts > 0 && (
            <div className={cn(
              "p-3 rounded-xl border-l-4 border-red-500",
              "bg-gradient-to-r from-red-50/60 to-red-25/40 dark:from-red-950/30 dark:to-red-900/20"
            )}>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    تحذير: {criticalProducts} منتج في حالة حرجة
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    يجب إعادة تعبئة هذه المنتجات فوراً لتجنب نفاد المخزون
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* زر للانتقال إلى صفحة المخزون */}
          <div className="pt-2">
            <Button 
              asChild 
              variant="outline" 
              className="w-full bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
            >
              <Link to="/dashboard/inventory" className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>إدارة المخزون</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    <span className="text-xs font-medium">{lowStockProducts.length}</span>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LowStockCard;
