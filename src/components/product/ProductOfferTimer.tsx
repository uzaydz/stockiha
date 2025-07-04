import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClockIcon, 
  FireIcon, 
  CalendarDaysIcon,
  BoltIcon 
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';

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
            const savedEndTime = new Date(parsed.endTime);
            
            if (savedEndTime.getTime() > now.getTime()) {
              return savedEndTime;
            } else {
              localStorage.removeItem(cookieKey);
            }
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

// مكون المؤقت المحسن
const ProductOfferTimer: React.FC<ProductOfferTimerProps> = ({
  settings,
  className,
  theme = 'default'
}) => {
  const { timeRemaining, isExpired, isActive } = useOfferTimer(settings);
  const { productOfferTimer } = useProductPurchaseTranslation();

  if (!isActive || isExpired) {
    return null;
  }

  // تحديد الأيقونة
  const getIcon = () => {
    switch (settings.offer_timer_type) {
      case 'specific_date': return CalendarDaysIcon;
      case 'evergreen': return BoltIcon;
      case 'fixed_duration_per_visitor': return ClockIcon;
      default: return ClockIcon;
    }
  };

  const Icon = getIcon();
  const isUrgent = timeRemaining.total < 300000; // أقل من 5 دقائق

  // مكونات الوقت مع تحسين العرض
  const timeUnits = [
    { label: productOfferTimer.days(), value: timeRemaining.days, show: timeRemaining.days > 0 },
    { label: productOfferTimer.hours(), value: timeRemaining.hours, show: timeRemaining.days > 0 || timeRemaining.hours > 0 },
    { label: productOfferTimer.minutes(), value: timeRemaining.minutes, show: true },
    { label: productOfferTimer.seconds(), value: timeRemaining.seconds, show: timeRemaining.days === 0 && timeRemaining.hours === 0 }
  ].filter(unit => unit.show);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn("w-full", className)}
      >
        {/* البطاقة الرئيسية للمؤقت */}
        <div className="bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-2xl p-4 space-y-3">
          {/* العنوان مع الأيقونة */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl",
              isUrgent 
                ? "bg-red-100 dark:bg-red-900/30" 
                : "bg-primary/10 dark:bg-primary/20"
            )}>
              <motion.div
                animate={isUrgent ? { scale: [1, 1.05, 1] } : {}}
                transition={isUrgent ? { duration: 1.5, repeat: Infinity } : {}}
              >
                <Icon className={cn(
                  "w-4 h-4",
                  isUrgent 
                    ? "text-red-600 dark:text-red-400" 
                    : "text-primary"
                )} />
              </motion.div>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold flex items-center gap-2">
                {settings.offer_timer_text_above || productOfferTimer.limitedOffer()}
                {isUrgent && (
                  <FireIcon className="w-3 h-3 text-red-500 dark:text-red-400 animate-pulse" />
                )}
              </h3>
            </div>
          </div>

          {/* عداد الوقت المدمج */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {timeUnits.map((unit, index) => (
              <React.Fragment key={unit.label}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-1"
                >
                  <motion.span
                    key={unit.value}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      "text-xl font-bold min-w-[2rem] text-center",
                      isUrgent 
                        ? "text-red-600 dark:text-red-400" 
                        : "text-primary"
                    )}
                  >
                    {unit.value.toString().padStart(2, '0')}
                  </motion.span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {unit.label}
                  </span>
                </motion.div>
                {index < timeUnits.length - 1 && (
                  <span className="text-muted-foreground mx-1">:</span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* شريط التقدم للحالة العاجلة */}
          {isUrgent && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {productOfferTimer.hurryUp()}
                </span>
                <span className="text-red-500 dark:text-red-400">⚡</span>
              </div>
              <div className="w-full bg-red-100 dark:bg-red-900/30 rounded-full h-1.5">
                <motion.div
                  className="bg-gradient-to-r from-red-500 to-red-600 dark:from-red-400 dark:to-red-500 h-1.5 rounded-full"
                  initial={{ width: "100%" }}
                  animate={{ 
                    width: `${Math.max(5, (timeRemaining.total / 300000) * 100)}%`
                  }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
          )}

          {/* نص إضافي */}
          {settings.offer_timer_text_below && (
            <div className="text-center text-xs text-muted-foreground">
              {settings.offer_timer_text_below}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductOfferTimer;
