import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Eye, 
  Activity, 
  TrendingUp, 
  ArrowRight,
  AlertCircle,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Clock,
  MapPin,
  BarChart3,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSuperUnifiedData } from '@/context/SuperUnifiedDataContext';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// أنماط CSS محسنة متطابقة مع OptimizedAnalyticsSection
const styles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  @keyframes pulse-glow {
    0%, 100% { 
      box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0.4);
    }
    50% { 
      box-shadow: 0 0 0 10px rgba(var(--primary-rgb), 0);
    }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  
  .visitor-analytics-card {
    background: linear-gradient(135deg, 
      hsl(var(--background)) 0%, 
      hsl(var(--background)/0.95) 100%
    );
    backdrop-filter: blur(10px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .visitor-analytics-card:hover {
    transform: translateY(-4px);
    box-shadow: 
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }
  
  .gradient-text {
    background: linear-gradient(135deg, 
      hsl(var(--primary)) 0%, 
      hsl(var(--primary)/0.8) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .shimmer-effect {
    position: relative;
    overflow: hidden;
  }
  
  .shimmer-effect::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    animation: shimmer 2s infinite;
  }
  
  .stats-badge {
    background: linear-gradient(135deg, 
      hsl(var(--primary)/0.1) 0%, 
      hsl(var(--primary)/0.05) 100%
    );
    border: 1px solid hsl(var(--primary)/0.2);
  }
  
  .device-item {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }
  
  .device-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(var(--primary-rgb), 0.1), transparent);
    transition: left 0.5s ease;
  }
  
  .device-item:hover::before {
    left: 100%;
  }
`;

// متغيرات الحركة
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

// تنسيق الأرقام
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ar-DZ').format(num);
};

// تنسيق النسب المئوية
const formatPercentage = (num: number): string => {
  return `${num.toFixed(1)}%`;
};

// مكون عرض إحصائية محسن
const StatBox = ({ 
  icon, 
  title, 
  value, 
  subtitle, 
  trend, 
  color = "blue",
  className = "",
  delay = 0
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  color?: "blue" | "green" | "purple" | "orange";
  className?: string;
  delay?: number;
}) => {
  const colorClasses = {
    blue: "from-blue-500/20 to-blue-600/10",
    green: "from-green-500/20 to-green-600/10", 
    purple: "from-purple-500/20 to-purple-600/10",
    orange: "from-orange-500/20 to-orange-600/10"
  };

  const iconColorClasses = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    purple: "text-purple-600 dark:text-purple-400", 
    orange: "text-orange-600 dark:text-orange-400"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "stats-badge p-4 rounded-xl transition-all duration-200 hover:shadow-md relative overflow-hidden group",
        className
      )}
    >
      {/* خلفية متحركة */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        colorClasses[color]
      )} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={cn(
            "p-2.5 rounded-xl bg-gradient-to-br backdrop-blur-sm",
            colorClasses[color]
          )}>
            <span className={iconColorClasses[color]}>{icon}</span>
          </div>
          {trend !== undefined && (
            <Badge 
              variant={trend >= 0 ? "default" : "destructive"} 
              className="text-xs flex items-center gap-1"
            >
              <TrendingUp className={cn("h-3 w-3", trend < 0 && "rotate-180")} />
              {trend >= 0 ? "+" : ""}{trend}%
            </Badge>
          )}
        </div>
        
        <h3 className="text-xs font-medium text-muted-foreground mb-2">{title}</h3>
        <p className="text-2xl font-bold gradient-text">
          {typeof value === 'number' ? formatNumber(value) : value}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
};

// مكون عرض التوزيع محسن
const DistributionItem = ({ 
  label, 
  value, 
  percentage, 
  icon,
  color = "blue",
  index = 0
}: {
  label: string;
  value: number;
  percentage: number;
  icon?: React.ReactNode;
  color?: "blue" | "green" | "purple" | "orange";
  index?: number;
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ x: 4 }}
      className="device-item flex items-center justify-between py-3 px-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && (
          <div className="p-1.5 rounded-lg bg-background/60 text-muted-foreground flex-shrink-0">
            {icon}
          </div>
        )}
        <span className="text-sm font-medium text-foreground truncate">{label}</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-16">
          <Progress value={percentage} className="h-2" />
        </div>
        <span className="text-sm font-semibold text-foreground min-w-[3rem] text-right">
          {formatNumber(value)}
        </span>
        <span className="text-xs text-muted-foreground min-w-[3rem] text-right">
          {formatPercentage(percentage)}
        </span>
      </div>
    </motion.div>
  );
};

// مكون التحميل المحسن
const VisitorAnalyticsLoader = () => (
  <motion.div 
    className="visitor-analytics-card rounded-2xl border border-border/50 p-6 shimmer-effect"
    initial="hidden"
    animate="visible"
    variants={containerVariants}
  >
    <div className="flex items-center justify-between mb-6">
      <div className="h-7 w-40 bg-muted/60 animate-pulse rounded-lg"></div>
      <div className="h-5 w-20 bg-muted/40 animate-pulse rounded-md"></div>
    </div>
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted/40 animate-pulse rounded-xl"></div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-5 w-32 bg-muted/40 animate-pulse rounded"></div>
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-12 bg-muted/30 animate-pulse rounded-xl"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

const VisitorAnalyticsCard: React.FC = () => {
  const { globalData, isLoading, error } = useSuperUnifiedData();

  // استخراج بيانات تحليلات الزوار
  const visitorAnalytics = globalData?.additional_data?.visitor_analytics;

  // معالجة البيانات
  const {
    trafficOverview,
    deviceData,
    locationData,
    topPages,
    topProducts,
    peakHour,
    totalTraffic
  } = useMemo(() => {
    if (!visitorAnalytics) {
      return {
        trafficOverview: null,
        deviceData: [],
        locationData: [],
        topPages: [],
        topProducts: [],
        peakHour: null,
        totalTraffic: 0
      };
    }

    const overview = visitorAnalytics.traffic_overview || {};
    
    // معالجة بيانات الأجهزة
    const devices = Object.entries(visitorAnalytics.traffic_by_device || {}).map(([device, count]) => ({
      label: device === 'desktop' ? 'حاسوب' : device === 'mobile' ? 'هاتف' : device === 'tablet' ? 'جهاز لوحي' : device,
      value: Number(count),
      icon: device === 'desktop' ? <Monitor className="h-4 w-4" /> : 
            device === 'mobile' ? <Smartphone className="h-4 w-4" /> : 
            device === 'tablet' ? <Tablet className="h-4 w-4" /> : <Monitor className="h-4 w-4" />
    }));

    const totalDeviceCount = devices.reduce((sum, item) => sum + item.value, 0);
    const deviceData = devices.map(item => ({
      ...item,
      percentage: totalDeviceCount > 0 ? (item.value / totalDeviceCount) * 100 : 0
    })).sort((a, b) => b.value - a.value);

    // معالجة بيانات المواقع
    const locations = Object.entries(visitorAnalytics.traffic_by_location || {}).map(([location, count]) => ({
      label: location,
      value: Number(count)
    }));

    const totalLocationCount = locations.reduce((sum, item) => sum + item.value, 0);
    const locationData = locations.map(item => ({
      ...item,
      percentage: totalLocationCount > 0 ? (item.value / totalLocationCount) * 100 : 0,
      icon: <MapPin className="h-4 w-4" />
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    // معالجة أفضل الساعات
    const timeData = visitorAnalytics.traffic_by_time || [];
    const hourlyStats = timeData.reduce((acc: any, item: any) => {
      const hour = item.hour;
      if (!acc[hour]) {
        acc[hour] = { sessions: 0, views: 0 };
      }
      acc[hour].sessions += Number(item.session_count || 0);
      acc[hour].views += Number(item.page_views || 0);
      return acc;
    }, {});

    const peakHourData = Object.entries(hourlyStats).reduce((peak: any, [hour, data]: [string, any]) => {
      if (!peak || data.sessions > peak.sessions) {
        return { hour: Number(hour), sessions: data.sessions, views: data.views };
      }
      return peak;
    }, null);

    const formatHour = (hour: number) => {
      if (hour < 12) return `${hour} ص`;
      if (hour === 12) return '12 م';
      return `${hour - 12} م`;
    };

    const peakHour = peakHourData ? {
      time: formatHour(peakHourData.hour),
      sessions: peakHourData.sessions,
      views: peakHourData.views
    } : null;

    // معالجة أفضل الصفحات
    const pages = (visitorAnalytics.popular_pages || []).slice(0, 3).map((page: any) => ({
      url: page.page_url?.split('/').pop() || 'الصفحة الرئيسية',
      views: page.view_count,
      visitors: page.unique_visitors
    }));

    // معالجة أفضل المنتجات
    const products = (visitorAnalytics.top_products_by_views || []).slice(0, 3).map((product: any) => ({
      name: product.product_name || 'منتج غير محدد',
      views: product.view_count,
      visitors: product.unique_visitors
    }));

    const totalTraffic = (overview.total_sessions || 0) + (overview.total_views || 0);

    return {
      trafficOverview: overview,
      deviceData,
      locationData,
      topPages: pages,
      topProducts: products,
      peakHour,
      totalTraffic
    };
  }, [visitorAnalytics]);

  // حالة التحميل
  if (isLoading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <VisitorAnalyticsLoader />
      </>
    );
  }

  // حالة الخطأ
  if (error) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <motion.div 
          className="visitor-analytics-card rounded-2xl border border-red-200/30 dark:border-red-800/30 p-6 bg-red-50/50 dark:bg-red-900/10"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <motion.div 
              className="p-4 rounded-full bg-red-100 dark:bg-red-900/20"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            >
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </motion.div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-red-900 dark:text-red-100">
                فشل في تحميل تحليلات الزوار
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
              className="bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 transition-all hover:scale-105"
            >
              <AlertCircle className="h-4 w-4 ml-2" />
              إعادة المحاولة
            </Button>
          </div>
        </motion.div>
      </>
    );
  }

  // حالة عدم وجود بيانات
  if (!trafficOverview || (!trafficOverview.total_sessions && !trafficOverview.total_views)) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <motion.div 
          className="visitor-analytics-card rounded-2xl border border-border/50 p-6 hover:border-primary/30 relative overflow-hidden group"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* خلفية متحركة */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    تحليلات الزوار
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    إحصائيات حركة المرور والزوار
                  </p>
                </div>
              </div>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link 
                      to="/dashboard/analytics" 
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors group"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      التفاصيل
                      <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>عرض تحليلات مفصلة</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <motion.div 
              className="flex flex-col items-center justify-center py-12 text-center space-y-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-4 rounded-2xl bg-muted/30 animate-float">
                <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  بيانات الزوار غير متوفرة
                </h3>
                <p className="text-sm text-muted-foreground">
                  ستظهر تحليلات الزوار هنا بمجرد وجود بيانات
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <motion.div 
        className="visitor-analytics-card rounded-2xl border border-border/50 p-6 hover:border-primary/30 relative overflow-hidden group"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {/* خلفية متحركة */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10">
          {/* رأس البطاقة */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  تحليلات الزوار
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  إجمالي {formatNumber(totalTraffic)} تفاعل
                </p>
              </div>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link 
                    to="/dashboard/analytics" 
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors group"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    التفاصيل
                    <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>عرض تحليلات مفصلة</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* الإحصائيات الرئيسية */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatBox
              icon={<Eye className="h-4 w-4" />}
              title="إجمالي المشاهدات"
              value={trafficOverview.total_views || 0}
              color="blue"
              delay={0}
            />
            <StatBox
              icon={<Activity className="h-4 w-4" />}
              title="الجلسات"
              value={trafficOverview.total_sessions || 0}
              color="green"
              delay={0.1}
            />
            <StatBox
              icon={<Users className="h-4 w-4" />}
              title="الزوار الفريدون"
              value={trafficOverview.unique_visitors || 0}
              color="purple"
              delay={0.2}
            />
            <StatBox
              icon={<Clock className="h-4 w-4" />}
              title="وقت الذروة"
              value={peakHour?.time || '--'}
              subtitle={peakHour ? `${peakHour.sessions} جلسة` : ''}
              color="orange"
              delay={0.3}
            />
          </div>

          {/* قسم التوزيعات */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* توزيع الأجهزة */}
            <motion.div 
              className="space-y-4"
              variants={itemVariants}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10">
                  <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">
                  توزيع الأجهزة
                </h4>
                {deviceData.length > 0 && (
                  <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                )}
              </div>
              <div className="space-y-3">
                <AnimatePresence mode="wait">
                  {deviceData.length > 0 ? deviceData.slice(0, 3).map((device, index) => (
                    <DistributionItem
                      key={device.label}
                      label={device.label}
                      value={device.value}
                      percentage={device.percentage}
                      icon={device.icon}
                      color={index === 0 ? "blue" : index === 1 ? "green" : "purple"}
                      index={index}
                    />
                  )) : (
                    <motion.div 
                      className="flex items-center justify-center py-8 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <p className="text-sm text-muted-foreground">لا توجد بيانات متاحة</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* التوزيع الجغرافي */}
            <motion.div 
              className="space-y-4"
              variants={itemVariants}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10">
                  <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">
                  التوزيع الجغرافي
                </h4>
                {locationData.length > 0 && (
                  <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                )}
              </div>
              <div className="space-y-3">
                <AnimatePresence mode="wait">
                  {locationData.length > 0 ? locationData.slice(0, 3).map((location, index) => (
                    <DistributionItem
                      key={location.label}
                      label={location.label}
                      value={location.value}
                      percentage={location.percentage}
                      icon={location.icon}
                      color={index === 0 ? "green" : index === 1 ? "blue" : "purple"}
                      index={index}
                    />
                  )) : (
                    <motion.div 
                      className="flex items-center justify-center py-8 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <p className="text-sm text-muted-foreground">لا توجد بيانات متاحة</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* أكثر الصفحات والمنتجات */}
          {(topPages.length > 0 || topProducts.length > 0) && (
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6"
              variants={itemVariants}
            >
              {/* أكثر الصفحات زيارة */}
              {topPages.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10">
                      <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">
                      أكثر الصفحات زيارة
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {topPages.map((page, index) => (
                      <motion.div 
                        key={index} 
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ x: 4 }}
                      >
                        <span className="text-sm font-medium text-foreground truncate max-w-32">{page.url}</span>
                        <Badge variant="secondary" className="text-xs px-2 py-1 gradient-text font-bold">
                          {formatNumber(page.views)}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* أكثر المنتجات مشاهدة */}
              {topProducts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10">
                      <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">
                      أكثر المنتجات مشاهدة
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {topProducts.map((product, index) => (
                      <motion.div 
                        key={index} 
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ x: 4 }}
                      >
                        <span className="text-sm font-medium text-foreground truncate max-w-32">{product.name}</span>
                        <Badge variant="secondary" className="text-xs px-2 py-1 gradient-text font-bold">
                          {formatNumber(product.views)}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default VisitorAnalyticsCard;
