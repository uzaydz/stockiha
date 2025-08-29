import React, { memo, useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Store,
  Zap,
  BarChart3,
  Package,
  Truck,
  Users,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

// المميزات الأساسية مع تصميم حديث
const CORE_FEATURES = [
  {
    icon: Store,
    title: 'متجر إلكتروني',
    subtitle: 'احترافي ومتجاوب',
    benefits: ['تصميم عصري', 'سهولة التصفح', 'تجربة مميزة']
  },
  {
    icon: Zap,
    title: 'نقطة بيع',
    subtitle: 'سريعة وذكية',
    benefits: ['مدفوعات فورية', 'دعم الباركود', 'طباعة تلقائية']
  },
  {
    icon: BarChart3,
    title: 'تحليلات متقدمة',
    subtitle: 'رؤى ذكية للنمو',
    benefits: ['تقارير تفصيلية', 'مؤشرات الأداء', 'توقعات المبيعات']
  }
];

// المميزات الثانوية
const SECONDARY_FEATURES = [
  { icon: Package, text: 'إدارة مخزون متطورة' },
  { icon: Truck, text: 'شبكة توصيل شاملة' },
  { icon: Users, text: 'إدارة فريق مرنة' }
];

// بطاقة مميزة رئيسية
const CoreFeatureCard = memo(({ feature, index }: { feature: typeof CORE_FEATURES[0]; index: number }) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => setIsVisible(true), index * 200);
        }
      },
      { threshold: 0.2 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={cardRef}
      className={`transform transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'
      }`}
    >
      <div className="group relative bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:shadow-[#fc5d41]/20 transition-all duration-500 hover:-translate-y-2">
        {/* التأثير المتدرج */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#fc5d41]/5 via-transparent to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {/* الأيقونة */}
        <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#fc5d41] to-[#fc5d41]/80 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
          <feature.icon className="w-8 h-8 text-white" strokeWidth={1.5} />
        </div>

        {/* المحتوى */}
        <div className="relative space-y-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {feature.title}
            </h3>
            <p className="text-sm font-medium text-[#fc5d41]">
              {feature.subtitle}
            </p>
          </div>
          
          {/* قائمة المزايا */}
          <ul className="space-y-2">
            {feature.benefits.map((benefit, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-[#fc5d41] flex-shrink-0" />
                <span className="text-sm">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
});

CoreFeatureCard.displayName = 'CoreFeatureCard';

const FeaturesSection = memo(() => {
  const [activeFeature, setActiveFeature] = useState(0);

  // تبديل المميزة النشطة تلقائياً
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % SECONDARY_FEATURES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      dir="rtl"
      className="relative py-24 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 50%, #f5f5f5 100%)'
      }}
    >
      {/* الخلفية */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/80 via-white to-gray-50/80 dark:from-gray-900/80 dark:via-gray-800 dark:to-gray-900/80"></div>
        <div className="absolute top-1/4 right-10 w-2 h-2 bg-[#fc5d41]/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/3 left-10 w-3 h-3 bg-purple-500/30 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="container px-6 mx-auto relative z-10">
        {/* العنوان */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/90 dark:bg-gray-800/90 border border-gray-200/60 dark:border-gray-600/60 shadow-md backdrop-blur-sm mb-8">
            <div className="w-2 h-2 bg-[#fc5d41] rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">حلول متكاملة</span>
            <div className="w-2 h-2 bg-[#fc5d41] rounded-full animate-pulse"></div>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
            <span className="text-gray-900 dark:text-white">نظام شامل</span>
            <br />
            <span className="text-[#fc5d41]">لإدارة تجارتك</span>
          </h2>
          
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            اكتشف كيف تدير أعمالك بسهولة مع أدوات احترافية مصممة خصيصاً لك
          </p>
        </div>

        {/* المميزات الرئيسية */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {CORE_FEATURES.map((feature, index) => (
            <CoreFeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>

        {/* المميزات الثانوية التفاعلية */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 shadow-xl border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm">
            <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
              مميزات إضافية تجعل الفرق
            </h3>
            
            <div className="grid md:grid-cols-3 gap-6">
              {SECONDARY_FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                const isActive = index === activeFeature;
                
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 ${
                      isActive 
                        ? 'bg-[#fc5d41]/10 border-2 border-[#fc5d41]/30 shadow-lg' 
                        : 'bg-gray-50/50 dark:bg-gray-700/50 border border-transparent hover:bg-gray-100/50 dark:hover:bg-gray-600/50'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isActive ? 'bg-[#fc5d41] text-white scale-110' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`font-medium transition-colors duration-300 ${
                      isActive ? 'text-[#fc5d41]' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {feature.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* دعوة للعمل */}
        <div className="text-center">
          <div className="max-w-2xl mx-auto space-y-8">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
              جاهز لتطوير أعمالك؟
            </h3>
            
            <p className="text-lg text-gray-600 dark:text-gray-400">
              ابدأ اليوم واكتشف الفرق مع سطوكيها
            </p>
            
            <Link to="/tenant/signup">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/90 hover:from-[#fc5d41]/90 hover:to-[#fc5d41] text-white px-10 py-4 text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-[#fc5d41]/30 transition-all duration-300 hover:-translate-y-1 hover:scale-105 group"
              >
                <span className="flex items-center gap-3">
                  ابدأ تجربتك المجانية
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180 group-hover:-translate-x-1 transition-transform duration-300" />
                </span>
              </Button>
            </Link>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ✨ لا توجد رسوم إعداد • إلغاء في أي وقت
            </p>
          </div>
        </div>
      </div>
    </section>
  );
});

FeaturesSection.displayName = 'FeaturesSection';

export default FeaturesSection;
