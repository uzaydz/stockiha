import React, { useState, useEffect } from 'react';
import { ArrowRight, Play, ArrowLeft } from './Icons';
import { useLanguage } from '../context/LanguageContext';
import { useStoreData } from '../context/StoreDataContext';

interface HeroProps {
  onExplore: () => void;
}

const Hero: React.FC<HeroProps> = ({ onExplore }) => {
  const { storeName } = useStoreData();
  const [loaded, setLoaded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { t, direction, language } = useLanguage();

  useEffect(() => {
    setLoaded(true);

    if (window.matchMedia('(pointer: coarse)').matches) return;

    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrameId) return;

      animationFrameId = requestAnimationFrame(() => {
        setMousePos({
          x: (e.clientX / window.innerWidth - 0.5) * 20,
          y: (e.clientY / window.innerHeight - 0.5) * 20
        });
        animationFrameId = 0;
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const isArabic = language === 'ar';

  return (
    <header className="relative min-h-screen w-full bg-white dark:bg-dark-bg overflow-hidden flex flex-col md:flex-row pt-32 md:pt-28 transition-colors duration-700 contain-paint">

      {/* GIANT WATERMARK TEXT */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none select-none hidden md:block mix-blend-multiply dark:mix-blend-overlay opacity-[0.04] dark:opacity-[0.1] will-change-transform"
        style={{ transform: `translate3d(-50%, -50%, 0) translate3d(${mousePos.x * -2}px, ${mousePos.y * -2}px, 0)` }}
      >
        <span className={`text-[20vw] font-bold leading-none text-aura-black dark:text-white font-serif ${isArabic ? '' : 'italic'}`}>{storeName.toUpperCase()}</span>
      </div>

      {/* LEFT COLUMN: CONTENT */}
      <div className="w-full md:w-1/2 relative z-10 flex flex-col justify-center px-6 md:px-24 pb-12 md:py-0 order-2 md:order-1">
        <div className={`transition-all duration-1000 delay-300 flex flex-col items-start ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-3 border border-gray-200 dark:border-white/10 rounded-full pr-4 pl-1 py-1 mb-8 bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            <div className="bg-aura-black dark:bg-white dark:text-black text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">
              {t('hero.new')}
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300">
              {t('hero.collection')}
            </span>
          </div>

          {/* Main Headline */}
          <h1 className={`text-4xl md:text-6xl lg:text-7xl leading-[1.1] md:leading-[0.95] font-serif text-aura-black dark:text-white mb-6 ${isArabic ? 'font-bold tracking-normal' : 'italic'}`}>
            {t('hero.title_line1')} <br />
            <span className={`not-italic font-sans font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-black to-gray-500 dark:from-white dark:to-gray-500 ${isArabic ? 'tracking-normal' : ''}`}>
              {t('hero.title_line2')}
            </span>
          </h1>

          <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-md mb-10">
            {t('hero.description')}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-8">
            <button
              onClick={onExplore}
              className="group relative px-8 py-4 bg-aura-black dark:bg-white text-white dark:text-black overflow-hidden rounded-sm shadow-xl hover:shadow-2xl transition-shadow"
            >
              <div className="absolute inset-0 w-full h-full bg-gray-800 dark:bg-gray-200 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left rtl:origin-right duration-500"></div>
              <div className="relative flex items-center gap-3 uppercase tracking-widest text-xs font-bold">
                {t('hero.shop_btn')} <ArrowIcon size={14} className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
              </div>
            </button>

            <button className="group flex items-center gap-3 text-xs font-bold uppercase tracking-widest hover:text-gray-600 dark:hover:text-gray-300 transition-colors dark:text-white">
              <div className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/20 flex items-center justify-center group-hover:bg-aura-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all duration-300">
                <Play size={12} fill="currentColor" className="ml-0.5 rtl:mr-0.5 rtl:ml-0" />
              </div>
              <span>{t('hero.film_btn')}</span>
            </button>
          </div>

          {/* Stats / Trust */}
          <div className="mt-16 flex gap-12 border-t border-gray-100 dark:border-white/10 pt-8 w-full text-aura-black dark:text-white">
            <div>
              <p className={`text-2xl font-serif ${isArabic ? '' : 'italic'}`}>24k</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">{t('hero.community')}</p>
            </div>
            <div>
              <p className={`text-2xl font-serif ${isArabic ? '' : 'italic'}`}>100%</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">{t('hero.sustainable')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: VISUAL */}
      <div className="w-full md:w-1/2 relative h-[50vh] md:h-auto order-1 md:order-2 overflow-hidden">
        <div
          className={`w-full h-full transition-all duration-[1.5s] ease-out ${loaded ? 'scale-100 opacity-100' : 'scale-110 opacity-0'}`}
        >
          <img
            src="https://picsum.photos/800/1200?grayscale&blur=1"
            srcSet="https://picsum.photos/400/600?grayscale&blur=1 400w, https://picsum.photos/800/1200?grayscale&blur=1 800w"
            sizes="(max-width: 768px) 100vw, 50vw"
            alt="Hero Visual"
            className="w-full h-full object-cover dark:brightness-90 dark:grayscale-[0.2]"
            // @ts-ignore
            fetchPriority="high"
            loading="eager"
            decoding="sync"
            width="800"
            height="1200"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-dark-bg via-transparent to-transparent md:hidden"></div>
        </div>
      </div>

    </header>
  );
};

export default React.memo(Hero);