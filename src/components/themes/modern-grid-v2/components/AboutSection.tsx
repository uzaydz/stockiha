import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const AboutSection: React.FC = () => {
  const { t, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  return (
    <section id="about" className="py-24 bg-aura-black text-white relative overflow-hidden content-visibility-auto contain-content" dir={direction}>
      <div className={`absolute top-0 ${isRTL ? 'left-0 bg-gradient-to-r' : 'right-0 bg-gradient-to-l'} w-1/3 h-full from-gray-900 to-transparent pointer-events-none`}></div>
      
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        <div className="space-y-8 relative z-10">
          <h2 className="text-4xl md:text-6xl font-serif leading-tight">
            {t('about.title')} <br/> <span className="italic text-gray-400">{t('about.subtitle')}</span>
          </h2>
          <div className="h-px w-24 bg-white/30"></div>
          <p className="text-lg text-gray-300 leading-relaxed max-w-md">
            {t('about.p1')}
          </p>
          <p className="text-lg text-gray-300 leading-relaxed max-w-md">
            {t('about.p2')}
          </p>
          
          <div className="pt-8 grid grid-cols-3 gap-8 border-t border-white/10">
             <div>
                <h4 className="text-3xl font-serif">01</h4>
                <p className="text-xs uppercase tracking-widest mt-2 text-gray-400">{t('about.design')}</p>
             </div>
             <div>
                <h4 className="text-3xl font-serif">02</h4>
                <p className="text-xs uppercase tracking-widest mt-2 text-gray-400">{t('about.sustain')}</p>
             </div>
             <div>
                <h4 className="text-3xl font-serif">03</h4>
                <p className="text-xs uppercase tracking-widest mt-2 text-gray-400">{t('about.evolve')}</p>
             </div>
          </div>
        </div>

        <div className="relative h-[600px] w-full group">
          <div className={`absolute inset-0 border border-white/20 z-0 transition-transform duration-500 ${isRTL ? '-translate-x-4 group-hover:-translate-x-6' : 'translate-x-4 group-hover:translate-x-6'} translate-y-4 group-hover:translate-y-6`}></div>
          <img 
            src="https://picsum.photos/800/1000?random=99" 
            alt="Studio Work" 
            className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 z-10"
            loading="lazy"
            decoding="async"
            width="800"
            height="1000"
          />
        </div>
      </div>
    </section>
  );
};

export default React.memo(AboutSection);