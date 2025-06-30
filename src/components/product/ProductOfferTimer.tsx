import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Zap, 
  Calendar,
  Timer,
  Flame,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// أنواع البيانات
interface OfferTimerSettings {
  offer_timer_enabled: boolean;
  offer_timer_title?: string;
  offer_timer_type: 'specific_date' | 'evergreen' | 'fixed_duration_per_visitor';
  offer_timer_end_date?: string;
  offer_timer_duration_minutes?: number;
  offer_timer_text_above?: string;
  offer_timer_text_below?: string;
  offer_timer_end_action?: 'hide' | 'show_message' | 'redirect';
  offer_timer_end_action_message?: string;
  offer_timer_end_action_url?: string;
  offer_timer_restart_for_new_session?: boolean;
  offer_timer_cookie_duration_days?: number;
  offer_timer_show_on_specific_pages_only?: boolean;
  offer_timer_specific_page_urls?: string[];
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

interface ProductOfferTimerProps {
  settings: OfferTimerSettings;
  className?: string;
  theme?: 'default' | 'urgent' | 'elegant';
}

// Hook لحساب الوقت المتبقي
const useOfferTimer = (settings: OfferTimerSettings) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0
  });
  const [isExpired, setIsExpired] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const getEndTime = useCallback(() => {
    const now = new Date();
    
    switch (settings.offer_timer_type) {
      case 'specific_date':
        return settings.offer_timer_end_date ? new Date(settings.offer_timer_end_date) : null;
        
      case 'evergreen':
      case 'fixed_duration_per_visitor':
        const cookieKey = `offer_timer_${settings.offer_timer_type}_${window.location.pathname}`;
        const existingTimer = localStorage.getItem(cookieKey);
        
        if (existingTimer && !settings.offer_timer_restart_for_new_session) {
          try {
            const parsed = JSON.parse(existingTimer);
            return new Date(parsed.endTime);
          } catch {
            localStorage.removeItem(cookieKey);
          }
        }
        
        const duration = settings.offer_timer_duration_minutes || 60;
        const endTime = new Date(now.getTime() + duration * 60 * 1000);
        
        localStorage.setItem(cookieKey, JSON.stringify({
          endTime: endTime.toISOString(),
          startTime: now.toISOString()
        }));
        
        return endTime;
        
      default:
        return null;
    }
  }, [settings]);

  const calculateTimeRemaining = useCallback((endTime: Date): TimeRemaining => {
    const now = new Date();
    const difference = endTime.getTime() - now.getTime();
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }
    
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds, total: difference };
  }, []);

  useEffect(() => {
    if (!settings.offer_timer_enabled) {
      setIsActive(false);
      return;
    }

    const endTime = getEndTime();
    if (!endTime) {
      setIsActive(false);
      return;
    }

    setIsActive(true);

    const updateTimer = () => {
      const remaining = calculateTimeRemaining(endTime);
      setTimeRemaining(remaining);
      
      if (remaining.total <= 0) {
        setIsExpired(true);
        setIsActive(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [settings, getEndTime, calculateTimeRemaining]);

  return { timeRemaining, isExpired, isActive };
};

// مكون عرض الوقت الفردي
const TimeUnit: React.FC<{
  value: number;
  label: string;
  isUrgent?: boolean;
}> = ({ value, label, isUrgent = false }) => {
  return (
    <motion.div className="text-center">
      <div className={cn(
        "relative rounded-xl py-3 px-4 min-w-[70px] font-mono font-bold text-2xl md:text-3xl shadow-lg transition-all duration-300",
        "border-2 bg-gradient-to-br",
        isUrgent 
          ? "border-red-400 text-red-600 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 dark:border-red-600/50 dark:text-red-400" 
          : "border-primary/30 text-primary bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5"
      )}>
        <motion.span
          key={value}
          initial={{ y: -20, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
            duration: 0.3 
          }}
        >
          {value.toString().padStart(2, '0')}
        </motion.span>
        
        {/* تأثير وهج */}
        <div className={cn(
          "absolute inset-0 rounded-xl opacity-30 blur-xl transition-all duration-300",
          isUrgent ? "bg-red-400" : "bg-primary/20"
        )} />
      </div>
      
      <div className={cn(
        "text-xs md:text-sm mt-2 font-medium transition-colors duration-300",
        isUrgent ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
      )}>
        {label}
      </div>
    </motion.div>
  );
};

// مكون الفاصل المتحرك
const TimeSeparator: React.FC<{ isUrgent?: boolean }> = ({ isUrgent = false }) => {
  return (
    <motion.div
      animate={{ 
        opacity: [1, 0.3, 1],
        scale: [1, 0.8, 1]
      }}
      transition={{ 
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className={cn(
        "flex items-center justify-center text-3xl font-bold self-center mb-6",
        isUrgent ? "text-red-500" : "text-primary/60"
      )}
    >
      :
    </motion.div>
  );
};

// المكون الرئيسي
const ProductOfferTimer: React.FC<ProductOfferTimerProps> = ({
  settings,
  className,
  theme = 'default'
}) => {
  const { timeRemaining, isExpired, isActive } = useOfferTimer(settings);

  // إذا لم يكن المؤقت نشطاً أو انتهى
  if (!isActive || isExpired) {
    return null;
  }

  // تحديد حالة الإلحاح
  const isUrgent = timeRemaining.total < 300000; // أقل من 5 دقائق
  const isVeryUrgent = timeRemaining.total < 60000; // أقل من دقيقة

  // أيقونة ديناميكية حسب النوع
  const getIcon = () => {
    switch (settings.offer_timer_type) {
      case 'specific_date': return Calendar;
      case 'evergreen': return Zap;
      case 'fixed_duration_per_visitor': return Timer;
      default: return Clock;
    }
  };

  const Icon = getIcon();

  // النصوص
  const textAbove = settings.offer_timer_text_above || settings.offer_timer_title || "⚡ عرض محدود الوقت";
  const textBelow = settings.offer_timer_text_below || "استفد من العرض قبل انتهاء الوقت!";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
        className={cn("w-full", className)}
      >
        <Card className={cn(
          "overflow-hidden border-2 shadow-xl transition-all duration-300",
          isUrgent 
            ? "border-red-400 bg-gradient-to-br from-red-50/80 to-orange-50/80 dark:from-red-950/20 dark:to-orange-950/20 shadow-red-200/50 dark:shadow-red-950/30" 
            : "border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 shadow-primary/10"
        )}>
          {/* Header */}
          <div className={cn(
            "px-4 py-3 border-b-2 flex items-center justify-center gap-2 relative overflow-hidden",
            isUrgent 
              ? "bg-gradient-to-r from-red-500 to-orange-500 border-red-400 text-white" 
              : "bg-gradient-to-r from-primary to-primary/80 border-primary/20 text-primary-foreground"
          )}>
            {/* خلفية متحركة */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            
            <motion.div
              animate={isUrgent ? { 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1]
              } : {}}
              transition={isUrgent ? { 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              } : {}}
            >
              {isUrgent ? (
                <AlertTriangle className="h-5 w-5 text-yellow-300" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </motion.div>
            
            <h3 className="font-bold text-sm md:text-base text-center">
              {textAbove}
            </h3>
            
            {isUrgent && (
              <motion.div
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Sparkles className="h-4 w-4 text-yellow-300" />
              </motion.div>
            )}
          </div>

          {/* Timer Content */}
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-2 md:gap-4">
              {/* أيام */}
              {timeRemaining.days > 0 && (
                <>
                  <TimeUnit 
                    value={timeRemaining.days} 
                    label="يوم" 
                    isUrgent={isUrgent} 
                  />
                  <TimeSeparator isUrgent={isUrgent} />
                </>
              )}
              
              {/* ساعات */}
              <TimeUnit 
                value={timeRemaining.hours} 
                label="ساعة" 
                isUrgent={isUrgent} 
              />
              <TimeSeparator isUrgent={isUrgent} />
              
              {/* دقائق */}
              <TimeUnit 
                value={timeRemaining.minutes} 
                label="دقيقة" 
                isUrgent={isUrgent} 
              />
              <TimeSeparator isUrgent={isUrgent} />
              
              {/* ثواني */}
              <TimeUnit 
                value={timeRemaining.seconds} 
                label="ثانية" 
                isUrgent={isUrgent} 
              />
            </div>

            {/* النص السفلي */}
            {textBelow && (
              <motion.div 
                className="mt-6 text-center"
                animate={isUrgent ? { 
                  scale: [1, 1.02, 1]
                } : {}}
                transition={isUrgent ? { 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                } : {}}
              >
                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm",
                  isUrgent 
                    ? "bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-600" 
                    : "bg-primary/10 text-primary border border-primary/20"
                )}>
                  <Flame className={cn(
                    "h-4 w-4",
                    isUrgent ? "text-red-500" : "text-primary"
                  )} />
                  {textBelow}
                </div>
              </motion.div>
            )}

            {/* شريط التقدم للحالات العاجلة */}
            {isVeryUrgent && (
              <motion.div 
                className="mt-4 h-2 bg-red-100 dark:bg-red-950/30 rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                  animate={{
                    width: [`${(timeRemaining.total / 60000) * 100}%`, "0%"]
                  }}
                  transition={{
                    duration: timeRemaining.total / 1000,
                    ease: "linear"
                  }}
                />
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductOfferTimer;
