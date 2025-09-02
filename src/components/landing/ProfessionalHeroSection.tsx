import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, ArrowRight, Zap, Shield, Globe, TrendingUp } from 'lucide-react';

const ProfessionalHeroSection = () => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const typewriterIntervalRef = useRef<NodeJS.Timeout>();

  // Dynamic texts for typewriter effect
  const dynamicTexts = ['الفوضى', 'التعقيد', 'الأخطاء', 'الإهمال'];

  // Features with optimized memory usage
  const features = [
    { icon: Zap, text: 'سرعة فائقة', color: 'text-amber-500' },
    { icon: Shield, text: 'أمان متقدم', color: 'text-emerald-500' },
    { icon: Globe, text: 'وصول عالمي', color: 'text-blue-500' },
    { icon: TrendingUp, text: 'نمو مستمر', color: 'text-violet-500' }
  ];

  // Optimized typewriter effect
  const typewriterEffect = useCallback(() => {
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const scheduleNext = (delay: number) => {
      typewriterIntervalRef.current = setTimeout(() => {
        type();
      }, delay);
    };

    const type = () => {
      const currentWord = dynamicTexts[wordIndex];

      if (isDeleting) {
        // Deleting characters
        if (charIndex > 0) {
          charIndex--;
          setTypedText(currentWord.slice(0, charIndex));
          scheduleNext(60); // Deletion speed
        } else {
          // Finished deleting, move to next word
          isDeleting = false;
          wordIndex = (wordIndex + 1) % dynamicTexts.length;
          scheduleNext(800); // Pause before next word
        }
      } else {
        // Typing characters
        if (charIndex < currentWord.length) {
          charIndex++;
          setTypedText(currentWord.slice(0, charIndex));
          scheduleNext(120); // Typing speed
        } else {
          // Finished typing, pause then start deleting
          isDeleting = true;
          scheduleNext(2200); // Pause before deleting
        }
      }
    };

    // Start effect after 1.2 seconds
    const startTimeout = setTimeout(() => {
      type();
    }, 1200);

    // Cleanup
    return () => {
      clearTimeout(startTimeout);
      if (typewriterIntervalRef.current) {
        clearTimeout(typewriterIntervalRef.current);
      }
    };
  }, [dynamicTexts]);

  // Intersection Observer for animations
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

  // Rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [features.length]);

  const handleDemoClick = useCallback(() => {
    const demoSection = document.getElementById('demo-section');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative pt-20 md:pt-28 pb-16 md:pb-20 overflow-hidden min-h-screen flex items-center landing-bg-primary landing-section-transition"
      dir="rtl"
    >
      {/* Background elements */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/90 via-white to-gray-50/90 dark:from-gray-900/90 dark:via-gray-800 dark:to-gray-900/90"></div>
        <div className="absolute top-20 right-20 w-3 h-3 bg-amber-500/20 rounded-full hidden sm:block animate-pulse"></div>
        <div className="absolute bottom-24 left-24 w-2.5 h-2.5 bg-emerald-500/20 rounded-full hidden sm:block animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-xl hidden lg:block"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text content */}
          <div className={`space-y-8 transition-all duration-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 dark:bg-gray-800/90 border border-gray-200/40 dark:border-gray-700/40 shadow-sm">
              <div className="w-2 h-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">النظام الأول في الجزائر</span>
            </div>

            {/* Main heading */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-gray-900 dark:text-white">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 block">
                  سطوكيها
                </span>
                <span className="text-gray-700 dark:text-gray-300 font-medium text-xl sm:text-2xl lg:text-3xl block mt-2">
                  لأن وقتك أغلى من{' '}
                  <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 font-bold relative">
                    {typedText}
                    <span className="inline-block w-1 h-6 bg-amber-500 ml-1 animate-pulse"></span>
                  </span>
                </span>
              </h1>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                سطوكيها هي منصتك الشاملة لإدارة تجاربك بكل سهولة واحترافية.
              </p>
              
              <p className="text-gray-500 dark:text-gray-500 leading-relaxed max-w-2xl">
                من تتبع المخزون وتنظيم المنتجات، إلى إصدار الفواتير ومتابعة الطلبات وربط متجرك مع شركات التوصيل.
              </p>
              
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-full">
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  صُمم خصيصاً للتجار الجزائريين
                </span>
              </div>
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                const isActive = index === currentFeature;
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-white dark:bg-gray-800 shadow-md border border-amber-500/30' 
                        : 'bg-gray-100/50 dark:bg-gray-700/50 border border-gray-200/30 dark:border-gray-600/30'
                    }`}
                  >
                    <div className={`${feature.color} ${isActive ? 'scale-110' : ''} transition-all duration-300`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <span className={`text-sm font-medium transition-colors duration-300 ${
                      isActive 
                        ? 'text-amber-600 dark:text-amber-400' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {feature.text}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/tenant/signup">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8 py-3 text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 group"
                >
                  <span className="relative z-10">ابدأ مجاناً الآن</span>
                  <ArrowRight className="w-5 h-5 mr-2 rtl:rotate-180 group-hover:-translate-x-1 transition-transform duration-300 relative z-10" />
                </Button>
              </Link>
              
              <Button 
                size="lg" 
                onClick={handleDemoClick}
                variant="outline"
                className="border-2 border-amber-500 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-8 py-3 text-base font-semibold rounded-xl transition-all duration-300 group"
              >
                <Play className="w-5 h-5 ml-2 group-hover:text-amber-600 group-hover:scale-105 transition-all duration-300" />
                <span>شاهد العرض الترويجي</span>
              </Button>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className={`transition-all duration-800 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="relative">
              {/* Glowing background */}
              <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-3xl blur-xl animate-pulse"></div>
              
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xl border border-gray-200/30 dark:border-gray-700/30">
                {/* Browser bar */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200/30 dark:border-gray-700/30">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-1.5 text-sm text-center">
                    <span className="text-amber-600 dark:text-amber-400 font-medium">متجرك</span>.stockiha.com
                  </div>
                </div>
                
                {/* Dashboard content */}
                <div className="aspect-video bg-gradient-to-br from-gray-50 dark:from-gray-700 to-gray-100 dark:to-gray-600 rounded-xl flex flex-col p-4 relative overflow-hidden">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center border border-amber-100 dark:border-amber-800/30">
                      <div className="text-lg font-bold text-amber-600 dark:text-amber-400">124</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">طلب جديد</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 text-center border border-emerald-100 dark:border-emerald-800/30">
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">87%</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">زيادة المبيعات</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center border border-blue-100 dark:border-blue-800/30">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">24</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">منتج منخفض</div>
                    </div>
                  </div>
                  
                  {/* Chart */}
                  <div className="bg-white dark:bg-gray-700/50 rounded-lg p-3 flex-1 flex items-center justify-center border border-gray-200/30 dark:border-gray-600/30">
                    <div className="text-center">
                      <div className="flex items-end justify-center h-12 gap-1 mb-2">
                        {[40, 65, 30, 75, 50, 85, 45, 90, 60, 80, 55, 95].map((height, i) => (
                          <div 
                            key={i}
                            className="w-2 bg-gradient-to-t from-amber-500 to-orange-500 rounded-t-sm"
                            style={{ height: `${height}%` }}
                          ></div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">مخطط المبيعات الشهرية</p>
                    </div>
                  </div>
                  
                  {/* Recent activity */}
                  <div className="mt-4 pt-3 border-t border-gray-200/30 dark:border-gray-700/30">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">النشاط الأخير</h3>
                    <div className="space-y-2">
                      {[
                        { action: 'تم إنشاء طلب جديد', time: 'قبل 5 دقائق' },
                        { action: 'تم تحديث المخزون', time: 'قبل 12 دقيقة' }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                          <span className="text-gray-700 dark:text-gray-300 flex-1">{item.action}</span>
                          <span className="text-gray-500 dark:text-gray-400">{item.time}</span>
                        </div>
                      ))}
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
};

export default ProfessionalHeroSection;