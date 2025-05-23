import { useEffect, useState } from 'react';
import { Package, Crown, Award, Medal } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
        console.error('Error fetching province data:', err);
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
  
  return (
    <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground mb-1">
          أفضل الولايات من حيث الطلبات
        </h3>
        <p className="text-sm text-muted-foreground">
          ترتيب الولايات حسب عدد الطلبات
        </p>
      </div>
      <div className="h-80">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        ) : provinceData.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground text-sm">لا توجد بيانات طلبات حسب الولايات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {provinceData.map((province, index) => (
              <div 
                key={province.province_id} 
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    {getRankIcon(index)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground text-sm">
                      {province.province_name}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Package className="h-3 w-3" />
                      <span>{province.order_count} طلب</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold text-foreground text-sm">
                    {formatCurrency(province.total_revenue)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(province.avg_order_value)} متوسط
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProvinceOrdersCard; 