import { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  Package, 
  TrendingDown, 
  AlertCircle, 
  Eye, 
  ShoppingCart,
  BarChart3,
  Clock,
  DollarSign,
  ArrowRight,
  RefreshCw,
  PackageX,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Product } from '@/lib/api/products';

interface LowStockCardProps {
  products: Product[];
  organizationId?: string;
  limit?: number;
}

const LowStockCard = ({ products, organizationId, limit = 5 }: LowStockCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // تصفية المنتجات منخفضة المخزون
  const lowStockProducts = products
    .filter(product => {
      const quantity = product.stock_quantity || 0;
      const minLevel = product.min_stock_level || 5;
      return quantity > 0 && quantity <= minLevel;
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

  // حساب عدد المنتجات الحرجة
  const criticalProducts = lowStockProducts.filter(product => getStockLevel(product) === 'critical').length;

  return (
    <div className="h-full">
      {lowStockProducts.length === 0 ? (
        <div className={cn(
          "flex flex-col items-center justify-center h-full py-8 text-center space-y-4 rounded-xl",
          "bg-gradient-to-br from-muted/30 to-muted/20 border border-border/20"
        )}>
          <div className="p-3 rounded-xl bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/10 border border-green-200/50 dark:border-green-700/30">
            <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              جميع المنتجات بمخزون جيد
            </p>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              لا توجد منتجات تحتاج إعادة تعبئة حالياً
            </p>
          </div>
          <Button 
            asChild 
            variant="outline" 
            className={cn(
              "mt-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20",
              "hover:bg-gradient-to-br hover:from-primary/20 hover:to-primary/10 hover:border-primary/30",
              "text-primary font-semibold transition-all duration-300"
            )}
          >
            <Link to="/dashboard/inventory" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              عرض تقرير المخزون
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* إحصائيات سريعة */}
          <div className="grid grid-cols-2 gap-3">
            <div className={cn(
              "p-3 rounded-xl border transition-all duration-300",
              "bg-gradient-to-br from-background/60 to-background/40 backdrop-blur-sm border-border/30"
            )}>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/20 dark:to-red-800/10">
                  <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">منتجات حرجة</p>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">{criticalProducts}</p>
                </div>
              </div>
            </div>
            
            <div className={cn(
              "p-3 rounded-xl border transition-all duration-300",
              "bg-gradient-to-br from-background/60 to-background/40 backdrop-blur-sm border-border/30"
            )}>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                  <DollarSign className="h-3 w-3 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">قيمة المخزون</p>
                  <p className="text-xs font-bold text-primary">{formatCurrency(totalValue)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* قائمة المنتجات */}
          <div className="space-y-3">
            {lowStockProducts.map((product) => {
              const quantity = product.stock_quantity || 0;
              const stockLevel = getStockLevel(product);
              const estimatedValue = quantity * (product.price || 0);
              
              return (
                <div 
                  key={product.id} 
                  className={cn(
                    "p-4 rounded-xl transition-all duration-300 group",
                    "bg-gradient-to-br from-background/60 to-background/40 backdrop-blur-sm border border-border/30",
                    "hover:shadow-md hover:scale-[1.02] cursor-pointer"
                  )}
                >
                  {/* الصف الأول: معلومات المنتج الأساسية */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 overflow-hidden border border-border/30 group-hover:scale-110 transition-transform duration-300">
                        <img
                          src={product.thumbnail_image || '/placeholder.svg'}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold group-hover:text-primary transition-colors duration-300 line-clamp-1">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="font-medium">{product.sku}</span>
                          {product.category && (
                            <>
                              <span>•</span>
                              <span className="font-medium capitalize">{product.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
                        "bg-gradient-to-br", getStockLevelColor(stockLevel)
                      )}>
                        {getStockLevelIcon(stockLevel)}
                        <span>{getStockLevelText(stockLevel)}</span>
                      </div>
                    </div>
                  </div>

                  {/* الصف الثاني: تفاصيل المخزون والقيمة */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground font-medium">المتبقي</p>
                        <p className={cn(
                          "text-lg font-bold",
                          stockLevel === 'critical' ? 'text-red-600 dark:text-red-400' :
                          stockLevel === 'low' ? 'text-orange-600 dark:text-orange-400' :
                          'text-yellow-600 dark:text-yellow-400'
                        )}>
                          {quantity}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground font-medium">الحد الأدنى</p>
                        <p className="text-sm font-semibold text-foreground">
                          {product.min_stock_level || 5}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground font-medium">القيمة</p>
                        <p className="text-xs font-semibold text-primary">
                          {formatCurrency(estimatedValue)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/dashboard/products/${product.id}`}
                        className={cn(
                          "p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20",
                          "hover:bg-gradient-to-br hover:from-primary/20 hover:to-primary/10 hover:border-primary/30",
                          "text-primary transition-all duration-300 hover:scale-110"
                        )}
                      >
                        <Eye className="h-3 w-3" />
                      </Link>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          "h-7 px-2 text-xs bg-gradient-to-br from-green-50 to-green-25 dark:from-green-900/20 dark:to-green-800/10",
                          "border-green-200/50 dark:border-green-700/30 text-green-600 dark:text-green-400",
                          "hover:bg-gradient-to-br hover:from-green-100 hover:to-green-50 hover:border-green-300/50",
                          "transition-all duration-300"
                        )}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        إعادة طلب
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* أزرار الإجراءات */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button 
              asChild 
              variant="outline" 
              className={cn(
                "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20",
                "hover:bg-gradient-to-br hover:from-primary/20 hover:to-primary/10 hover:border-primary/30",
                "text-primary font-semibold transition-all duration-300"
              )}
            >
              <Link to="/dashboard/inventory" className="flex items-center justify-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs">إدارة المخزون</span>
              </Link>
            </Button>
            
            <Button 
              asChild 
              variant="outline" 
              className={cn(
                "bg-gradient-to-br from-orange-50 to-orange-25 dark:from-orange-900/20 dark:to-orange-800/10",
                "border-orange-200/50 dark:border-orange-700/30 text-orange-600 dark:text-orange-400",
                "hover:bg-gradient-to-br hover:from-orange-100 hover:to-orange-50 hover:border-orange-300/50",
                "font-semibold transition-all duration-300"
              )}
            >
              <Link to="/dashboard/inventory?tab=to-reorder" className="flex items-center justify-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-xs">طلبات الشراء</span>
              </Link>
            </Button>
          </div>
          
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
        </div>
      )}
    </div>
  );
};

export default LowStockCard;
