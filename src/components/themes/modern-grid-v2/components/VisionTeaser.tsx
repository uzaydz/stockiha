import React from 'react';
import { ArrowRight, ArrowLeft } from './Icons';
import { useLanguage } from '../context/LanguageContext';

interface VisionTeaserProps {
  onEnterVision: () => void;
}

const VisionTeaser: React.FC<VisionTeaserProps> = ({ onEnterVision }) => {
  const { t, direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="relative py-32 bg-aura-black overflow-hidden cursor-pointer group" onClick={onEnterVision} dir={direction}>
      {/* Background Video/Image Simulation */}
      <div className="absolute inset-0 opacity-40 transition-opacity duration-700 group-hover:opacity-60">
        <img 
          src="https://picsum.photos/1920/1080?random=999" 
          alt="Vision Background" 
          className="w-full h-full object-cover grayscale filter brightness-50 scale-105 transition-transform duration-[2s] group-hover:scale-100"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-white">
        <div className="mb-8 md:mb-0 text-center md:text-start">
          <div className="flex items-center justify-center md:justify-start gap-3 text-gray-400 mb-4">
             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
             <span className="text-xs font-bold uppercase tracking-[0.2em]">{t('teaser.live')}</span>
          </div>
          <h2 className="text-5xl md:text-8xl font-serif italic leading-none mb-2">
            {t('teaser.title')}
          </h2>
          <p className="text-gray-400 max-w-md mt-4 leading-relaxed mx-auto md:mx-0">
            {t('teaser.desc')}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="w-24 h-24 rounded-full border border-white/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all duration-500">
            <ArrowIcon size={32} />
          </div>
          <span className="mt-4 text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-2 group-hover:translate-y-0">
            {t('teaser.enter')}
          </span>
        </div>
      </div>

      {/* Floating Text */}
      <div className="absolute -bottom-10 left-0 w-full overflow-hidden pointer-events-none" dir="ltr">
        <div className="text-[10rem] font-bold text-white/5 whitespace-nowrap uppercase leading-none select-none animate-float">
          {t('teaser.float')}
        </div>
      </div>
    </section>
  );
};

export default VisionTeaser;