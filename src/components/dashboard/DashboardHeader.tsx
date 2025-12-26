import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import {
  Calendar, ChevronDown, Quote, Sparkles, User, Briefcase, Globe, ArrowRight, ArrowLeft, RefreshCw, Star,
  Clock, CheckCircle2, LayoutDashboard, ScanBarcode, Package, ClipboardList, BarChart3, Truck, Wrench,
  Store, Users, Settings, Crown, FileSpreadsheet, GraduationCap, Laptop, Store as StoreIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Types
type TimeframeType = 'daily' | 'weekly' | 'monthly' | 'annual' | 'custom';

// Constants
const VERSES = [
  { text: "وَفِي السَّمَاءِ رِزْقُكُمْ وَمَا تُوعَدُونَ", source: "سورة الذاريات: 22" },
  { text: "يَرْجُونَ تِجَارَةً لَنْ تَبُورَ", source: "سورة فاطر: 29" },
  { text: "وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا", source: "سورة البقرة: 275" },
  { text: "فَانتَشِرُوا فِي الْأَرْضِ وَابْتَغُوا مِن فَضْلِ اللَّهِ", source: "سورة الجمعة: 10" },
  { text: "رِجَالٌ لَّا تُلْهِيهِمْ تِجَارَةٌ وَلَا بَيْعٌ عَن ذِكْرِ اللَّهِ", source: "سورة النور: 37" },
  { text: "وَمَا مِن دَابَّةٍ فِي الْأَرْضِ إِلَّا عَلَى اللَّهِ رِزْقُهَا", source: "سورة هود: 6" },
  { text: "لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ", source: "سورة إبراهيم: 7" },
];

const MOTIVATIONS = [
  { text: "تسعة أعشار الرزق في التجارة", highlight: "حديث شريف / مقولة مأثورة" },
  { text: "أفضل طريقة للتنبؤ بمستقبلك هي أن تصنعه", highlight: "ركز على مبيعات اليوم" },
  { text: "لا تنتظر الفرصة، بل اصنعها", highlight: "بادر بالاتصال بعملائك" },
  { text: "النجاح هو مجموع مجهودات صغيرة تتكرر كل يوم", highlight: "استمر في السعي" },
  { text: "كل عميل راضٍ هو سفير لعلامتك التجارية", highlight: "اهتم بالجودة" },
  { text: "التاجر الصدوق الأمين مع النبيين والصديقين", highlight: "الأمانة مفتاح الرزق" },
  { text: "السوق لا ينتظر المتأخرين", highlight: "اغتنم الفرصة الآن" },
];

const PERIODS: { value: TimeframeType; label: string }[] = [
  { value: 'daily', label: 'يومي' },
  { value: 'weekly', label: 'أسبوعي' },
  { value: 'monthly', label: 'شهري' },
  { value: 'annual', label: 'سنوي' },
  { value: 'custom', label: 'مخصص' },
];

// Added 'mode' property to NAV_ITEMS
const NAV_ITEMS = [
  { title: 'نظرة عامة', icon: LayoutDashboard, href: '/dashboard/pos-dashboard', mode: 'all' },
  { title: 'نقطة البيع', icon: ScanBarcode, href: '/dashboard/pos-advanced', mode: 'all' },
  { title: 'المنتجات', icon: Package, href: '/dashboard/product-operations/products', mode: 'full' },
  { title: 'سجل الطلبات', icon: ClipboardList, href: '/dashboard/pos-operations/orders', mode: 'all' },
  { title: 'التقارير', icon: BarChart3, href: '/dashboard/analytics', mode: 'full' },
  { title: 'الموردين', icon: Truck, href: '/dashboard/supplier-operations/suppliers', mode: 'full' },
  { title: 'الصيانة', icon: Wrench, href: '/dashboard/services-operations/repair', mode: 'full' },
  { title: 'طلبات المتجر', icon: Globe, href: '/dashboard/sales-operations/onlineOrders', mode: 'merchant' },
  { title: 'إعدادات المتجر', icon: Store, href: '/dashboard/store-operations/store-settings', mode: 'merchant' },
  { title: 'الموظفين', icon: Users, href: '/dashboard/staff-management', mode: 'full' },
  { title: 'الإعدادات', icon: Settings, href: '/dashboard/settings-unified', mode: 'full' },
  { title: 'الاشتراك', icon: Crown, href: '/dashboard/subscription', mode: 'full' },
  { title: 'كشف 104', icon: FileSpreadsheet, href: '/dashboard/etat104', mode: 'full' },
  { title: 'الأكاديمية', icon: GraduationCap, href: '/dashboard/courses-operations/all', mode: 'all' },
];

const DashboardHeader = ({ toggleSidebar, onTimeframeChange, onCustomDateChange }: any) => {
  const { user } = useAuth() as any;
  const { currentOrganization } = useTenant() as any;

  const [activeTimeframe, setActiveTimeframe] = useState<TimeframeType>('monthly');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)),
    end: new Date()
  });

  const [activeContent, setActiveContent] = useState<'verse' | 'motivation'>('verse');
  const [contentIndex, setContentIndex] = useState(0);
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [systemMode, setSystemMode] = useState<'full' | 'merchant'>('full');

  // Filter items based on mode
  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (systemMode === 'full') return item.mode === 'all' || item.mode === 'full';
    if (systemMode === 'merchant') return item.mode === 'all' || item.mode === 'merchant';
    return true;
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Enable mouse wheel scrolling for the horizontal menu
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      const onWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    }
  }, []);

  // Auto-rotate content every 12 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveContent(prev => {
        const newContent = prev === 'verse' ? 'motivation' : 'verse';
        // Update content index based on the NEW content type
        setContentIndex(Math.floor(Math.random() * (newContent === 'verse' ? VERSES.length : MOTIVATIONS.length)));
        return newContent;
      });
    }, 12000);

    // Initial greeting setup
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      setGreeting(hour >= 4 && hour < 12 ? 'صباح الخير' : 'مساء الخير');
      setCurrentTime(format(now, 'hh:mm a', { locale: ar }));
    };

    updateTime();
    const timeInterval = setInterval(updateTime, 60000); // Update time every minute

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  const handleTimeframeSelect = (value: TimeframeType) => {
    setActiveTimeframe(value);
    if (value === 'custom') {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(false);
      onTimeframeChange(value);
    }
  };

  const activePeriodLabel = PERIODS.find(p => p.value === activeTimeframe)?.label;

  return (
    <div
      className="mb-4 sm:mb-6 md:mb-8 pt-2 sm:pt-4 md:pt-6 space-y-4 sm:space-y-6 md:space-y-8"
      style={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >

      {/* ===== Top Bar: Time & Controls ===== */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Current Time */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-zinc-50 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
          <span className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-200" dir="ltr">{currentTime}</span>
        </div>

        {/* Right: Timeframe Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {activeTimeframe === 'custom' && (
            <div onClick={() => setShowDatePicker(!showDatePicker)} className="cursor-pointer text-[10px] sm:text-xs font-medium text-orange-600 bg-orange-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-orange-200">
              {format(customDateRange.start, 'dd/MM')} - {format(customDateRange.end, 'dd/MM')}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 sm:h-9 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-medium px-2.5 sm:px-4 gap-1.5 sm:gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-full shadow-sm text-xs sm:text-sm">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
                <span className="hidden xs:inline">{activePeriodLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              {PERIODS.map((period) => (
                <DropdownMenuItem
                  key={period.value}
                  onClick={() => handleTimeframeSelect(period.value)}
                  className={cn(
                    "flex items-center justify-between cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-800 py-2.5",
                    activeTimeframe === period.value && "bg-orange-50 dark:bg-orange-900/10 text-orange-600 font-semibold"
                  )}
                >
                  {period.label}
                  {activeTimeframe === period.value && <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Custom Date Picker (Expands) */}
      <AnimatePresence>
        {showDatePicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex justify-end overflow-hidden"
          >
            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <input
                type="date"
                className="bg-transparent text-sm font-medium w-auto focus:outline-none dark:text-white"
                value={customDateRange.start.toISOString().split('T')[0]}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
              />
              <span className="text-zinc-400">-</span>
              <input
                type="date"
                className="bg-transparent text-sm font-medium w-auto focus:outline-none dark:text-white"
                value={customDateRange.end.toISOString().split('T')[0]}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
              />
              <Button
                size="sm"
                className="h-7 px-3 rounded-lg bg-orange-500 text-white hover:bg-orange-600"
                onClick={() => {
                  onCustomDateChange?.(customDateRange.start, customDateRange.end);
                  setShowDatePicker(false);
                }}
              >
                تطبيق
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ===== Hero Section: Large Greeting & Widget ===== */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 lg:items-center">

        {/* Left Side: Large Bold Greeting */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-zinc-900 dark:bg-zinc-800 border-2 border-orange-100 dark:border-orange-900/50 shadow-xl shadow-orange-500/5 flex items-center justify-center overflow-hidden">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg sm:text-xl md:text-2xl font-bold text-orange-500">{user?.full_name?.charAt(0) || 'U'}</span>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 bg-emerald-500 border-2 sm:border-[3px] border-zinc-50 dark:border-zinc-900 rounded-full"></div>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight truncate">
                {greeting}، {user?.full_name?.split(' ')[0]}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium text-xs sm:text-sm md:text-base lg:text-lg mt-0.5 sm:mt-1 truncate">
                نتمنى لك يوماً مليئاً بالأرباح 🚀
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Inspiration Widget - مخفي على الشاشات الصغيرة جداً */}
        <div className="hidden sm:block w-full lg:w-[350px] xl:w-[400px] flex-shrink-0">
          <div className="w-full text-right group relative overflow-hidden rounded-xl sm:rounded-2xl bg-zinc-900 text-white p-4 sm:p-5 shadow-xl border border-zinc-800 hover:border-orange-500/30 transition-all">

            {/* Background Gradient & Noise */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-zinc-900 to-amber-600/10 opacity-60"></div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none"></div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeContent + contentIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 space-y-2 sm:space-y-3"
              >
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <span className={cn(
                    "text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border",
                    activeContent === 'verse'
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-orange-500/10 border-orange-500/20 text-orange-400"
                  )}>
                    {activeContent === 'verse' ? 'آية اليوم' : 'نصيحة ذهبية'}
                  </span>
                  <Star className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", activeContent === 'verse' ? "text-amber-500" : "text-orange-500")} />
                </div>

                <p className={cn(
                  "text-sm sm:text-base lg:text-lg font-bold leading-relaxed line-clamp-2",
                  activeContent === 'verse' ? "font-amiri" : "font-sans"
                )}>
                  {activeContent === 'verse' ? VERSES[contentIndex].text : MOTIVATIONS[contentIndex].text}
                </p>

                <p className="text-[10px] sm:text-xs text-zinc-400 font-medium">
                  {activeContent === 'verse' ? VERSES[contentIndex].source : MOTIVATIONS[contentIndex].highlight}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 h-0.5 sm:h-1 bg-white/5 w-full">
              <motion.div
                className="h-full bg-orange-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 12, ease: "linear", repeat: Infinity }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== Quick Navigation & System Switcher (Ultra-Minimalist Professional Design) ===== */}
      <div className="w-full max-w-full isolate">
        <div className="relative w-full rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">

          <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr] items-center p-1 gap-2 h-auto md:h-14">

            {/* 1. System Switcher (Segmented Control Style) */}
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl flex items-center gap-0.5 w-full md:w-auto relative">
              <button
                onClick={() => setSystemMode('full')}
                className={cn(
                  "relative flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 isolate z-10",
                  systemMode === 'full'
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                )}
              >
                {systemMode === 'full' && (
                  <motion.div
                    layoutId="activeSystemTab"
                    className="absolute inset-0 bg-white dark:bg-zinc-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)] rounded-lg -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Laptop className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">النظام الكامل</span>
              </button>

              <button
                onClick={() => setSystemMode('merchant')}
                className={cn(
                  "relative flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 isolate z-10",
                  systemMode === 'merchant'
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                )}
              >
                {systemMode === 'merchant' && (
                  <motion.div
                    layoutId="activeSystemTab"
                    className="absolute inset-0 bg-white dark:bg-zinc-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)] rounded-lg -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <StoreIcon className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">واجهة التاجر</span>
              </button>
            </div>

            {/* 2. Vertical Divider */}
            <div className="hidden md:block w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>

            {/* 3. Navigation Items (Clean List) */}
            <div className="relative min-w-0 w-full overflow-hidden">

              {/* Subtle Fade Edges */}
              <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white dark:from-zinc-900 to-transparent z-10 pointer-events-none"></div>
              <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white dark:from-zinc-900 to-transparent z-10 pointer-events-none"></div>

              {/* Force hide scrollbar for all browsers */}
              <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                  display: none;
                }
                .hide-scrollbar {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `}</style>
              <div
                ref={scrollContainerRef}
                className="flex items-center gap-1 overflow-x-auto hide-scrollbar py-1 px-2 w-full"
                style={{
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <AnimatePresence mode="popLayout">
                  {filteredNavItems.map((item) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="flex-shrink-0"
                    >
                      <Link
                        to={item.href}
                        className="group flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
                      >
                        <item.icon className="w-4 h-4 text-zinc-400 group-hover:text-orange-500 transition-colors" />
                        <span className="whitespace-nowrap">{item.title}</span>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardHeader;
