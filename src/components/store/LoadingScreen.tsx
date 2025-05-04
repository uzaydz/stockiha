import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
  isLoading: boolean;
  siteName?: string;
}

const LoadingScreen = ({ isLoading, siteName = 'المتجر' }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  
  // محاكاة شريط التقدم
  useEffect(() => {
    if (!isLoading) return;
    
    let timer: NodeJS.Timeout;
    const startProgress = () => {
      timer = setInterval(() => {
        setProgress(prev => {
          // تباطؤ التقدم كلما اقتربنا من النهاية
          const increment = (100 - prev) / 20;
          const newProgress = prev + (increment > 0.5 ? increment : 0.5);
          
          // عدم تجاوز 98% حتى يتم التحميل فعلياً
          return Math.min(newProgress, 98);
        });
      }, 100);
    };
    
    startProgress();
    
    return () => clearInterval(timer);
  }, [isLoading]);
  
  // إكمال التقدم إلى 100% عند انتهاء التحميل
  useEffect(() => {
    if (!isLoading && progress < 100) {
      setProgress(100);
    }
  }, [isLoading, progress]);
  
  if (!isLoading && progress >= 100) return null;
  
  return (
    <motion.div 
      className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: isLoading ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="w-20 h-20 relative mb-6">
          <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-2 border-primary/20"></div>
          <div className="absolute inset-0 flex items-center justify-center font-bold text-lg">
            {Math.round(progress)}%
          </div>
        </div>
        
        <h2 className="text-xl font-bold mb-2 text-center">جاري تحميل {siteName}</h2>
        <p className="text-muted-foreground text-center mb-4">نجهز لك تجربة تسوق مميزة</p>
        
        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default LoadingScreen; 