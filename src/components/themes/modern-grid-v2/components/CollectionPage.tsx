import React from 'react';
import { ArrowRight, ArrowDown, ArrowLeft } from './Icons';
import { useLanguage } from '../context/LanguageContext';

interface CollectionPageProps {
  onShopCategory: (category: string) => void;
}

const CollectionPage: React.FC<CollectionPageProps> = ({ onShopCategory }) => {
  const { t, direction, language } = useLanguage();
  const isRTL = direction === 'rtl';
  const isArabic = language === 'ar';
  
  const handleShopClick = (category: string) => {
    onShopCategory(category);
    window.scrollTo(0, 0);
  };

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight; 

  return (
    <div className="bg-white dark:bg-dark-bg animate-fade-in-up transition-colors duration-700" dir={direction}>
      
      {/* Intro Hero */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
           <img 
            src="https://picsum.photos/1920/1200?random=88" 
            alt="Editorial Cover"
            className="w-full h-full object-cover grayscale brightness-75 dark:brightness-50"
            fetchPriority="high"
            loading="eager"
           />
           <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-white dark:to-dark-bg"></div>
        </div>
        
        <div className="relative z-10 text-center text-white px-6 max-w-4xl">
          <span className="block text-sm tracking-[0.4em] uppercase mb-6 opacity-80">{t('collection.editorial')}</span>
          <h1 className={`text-6xl md:text-8xl lg:text-9xl font-serif mb-8 leading-none ${isArabic ? '' : 'italic'}`}>
            {t('collection.art_absence')}
          </h1>
          <p className="text-lg font-light max-w-lg mx-auto leading-relaxed text-white/90">
            {t('collection.manifesto')}
          </p>
        </div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white animate-bounce">
          <ArrowDown size={24} />
        </div>
      </section>

      {/* Manifesto Section */}
      <section className="py-32 px-6 max-w-5xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-serif leading-tight mb-12 text-aura-black dark:text-white">
          "{t('collection.form_follows')}"
        </h2>
        <div className="w-px h-24 bg-gray-300 dark:bg-gray-700 mx-auto"></div>
      </section>

      {/* Look 01: The Essentials */}
      <section className="py-12 md:py-24">
        <div className="max-w-[1600px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className={`order-2 ${isRTL ? 'lg:order-2' : 'lg:order-1'} relative h-[800px] overflow-hidden group cursor-pointer`} onClick={() => handleShopClick('The Essentials')}>
            <img 
              src="https://picsum.photos/900/1200?random=89" 
              alt="The Essentials Look" 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 dark:brightness-90"
              loading="lazy"
              decoding="async"
              width="900"
              height="1200"
            />
            <div className={`absolute bottom-8 ${isRTL ? 'right-8' : 'left-8'} bg-white/90 dark:bg-black/90 backdrop-blur p-6 max-w-xs transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500`}>
              <p className={`font-serif text-xl mb-2 text-aura-black dark:text-white ${isArabic ? '' : 'italic'}`}>The Silk Knit</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">{t('vision.shop_look')} <ArrowIcon size={12} /></p>
            </div>
          </div>
          <div className={`order-1 ${isRTL ? 'lg:order-1 lg:pr-12' : 'lg:order-2 lg:pl-12'}`}>
            <span className="text-9xl font-serif text-gray-100 dark:text-gray-800 absolute -z-10 -translate-y-12 select-none">01</span>
            <h3 className="text-4xl md:text-5xl font-serif mb-6 text-aura-black dark:text-white">{t('collection.elemental')}</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8 max-w-md">
              Returning to the foundation. Our essentials collection strips away the superfluous, leaving only pure geometry and tactile warmth. 
              Fabric that breathes with you.
            </p>
            <button 
              onClick={() => handleShopClick('The Essentials')}
              className="inline-flex items-center gap-3 border-b border-black dark:border-white pb-1 uppercase tracking-widest text-xs font-bold hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-600 dark:hover:border-gray-300 transition-colors text-aura-black dark:text-white"
            >
              {t('collection.shop_essentials')}
            </button>
          </div>
        </div>
      </section>

      {/* Parallax Break */}
      <section className="relative h-[60vh] md:h-[80vh] overflow-hidden my-12">
        <img 
          src="https://picsum.photos/1920/1080?random=95" 
          alt="Texture Detail" 
          className="absolute inset-0 w-full h-full object-cover fixed-background dark:brightness-75"
          style={{ objectPosition: 'center' }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <h2 className={`text-5xl md:text-7xl font-serif text-white ${isArabic ? '' : 'italic'}`}>{t('collection.tactile')}</h2>
        </div>
      </section>

      {/* Look 02: Outerwear */}
      <section className="py-12 md:py-24 bg-aura-stone/30 dark:bg-[#121212]">
        <div className="max-w-[1600px] mx-auto px-6">
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-16">
              <div className="lg:col-span-4">
                <span className="text-9xl font-serif text-gray-200 dark:text-gray-800 block leading-none mb-4">02</span>
                <h3 className="text-4xl md:text-5xl font-serif mb-6 text-aura-black dark:text-white">{t('collection.shield')}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
                  Engineered for the urban environment. Water-resistant finishes meet soft, draping silhouettes. 
                  Protection without the weight.
                </p>
                <button 
                  onClick={() => handleShopClick('Outerwear')}
                  className="bg-aura-black dark:bg-white text-white dark:text-black px-8 py-4 uppercase tracking-widest text-xs font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors mb-8 lg:mb-0"
                >
                  {t('collection.view_outerwear')}
                </button>
              </div>
              <div className="lg:col-span-8 grid grid-cols-2 gap-4">
                 <div className="relative aspect-[3/4] overflow-hidden group cursor-pointer" onClick={() => handleShopClick('Outerwear')}>
                    <img src="https://picsum.photos/600/800?random=91" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 dark:brightness-90" alt="Coat" loading="lazy" />
                 </div>
                 <div className="relative aspect-[3/4] overflow-hidden mt-12 group cursor-pointer" onClick={() => handleShopClick('Outerwear')}>
                    <img src="https://picsum.photos/600/800?random=92" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 dark:brightness-90" alt="Jacket" loading="lazy" />
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Look 03: Accessories */}
      <section className="py-24 bg-white dark:bg-dark-bg">
        <div className="max-w-6xl mx-auto px-6 text-center mb-16">
          <span className="text-sm tracking-widest uppercase text-gray-500 dark:text-gray-400 mb-2 block">{t('collection.final_touches')}</span>
          <h3 className="text-4xl font-serif mb-6 text-aura-black dark:text-white">{t('collection.architecture')}</h3>
        </div>
        
        <div className="max-w-[1800px] mx-auto px-6 overflow-x-auto pb-12 no-scrollbar" dir="ltr">
           <div className="flex gap-8 min-w-max">
              {[96, 97, 98, 99].map((id, index) => (
                <div key={id} className="w-[300px] md:w-[400px] group cursor-pointer" onClick={() => handleShopClick('Accessories')}>
                   <div className="aspect-square overflow-hidden mb-4 bg-gray-50 dark:bg-dark-card">
                     <img 
                       src={`https://picsum.photos/800/800?random=${id}`} 
                       alt="Accessory" 
                       className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0"
                       loading="lazy" 
                     />
                   </div>
                   <div className="flex justify-between items-baseline text-aura-black dark:text-white">
                      <p className={`font-serif text-xl ${isArabic ? '' : 'italic'}`}>Object 0{index + 1}</p>
                      <span className="text-xs uppercase tracking-widest border-b border-transparent group-hover:border-black dark:group-hover:border-white transition-colors">Explore</span>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </section>

      <section className="py-24 bg-aura-black dark:bg-white text-white dark:text-black text-center">
        <h2 className={`text-4xl font-serif mb-8 ${isArabic ? '' : 'italic'}`}>{t('collection.ready')}</h2>
        <button 
          onClick={() => handleShopClick('All')}
          className="bg-white dark:bg-black text-aura-black dark:text-white px-10 py-4 uppercase tracking-widest text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          {t('collection.shop_full')}
        </button>
      </section>

    </div>
  );
};

export default React.memo(CollectionPage);