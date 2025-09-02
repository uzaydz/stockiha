import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Zap, TrendingUp, Shield, Globe } from 'lucide-react';
import DashboardPreview from '@/components/landing/DashboardPreview';

const HeroSection = () => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const dynamicTexts = ['الفوضى', 'التعقيد', 'الأخطاء', 'الإهمال'];

  // Typewriter effect
  useEffect(() => {
    const type = () => {
      const currentWord = dynamicTexts[currentTextIndex];
      
      if (isDeleting) {
        setTypedText(currentWord.substring(0, typedText.length - 1));
        if (typedText.length === 0) {
          setIsDeleting(false);
          setCurrentTextIndex((prev) => (prev + 1) % dynamicTexts.length);
        }
      } else {
        setTypedText(currentWord.substring(0, typedText.length + 1));
        if (typedText.length === currentWord.length) {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      }
    };

    const timer = setTimeout(type, isDeleting ? 70 : 120);
    return () => clearTimeout(timer);
  }, [typedText, isDeleting, currentTextIndex, dynamicTexts]);

  // Intersection Observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const scrollToDemo = useCallback(() => {
    const demoSection = document.getElementById('demo-section');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Features data
  const features = [
    { icon: Zap, title: 'سرعة فائقة', color: 'text-amber-500' },
    { icon: Shield, title: 'أمان متقدم', color: 'text-emerald-500' },
    { icon: Globe, title: 'وصول عالمي', color: 'text-blue-500' },
    { icon: TrendingUp, title: 'نمو مستمر', color: 'text-violet-500' }
  ];

  return (
    <section 
      ref={heroRef}
      className="relative min-h-screen flex items-center pt-16 overflow-hidden bg-gradient-to-br from-white via-orange-50/30 to-red-50/30 dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900/50"
      dir="rtl"
    >
      {/* Background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-full h-full">
          <div className="absolute top-20 right-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl hidden lg:block"></div>
          <div className="absolute bottom-20 left-10 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl hidden lg:block"></div>
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center py-8">
          {/* Content wrapper */}
          <div className={`transition-all duration-1000 w-full max-w-6xl ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full border border-gray-200/50 dark:border-gray-700/50 shadow-sm mb-6">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">النظام الأول في الجزائر</span>
            </div>
            
            {/* Main heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              <span className="block text-gray-900 dark:text-white">سطوكيها</span>
              <span className="block mt-2 text-gray-700 dark:text-gray-300">
                لأن وقتك أغلى من{' '}
                <span className="relative inline-block bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent font-bold">
                  {typedText}
                  <span className="ml-1 inline-block w-1 h-8 bg-amber-500 animate-pulse align-middle"></span>
                </span>
              </span>
            </h1>
            
            {/* Description */}
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
              منصة شاملة لإدارة المتاجر تجمع بين نقطة البيع والمتجر الإلكتروني وإدارة المخزون. 
              ابدأ مجاناً اليوم واكتشف الفرق مع سطوكيها.
            </p>
            
            {/* Features list - Centered for mobile */}
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div 
                    key={index}
                    className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full border border-gray-200/50 dark:border-gray-700/50 shadow-sm"
                  >
                    <Icon className={`w-4 h-4 ${feature.color}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {feature.title}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* CTA Buttons - Stacked on mobile */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link to="/tenant/signup">
                <Button className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl">
                  <span className="flex items-center gap-2">
                    ابدأ مجاناً الآن
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                onClick={scrollToDemo}
                className="border-2 border-amber-500 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300"
              >
                <span className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  شاهد العرض الترويجي
                </span>
              </Button>
            </div>
          </div>
          
          {/* Dashboard Preview - Centered and responsive */}
          <div className={`w-full max-w-4xl transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="relative">
              {/* Glowing background effect - Hidden on mobile for better performance */}
              <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/10 to-rose-500/10 rounded-3xl blur-xl animate-pulse hidden lg:block"></div>
              
              {/* Dashboard preview */}
              <div className="relative">
                <DashboardPreview />
              </div>
              
              {/* Floating elements - Hidden on mobile */}
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-gradient-to-br from-amber-400 to-rose-500 rounded-2xl shadow-xl rotate-12 animate-float hidden lg:block"></div>
              <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-gradient-to-br from-blue-400 to-violet-500 rounded-2xl shadow-xl -rotate-12 animate-float hidden lg:block" style={{ animationDelay: '1s' }}></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(5deg);
          }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};

export default HeroSection;