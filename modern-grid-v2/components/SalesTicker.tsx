
import React, { useState, useEffect } from 'react';
import { Clock } from './Icons';
import { useLanguage } from '../context/LanguageContext';

const SalesTicker: React.FC = () => {
  const { t, direction } = useLanguage();
  
  // Initialize with a future time (e.g., 12 hours from now) to simulate scarcity
  const [timeLeft, setTimeLeft] = useState(12 * 60 * 60); 

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 12 * 60 * 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return { h, m, s };
  };

  const { h, m, s } = formatTime(timeLeft);

  return (
    <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 px-4 py-2.5 rounded-sm mb-6 w-fit shadow-sm" dir={direction}>
      <div className="relative flex items-center justify-center">
         <div className="absolute w-2 h-2 bg-red-500 rounded-full animate-ping opacity-75"></div>
         <Clock size={14} className="text-red-600 dark:text-red-500 relative z-10" strokeWidth={2.5} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {t('offers.ends_in')}:
      </span>
      <div className="flex items-center gap-1.5 text-sm font-mono font-bold text-gray-900 dark:text-white">
        <div className="flex flex-col items-center leading-none">
           <span>{h.toString().padStart(2, '0')}</span>
        </div>
        <span className="text-gray-300 dark:text-gray-600 -mt-0.5">:</span>
        <div className="flex flex-col items-center leading-none">
           <span>{m.toString().padStart(2, '0')}</span>
        </div>
        <span className="text-gray-300 dark:text-gray-600 -mt-0.5">:</span>
        <div className="flex flex-col items-center leading-none text-red-600 dark:text-red-500">
           <span>{s.toString().padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  );
};

export default SalesTicker;
