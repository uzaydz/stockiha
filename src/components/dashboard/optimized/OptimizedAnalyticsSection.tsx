import React, { Suspense, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSuperUnifiedData } from '../../../context/SuperUnifiedDataContext';
import { useTenant } from '../../../context/TenantContext';
import OrderHeatmapCard from '../OrderHeatmapCard';
import VisitorAnalyticsCard from '../VisitorAnalyticsCard';
import OnlineOrderAnalyticsCard from '../OnlineOrderAnalyticsCard';
import { 
  MapPin, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Award,
  Package,
  DollarSign,
  BarChart3,
  Filter,
  Download,
  Eye,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// أنماط CSS محسنة
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
  
  .analytics-card {
    background: linear-gradient(135deg, 
      hsl(var(--background)) 0%, 
      hsl(var(--background)/0.95) 100%
    );
    backdrop-filter: blur(10px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .analytics-card:hover {
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
  
  .province-item {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }
  
  .province-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(var(--primary-rgb), 0.1), transparent);
    transition: left 0.5s ease;
  }
  
  .province-item:hover::before {
    left: 100%;
  }
  
  .stats-badge {
    background: linear-gradient(135deg, 
      hsl(var(--primary)/0.1) 0%, 
      hsl(var(--primary)/0.05) 100%
    );
    border: 1px solid hsl(var(--primary)/0.2);
  }
  
  .success-badge {
    background: linear-gradient(135deg, 
      hsl(142 76% 36% / 0.1) 0%, 
      hsl(142 76% 36% / 0.05) 100%
    );
    border: 1px solid hsl(142 76% 36% / 0.3);
    color: hsl(142 76% 36%);
  }
  
  .warning-badge {
    background: linear-gradient(135deg, 
      hsl(38 92% 50% / 0.1) 0%, 
      hsl(38 92% 50% / 0.05) 100%
    );
    border: 1px solid hsl(38 92% 50% / 0.3);
    color: hsl(38 92% 50%);
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

// مكون التحميل المحسن
const AnalyticsLoader = () => (
  <motion.div 
    className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    initial="hidden"
    animate="visible"
    variants={containerVariants}
  >
    {Array.from({ length: 2 }).map((_, i) => (
      <motion.div 
        key={i} 
        className="analytics-card rounded-2xl border border-border/50 p-6 shimmer-effect"
        variants={itemVariants}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-40 bg-muted/60 animate-pulse rounded-lg"></div>
          <div className="h-5 w-20 bg-muted/40 animate-pulse rounded-md"></div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="h-20 bg-muted/40 animate-pulse rounded-xl"></div>
          ))}
        </div>
      </motion.div>
    ))}
  </motion.div>
);

// مكون الخطأ المحسن
const AnalyticsError = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <motion.div 
    className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div className="analytics-card rounded-2xl border border-red-200/30 dark:border-red-800/30 p-6 bg-red-50/50 dark:bg-red-900/10">
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
        <motion.div 
          className="p-4 rounded-full bg-red-100 dark:bg-red-900/20"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
        >
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </motion.div>
        
        <div className="space-y-2 max-w-sm">
          <h3 className="text-lg font-bold text-red-900 dark:text-red-100">
            فشل في تحميل التحليلات
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
        
        <Button
          onClick={onRetry}
          variant="outline"
          className="mt-4 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 transition-all hover:scale-105"
        >
          <AlertCircle className="h-4 w-4 ml-2" />
          إعادة المحاولة
        </Button>
      </div>
    </div>
  </motion.div>
);

// مكون بطاقة الولايات المحسن
const OptimizedProvinceCard = () => {
  const { provincesGlobal, isLoading, error } = useSuperUnifiedData();
  
  // حساب معلومات إضافية
  const stats = useMemo(() => {
    if (!provincesGlobal || provincesGlobal.length === 0) return null;
    
    const totalRevenue = provincesGlobal.reduce((sum, p) => sum + (p.total_revenue || 0), 0);
    const totalOrders = provincesGlobal.reduce((sum, p) => sum + (p.order_count || 0), 0);
    const topProvince = provincesGlobal[0];
    const growthRate = 15.5; // يمكن حسابها من البيانات الفعلية
    
    return { totalRevenue, totalOrders, topProvince, growthRate };
  }, [provincesGlobal]);
  
  const displayedProvinces = provincesGlobal?.slice(0, 5);

  if (isLoading) {
    return (
      <motion.div 
        className="analytics-card rounded-2xl border border-border/50 p-6 shimmer-effect"
        variants={itemVariants}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-40 bg-muted/60 animate-pulse rounded-lg"></div>
          <div className="h-5 w-20 bg-muted/40 animate-pulse rounded-md"></div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted/40 animate-pulse rounded-xl"></div>
          ))}
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        className="analytics-card rounded-2xl border border-red-200/30 dark:border-red-800/30 p-6 bg-red-50/50 dark:bg-red-900/10"
        variants={itemVariants}
      >
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              فشل في تحميل بيانات الولايات
            </h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="analytics-card rounded-2xl border border-border/50 p-6 hover:border-primary/30 relative overflow-hidden group"
      variants={itemVariants}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      {/* خلفية متحركة */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* رأس البطاقة */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 backdrop-blur-sm">
              <MapPin className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
          الطلبات حسب الولايات
        </h2>
              {stats && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  إجمالي {stats.totalOrders} طلب
                </p>
              )}
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
                  عرض الكل
                  <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>عرض تفاصيل كاملة</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* إحصائيات سريعة */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="stats-badge rounded-xl p-3">
              <div className="flex items-center justify-between">
                <DollarSign className="h-4 w-4 text-primary/60" />
                <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {stats.growthRate}%
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">
                {(stats.totalRevenue / 1000).toFixed(1)}k
              </p>
              <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
            </div>
            
            <div className="stats-badge rounded-xl p-3">
              <div className="flex items-center justify-between">
                <Award className="h-4 w-4 text-primary/60" />
                <Sparkles className="h-3 w-3 text-yellow-500" />
              </div>
              <p className="text-lg font-bold text-foreground mt-1 truncate">
                {stats.topProvince?.province_name}
              </p>
              <p className="text-xs text-muted-foreground">الولاية الأفضل</p>
            </div>
          </div>
        )}
        
        {/* قائمة الولايات */}
        {!provincesGlobal || provincesGlobal.length === 0 ? (
          <motion.div 
            className="flex flex-col items-center justify-center py-12 text-center space-y-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4 rounded-2xl bg-muted/30 animate-float">
              <MapPin className="h-8 w-8 text-muted-foreground/50" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              لا توجد بيانات ولايات
            </h3>
            <p className="text-sm text-muted-foreground">
                ستظهر بيانات الولايات هنا عند توفرها
            </p>
          </div>
          </motion.div>
      ) : (
        <div className="space-y-3">
            <AnimatePresence mode="wait">
              {displayedProvinces?.map((province, index) => {
                const percentage = stats ? (province.total_revenue / stats.totalRevenue) * 100 : 0;
                const isTop = index === 0;
                
                return (
                  <motion.div
                    key={province.province_id}
                    className={cn(
                      "province-item p-4 rounded-xl transition-all cursor-pointer",
                      isTop ? "bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20" : "bg-muted/30 hover:bg-muted/50"
                    )}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 4 }}
                  >
              <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm",
                          isTop ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900" : "bg-muted text-muted-foreground"
                        )}>
                          {index + 1}
                        </div>
                <div>
                          <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                            {province.province_name}
                            {isTop && <Award className="h-3.5 w-3.5 text-yellow-500" />}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {province.order_count} طلب
                            </span>
                            <span className="text-xs text-muted-foreground">
                              متوسط: {(province.avg_order_value || 0).toFixed(0)} دج
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-left">
                        <p className="font-bold text-base gradient-text">
                          {(province.total_revenue || 0).toFixed(0)} دج
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.8, delay: index * 0.1 }}
                            />
                </div>
                          <span className="text-xs text-muted-foreground">
                            {percentage.toFixed(0)}%
                          </span>
                </div>
              </div>
            </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

        </div>
      )}

    </div>
    </motion.div>
  );
};

// مكون خريطة الطلبات المحسن
const OptimizedHeatmapCard = () => {
  const { organization } = useTenant();
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  
  return (
    <motion.div 
      className="analytics-card rounded-2xl border border-border/50 p-6 hover:border-primary/30 relative overflow-hidden group"
      variants={itemVariants}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      {/* خلفية متحركة */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
          خريطة الطلبات حسب الوقت
        </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                توزيع الطلبات على مدار الأسبوع
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
        
        {/* أزرار الفترة الزمنية */}
        <div className="flex gap-1 p-1 bg-muted/30 rounded-lg mb-4">
          {(['day', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                period === p 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p === 'day' ? 'يومي' : p === 'week' ? 'أسبوعي' : 'شهري'}
            </button>
          ))}
        </div>
        
        {/* الخريطة الحرارية */}
        <div className="relative">
          <OrderHeatmapCard />
          
          {/* تراكب المعلومات */}
          <motion.div 
            className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background via-background/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            initial={{ y: 10 }}
            whileHover={{ y: 0 }}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">أوقات الذروة</span>
              <span className="font-medium text-foreground">2:00 م - 5:00 م</span>
            </div>
          </motion.div>
      </div>
      
        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-xs text-green-600 dark:text-green-400">الأعلى</p>
            <p className="text-sm font-bold text-foreground">156</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">المتوسط</p>
            <p className="text-sm font-bold text-foreground">89</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-600 dark:text-red-400">الأدنى</p>
            <p className="text-sm font-bold text-foreground">12</p>
          </div>
        </div>
    </div>
    </motion.div>
  );
};

const OptimizedAnalyticsSection: React.FC = () => {
  const { provincesGlobal, isLoading, error } = useSuperUnifiedData();

  if (isLoading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <AnalyticsLoader />
      </>
    );
  }

  if (error) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <AnalyticsError error={error} onRetry={() => window.location.reload()} />
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="space-y-6">
        {/* الصف الأول: تحليلات الطلبات والولايات */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* مكون أفضل الولايات */}
          <OptimizedProvinceCard />
          
          {/* مكون خريطة الطلبات حسب الوقت */}
          <OptimizedHeatmapCard />
        </motion.div>

        {/* الصف الثاني: تحليلات الزوار - صف منفصل */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <VisitorAnalyticsCard />
        </motion.div>

        {/* الصف الثالث: إحصائيات الطلبات الأونلاين - صف منفصل */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <OnlineOrderAnalyticsCard />
        </motion.div>
      </div>
    </>
  );
};

export default OptimizedAnalyticsSection;
