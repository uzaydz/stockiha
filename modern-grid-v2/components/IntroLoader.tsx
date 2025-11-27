import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface IntroLoaderProps {
  onComplete: () => void;
}

const IntroLoader: React.FC<IntroLoaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const { t, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Random increment for realism
        return prev + Math.floor(Math.random() * 4) + 1;
      });
    }, 40);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      // Pause briefly at 100% before lifting curtain
      setTimeout(() => {
        setIsExiting(true);
        // Wait for the CSS transition to finish before unmounting/allowing scroll
        setTimeout(onComplete, 1000);
      }, 800);
    }
  }, [progress, onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#0a0a0a] text-white flex flex-col justify-between transition-transform duration-1000 cubic-bezier(0.7, 0, 0.3, 1) ${isExiting ? '-translate-y-full' : 'translate-y-0'}`}
      dir={direction}
    >
      {/* Top Bar */}
      <div className="p-6 md:p-12 flex justify-between items-start opacity-80">
        <span className="text-[10px] uppercase tracking-[0.3em]">Asray Studios</span>
        <span className="text-[10px] uppercase tracking-[0.3em]">{t('intro.location')}</span>
      </div>
      
      {/* Center Brand */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="relative">
           <h1 className="text-[18vw] font-serif italic leading-none mix-blend-difference">
            ASRAY
           </h1>
           <div 
             className="absolute top-0 left-0 w-full h-full bg-[#0a0a0a] transition-all duration-[2000ms] ease-linear"
             style={{ height: `${100 - progress}%` }}
           ></div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="p-6 md:p-12 flex justify-between items-end">
         <div className="text-6xl md:text-8xl font-mono leading-none">
           {progress}%
         </div>
         <div className={`text-right hidden md:block ${isRTL ? 'text-left' : 'text-right'}`}>
           <p className="text-[10px] uppercase tracking-[0.3em] mb-1">{t('intro.status')}</p>
           <p className="text-xs text-gray-400">{t('intro.init')}</p>
         </div>
      </div>
    </div>
  );
};

export default IntroLoader;