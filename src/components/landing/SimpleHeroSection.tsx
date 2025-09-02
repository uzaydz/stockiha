import React, { memo, useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlayCircle, ArrowLeft, Zap, TrendingUp, Shield, Globe } from 'lucide-react';
import './hero-effects.css';

// هيرو محسّن مع تأثيرات رقيقة وأداء عالي
const SimpleHeroSection = memo(() => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const typewriterIntervalRef = useRef<NodeJS.Timeout>();
  
  // تحديد ما إذا كان المستخدم يفضل تقليل الحركة
  const prefersReducedMotion = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }, []);
  
  // النصوص الديناميكية
  const dynamicTexts = useMemo(() => [
    'الفوضى',
    'التعقيد', 
    'الأخطاء',
    'الإهمال'
  ], []);
  
  // الميزات مع تحسين الذاكرة
  const features = useMemo(() => [
    { icon: Zap, text: 'سرعة فائقة', color: 'text-yellow-600' },
    { icon: Shield, text: 'أمان متقدم', color: 'text-green-600' },
    { icon: Globe, text: 'وصول عالمي', color: 'text-blue-600' },
    { icon: TrendingUp, text: 'نمو مستمر', color: 'text-purple-600' }
  ], []);
  
  // تأثير تايبرايتر مثالي ومستقر
  const typewriterEffect = useCallback(() => {
    if (prefersReducedMotion) {
      setTypedText(dynamicTexts[0]);
      return;
    }

    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let isWaiting = false;

    const scheduleNext = (delay: number) => {
      typewriterIntervalRef.current = setTimeout(() => {
        type();
      }, delay);
    };

    const type = () => {
      if (isWaiting) return;

      const currentWord = dynamicTexts[wordIndex];
      
      if (isDeleting) {
        // حذف الأحرف
        if (charIndex > 0) {
          charIndex--;
          setTypedText(currentWord.slice(0, charIndex));
          scheduleNext(60); // سرعة الحذف
        } else {
          // انتهى من الحذف، انتقال للكلمة التالية
          isDeleting = false;
          wordIndex = (wordIndex + 1) % dynamicTexts.length;
          scheduleNext(800); // وقفة قبل الكلمة الجديدة
        }
      } else {
        // كتابة الأحرف
        if (charIndex < currentWord.length) {
          charIndex++;
          setTypedText(currentWord.slice(0, charIndex));
          scheduleNext(120); // سرعة الكتابة
        } else {
          // انتهى من الكتابة، وقفة ثم بدء الحذف
          isDeleting = true;
          scheduleNext(2200); // وقفة قبل الحذف
        }
      }
    };

    // بدء التأثير بعد 1.2 ثانية
    const startTimeout = setTimeout(() => {
      type();
    }, 1200);

    // تنظيف
    return () => {
      clearTimeout(startTimeout);
      if (typewriterIntervalRef.current) {
        clearTimeout(typewriterIntervalRef.current);
      }
    };
  }, [dynamicTexts, prefersReducedMotion]);
  
  // Intersection Observer للتحكم في الأنيميشن
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            typewriterEffect();
          }
        });
      },
      { threshold: 0.1 }
    );
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    
    return () => {
      observer.disconnect();
      if (typewriterIntervalRef.current) {
        clearTimeout(typewriterIntervalRef.current);
      }
    };
  }, [typewriterEffect]);
  
  // تدوير الميزات
  useEffect(() => {
    if (prefersReducedMotion) return;
    
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [features.length, prefersReducedMotion]);
  
  const handleDemoClick = useCallback(() => {
    const demoSection = document.getElementById('demo-section');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative landing-bg-primary landing-section-transition pt-20 md:pt-28 pb-16 md:pb-20 overflow-hidden min-h-screen flex items-center"
      style={{
        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
        position: 'relative'
      }}
      role="region"
      aria-labelledby="hero-title"
      dir="rtl"
    >
      {/* خلفية بسيطة وأنيقة محسّنة */}
      <div className="absolute inset-0 hero-bg" aria-hidden="true">
        {/* تدرج أساسي محسّن */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/90 via-white to-gray-50/90 dark:from-gray-900/90 dark:via-gray-800 dark:to-gray-900/90"></div>
        
        {/* نقاط زخرفية رقيقة محسّنة (قللت عددها للبساطة) */}
        <div className="absolute top-20 right-20 w-3 h-3 bg-[#fc5d41]/10 rounded-full hidden sm:block hero-float"></div>
        <div className="absolute bottom-24 left-24 w-2.5 h-2.5 bg-teal-500/10 rounded-full hidden sm:block hero-float" style={{animationDelay: '1.5s'}}></div>
        
        {/* تأثير رقيق للعمق */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-[#fc5d41]/3 to-transparent rounded-full blur-xl hidden lg:block"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10 w-full">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`space-y-6 transition-all duration-800 ${isVisible ? 'hero-content-visible' : 'hero-content-hidden'}`}
>
            
            {/* شارة علوية محسنة (تبسيط) */}
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/90 dark:bg-gray-800/90 border border-gray-200/40 dark:border-gray-600/40 shadow-md backdrop-blur-sm">
              <div className="w-2.5 h-2.5 bg-gradient-to-r from-[#fc5d41] to-purple-500 rounded-full hero-dot-pulse"></div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 tracking-wide">النظام الأول في الجزائر</span>
            </div>

            {/* العنوان الرئيسي محسن للهاتف */}
            <div className="space-y-3">
              <h1 id="hero-title" className="text-3xl sm:text-4xl lg:text-6xl xl:text-7xl font-bold leading-tight max-w-4xl mx-auto px-2 sm:px-0">
                <span className="text-[#fc5d41] block mb-1">
                  سطوكيها
                </span>
                <span className="text-gray-900 dark:text-white font-medium text-lg sm:text-xl lg:text-2xl xl:text-3xl block">
                  لأن وقتك أغلى من{' '}
                  <span 
                    className="inline-block text-[#fc5d41] font-bold relative"
                    style={{
                      background: 'linear-gradient(135deg, #fc5d41 0%, #e11d48 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {typedText}
                    <span 
                      className="inline-block w-0.5 h-5 bg-[#fc5d41] ml-1 opacity-90"
                      style={{
                        animation: 'blink 1s ease-in-out infinite'
                      }}
                    />
                  </span>
                </span>
              </h1>
              
              {/* خط زخرفي بسيط (إزالة للبساطة) */}
            </div>

            {/* الوصف محسّن للهاتف (توحيد الخطوط) */}
            <div className="space-y-4 px-4 sm:px-0">
              <p className="text-base sm:text-lg lg:text-xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto font-normal">
                سطوكيها هي منصتك الشاملة لإدارة تجارتك بكل سهولة واحترافية.
              </p>
              
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-3xl mx-auto">
                من تتبع المخزون وتنظيم المنتجات، إلى إصدار الفواتير ومتابعة الطلبات وربط متجرك مع شركات التوصيل.
              </p>
              
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#fc5d41]/5 rounded-full mt-3">
                <span className="text-xs font-medium text-[#fc5d41]">
                  صُمم خصيصاً للتجار الجزائريين
                </span>
              </div>
            </div>

            {/* قسم الميزات التفاعلية (تحسين التناسق) */}
            <div className="flex flex-wrap justify-center gap-3 mt-6 mb-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                const isActive = index === currentFeature;
                return (
                  <div
                    key={index}
                    className={`feature-item flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                      isActive 
                        ? 'bg-white/95 dark:bg-gray-800/95 shadow-md border border-[#fc5d41]/20 feature-active' 
                        : 'bg-white/70 dark:bg-gray-800/70 shadow-sm hover:shadow-md border border-gray-200/30 dark:border-gray-700/30'
                    }`}
                  >
                    <div className={`${feature.color} ${isActive ? 'feature-icon-active' : ''} transition-all duration-300`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <span className={`text-xs font-medium transition-colors duration-300 ${
                      isActive 
                        ? 'text-[#fc5d41] dark:text-[#fc5d41]' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {feature.text}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* الأزرار المحسنة (تبسيط) */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-6">
              <Link to="/tenant/signup">
                <Button 
                  size="lg" 
                  aria-label="ابدأ مجاناً الآن"
                  className="cta-button bg-[#fc5d41] hover:bg-[#e11d48] text-white px-8 py-3 text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 group border-0"
                >
                  <span className="relative z-10">ابدأ مجاناً الآن</span>
                  <ArrowLeft className="w-5 h-5 mr-2 rtl:rotate-180 group-hover:-translate-x-1 transition-transform duration-300 relative z-10" />
                </Button>
              </Link>
              
              <Button 
                size="lg" 
                onClick={handleDemoClick}
                aria-label="شاهد العرض الترويجي"
                className="secondary-button border border-gray-300 hover:border-[#fc5d41] bg-white hover:bg-gray-50 px-8 py-3 text-base font-semibold rounded-xl transition-all duration-300 group shadow-md hover:shadow-lg text-gray-700 hover:text-[#fc5d41] dark:text-gray-300 dark:hover:text-[#fc5d41]"
              >
                <PlayCircle className="w-5 h-5 ml-2 group-hover:text-[#fc5d41] group-hover:scale-105 transition-all duration-300" />
                <span>شاهد العرض الترويجي</span>
              </Button>
            </div>

            {/* مساحة للصورة المبسطة (تحسين للبساطة) */}
            <div className="relative mt-10">
              <div className="relative max-w-4xl mx-auto">
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-200/30 dark:border-gray-700/30 preview-container">
                  
                  {/* شريط علوي مثل المتصفح (تبسيط) */}
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200/30 dark:border-gray-700/30">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 bg-red-400 rounded-full"></div>
                      <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full"></div>
                      <div className="w-2.5 h-2.5 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-600 rounded-md px-3 py-1 text-xs text-center">
                      <span className="text-[#fc5d41] font-medium">متجرك</span>.stockiha.com
                    </div>
                  </div>
                  
                  {/* منطقة المحتوى */}
                  <div className="aspect-[16/9] bg-gradient-to-br from-gray-50 dark:from-gray-700 to-gray-100 dark:to-gray-600 rounded-xl flex items-center justify-center relative overflow-hidden">
                    
                    {/* محتوى المعاينة */}
                    <div className="text-center z-10">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#fc5d41] to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md dashboard-icon">
                        <div className="w-8 h-8 bg-white/20 rounded-md flex items-center justify-center">
                          <div className="w-4 h-4 bg-white rounded opacity-80"></div>
                        </div>
                      </div>
                      
                      <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-1">
                        لوحة التحكم الذكية
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        إدارة شاملة لتجارتك
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
});

SimpleHeroSection.displayName = 'SimpleHeroSection';

export default SimpleHeroSection;
