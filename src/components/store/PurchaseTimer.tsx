import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Flame, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PurchaseTimerProps {
  endDate: string; // ISO string format or timestamp number
  textAbove?: string;
  textBelow?: string;
  onTimerEnd?: () => void; // Optional callback when timer reaches zero
}

const calculateTimeLeft = (targetDate: Date) => {
  const difference = +targetDate - +new Date();
  let timeLeft = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  };

  if (difference > 0) {
    timeLeft = {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  return { timeLeft, difference };
};

const PurchaseTimer = ({ 
  endDate, 
  textAbove = "العرض ينتهي خلال:", 
  textBelow = "سارع بالطلب قبل انتهاء العرض - الكمية محدودة",
  onTimerEnd 
}: PurchaseTimerProps) => {
  const targetDate = new Date(endDate);
  const [{ timeLeft, difference }, setTimeLeft] = useState(calculateTimeLeft(targetDate));
  const [isClient, setIsClient] = useState(false);
  const [isAlmostEnded, setIsAlmostEnded] = useState(false);
  // إضافة مرجع للتحكم في طباعة السجلات
  const loggedRef = useRef(false);

  useEffect(() => {
    // Ensure this runs only on the client
    setIsClient(true);

    const timer = setInterval(() => {
      const newTime = calculateTimeLeft(targetDate);
      setTimeLeft(newTime);

      // Set isAlmostEnded flag if less than 1 hour remains
      setIsAlmostEnded(newTime.difference > 0 && newTime.difference < 3600000);

      if (newTime.difference <= 0) {
        clearInterval(timer);
        if (onTimerEnd) {
          onTimerEnd();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate, onTimerEnd]); // Rerun effect if endDate changes

  // طباعة رسالة واحدة فقط عند التحميل الأولي وليس في كل تحديث
  useEffect(() => {
    if (isClient && !loggedRef.current) {
      loggedRef.current = true;
      
    }
  }, [isClient, targetDate, difference, endDate]);
  
  // لا تعرض المؤقت على الخادم أو إذا كان تاريخ الاستهداف غير صالح
  if (!isClient || isNaN(targetDate.getTime())) {
    // تجنب الطباعة المتكررة
    if (!loggedRef.current) {
      
      loggedRef.current = true;
    }
    return null;
  }
  
  // إذا كان التاريخ في الماضي، نعرض رسالة انتهاء العرض
  const isPastDate = difference <= 0;
  if (isPastDate) {
    // أضفنا شرطًا للسماح بعرض المؤقت حسب الرغبة
    const showPastDateTimer = true; // يمكن تغيير هذا حسب الحاجة
    
    if (!showPastDateTimer) {
      // تجنب الطباعة المتكررة
      if (!loggedRef.current) {
        
        loggedRef.current = true;
      }
      return null;
    }
    
    // تجنب الطباعة المتكررة
    if (!loggedRef.current) {
      
      loggedRef.current = true;
    }
    // نستمر لعرض المؤقت مع قيم افتراضية للعرض
  }

  // Helper function to format time units
  const formatTimeUnit = (unit: number) => unit.toString().padStart(2, '0');

  // Create digit animation variants
  const digitVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          className={`
            overflow-hidden border shadow-md
            ${isAlmostEnded 
              ? 'border-red-400 shadow-red-100 dark:shadow-red-950/20' 
              : 'border-primary/20 shadow-primary/5'}
          `}
        >
          <div 
            className={`
              border-b px-4 py-3 flex items-center gap-2
              ${isAlmostEnded 
                ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/20' 
                : 'bg-primary/5 border-primary/20'}
            `}
          >
            {isAlmostEnded ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <Clock className="h-4 w-4 text-primary" />
            )}
            <p className={`font-medium text-sm ${isAlmostEnded ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>
              {textAbove}
            </p>
          </div>
          <CardContent className="p-4">
            <div className="flex justify-center gap-3 text-center">
              {timeLeft.days > 0 && (
                <div className="flex flex-col items-center">
                  <div className={`
                    rounded-lg py-2 px-3 w-16 relative overflow-hidden
                    ${isAlmostEnded 
                      ? 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800/30' 
                      : 'bg-primary/5 border border-primary/10'}
                  `}>
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={timeLeft.days}
                        variants={digitVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="font-mono font-bold text-xl"
                      >
                        {formatTimeUnit(timeLeft.days)}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5">يوم</div>
                </div>
              )}
              <div className="flex flex-col items-center">
                <div className={`
                  rounded-lg py-2 px-3 w-16 relative overflow-hidden
                  ${isAlmostEnded 
                    ? 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800/30' 
                    : 'bg-primary/5 border border-primary/10'}
                `}>
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={timeLeft.hours}
                      variants={digitVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="font-mono font-bold text-xl"
                    >
                      {formatTimeUnit(timeLeft.hours)}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">ساعة</div>
              </div>
              <div className="flex flex-col items-center">
                <div className={`
                  rounded-lg py-2 px-3 w-16 relative overflow-hidden
                  ${isAlmostEnded 
                    ? 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800/30' 
                    : 'bg-primary/5 border border-primary/10'}
                `}>
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={timeLeft.minutes}
                      variants={digitVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="font-mono font-bold text-xl"
                    >
                      {formatTimeUnit(timeLeft.minutes)}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">دقيقة</div>
              </div>
              <div className="flex flex-col items-center">
                <div className={`
                  rounded-lg py-2 px-3 w-16 relative overflow-hidden
                  ${isAlmostEnded 
                    ? 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800/30' 
                    : 'bg-primary/5 border border-primary/10'}
                `}>
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={timeLeft.seconds}
                      variants={digitVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className={`font-mono font-bold text-xl ${timeLeft.seconds < 10 && isAlmostEnded ? 'text-red-600 dark:text-red-400' : ''}`}
                    >
                      {formatTimeUnit(timeLeft.seconds)}
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
                  ${isAlmostEnded ? 'text-red-600 dark:text-red-400' : 'text-primary'}
                `}
                animate={isAlmostEnded ? { scale: [1, 1.03, 1] } : {}}
                transition={isAlmostEnded ? { repeat: Infinity, duration: 2 } : {}}
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

export default PurchaseTimer; 