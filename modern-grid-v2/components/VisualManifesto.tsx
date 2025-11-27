import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const VisualManifesto: React.FC = () => {
  const { t, direction, language } = useLanguage();
  const isArabic = language === 'ar';

  return (
    <section className="relative py-48 md:py-64 bg-white dark:bg-black overflow-hidden flex items-center justify-center transition-colors duration-700" dir={direction}>
      {/* Video/Image Background with Parallax feel */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://picsum.photos/1920/1080?grayscale&blur=4" 
          alt="Aesthetic Background" 
          className="w-full h-full object-cover opacity-20 dark:opacity-30"
        />
        {/* Grain Overlay */}
        <div className="absolute inset-0 opacity-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center mix-blend-difference dark:mix-blend-normal text-black dark:text-white">
        <div className="mb-8 flex justify-center">
           <div className="w-px h-24 bg-black dark:bg-white animate-pulse"></div>
        </div>
        
        <h2 className={`text-5xl md:text-7xl lg:text-8xl font-serif leading-tight mb-8 ${isArabic ? '' : 'italic'}`}>
          {t('manifesto.quote')}
        </h2>
        
        <div className="flex items-center justify-center gap-4 text-xs uppercase tracking-[0.3em] font-bold text-gray-600 dark:text-gray-400 mt-12">
           <span>{t('manifesto.est')}</span>
           <span className="w-12 h-px bg-gray-400 dark:bg-gray-600"></span>
           <span>{t('manifesto.location')}</span>
        </div>
      </div>
      
      {/* Floating Elements */}
      <div className="absolute top-1/2 left-12 w-24 h-24 border border-black/10 dark:border-white/10 rounded-full animate-spin-slow hidden md:block"></div>
      <div className="absolute bottom-12 right-12 w-32 h-32 border border-black/10 dark:border-white/10 rounded-full animate-float hidden md:block"></div>
    </section>
  );
};

export default VisualManifesto;