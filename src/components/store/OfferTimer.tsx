import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Zap, 
  Calendar,
  Timer,
  Flame,
  Sparkles
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

// المكون الرئيسي المحسن
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
      className={cn(className)}
    >
      <Card className={cn(
        "border shadow-sm transition-all duration-300 overflow-hidden relative",
        isUrgent ? "border-destructive/40 bg-destructive/5" : "border-primary/20 bg-primary/5"
      )}>
        {/* خلفية متدرجة ناعمة */}
        <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/50 to-transparent pointer-events-none" />
        
        <CardContent className="p-4 relative">
          {/* الهيدر */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <motion.div 
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center",
                  "bg-gradient-to-br shadow-sm transition-colors duration-300",
                  isUrgent 
                    ? "from-destructive/20 to-destructive/10 text-destructive" 
                    : "from-primary/20 to-primary/10 text-primary"
                )}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                <Icon className="h-4 w-4" />
              </motion.div>
              
              {settings.offer_timer_title && (
                <div>
                  <h4 className="font-bold text-base text-foreground leading-tight">
                    {settings.offer_timer_title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    العرض محدود المدة
                  </p>
                </div>
              )}
            </div>
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", bounce: 0.6 }}
            >
              <Badge 
                variant={isUrgent ? "destructive" : "secondary"} 
                className={cn(
                  "text-sm flex items-center gap-1.5 px-2.5 py-1 transition-all duration-300",
                  isVeryUrgent && "animate-pulse"
                )}
              >
                <motion.div
                  animate={isUrgent ? { 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  } : {}}
                  transition={{ 
                    duration: 1.5,
                    repeat: isUrgent ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                >
                  {isUrgent ? <Flame className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                </motion.div>
                {isVeryUrgent ? "ينتهي الآن!" : isUrgent ? "ينتهي قريباً!" : "عرض محدود"}
              </Badge>
            </motion.div>
          </div>

          {/* النص العلوي */}
          {settings.offer_timer_text_above && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={cn(
                "text-center text-sm font-medium mb-3 p-2.5 rounded-lg",
                "bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50",
                isUrgent ? "text-destructive" : "text-foreground"
              )}
            >
              {settings.offer_timer_text_above}
            </motion.div>
          )}

          {/* العداد */}
          <motion.div 
            className="flex items-center justify-center gap-1.5 mb-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring", bounce: 0.3 }}
          >
            {timeRemaining.days > 0 && (
              <TimeDisplay 
                value={timeRemaining.days} 
                label="يوم" 
                isUrgent={isUrgent}
              />
            )}
            <TimeDisplay 
              value={timeRemaining.hours} 
              label="ساعة" 
              isUrgent={isUrgent}
            />
            <TimeDisplay 
              value={timeRemaining.minutes} 
              label="دقيقة" 
              isUrgent={isUrgent}
            />
            <TimeDisplay 
              value={timeRemaining.seconds} 
              label="ثانية" 
              isLast={true}
              isUrgent={isUrgent}
            />
          </motion.div>

          {/* النص السفلي */}
          {settings.offer_timer_text_below && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center text-sm text-muted-foreground"
            >
              {settings.offer_timer_text_below}
            </motion.div>
          )}

          {/* مؤشر إضافي للحالات الحرجة */}
          {isVeryUrgent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-2 text-center"
            >
              <div className="text-sm text-destructive font-medium bg-destructive/10 px-3 py-1 rounded-full inline-flex items-center gap-1">
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  ⚡
                </motion.div>
                آخر لحظة للحصول على العرض
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default OfferTimer; 