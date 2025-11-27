import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft } from './Icons';
import { useLanguage } from '../context/LanguageContext';

const AtelierSpotlight: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const { t, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="relative py-32 bg-white dark:bg-white overflow-hidden" dir={direction}>
      <div className="max-w-[1800px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
        
        {/* Text Content - Left/Bottom on mobile, Right on Desktop */}
        <div className="relative z-10 order-2 lg:order-1">
           <div className="w-12 h-px bg-black mb-8"></div>
           <span className="text-xs font-bold uppercase tracking-[0.3em] text-gray-400 mb-6 block">{t('atelier.label')}</span>
           
           <h2 className="text-5xl md:text-7xl font-serif italic mb-8 leading-[0.9]">
             {t('atelier.title')} <br/>
             <span className="not-italic text-transparent bg-clip-text bg-gradient-to-r from-black to-gray-500">{t('atelier.subtitle')}</span>
           </h2>
           
           <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-md font-serif">
             {t('atelier.quote')}
           </p>
           <p className="text-sm text-gray-500 leading-relaxed mb-12 max-w-md">
             {t('atelier.desc')}
           </p>
           
           <div className="grid grid-cols-2 gap-8 mb-12 border-t border-gray-100 pt-8">
             <div>
               <h4 className="text-4xl font-serif mb-2">120+</h4>
               <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">{t('atelier.hours')}</p>
             </div>
             <div>
               <h4 className="text-4xl font-serif mb-2">0%</h4>
               <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">{t('atelier.compromise')}</p>
             </div>
           </div>

           <button className="group flex items-center gap-4 text-xs uppercase tracking-[0.2em] font-bold border-b border-black pb-2 hover:text-gray-600 transition-colors">
             {t('atelier.explore')}
             <ArrowIcon size={14} className={`transition-transform ${isRTL ? 'group-hover:-translate-x-2' : 'group-hover:translate-x-2'}`}/>
           </button>
        </div>

        {/* Mask Reveal Image - Arch Shape */}
        <div className="relative order-1 lg:order-2 h-[70vh] w-full overflow-hidden rounded-t-[150px] lg:rounded-t-[300px]">
           <div className="absolute inset-0 bg-gray-200 overflow-hidden">
              <img 
                src="https://picsum.photos/1000/1500?grayscale&blur=1" 
                alt="Atelier Work" 
                className="w-full h-full object-cover transition-transform duration-75"
                style={{ 
                  transform: `scale(${1.1 + scrollY * 0.0001}) translateY(${scrollY * 0.02}px)` 
                }}
                loading="lazy"
              />
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
           </div>
           
           {/* Floating Badge */}
           <div className={`absolute bottom-8 ${isRTL ? 'left-8' : 'right-8'} bg-white/90 backdrop-blur p-6 rounded-sm max-w-[200px] shadow-xl hidden md:block`}>
             <p className="font-serif italic text-lg">{t('atelier.badge_quote')}</p>
             <div className="w-full h-px bg-gray-200 my-2"></div>
             <p className="text-[9px] uppercase tracking-widest text-gray-500">{t('atelier.badge_role')}</p>
           </div>
        </div>

      </div>
    </section>
  );
};

export default AtelierSpotlight;