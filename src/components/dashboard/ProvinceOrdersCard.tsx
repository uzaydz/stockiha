import { useEffect, useState } from 'react';
import { Package, Crown, Award, Medal, MapPin, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface ProvinceData {
  province_name: string;
  province_id: string;
  order_count: number;
  total_revenue: number;
  avg_order_value: number;
}

interface ProvinceOrdersCardProps {
  organizationId: string;
  limit?: number;
}

const ProvinceOrdersCard = ({ organizationId, limit = 5 }: ProvinceOrdersCardProps) => {
  const [provinceData, setProvinceData] = useState<ProvinceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProvinceData = async () => {
      if (!organizationId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // 1. جلب بيانات الولايات باللغة العربية
        const { data: provinceData, error: provinceError } = await supabase
          .from('yalidine_provinces_global')
          .select('id, name_ar');
          
        if (provinceError) throw provinceError;
        
        // إنشاء خريطة الولايات من المعرف (كسلسلة نصية) إلى الاسم العربي
        const provinceNames: Record<string, string> = {};
        provinceData?.forEach(province => {
          if (province && province.id !== null && province.name_ar) {
            provinceNames[province.id.toString()] = province.name_ar;
          }
        });
        
        // 2. جلب بيانات الطلبات
        const { data: ordersData, error: ordersError } = await supabase
          .from('online_orders_view')
          .select(`
            province,
            total
          `)
          .eq('organization_id', organizationId)
          .not('province', 'is', null);
        
        if (ordersError) throw ordersError;
        
        // 3. معالجة البيانات وتجميعها حسب الولاية
        const provinceMap = new Map<string, { count: number, revenue: number }>();
        
        ordersData?.forEach(order => {
          if (!order.province) return;
          
          const key = order.province;
          const existing = provinceMap.get(key) || { count: 0, revenue: 0 };
          
          provinceMap.set(key, {
            count: existing.count + 1,
            revenue: existing.revenue + (parseFloat(order.total?.toString() || '0') || 0)
          });
        });
        
        // 4. تحويل البيانات إلى مصفوفة وترتيبها
        const processedData: ProvinceData[] = Array.from(provinceMap.entries())
          .map(([province, stats]) => {
            let provinceName = province;
            
            // إذا كان مفتاح الولاية رقمًا وموجود في قائمة الأسماء، استخدم الاسم العربي
            if (/^\d+$/.test(province) && provinceNames[province]) {
              provinceName = provinceNames[province];
            }
            
            return {
              province_name: provinceName,
              province_id: province,
              order_count: stats.count,
              total_revenue: stats.revenue,
              avg_order_value: stats.revenue / stats.count
            };
          })
          .sort((a, b) => b.order_count - a.order_count)
          .slice(0, limit);
        
        setProvinceData(processedData);
      } catch (err) {
        setError('حدث خطأ أثناء جلب بيانات الولايات');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProvinceData();
  }, [organizationId, limit]);

  // تنسيق الرقم لعرض القيم النقدية
  const formatCurrency = (value: number): string => {
    return `${Number(value).toLocaleString('ar-DZ')} د.ج`;
  };

  // الحصول على أيقونة الترتيب
  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (index === 1) return <Award className="h-4 w-4 text-gray-400" />;
    if (index === 2) return <Medal className="h-4 w-4 text-amber-600" />;
    return <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>;
  };

  // الحصول على لون الترتيب
  const getRankColor = (index: number) => {
    if (index === 0) return 'from-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-800/10 text-yellow-600 dark:text-yellow-400 border-yellow-200/50 dark:border-yellow-700/30';
    if (index === 1) return 'from-gray-100 to-gray-50 dark:from-gray-900/20 dark:to-gray-800/10 text-gray-600 dark:text-gray-400 border-gray-200/50 dark:border-gray-700/30';
    if (index === 2) return 'from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-amber-800/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-700/30';
    return 'from-primary/20 to-primary/10 text-primary border-primary/20';
  };
  
  return (
    <div className={cn(
      "rounded-xl bg-card text-card-foreground relative overflow-hidden transition-all duration-300",
      "bg-gradient-to-br from-background/95 to-background/90 backdrop-blur-md border border-border/20",
      "shadow-lg hover:shadow-xl before:absolute before:inset-0 before:bg-gradient-to-br",
      "before:from-primary/5 before:to-transparent before:pointer-events-none"
    )}>
      <div className="p-6 relative z-10">
        {/* الرأس */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "flex items-center justify-center h-12 w-12 rounded-xl border transition-all duration-300",
              "bg-gradient-to-br from-primary/20 to-primary/10 text-primary border-primary/20",
              "hover:scale-110 shadow-md hover:shadow-lg"
            )}>
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                أفضل الولايات من حيث الطلبات
              </h3>
              <p className="text-sm text-muted-foreground font-medium">
                ترتيب الولايات حسب عدد الطلبات والإيرادات
              </p>
            </div>
          </div>
        </div>

        {/* المحتوى */}
        <div className="h-80">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground font-medium">جاري تحميل بيانات الولايات...</p>
            </div>
          ) : error ? (
            <div className={cn(
              "flex flex-col items-center justify-center h-full space-y-4 text-center",
              "bg-gradient-to-br from-muted/30 to-muted/20 border border-border/20 rounded-xl p-6"
            )}>
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/20 dark:to-red-800/10 border border-red-200/50 dark:border-red-700/30">
                <Package className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-destructive text-sm font-medium">{error}</p>
            </div>
          ) : provinceData.length === 0 ? (
            <div className={cn(
              "flex flex-col items-center justify-center h-full space-y-4 text-center",
              "bg-gradient-to-br from-muted/30 to-muted/20 border border-border/20 rounded-xl p-6"
            )}>
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  لا توجد بيانات طلبات حسب الولايات
                </p>
                <p className="text-sm text-muted-foreground mt-1 font-medium">
                  ستظهر البيانات هنا بمجرد وجود طلبات
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {provinceData.map((province, index) => (
                <div 
                  key={province.province_id} 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl transition-all duration-300 group",
                    "bg-gradient-to-br from-background/60 to-background/40 backdrop-blur-sm border border-border/30",
                    "hover:shadow-md hover:scale-[1.02] cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-110",
                      "bg-gradient-to-br", getRankColor(index)
                    )}>
                      {getRankIcon(index)}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors duration-300">
                        {province.province_name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          <span className="font-medium">{province.order_count} طلب</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          <span className="font-medium">{formatCurrency(province.avg_order_value)} متوسط</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-foreground text-sm bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                      {formatCurrency(province.total_revenue)}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      إجمالي الإيرادات
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProvinceOrdersCard;
