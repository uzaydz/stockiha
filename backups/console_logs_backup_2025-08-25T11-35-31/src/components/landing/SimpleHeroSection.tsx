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
    { icon: Zap, text: 'سرعة فائقة', color: 'text-yellow-500' },
    { icon: Shield, text: 'أمان متقدم', color: 'text-green-500' },
    { icon: Globe, text: 'وصول عالمي', color: 'text-blue-500' },
    { icon: TrendingUp, text: 'نمو مستمر', color: 'text-purple-500' }
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
      className="relative hero-section pt-28 md:pt-32 pb-20 md:pb-24 overflow-hidden min-h-screen flex items-center"
      style={{
        background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 50%, #f5f5f5 100%)',
        position: 'relative'
      }}
      role="region"
      aria-labelledby="hero-title"
      dir="rtl"
    >
      {/* خلفية بسيطة وأنيقة محسّنة */}
      <div className="absolute inset-0 hero-bg" aria-hidden="true">
        {/* تدرج أساسي محسّن */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/80 via-white to-gray-50/80 dark:from-gray-900/80 dark:via-gray-800 dark:to-gray-900/80"></div>
        
        {/* نقاط زخرفية رقيقة محسّنة */}
        <div className="absolute top-20 right-20 w-3 h-3 bg-[#fc5d41]/20 rounded-full hidden sm:block hero-float"></div>
        <div className="absolute top-40 left-32 w-2 h-2 bg-purple-500/20 rounded-full hidden sm:block hero-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-32 right-1/3 w-3 h-3 bg-blue-500/20 rounded-full hidden sm:block hero-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-24 left-24 w-2.5 h-2.5 bg-teal-500/20 rounded-full hidden sm:block hero-float" style={{animationDelay: '1.5s'}}></div>
        
        {/* خطوط هندسية بسيطة وأنيقة */}
        <div className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#fc5d41]/15 to-transparent hidden md:block opacity-60"></div>
        <div className="absolute bottom-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/15 to-transparent hidden md:block opacity-60"></div>
        
        {/* تأثير رقيق للعمق */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-[#fc5d41]/5 to-transparent rounded-full blur-xl hidden lg:block"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-gradient-to-br from-purple-500/5 to-transparent rounded-full blur-xl hidden lg:block"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10 w-full">
        <div className="max-w-5xl mx-auto text-center">
          <div className={`space-y-8 transition-all duration-1000 ${isVisible ? 'hero-content-visible' : 'hero-content-hidden'}`}>
            
            {/* شارة علوية محسنة */}
            <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white/95 dark:bg-gray-800/95 border border-gray-200/60 dark:border-gray-600/60 shadow-lg backdrop-blur-sm">
              <div className="w-3 h-3 bg-gradient-to-r from-[#fc5d41] to-purple-500 rounded-full hero-dot-pulse"></div>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 tracking-wide">النظام الأول في الجزائر</span>
              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-[#fc5d41] rounded-full hero-dot-scale"></div>
            </div>

            {/* العنوان الرئيسي محسن للهاتف */}
            <div className="space-y-4">
              <h1 id="hero-title" className="text-4xl sm:text-5xl lg:text-7xl xl:text-8xl font-black leading-tight max-w-5xl mx-auto px-2 sm:px-0">
                <span className="text-[#fc5d41] block mb-2">
                  سطوكيها
                </span>
                <span className="text-gray-900 dark:text-white font-light text-xl sm:text-2xl lg:text-3xl xl:text-4xl block">
                  لأن وقتك أغلى من{' '}
                  <span 
                    className="inline-block text-[#fc5d41] font-bold relative"
                    style={{
                      background: 'linear-gradient(135deg, #fc5d41 0%, #e11d48 50%, #fc5d41 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: '2px 2px 8px rgba(252,93,65,0.3)'
                    }}
                  >
                    {typedText}
                    {/* مؤشر الكتابة محسّن */}
                    <span 
                      className="inline-block w-0.5 h-6 bg-[#fc5d41] ml-1 opacity-90"
                      style={{
                        animation: 'blink 1.2s ease-in-out infinite'
                      }}
                    />
                  </span>
                </span>
              </h1>
              
              {/* خط زخرفي بسيط */}
              <div className="flex justify-center items-center gap-4 hero-divider">
                <div className="w-16 h-px bg-[#fc5d41] opacity-60"></div>
                <div className="w-3 h-3 bg-[#fc5d41] rounded-full opacity-80"></div>
                <div className="w-16 h-px bg-[#fc5d41] opacity-60"></div>
              </div>
            </div>

            {/* الوصف محسّن للهاتف */}
            <div className="space-y-4 sm:space-y-6 px-4 sm:px-0">
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-4xl mx-auto font-normal">
                سطوكيها هي منصتك الشاملة لإدارة تجارتك بكل سهولة واحترافية
              </p>
              
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-4xl mx-auto">
                من تتبع المخزون وتنظيم المنتجات، إلى إصدار الفواتير ومتابعة الطلبات وربط متجرك مع شركات التوصيل. أنشئ متجرك الإلكتروني في دقائق، استخدم نظام نقطة البيع لبيعك اليومي.
              </p>
              
              <p className="text-sm sm:text-base lg:text-lg text-gray-500 dark:text-gray-400 leading-relaxed max-w-3xl mx-auto">
                صمم صفحات هبوط جذابة لمنتجاتك، وأضف بيكسل تتبع لقياس الأداء وزيادة المبيعات.
              </p>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#fc5d41]/10 rounded-full mt-4">
                <div className="w-2 h-2 bg-[#fc5d41] rounded-full hero-pulse-dot"></div>
                <span className="text-sm font-medium text-[#fc5d41]">
                  صُمم خصيصاً للتجار الجزائريين
                </span>
              </div>
            </div>

            {/* قسم الميزات التفاعلية */}
            <div className="flex flex-wrap justify-center gap-4 mt-8 mb-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                const isActive = index === currentFeature;
                return (
                  <div
                    key={index}
                    className={`feature-item flex items-center gap-3 px-6 py-3 rounded-2xl backdrop-blur-sm transition-all duration-300 ${
                      isActive 
                        ? 'bg-white/95 dark:bg-gray-800/95 shadow-xl border-2 border-[#fc5d41]/30 feature-active' 
                        : 'bg-white/70 dark:bg-gray-800/70 shadow-md hover:shadow-lg border border-gray-200/50 dark:border-gray-700/50'
                    }`}
                  >
                    <div className={`${feature.color} ${isActive ? 'feature-icon-active' : ''} transition-all duration-300`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <span className={`text-sm font-medium transition-colors duration-300 ${
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
            
            {/* الأزرار المحسنة */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-8">
              <Link to="/tenant/signup">
                <Button 
                  size="lg" 
                  aria-label="ابدأ مجاناً الآن"
                  className="cta-button bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/90 hover:from-[#fc5d41]/90 hover:to-[#fc5d41] text-white px-10 md:px-14 py-4 md:py-5 text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-[#fc5d41]/30 transition-all duration-300 group border-0 relative overflow-hidden transform hover:-translate-y-1 hover:scale-[1.02]"
                >
                  <span className="relative z-10">ابدأ مجاناً الآن</span>
                  <ArrowLeft className="w-6 h-6 mr-3 rtl:rotate-180 group-hover:-translate-x-1 transition-transform duration-300 relative z-10" />
                </Button>
              </Link>
              
              <Button 
                size="lg" 
                onClick={handleDemoClick}
                aria-label="شاهد العرض الترويجي"
                className="secondary-button border-2 border-gray-300 hover:border-[#fc5d41] bg-white hover:bg-gray-50 px-10 md:px-14 py-4 md:py-5 text-lg font-semibold rounded-2xl transition-all duration-300 group shadow-lg hover:shadow-xl text-gray-700 hover:text-[#fc5d41] dark:text-gray-300 dark:hover:text-[#fc5d41] transform hover:-translate-y-1 hover:scale-[1.02]"
              >
                <PlayCircle className="w-6 h-6 ml-3 group-hover:text-[#fc5d41] group-hover:scale-110 transition-all duration-300" />
                <span>شاهد العرض الترويجي</span>
              </Button>
            </div>


            {/* مساحة للصورة المبسطة */}
            <div className="relative mt-12">
              <div className="relative max-w-5xl mx-auto">
                {/* الإطار الرئيسي مبسط */}
                <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50 preview-container">
                  
                  {/* شريط علوي مثل المتصفح */}
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-600 rounded-lg px-4 py-2 text-sm text-center">
                      <span className="text-[#fc5d41] font-semibold">متجرك</span>.stockiha.com
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full hero-pulse-dot"></div>
                      <span className="text-xs text-green-600 font-medium">مباشر</span>
                    </div>
                  </div>
                  
                  {/* منطقة المحتوى */}
                  <div className="aspect-[16/9] bg-gradient-to-br from-gray-50 dark:from-gray-700 to-gray-100 dark:to-gray-600 rounded-2xl flex items-center justify-center relative overflow-hidden">
                    
                    {/* محتوى المعاينة */}
                    <div className="text-center z-10">
                      <div className="w-20 h-20 bg-gradient-to-br from-[#fc5d41] to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg dashboard-icon">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                          <div className="w-5 h-5 bg-white rounded opacity-80"></div>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
                        لوحة التحكم الذكية
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        إدارة شاملة لتجارتك في مكان واحد
                      </p>
                      
                      {/* مؤشرات التحميل */}
                      <div className="flex justify-center gap-2 mt-4">
                        <div className="w-2 h-2 bg-[#fc5d41] rounded-full loading-dot" style={{ animationDelay: '0s' }}></div>
                        <div className="w-2 h-2 bg-[#fc5d41] rounded-full loading-dot" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-[#fc5d41] rounded-full loading-dot" style={{ animationDelay: '0.4s' }}></div>
                      </div>
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
