import { useEffect, useState, useMemo, memo, useCallback, useRef } from 'react';
import { Map as AlgeriaMap } from 'algeria-map-ts';
import { supabase } from '@/lib/supabase';
import { yalidineProvinces } from '@/data/yalidine-provinces';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MapPin,
  TrendingUp,
  CreditCard,
  X
} from 'lucide-react';

// === STYLES: High-Performance CSS ===
const mapStyles = `
  .algeria-map-tooltip,
  .tooltip,
  svg title {
    display: none !important;
  }

  .algeria-map-container svg {
    filter: drop-shadow(0 4px 20px rgba(0,0,0,0.04));
    will-change: transform;
  }

  /* Base Path Styles */
  .algeria-map-container svg path {
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
    stroke-width: 0.5px !important;
    vector-effect: non-scaling-stroke;
    outline: none !important;
    cursor: crosshair !important;
  }

  /* Active/Hover Styles */
  .algeria-map-container svg path:hover {
    filter: brightness(1.1) drop-shadow(0 0 15px rgba(249, 115, 22, 0.4)) !important;
    z-index: 50;
    transform: translateY(-2px) scale(1.005);
  }

  /* Dot Grid Background Pattern */
  .bg-dot-pattern {
    background-image: radial-gradient(rgba(0,0,0,0.1) 1px, transparent 1px);
    background-size: 20px 20px;
  }
  .dark .bg-dot-pattern {
    background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
  }
`;

// === TYPES ===
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

// === UTILS ===
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ar-DZ', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(value);
};

// Heatmap Color Scale (SaaS Style: Slate Base -> Vibrant Accents)
const getColorByOrderCount = (count: number, maxCount: number, isDark: boolean): string => {
  if (count === 0) return isDark ? '#18181b' : '#f4f4f5'; // zinc-900 / zinc-100

  const intensity = maxCount > 0 ? count / maxCount : 0;

  // Using a sophisticated Orange/Amber scale
  if (isDark) {
    if (intensity > 0.8) return '#ea580c'; // High
    if (intensity > 0.5) return '#c2410c';
    if (intensity > 0.2) return '#9a3412';
    return '#7c2d12'; // Low
  } else {
    if (intensity > 0.8) return '#f97316';
    if (intensity > 0.5) return '#fb923c';
    if (intensity > 0.2) return '#fdba74';
    return '#fed7aa';
  }
};

// === COMPONENT ===
const AlgeriaOrdersMap = memo(({
  organizationId,
  height = '500px',
  width = '100%'
}: AlgeriaOrdersMapProps) => {
  // Data State
  const [orderData, setOrderData] = useState<Map<string, WilayaOrderData>>(new Map());
  const [selectedWilaya, setSelectedWilaya] = useState<WilayaOrderData | null>(null);

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Hover State (Ref-based for max performance)
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hoveredData, setHoveredData] = useState<WilayaOrderData | null>(null);

  // --- Dark Mode Detection ---
  useEffect(() => {
    const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // --- Data Fetching ---
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!organizationId) return;
      setIsLoading(true);
      try {
        const { data: orders, error } = await supabase
          .from('online_orders_view')
          .select('province, total')
          .eq('organization_id', organizationId)
          .not('province', 'is', null);

        if (error) throw error;
        if (!isMounted) return;

        // Process Data
        const statsMap = new Map<string, { count: number, revenue: number }>();
        orders?.forEach(o => {
          const key = o.province?.toString();
          if (!key) return;
          const curr = statsMap.get(key) || { count: 0, revenue: 0 };
          statsMap.set(key, {
            count: curr.count + 1,
            revenue: curr.revenue + (Number(o.total) || 0)
          });
        });

        // Map to Provinces
        const finalData = new Map<string, WilayaOrderData>();
        yalidineProvinces.forEach(p => {
          const s = statsMap.get(p.id.toString()) || { count: 0, revenue: 0 };
          finalData.set(p.name, {
            name: p.name,
            name_ar: p.name_ar || p.name,
            order_count: s.count,
            total_revenue: s.revenue,
            avg_order_value: s.count ? s.revenue / s.count : 0
          });
        });

        setOrderData(finalData);
      } catch (e) {
        console.error('Error:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [organizationId]);

  // --- Derived Metrics ---
  const { maxCount, totalStats } = useMemo(() => {
    let max = 0;
    let tOrders = 0;
    let tRev = 0;
    let activeW = 0;

    orderData.forEach(d => {
      if (d.order_count > max) max = d.order_count;
      tOrders += d.order_count;
      tRev += d.total_revenue;
      if (d.order_count > 0) activeW++;
    });

    return {
      maxCount: max || 1,
      totalStats: {
        orders: tOrders,
        revenue: tRev,
        coverage: activeW,
        avg: tOrders ? tRev / tOrders : 0
      }
    };
  }, [orderData]);

  // --- Map Visualization Data ---
  const mapData = useMemo(() => {
    const data: Record<string, { value: number; color: string }> = {};
    orderData.forEach((d, name) => {
      data[name] = {
        value: d.order_count,
        color: getColorByOrderCount(d.order_count, maxCount, isDarkMode)
      };
    });
    return data;
  }, [orderData, maxCount, isDarkMode]);

  // --- Interaction Handlers ---

  // FIX: Moved useCallback here, BEFORE any early return
  const handleWilayaClick = useCallback((name: string) => {
    const d = orderData.get(name);
    if (d) setSelectedWilaya(d);
  }, [orderData]);

  // Optimized Mouse Move (Direct DOM Manipulation + React State Debounce)
  useEffect(() => {
    const container = document.querySelector('.algeria-map-container');
    if (!container) return;

    const idToName: Record<string, string> = {
      '_x30_1_Adrar': 'Adrar', '_x30_2_Chlef': 'Chlef', '_x30_3_Laghouat': 'Laghouat', '_x30_4_Oum_El-Bouaghi': 'Oum El Bouaghi',
      '_x30_5_Batna': 'Batna', '_x30_6_Béjaïa': 'Béjaïa', '_x30_7_Biskra': 'Biskra', '_x30_8_Béchar': 'Béchar',
      '_x30_9_Blida': 'Blida', '_x31_0_Bouira': 'Bouira', '_x31_1_Tamenrasset': 'Tamanrasset', '_x31_2_Tébessa': 'Tébessa',
      '_x31_3_Tlemcen': 'Tlemcen', '_x31_4_Tiaret': 'Tiaret', '_x31_5_Tizi-Ouzou': 'Tizi Ouzou', '_x31_6_Alger': 'Alger',
      '_x31_7_Djelfa': 'Djelfa', '_x31_8_Jijel': 'Jijel', '_x31_9_Sétif': 'Sétif', '_x32_0_Saida': 'Saïda',
      '_x32_1_Skikda': 'Skikda', '_x32_2_Sidi_Bel_Abbes': 'Sidi Bel Abbès', '_x32_3_Annaba': 'Annaba', '_x32_4_Guelma': 'Guelma',
      '_x32_5_Constantine': 'Constantine', '_x32_6_Médéa': 'Médéa', '_x32_7_Mostaganem': 'Mostaganem', '_x32_8_M_Sila': 'M\'Sila',
      '_x32_9_Mascara': 'Mascara', '_x33_0_Ouargla': 'Ouargla', '_x33_1_Oran': 'Oran', '_x33_2_El_Bayadh': 'El Bayadh',
      '_x33_3_Illizi': 'Illizi', '_x33_4_Bordj_Bou_Arréridj': 'Bordj Bou Arréridj', '_x33_5_Boumerdès': 'Boumerdès',
      '_x33_6_El_Tarf': 'El Tarf', '_x33_7_Tindouf': 'Tindouf', '_x33_8_Tissemsilt': 'Tissemsilt', '_x33_9_El_Oued': 'El Oued',
      '_x34_0_Khenchela': 'Khenchela', '_x34_1_Souk_Ahras': 'Souk Ahras', '_x34_2_Tipaza': 'Tipaza', '_x34_3_Mila': 'Mila',
      '_x34_4_Aïn_Defla': 'Aïn Defla', '_x34_5_Naâma': 'Naâma', '_x34_6_Aïn_Témouchent': 'Aïn Témouchent', '_x34_7_Ghardaïa': 'Ghardaïa',
      '_x34_8_Relizane': 'Relizane', '_x34_9_Timimoun': 'Timimoun', '_x35_0_Bordj_Badji_Mokhtar': 'Bordj Badji Mokhtar',
      '_x35_1_Ouled_Djellal': 'Ouled Djellal', '_x35_2_Béni_Abbès': 'Béni Abbès', '_x35_3_In_Salah': 'In Salah',
      '_x35_4_In_Guezzam': 'In Guezzam', '_x35_5_Touggourt': 'Touggourt', '_x35_6_Djanet': 'Djanet',
      '_x35_7_El_M_Ghair': 'El M\'Ghair', '_x35_8_El_Menia': 'El Menia'
    };

    let currentTarget: Element | null = null;

    const onMove = (e: MouseEvent) => {
      // 1. Move Tooltip Visibility (Direct DOM) for absolute zero lag
      if (tooltipRef.current) {
        tooltipRef.current.style.transform = `translate(${e.clientX + 15}px, ${e.clientY + 15}px)`;
      }

      // 2. Identify Target
      const target = e.target as Element;
      if (target && (target.tagName === 'path' || target.tagName === 'polygon')) {
        if (target !== currentTarget) {
          currentTarget = target;
          const id = target.id || target.getAttribute('id');
          const name = id ? idToName[id] : null;
          const data = name ? orderData.get(name) : null;

          if (data) {
            setHoveredData(data);
            if (tooltipRef.current) tooltipRef.current.style.opacity = '1';
          } else {
            setHoveredData(null);
            if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
          }
        }
      } else {
        if (currentTarget) {
          currentTarget = null;
          setHoveredData(null);
          if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
        }
      }
    };

    const onLeave = () => {
      currentTarget = null;
      setHoveredData(null);
      if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
    };

    container.addEventListener('mousemove', onMove, { passive: true });
    container.addEventListener('mouseleave', onLeave);

    return () => {
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('mouseleave', onLeave);
    };
  }, [orderData]);

  if (isLoading) {
    return (
      <div className="flex h-[500px] w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <span className="animate-pulse text-sm font-medium text-zinc-400">تحليل البيانات الجغرافية...</span>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
      <style>{mapStyles}</style>

      {/* 1. Header & Quick Stats (HUD Style) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 border-b border-zinc-100 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm z-10 relative">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-600 border border-orange-100 dark:border-orange-500/20">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">التوزيع الجغرافي</h3>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">ALGERIA ORDERS INTELLIGENCE</p>
          </div>
        </div>

        {/* Mini Stats Bar */}
        <div className="hidden md:flex items-center gap-6 text-xs mt-3 md:mt-0">
          <div className="flex flex-col items-end">
            <span className="text-zinc-400 font-medium">الإجمالي</span>
            <span className="text-zinc-900 dark:text-zinc-200 font-bold font-mono">{totalStats.orders}</span>
          </div>
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800"></div>
          <div className="flex flex-col items-end">
            <span className="text-zinc-400 font-medium">العائدات</span>
            <span className="text-zinc-900 dark:text-zinc-200 font-bold font-mono">{formatCurrency(totalStats.revenue)}</span>
          </div>
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800"></div>
          <div className="flex flex-col items-end">
            <span className="text-zinc-400 font-medium">المتوسط</span>
            <span className="text-zinc-900 dark:text-zinc-200 font-bold font-mono">{formatCurrency(totalStats.avg)}</span>
          </div>
        </div>
      </div>

      {/* 2. Background Grid Pattern */}
      <div className="absolute inset-0 bg-dot-pattern opacity-50 pointer-events-none"></div>

      {/* 3. The Map */}
      <div className="algeria-map-container relative z-0 p-8 transition-opacity duration-500" style={{ minHeight: height }}>
        <AlgeriaMap
          color={isDarkMode ? '#1e1e20' : '#f4f4f5'}
          HoverColor={isDarkMode ? '#fb923c' : '#fb923c'} // Always Orange on hover
          stroke={isDarkMode ? '#27272a' : '#e4e4e7'}
          hoverStroke={isDarkMode ? '#ea580c' : '#ea580c'}
          height={height}
          width={width}
          data={mapData}
          onWilayaClick={handleWilayaClick}
        />
      </div>

      {/* 4. High Performance Portal Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed top-0 left-0 bg-zinc-900/95 text-white p-3 rounded-lg shadow-2xl border border-white/10 pointer-events-none z-[9999] opacity-0 transition-opacity duration-150 backdrop-blur-md min-w-[160px]"
        style={{ willChange: 'transform, opacity' }}
      >
        {hoveredData && (
          <>
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
              <span className="font-bold text-sm">{hoveredData.name_ar}</span>
              <span className="text-xs font-mono text-orange-400 ml-2">DZ</span>
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">ORDERS</span>
                <span className="font-bold">{hoveredData.order_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">REVENUE</span>
                <span>{formatCurrency(hoveredData.total_revenue)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 5. Minimal Slide-over Panel for Details */}
      <AnimatePresence>
        {selectedWilaya && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedWilaya(null)}
              className="absolute inset-0 bg-zinc-900/10 dark:bg-black/40 backdrop-blur-[1px] z-20"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute top-0 right-0 h-full w-full sm:w-80 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 z-30 shadow-2xl flex flex-col"
            >
              {/* Panel Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900">
                <div>
                  <h2 className="text-xl font-bold font-mono">{selectedWilaya.name}</h2>
                  <p className="text-sm text-zinc-500">{selectedWilaya.name_ar}</p>
                </div>
                <button onClick={() => setSelectedWilaya(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                  <X className="h-5 w-5 text-zinc-400" />
                </button>
              </div>

              {/* Panel Content */}
              <div className="p-6 flex-1 overflow-y-auto space-y-6">

                <div className="bg-orange-50 dark:bg-orange-900/10 p-5 rounded-xl border border-orange-100 dark:border-orange-500/20 text-center">
                  <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Total Orders</p>
                  <p className="text-4xl font-black text-orange-600 dark:text-orange-400 font-mono tracking-tighter">{selectedWilaya.order_count}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-medium">Revenue</p>
                      <p className="font-bold text-lg font-mono">{formatCurrency(selectedWilaya.total_revenue)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-medium">Avg. Value</p>
                      <p className="font-bold text-lg font-mono">{formatCurrency(selectedWilaya.avg_order_value)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
});

AlgeriaOrdersMap.displayName = 'AlgeriaOrdersMap';

export default AlgeriaOrdersMap;
