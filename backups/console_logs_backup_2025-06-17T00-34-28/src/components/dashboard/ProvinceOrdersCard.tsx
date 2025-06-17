import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  MapPin, 
  TrendingUp, 
  Package, 
  AlertCircle,
  DollarSign,
  BarChart3,
  Crown,
  Award,
  Medal,
  Building
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

// تنسيق العملة
const formatCurrency = (value: number): string => {
  return `${Number(value).toLocaleString('ar-DZ')} د.ج`;
};

// الحصول على أيقونة الترتيب
const getRankIcon = (index: number) => {
  if (index === 0) return <Crown className="h-4 w-4" />;
  if (index === 1) return <Award className="h-4 w-4" />;
  if (index === 2) return <Medal className="h-4 w-4" />;
  return <MapPin className="h-4 w-4" />;
};

// الحصول على لون الترتيب
const getRankColor = (index: number) => {
  if (index === 0) return 'from-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-800/10 text-yellow-600 dark:text-yellow-400 border-yellow-200/50 dark:border-yellow-700/30';
  if (index === 1) return 'from-gray-100 to-gray-50 dark:from-gray-900/20 dark:to-gray-800/10 text-gray-600 dark:text-gray-400 border-gray-200/50 dark:border-gray-700/30';
  if (index === 2) return 'from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-amber-800/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-700/30';
  return 'from-primary/20 to-primary/10 text-primary border-primary/20';
};

// مكون لعرض بيانات ولاية واحدة
const ProvinceItem = React.memo(({ province, index }: { province: ProvinceData; index: number }) => {
  const RankIcon = getRankIcon(index);
  
  return (
    <div 
      className={cn(
        "relative p-4 rounded-xl transition-all duration-300 group",
        "bg-background/80 border border-border/30 shadow-sm",
        "hover:shadow-md hover:scale-[1.01] cursor-pointer",
        "hover:border-primary/20"
      )}
      style={{
        animationDelay: `${index * 100}ms`
      }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* القسم الأيسر - معلومات الولاية */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* أيقونة الترتيب */}
          <div className={cn(
            "flex items-center justify-center h-10 w-10 rounded-lg shrink-0",
            "bg-gradient-to-br shadow-sm", getRankColor(index)
          )}>
            {RankIcon}
          </div>
          
          {/* معلومات الولاية */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {/* اسم الولاية */}
              <h4 className="text-sm font-bold group-hover:text-primary transition-colors duration-300">
                {province.province_name}
              </h4>
              
              {/* شارة الترتيب */}
              <div className="flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 rounded-md border border-primary/20">
                <Crown className="h-2.5 w-2.5 text-primary" />
                <span className="text-xs text-primary">المرتبة #{index + 1}</span>
              </div>
            </div>
            
            {/* إحصائيات الولاية */}
            <div className="flex flex-wrap gap-2 text-xs mt-2">
              <div className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                <Package className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">{province.order_count} طلب</span>
              </div>

              <div className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                <BarChart3 className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">متوسط الطلب: {formatCurrency(province.avg_order_value)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* القسم الأيمن - المبلغ الإجمالي */}
        <div className="text-right flex flex-col items-end gap-2">
          {/* المبلغ الإجمالي */}
          <div className="text-base font-bold text-primary">
            {formatCurrency(province.total_revenue)}
          </div>
          
          {/* نص الإجمالي */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>الإيرادات الإجمالية</span>
            <DollarSign className="h-3 w-3" />
          </div>
        </div>
      </div>
    </div>
  );
});

ProvinceItem.displayName = 'ProvinceItem';

// مكون عرض حالة فارغة
const EmptyProvinceState = () => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-8 text-center space-y-4 rounded-xl",
      "bg-muted/30 border border-border/30"
    )}>
      <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
        <MapPin className="h-6 w-6 text-primary" />
      </div>
      
      <div className="space-y-1 max-w-xs">
        <h3 className="text-base font-bold text-foreground">
          لا توجد بيانات طلبات حسب الولايات
        </h3>
        <p className="text-sm text-muted-foreground">
          ستظهر البيانات هنا بمجرد وجود طلبات من مختلف الولايات
        </p>
      </div>
      
      <Button 
        asChild 
        variant="outline" 
        className="mt-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
      >
        <Link to="/dashboard/orders" className="flex items-center gap-2">
          <Building className="h-4 w-4" />
          عرض جميع الطلبات
          <TrendingUp className="h-4 w-4 opacity-60" />
        </Link>
      </Button>
    </div>
  );
};

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">جاري تحميل بيانات الولايات...</p>
        </div>
      </div>
    );
  }

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
      {provinceData.length === 0 ? (
        <EmptyProvinceState />
      ) : (
        <div className="space-y-3">
          {provinceData.map((province, index) => (
            <ProvinceItem key={province.province_id} province={province} index={index} />
          ))}
          
          {/* زر عرض المزيد من الإحصائيات */}
          <div className="pt-2">
            <Button 
              asChild 
              variant="outline" 
              className="w-full bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
            >
              <Link to="/dashboard/statistics" className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>عرض إحصائيات الولايات</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    <span className="text-xs font-medium">{provinceData.length}</span>
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

export default ProvinceOrdersCard;
