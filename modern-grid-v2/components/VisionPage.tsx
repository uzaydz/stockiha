import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowDown } from './Icons';
import { useStoreData } from '../context/StoreDataContext';
import { Product } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface VisionPageProps {
  onBack: () => void;
  onOpenProduct: (product: Product) => void;
}

const VisionPage: React.FC<VisionPageProps> = ({ onBack, onOpenProduct }) => {
  const [scrollY, setScrollY] = useState(0);
  const { t, direction } = useLanguage();
  const { products: PRODUCTS } = useStoreData();
  const isRTL = direction === 'rtl';

  // Filter for dark items for this specific vibe
  const visionProducts = PRODUCTS.slice(0, 5);

  useEffect(() => {
    // Performance: Disable parallax calculation on mobile to save battery/CPU
    if (window.innerWidth < 768) return;

    let animationFrameId: number;
    const handleScroll = () => {
      animationFrameId = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Helper to calculate parallax transforms
  const getParallax = (speed: number, offset: number = 0) => {
    // Disable transform on mobile for simple scroll
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 'none';
    return `translateY(${scrollY * speed + offset}px)`;
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="bg-white dark:bg-[#050505] text-black dark:text-white overflow-x-hidden selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-1000" dir={direction}>

      {/* Fixed Header */}
      <nav className="fixed top-0 left-0 w-full p-8 z-50 flex justify-between items-start mix-blend-difference dark:mix-blend-normal pointer-events-none">
        <button onClick={onBack} className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] group hover:opacity-70 transition-opacity cursor-hover text-white dark:text-white pointer-events-auto">
          <div className="w-8 h-px bg-white group-hover:w-12 transition-all"></div>
          {t('vision.exit')}
        </button>
        <div className={`text-right hidden md:block text-white dark:text-white ${isRTL ? 'text-left' : 'text-right'}`}>
          <span className="block text-[10px] uppercase tracking-widest mb-1">{t('vision.chapter')} 01</span>
          <span className="font-serif italic text-xl">{t('vision.series')}</span>
        </div>
      </nav>

      {/* CHAPTER 1: THE PORTAL (Zoom Effect) */}
      <section className="relative h-[120vh] overflow-hidden flex items-center justify-center bg-black dark:bg-black">
        <div
          className="absolute inset-0 z-0"
          style={{
            // Conditional transform logic done in CSS/JS, keep it simple here
            transform: typeof window !== 'undefined' && window.innerWidth >= 768 ? `scale(${1 + scrollY * 0.0005})` : 'none',
            opacity: typeof window !== 'undefined' && window.innerWidth >= 768 ? Math.max(0, 1 - scrollY * 0.001) : 1
          }}
        >
          <img
            src="https://picsum.photos/1920/1080?grayscale&blur=2"
            className="w-full h-full object-cover opacity-40"
            alt="Portal Background"
            fetchPriority="high"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-white dark:to-[#050505]"></div>
        </div>

        <div className="relative z-10 text-center px-6">
          <p
            className="text-xs md:text-sm uppercase tracking-[0.5em] mb-8 text-gray-400"
          >
            {t('vision.experimental')}
          </p>
          <h1
            className="text-[15vw] md:text-[12vw] font-serif leading-[0.8] mix-blend-overlay opacity-90 text-white"
            style={{ transform: typeof window !== 'undefined' && window.innerWidth >= 768 ? `translateY(${scrollY * 0.2}px) scale(${1 + scrollY * 0.0002})` : 'none' }}
          >
            {t('vision.deep_dive')}
          </h1>
        </div>

        <div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center text-white dark:text-white mix-blend-difference dark:mix-blend-normal"
          style={{ opacity: typeof window !== 'undefined' && window.innerWidth >= 768 ? Math.max(0, 1 - scrollY * 0.005) : 1 }}
        >
          <ArrowDown className="animate-bounce mx-auto mb-4" />
          <span className="text-[10px] uppercase tracking-widest">{t('vision.begin')}</span>
        </div>
      </section>

      {/* CHAPTER 2: THE MANIFESTO (Marquee & Sticky) */}
      <section className="relative py-32 bg-white dark:bg-black text-black dark:text-white transition-colors duration-700">
        {/* Giant Marquee Background */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full overflow-hidden opacity-5 pointer-events-none select-none" dir="ltr">
          <div
            className="whitespace-nowrap text-[20vw] font-bold leading-none"
            style={{ transform: `translateX(${-scrollY * 0.5}px)` }}
          >
            {t('vision.marquee')}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <p className="text-2xl md:text-4xl font-serif leading-relaxed text-gray-500 dark:text-gray-400 text-center">
            "{t('vision.manifesto_p1')} <br />
            <span className="text-black dark:text-white">{t('vision.manifesto_p2')}</span> <br />
            {t('vision.manifesto_p3')}"
          </p>
        </div>
      </section>

      {/* CHAPTER 3: THE DECONSTRUCTION (Parallax Grid) */}
      <section className="relative py-48 overflow-hidden bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-700">
        <div className="max-w-[1600px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-32">

          {/* Item 1 - Fast Mover */}
          <div className="mt-0 md:mt-32 cursor-pointer group" onClick={() => onOpenProduct(visionProducts[0])}
            style={{ transform: getParallax(0.1, 0) }}>
            <div className="aspect-[3/4] relative overflow-hidden mb-4 bg-gray-200 dark:bg-gray-900">
              <img src={visionProducts[0].images[0]} className="w-full h-full object-cover opacity-80 dark:opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" alt="v1" loading="lazy" />
              <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} text-xs font-bold border border-black/30 dark:border-white/30 px-2 py-1 rounded-full`}>+</div>
            </div>
            <h3 className={`text-3xl font-serif italic transition-transform text-black dark:text-white ${isRTL ? 'group-hover:-translate-x-4' : 'group-hover:translate-x-4'}`}>{visionProducts[0].name}</h3>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-2">001 / {t('vision.concept')}</p>
          </div>

          {/* Item 2 - Slow Mover */}
          <div className="cursor-pointer group" onClick={() => onOpenProduct(visionProducts[1])}
            style={{ transform: getParallax(0.05, 0) }}>
            <div className="aspect-[3/4] relative overflow-hidden mb-4 bg-gray-200 dark:bg-gray-900 grayscale hover:grayscale-0 transition-all duration-700">
              <img src={visionProducts[1].images[0]} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-all duration-700" alt="v2" loading="lazy" />
            </div>
            <h3 className={`text-3xl font-serif italic transition-transform text-black dark:text-white ${isRTL ? 'group-hover:-translate-x-4' : 'group-hover:translate-x-4'}`}>{visionProducts[1].name}</h3>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-2">002 / {t('vision.form')}</p>
          </div>

          {/* Item 3 - Reverse/Static Mover */}
          <div className="hidden lg:block mt-64 cursor-pointer group" onClick={() => onOpenProduct(visionProducts[2])}
            style={{ transform: getParallax(-0.08, 200) }}>
            <div className="aspect-[4/5] relative overflow-hidden mb-4 bg-gray-200 dark:bg-gray-900">
              <img src={visionProducts[2].images[0]} className="w-full h-full object-cover opacity-80 dark:opacity-60 group-hover:opacity-100 transition-all duration-700" alt="v3" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-white/80 dark:from-black to-transparent opacity-50"></div>
            </div>
            <h3 className={`text-3xl font-serif italic transition-transform text-black dark:text-white ${isRTL ? 'group-hover:-translate-x-4' : 'group-hover:translate-x-4'}`}>{visionProducts[2].name}</h3>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-2">003 / {t('vision.void')}</p>
          </div>

        </div>
      </section>

      {/* CHAPTER 4: THE RUNWAY (Sticky Horizontal Scroll) */}
      <section className="relative h-[300vh]">
        <div className="sticky top-0 h-screen overflow-hidden bg-white dark:bg-black text-black dark:text-white flex flex-col justify-center transition-colors duration-700">
          <div className={`absolute top-8 ${isRTL ? 'right-8 md:right-16' : 'left-8 md:left-16'} z-10`}>
            <h2 className="text-6xl md:text-8xl font-serif leading-none">{t('vision.lineup')}</h2>
          </div>

          {/* The Horizontal Strip */}
          <div
            className="flex gap-8 items-center"
            style={{
              transform: `translateX(${isRTL ? '' : '-'}${typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : (scrollY - 2500) * 0.8}px)`,
              paddingLeft: isRTL ? '0' : '20vw',
              paddingRight: isRTL ? '20vw' : '0',
              flexDirection: isRTL ? 'row-reverse' : 'row',
              overflowX: typeof window !== 'undefined' && window.innerWidth < 768 ? 'auto' : 'visible'
            }}
          >
            {visionProducts.map((product, idx) => (
              <div
                key={idx}
                className="w-[300px] md:w-[400px] shrink-0 group cursor-pointer"
                onClick={() => onOpenProduct(product)}
              >
                <div className="aspect-[3/5] overflow-hidden relative bg-gray-200 dark:bg-gray-800 mb-6">
                  <img src={product.images[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Runway" loading="lazy" />
                  <div className="absolute bottom-0 left-0 w-full p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 dark:bg-black/90">
                    <p className="uppercase tracking-widest text-xs font-bold text-black dark:text-white">{t('vision.shop_look')}</p>
                  </div>
                </div>
                <div className="flex items-end justify-between border-b border-black dark:border-white pb-2">
                  <span className="font-serif italic text-2xl">{product.name}</span>
                  <span className="font-mono text-xs">0{idx + 1}</span>
                </div>
              </div>
            ))}

            {/* End Card */}
            <div className="w-[400px] shrink-0 h-[600px] flex items-center justify-center border border-black/10 dark:border-white/10">
              <p className="font-serif text-3xl italic text-gray-400">{t('vision.end_runway')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER 5: THE ARCHIVES */}
      <section className="py-48 px-6 max-w-5xl mx-auto bg-white dark:bg-black transition-colors duration-700">
        <div className="text-center mb-32">
          <span className="text-xs uppercase tracking-[0.5em] text-gray-500 mb-4 block">{t('vision.immersion')}</span>
          <h2 className="text-5xl md:text-7xl font-serif text-black dark:text-white">{t('vision.details')}</h2>
        </div>

        <div className="space-y-[-100px] pb-32">
          {[
            { title: t('vision.archive_1_title'), desc: t('vision.archive_1_desc'), img: "https://picsum.photos/1200/600?grayscale&blur=1" },
            { title: t('vision.archive_2_title'), desc: t('vision.archive_2_desc'), img: "https://picsum.photos/1200/600?grayscale&blur=2" },
            { title: t('vision.archive_3_title'), desc: t('vision.archive_3_desc'), img: "https://picsum.photos/1200/600?grayscale&blur=3" }
          ].map((item, i) => (
            <div
              key={i}
              className="sticky top-32 bg-gray-100 dark:bg-[#111] border border-black/5 dark:border-white/10 p-8 md:p-16 rounded-sm shadow-2xl transform transition-transform duration-500 hover:-translate-y-4 group"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div>
                  <span className="text-6xl font-serif text-gray-300 dark:text-white/20 mb-4 block">0{i + 1}</span>
                  <h3 className="text-4xl font-serif mb-4 text-black dark:text-white">{item.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-lg">{item.desc}</p>
                </div>
                <div className="aspect-video overflow-hidden bg-gray-300 dark:bg-black opacity-80 dark:opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                  <img src={item.img} className="w-full h-full object-cover grayscale" alt="Detail" loading="lazy" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* EXIT FOOTER */}
      <section className="h-screen flex flex-col items-center justify-center bg-white dark:bg-black text-black dark:text-white relative overflow-hidden transition-colors duration-700">
        <div className="absolute inset-0 opacity-10">
          <img src="https://picsum.photos/1920/1080?random=5" className="w-full h-full object-cover" alt="Exit" loading="lazy" />
        </div>
        <h2 className="text-[10vw] font-serif italic relative z-10 leading-none">{t('vision.wake_up')}</h2>
        <button
          onClick={onBack}
          className="mt-12 px-12 py-4 bg-black dark:bg-white text-white dark:text-black uppercase tracking-[0.3em] text-xs font-bold hover:bg-red-600 dark:hover:bg-red-500 transition-colors relative z-10 cursor-hover"
        >
          {t('vision.return')}
        </button>
      </section>

    </div>
  );
};

export default React.memo(VisionPage);