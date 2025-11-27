import React from 'react';
import { Star } from './Icons';
import { useLanguage } from '../context/LanguageContext';

const MarqueeStrip: React.FC = () => {
  const { language } = useLanguage();
  
  const itemsEn = [
    "SPRING / SUMMER 2025",
    "NEW COLLECTION LIVE",
    "WORLDWIDE SHIPPING",
    "ASRAY STUDIOS",
    "DEFINING SILHOUETTE",
    "LIMITED CAPSULE"
  ];

  const itemsAr = [
    "ربيع / صيف 2025",
    "التشكيلة الجديدة متاحة الآن",
    "شحن لجميع أنحاء العالم",
    "استوديوهات أسراي",
    "تعريف الأناقة",
    "إصدار محدود"
  ];

  const itemsFr = [
    "PRINTEMPS / ÉTÉ 2025",
    "NOUVELLE COLLECTION",
    "EXPÉDITION MONDIALE",
    "STUDIOS ASRAY",
    "DÉFINIR LA SILHOUETTE",
    "CAPSULE LIMITÉE"
  ];

  let items = itemsEn;
  if (language === 'ar') items = itemsAr;
  if (language === 'fr') items = itemsFr;

  return (
    <div className="bg-aura-black text-white py-4 overflow-hidden border-y border-white/10 relative z-20 content-visibility-auto">
      <div className="flex whitespace-nowrap animate-scroll will-change-transform" dir="ltr">
        {/* Render duplications for seamless loop */}
        {[...Array(4)].map((_, groupIndex) => (
          <div key={groupIndex} className="flex items-center gap-12 px-6">
            {items.map((text, i) => (
              <div key={i} className="flex items-center gap-12">
                <span className={`text-xs font-bold uppercase ${language === 'ar' ? 'tracking-normal' : 'tracking-[0.3em]'}`}>{text}</span>
                <Star size={10} className="text-gray-500 fill-current" />
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <style>{`
        @keyframes scroll {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-25%, 0, 0); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default MarqueeStrip;