import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Zap, 
  Calendar,
  Timer,
  Flame,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OfferTimerSettings, OfferTimerProps, TimeRemaining } from '@/types/offerTimer';

// مكون عداد الوقت المحسن
const TimeDisplay: React.FC<{ 
  value: number; 
  label: string; 
  isLast?: boolean;
  isUrgent?: boolean;
}> = ({ value, label, isLast = false, isUrgent = false }) => {
  return (
    <div className="flex items-center">
      <motion.div 
        className="text-center"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        <div className={cn(
          "rounded-xl px-4 py-2.5 min-w-[55px] font-bold text-3xl shadow-sm transition-all duration-300",
          "border-2 bg-gradient-to-br from-background via-background to-muted/20",
          isUrgent 
            ? "border-destructive/30 text-destructive bg-destructive/5" 
            : "border-primary/30 text-primary bg-primary/5"
        )}>
          <motion.span
            key={value}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
          >
            {value.toString().padStart(2, '0')}
          </motion.span>
        </div>
        <div className={cn(
          "text-sm mt-1.5 font-medium transition-colors duration-300",
          isUrgent ? "text-destructive/80" : "text-muted-foreground"
        )}>
          {label}
        </div>
      </motion.div>
      {!isLast && (
        <motion.span 
          className={cn(
            "font-bold mx-2.5 text-2xl transition-colors duration-300",
            isUrgent ? "text-destructive/60" : "text-foreground/60"
          )}
          animate={{ 
            opacity: [1, 0.5, 1]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          :
        </motion.span>
      )}
    </div>
  );
};

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
        const cookieKey = `offer_timer_${settings.offer_timer_type}`;
        const existingTimer = localStorage.getItem(cookieKey);
        
        if (existingTimer) {
          return new Date(JSON.parse(existingTimer).endTime);
        } else {
          const duration = settings.offer_timer_duration_minutes || 60;
          const endTime = new Date(now.getTime() + duration * 60 * 1000);
          
          localStorage.setItem(cookieKey, JSON.stringify({
            endTime: endTime.toISOString(),
            startTime: now.toISOString()
          }));
          
          return endTime;
        }
        
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

// المكون الرئيسي المحسن بتصميم PurchaseTimer
const OfferTimer: React.FC<OfferTimerProps> = ({
  settings,
  className,
  position = 'below-price',
  theme = 'default',
  showProgress = true
}) => {
  const { timeRemaining, isExpired, isActive } = useOfferTimer(settings);

  const getIcon = () => {
    switch (settings.offer_timer_type) {
      case 'specific_date': return Calendar;
      case 'evergreen': return Zap;
      case 'fixed_duration_per_visitor': return Timer;
      default: return Clock;
    }
  };

  const Icon = getIcon();

  if (!isActive || isExpired) {
    return null;
  }

  // تحديد ما إذا كان العرض في الدقائق الأخيرة
  const isUrgent = timeRemaining.total < 300000; // أقل من 5 دقائق
  const isVeryUrgent = timeRemaining.total < 60000; // أقل من دقيقة

  // Helper function to format time units
  const formatTimeUnit = (unit: number) => unit.toString().padStart(2, '0');

  // Create digit animation variants
  const digitVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

  // تحديد النص العلوي والسفلي
  const textAbove = settings.offer_timer_text_above || settings.offer_timer_title || "العرض ينتهي خلال:";
  const textBelow = settings.offer_timer_text_below || "سارع بالطلب قبل انتهاء العرض - الكمية محدودة";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3 }}
        className={cn(className)}
      >
        <Card 
          className={`
            overflow-hidden border shadow-md
            ${isUrgent 
              ? 'border-red-400 shadow-red-100 dark:shadow-red-950/20' 
              : 'border-primary/20 shadow-primary/5'}
          `}
        >
          <div 
            className={`
              border-b px-4 py-3 flex items-center gap-2
              ${isUrgent 
                ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/20' 
                : 'bg-primary/5 border-primary/20'}
            `}
          >
            {isUrgent ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <Icon className="h-4 w-4 text-primary" />
            )}
            <p className={`font-medium text-sm ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>
              {textAbove}
            </p>
          </div>
          <CardContent className="p-4">
            <div className="flex justify-center gap-3 text-center">
              {timeRemaining.days > 0 && (
                <div className="flex flex-col items-center">
                  <div className={`
                    rounded-lg py-2 px-3 w-16 relative overflow-hidden
                    ${isUrgent 
                      ? 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800/30' 
                      : 'bg-primary/5 border border-primary/10'}
                  `}>
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={timeRemaining.days}
                        variants={digitVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="font-mono font-bold text-xl"
                      >
                        {formatTimeUnit(timeRemaining.days)}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5">يوم</div>
                </div>
              )}
              <div className="flex flex-col items-center">
                <div className={`
                  rounded-lg py-2 px-3 w-16 relative overflow-hidden
                  ${isUrgent 
                    ? 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800/30' 
                    : 'bg-primary/5 border border-primary/10'}
                `}>
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={timeRemaining.hours}
                      variants={digitVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="font-mono font-bold text-xl"
                    >
                      {formatTimeUnit(timeRemaining.hours)}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">ساعة</div>
              </div>
              <div className="flex flex-col items-center">
                <div className={`
                  rounded-lg py-2 px-3 w-16 relative overflow-hidden
                  ${isUrgent 
                    ? 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800/30' 
                    : 'bg-primary/5 border border-primary/10'}
                `}>
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={timeRemaining.minutes}
                      variants={digitVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="font-mono font-bold text-xl"
                    >
                      {formatTimeUnit(timeRemaining.minutes)}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">دقيقة</div>
              </div>
              <div className="flex flex-col items-center">
                <div className={`
                  rounded-lg py-2 px-3 w-16 relative overflow-hidden
                  ${isUrgent 
                    ? 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800/30' 
                    : 'bg-primary/5 border border-primary/10'}
                `}>
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={timeRemaining.seconds}
                      variants={digitVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className={`font-mono font-bold text-xl ${timeRemaining.seconds < 10 && isUrgent ? 'text-red-600 dark:text-red-400' : ''}`}
                    >
                      {formatTimeUnit(timeRemaining.seconds)}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">ثانية</div>
              </div>
            </div>
            {textBelow && (
              <motion.div 
                className={`
                  mt-3 flex items-center justify-center gap-1.5 text-center
                  ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-primary'}
                `}
                animate={isUrgent ? { scale: [1, 1.03, 1] } : {}}
                transition={isUrgent ? { repeat: Infinity, duration: 2 } : {}}
              >
                <Flame className="w-3 h-3" />
                <p className="text-sm font-medium">
                  {textBelow}
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default OfferTimer;
