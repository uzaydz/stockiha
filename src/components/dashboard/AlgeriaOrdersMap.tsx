import { useEffect, useState, useMemo, memo, useCallback } from 'react';
import { Map as AlgeriaMap } from 'algeria-map-ts';
import { supabase } from '@/lib/supabase';
import { yalidineProvinces } from '@/data/yalidine-provinces';
import { cn } from '@/lib/utils';
import {
  MapPin,
  Package,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Info,
  X
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// CSS لإخفاء tooltip الافتراضي وتحسين التصميم
const mapStyles = `
  /* إخفاء tooltip الافتراضي من المكتبة */
  .algeria-map-tooltip,
  [class*="tooltip"],
  svg title {
    display: none !important;
  }

  /* تحسين تجربة الهوفر */
  .algeria-map-container svg path {
    transition: all 0.2s ease-in-out !important;
    cursor: pointer !important;
    stroke-width: 1 !important;
  }

  .algeria-map-container svg path:hover {
    filter: brightness(1.1) !important;
  }

  /* تحسين مظهر الخريطة */
  .algeria-map-container svg {
    max-width: 100%;
    height: auto;
  }
`;

interface WilayaOrderData {
  name: string;
  name_ar: string;
  order_count: number;
  total_revenue: number;
  avg_order_value: number;
}

interface AlgeriaOrdersMapProps {
  organizationId: string;
  height?: string;
  width?: string;
}

// تنسيق العملة
const formatCurrency = (value: number): string => {
  return `${Number(value).toLocaleString('ar-DZ')} د.ج`;
};

// الحصول على لون الولاية بناءً على عدد الطلبات (متوافق مع الدارك مود)
const getColorByOrderCount = (count: number, maxCount: number, isDark: boolean): string => {
  if (count === 0) return isDark ? '#1e293b' : '#fafafa';

  const percentage = (count / maxCount) * 100;

  if (isDark) {
    // الدارك مود - برتقالي
    if (percentage >= 80) return '#7c2d12';
    if (percentage >= 60) return '#9a3412';
    if (percentage >= 40) return '#c2410c';
    if (percentage >= 20) return '#ea580c';
    return '#fb923c';
  } else {
    // اللايت مود - برتقالي أفتح للوضوح
    if (percentage >= 80) return '#c2410c';
    if (percentage >= 60) return '#ea580c';
    if (percentage >= 40) return '#f97316';
    if (percentage >= 20) return '#fb923c';
    return '#fed7aa';
  }
};

// مكون بطاقة الإحصائية - memo لمنع إعادة الرندر غير الضرورية
const StatCard = memo(({ icon: Icon, label, value, isNumber = false }: {
  icon: any;
  label: string;
  value: string | number;
  isNumber?: boolean;
}) => (
  <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 p-3 rounded-xl border border-primary/20 dark:border-primary/30">
    <div className="flex items-center gap-2 mb-1">
      <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/20">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <span className="text-xs text-primary font-medium">{label}</span>
    </div>
    <p className={cn(
      "font-bold text-foreground",
      isNumber ? "text-xl" : "text-sm"
    )}>
      {value}
    </p>
  </div>
));

StatCard.displayName = 'StatCard';

const AlgeriaOrdersMap = memo(({
  organizationId,
  height = '500px',
  width = '100%'
}: AlgeriaOrdersMapProps) => {
  const [orderData, setOrderData] = useState<Map<string, WilayaOrderData>>(new Map());
  const [selectedWilaya, setSelectedWilaya] = useState<WilayaOrderData | null>(null);
  const [hoveredWilaya, setHoveredWilaya] = useState<WilayaOrderData | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  // كشف الدارك مود - محسّن
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // جلب بيانات الطلبيات - مرة واحدة فقط
  useEffect(() => {
    let isMounted = true;

    const fetchOrderData = async () => {
      if (!organizationId) return;

      setIsLoading(true);
      setError(null);

      try {
        const { data: ordersData, error: ordersError } = await supabase
          .from('online_orders_view')
          .select('province, total')
          .eq('organization_id', organizationId)
          .not('province', 'is', null);

        if (ordersError) throw ordersError;

        if (!isMounted) return;

        const dataMap = new Map<string, { count: number, revenue: number }>();

        ordersData?.forEach(order => {
          if (!order.province) return;

          const key = order.province.toString();
          const existing = dataMap.get(key) || { count: 0, revenue: 0 };

          dataMap.set(key, {
            count: existing.count + 1,
            revenue: existing.revenue + (parseFloat(order.total?.toString() || '0') || 0)
          });
        });

        const processedData = new Map<string, WilayaOrderData>();

        yalidineProvinces.forEach(province => {
          const stats = dataMap.get(province.id.toString()) || { count: 0, revenue: 0 };

          processedData.set(province.name, {
            name: province.name,
            name_ar: province.name_ar || province.name,
            order_count: stats.count,
            total_revenue: stats.revenue,
            avg_order_value: stats.count > 0 ? stats.revenue / stats.count : 0
          });
        });

        setOrderData(processedData);
      } catch (err) {
        console.error('Error fetching order data:', err);
        if (isMounted) {
          setError('حدث خطأ أثناء جلب بيانات الطلبيات');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOrderData();

    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  // حساب الحد الأقصى - مع memo
  const maxOrderCount = useMemo(() => {
    let max = 0;
    orderData.forEach(data => {
      if (data.order_count > max) max = data.order_count;
    });
    return max || 1; // تجنب القسمة على صفر
  }, [orderData]);

  // تحضير البيانات للخريطة - مع memo
  const mapData = useMemo(() => {
    const data: Record<string, { value: number; color: string }> = {};

    orderData.forEach((wilayaData, wilayaName) => {
      data[wilayaName] = {
        value: wilayaData.order_count,
        color: getColorByOrderCount(wilayaData.order_count, maxOrderCount, isDarkMode)
      };
    });

    return data;
  }, [orderData, maxOrderCount, isDarkMode]);

  // الألوان الثابتة - مع useMemo
  const colors = useMemo(() => ({
    default: isDarkMode ? '#1e293b' : '#fafafa',
    hover: isDarkMode ? '#fb923c' : '#fdba74',
    stroke: isDarkMode ? '#334155' : '#d4d4d8',
    hoverStroke: isDarkMode ? '#ea580c' : '#f97316'
  }), [isDarkMode]);

  // معالجة النقر - useCallback
  const handleWilayaClick = useCallback((wilayaName: string) => {
    const wilayaData = orderData.get(wilayaName);
    if (wilayaData) {
      setSelectedWilaya(wilayaData);
    }
  }, [orderData]);

  // إغلاق التفاصيل - useCallback
  const handleCloseDetails = useCallback(() => {
    setSelectedWilaya(null);
  }, []);

  // معالجة حركة الماوس على الخريطة - محسّن
  useEffect(() => {
    // خريطة ربط معرفات المكتبة مع أسماء الولايات
    const idToWilayaMap: Record<string, string> = {
      '_x30_1_Adrar': 'Adrar',
      '_x30_2_Chlef': 'Chlef',
      '_x30_3_Laghouat': 'Laghouat',
      '_x30_4_Oum_El-Bouaghi': 'Oum El Bouaghi',
      '_x30_5_Batna': 'Batna',
      '_x30_6_Béjaïa': 'Béjaïa',
      '_x30_7_Biskra': 'Biskra',
      '_x30_8_Béchar': 'Béchar',
      '_x30_9_Blida': 'Blida',
      '_x31_0_Bouira': 'Bouira',
      '_x31_1_Tamenrasset': 'Tamanrasset',
      '_x31_2_Tébessa': 'Tébessa',
      '_x31_3_Tlemcen': 'Tlemcen',
      '_x31_4_Tiaret': 'Tiaret',
      '_x31_5_Tizi-Ouzou': 'Tizi Ouzou',
      '_x31_6_Alger': 'Alger',
      '_x31_7_Djelfa': 'Djelfa',
      '_x31_8_Jijel': 'Jijel',
      '_x31_9_Sétif': 'Sétif',
      '_x32_0_Saida': 'Saïda',
      '_x32_1_Skikda': 'Skikda',
      '_x32_2_Sidi_Bel_Abbes': 'Sidi Bel Abbès',
      '_x32_3_Annaba': 'Annaba',
      '_x32_4_Guelma': 'Guelma',
      '_x32_5_Constantine': 'Constantine',
      '_x32_6_Médéa': 'Médéa',
      '_x32_7_Mostaganem': 'Mostaganem',
      '_x32_8_M_Sila': 'M\'Sila',
      '_x32_9_Mascara': 'Mascara',
      '_x33_0_Ouargla': 'Ouargla',
      '_x33_1_Oran': 'Oran',
      '_x33_2_El_Bayadh': 'El Bayadh',
      '_x33_3_Illizi': 'Illizi',
      '_x33_4_Bordj_Bou_Arréridj': 'Bordj Bou Arréridj',
      '_x33_5_Boumerdès': 'Boumerdès',
      '_x33_6_El_Tarf': 'El Tarf',
      '_x33_7_Tindouf': 'Tindouf',
      '_x33_8_Tissemsilt': 'Tissemsilt',
      '_x33_9_El_Oued': 'El Oued',
      '_x34_0_Khenchela': 'Khenchela',
      '_x34_1_Souk_Ahras': 'Souk Ahras',
      '_x34_2_Tipaza': 'Tipaza',
      '_x34_3_Mila': 'Mila',
      '_x34_4_Aïn_Defla': 'Aïn Defla',
      '_x34_5_Naâma': 'Naâma',
      '_x34_6_Aïn_Témouchent': 'Aïn Témouchent',
      '_x34_7_Ghardaïa': 'Ghardaïa',
      '_x34_8_Relizane': 'Relizane',
      '_x34_9_Timimoun': 'Timimoun',
      '_x35_0_Bordj_Badji_Mokhtar': 'Bordj Badji Mokhtar',
      '_x35_1_Ouled_Djellal': 'Ouled Djellal',
      '_x35_2_Béni_Abbès': 'Béni Abbès',
      '_x35_3_In_Salah': 'In Salah',
      '_x35_4_In_Guezzam': 'In Guezzam',
      '_x35_5_Touggourt': 'Touggourt',
      '_x35_6_Djanet': 'Djanet',
      '_x35_7_El_M_Ghair': 'El M\'Ghair',
      '_x35_8_El_Menia': 'El Menia'
    };

    // انتظر قليلاً حتى تحميل الخريطة
    const timer = setTimeout(() => {
      const mapContainer = document.querySelector('.algeria-map-container');
      if (!mapContainer) return;

      const handleMouseMove = (e: MouseEvent) => {
        setMousePosition({ x: e.clientX, y: e.clientY });

        const target = e.target as any;

        // التحقق من أن العنصر هو path أو polygon
        if (target && (target.tagName === 'path' || target.tagName === 'PATH' ||
                      target.tagName === 'polygon' || target.tagName === 'POLYGON')) {
          // الحصول على المعرف من id
          const elementId = target.id || target.getAttribute('id');

          if (elementId) {
            // تحويل المعرف إلى اسم الولاية
            const wilayaName = idToWilayaMap[elementId];

            if (wilayaName) {
              // البحث في البيانات
              const foundData = orderData.get(wilayaName) || null;
              setHoveredWilaya(foundData);
            } else {
              setHoveredWilaya(null);
            }
          } else {
            setHoveredWilaya(null);
          }
        } else {
          setHoveredWilaya(null);
        }
      };

      const handleMouseLeave = () => {
        setHoveredWilaya(null);
      };

      mapContainer.addEventListener('mousemove', handleMouseMove);
      mapContainer.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        mapContainer.removeEventListener('mousemove', handleMouseMove);
        mapContainer.removeEventListener('mouseleave', handleMouseLeave);
      };
    }, 500);

    return () => clearTimeout(timer);
  }, [orderData]);

  // حساب الإحصائيات - مع memo
  const totalStats = useMemo(() => {
    let totalOrders = 0;
    let totalRevenue = 0;
    let wilayasWithOrders = 0;

    orderData.forEach(data => {
      totalOrders += data.order_count;
      totalRevenue += data.total_revenue;
      if (data.order_count > 0) wilayasWithOrders++;
    });

    return {
      totalOrders,
      totalRevenue,
      wilayasWithOrders,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
    };
  }, [orderData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">جاري تحميل خريطة الطلبات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* إضافة الأنماط */}
      <style>{mapStyles}</style>

      {/* الإحصائيات الإجمالية */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Package}
          label="إجمالي الطلبات"
          value={totalStats.totalOrders}
          isNumber
        />
        <StatCard
          icon={DollarSign}
          label="إجمالي الإيرادات"
          value={formatCurrency(totalStats.totalRevenue)}
        />
        <StatCard
          icon={MapPin}
          label="الولايات النشطة"
          value={totalStats.wilayasWithOrders}
          isNumber
        />
        <StatCard
          icon={TrendingUp}
          label="متوسط قيمة الطلب"
          value={formatCurrency(totalStats.avgOrderValue)}
        />
      </div>

      {/* عنوان الخريطة */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">التوزيع الجغرافي</h3>
            <p className="text-xs text-muted-foreground">انقر على أي ولاية لعرض التفاصيل</p>
          </div>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Info className="h-4 w-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs">الألوان الداكنة تشير إلى عدد أكبر من الطلبات</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* الخريطة */}
      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-background dark:to-muted/10 rounded-xl p-6 border border-gray-200/50 dark:border-border/20 shadow-sm overflow-hidden">
        <div className="algeria-map-container bg-white dark:bg-slate-900/50 rounded-lg p-4" style={{ minHeight: height }}>
          <AlgeriaMap
            color={colors.default}
            HoverColor={colors.hover}
            stroke={colors.stroke}
            hoverStroke={colors.hoverStroke}
            height={height}
            width={width}
            data={mapData}
            onWilayaClick={handleWilayaClick}
          />
        </div>

        {/* Tooltip مخصص عند الهوفر */}
        {hoveredWilaya && (
          <div
            className="fixed z-[9999] pointer-events-none animate-in fade-in duration-200"
            style={{
              left: mousePosition.x + 20,
              top: mousePosition.y + 20,
            }}
          >
            <div className="bg-white dark:bg-slate-800 border-2 border-primary/30 rounded-xl shadow-2xl p-3 min-w-[220px]">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/30">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <h4 className="font-bold text-foreground text-base">{hoveredWilaya.name_ar}</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4 bg-muted/30 dark:bg-muted/10 p-2 rounded-lg">
                  <span className="text-muted-foreground font-medium">عدد الطلبات:</span>
                  <span className="font-bold text-primary">{hoveredWilaya.order_count}</span>
                </div>
                <div className="flex items-center justify-between gap-4 bg-muted/30 dark:bg-muted/10 p-2 rounded-lg">
                  <span className="text-muted-foreground font-medium">الإيرادات:</span>
                  <span className="font-bold text-foreground text-xs">{formatCurrency(hoveredWilaya.total_revenue)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* مؤشر الألوان */}
        <div className="absolute bottom-6 left-6 bg-background/95 dark:bg-background/90 backdrop-blur-md p-3 rounded-xl border border-border/50 dark:border-border/30 shadow-lg">
          <p className="text-xs font-semibold mb-2 text-foreground">كثافة الطلبات</p>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-3 rounded-sm border border-border/20"
                style={{ backgroundColor: isDarkMode ? '#fb923c' : '#fed7aa' }}
              />
              <span className="text-xs text-muted-foreground">قليل</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-3 rounded-sm border border-border/20"
                style={{ backgroundColor: isDarkMode ? '#ea580c' : '#fb923c' }}
              />
              <span className="text-xs text-muted-foreground">متوسط</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-3 rounded-sm border border-border/20"
                style={{ backgroundColor: isDarkMode ? '#9a3412' : '#ea580c' }}
              />
              <span className="text-xs text-muted-foreground">كثير</span>
            </div>
          </div>
        </div>
      </div>

      {/* تفاصيل الولاية المختارة */}
      {selectedWilaya && (
        <div className={cn(
          "bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5",
          "rounded-xl p-4 border border-primary/20 dark:border-primary/30 shadow-sm",
          "animate-in fade-in slide-in-from-bottom-2 duration-300"
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <h4 className="text-lg font-bold text-primary">{selectedWilaya.name_ar}</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-background/60 dark:bg-background/40 backdrop-blur-sm p-3 rounded-lg border border-border/30 dark:border-border/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">عدد الطلبات</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{selectedWilaya.order_count}</p>
                </div>

                <div className="bg-background/60 dark:bg-background/40 backdrop-blur-sm p-3 rounded-lg border border-border/30 dark:border-border/20">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">إجمالي الإيرادات</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{formatCurrency(selectedWilaya.total_revenue)}</p>
                </div>

                <div className="bg-background/60 dark:bg-background/40 backdrop-blur-sm p-3 rounded-lg border border-border/30 dark:border-border/20">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">متوسط قيمة الطلب</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{formatCurrency(selectedWilaya.avg_order_value)}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleCloseDetails}
              className="p-1.5 rounded-lg hover:bg-background/60 dark:hover:bg-background/40 transition-colors"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* رسالة في حالة عدم وجود طلبات */}
      {totalStats.totalOrders === 0 && (
        <div className="text-center py-8 space-y-3 bg-muted/30 dark:bg-muted/10 rounded-xl border border-border/40 dark:border-border/20">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-muted/50 dark:bg-muted/30">
              <Package className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">لا توجد طلبات حتى الآن</p>
            <p className="text-xs text-muted-foreground mt-1">ستظهر البيانات على الخريطة بمجرد استلام الطلبات</p>
          </div>
        </div>
      )}
    </div>
  );
});

AlgeriaOrdersMap.displayName = 'AlgeriaOrdersMap';

export default AlgeriaOrdersMap;
