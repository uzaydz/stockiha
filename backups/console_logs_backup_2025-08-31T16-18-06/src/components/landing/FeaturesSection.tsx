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
      className={`transform transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
      }`}
    >
      <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:shadow-[#fc5d41]/10 transition-all duration-300 hover:-translate-y-1">
        {/* التأثير المتدرج (تبسيط) */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#fc5d41]/3 via-transparent to-purple-500/3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* الأيقونة */}
        <div className="relative flex items-center justify-center w-14 h-14 bg-[#fc5d41] rounded-xl mb-4 group-hover:scale-105 transition-transform duration-300">
          <feature.icon className="w-7 h-7 text-white" strokeWidth={1.5} />
        </div>

        {/* المحتوى */}
        <div className="relative space-y-3">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {feature.title}
            </h3>
            <p className="text-sm font-medium text-[#fc5d41]">
              {feature.subtitle}
            </p>
          </div>
          
          {/* قائمة المزايا */}
          <ul className="space-y-1">
            {feature.benefits.map((benefit, i) => (
              <li key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
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
      className="relative py-20 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)'
      }}
    >
      {/* الخلفية (تبسيط) */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/90 via-white to-gray-50/90 dark:from-gray-900/90 dark:via-gray-800 dark:to-gray-900/90"></div>
      </div>

      <div className="container px-4 mx-auto relative z-10">
        {/* العنوان */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 dark:bg-gray-800/90 border border-gray-200/40 dark:border-gray-600/40 shadow-sm backdrop-blur-sm mb-6">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">حلول متكاملة</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
            <span className="text-gray-900 dark:text-white">نظام شامل</span>
            <br />
            <span className="text-[#fc5d41]">لإدارة تجارتك</span>
          </h2>
          
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            اكتشف كيف تدير أعمالك بسهولة مع أدوات احترافية مصممة خصيصاً لك
          </p>
        </div>

        {/* المميزات الرئيسية */}
        <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {CORE_FEATURES.map((feature, index) => (
            <CoreFeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>

        {/* المميزات الثانوية التفاعلية (تحسين التناسق) */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-6 shadow-md border border-gray-200/40 dark:border-gray-700/40 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-6">
              مميزات إضافية تجعل الفرق
            </h3>
            
            <div className="grid md:grid-cols-3 gap-4">
              {SECONDARY_FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                const isActive = index === activeFeature;
                
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-[#fc5d41]/5 border border-[#fc5d41]/20 shadow-sm' 
                        : 'bg-gray-50/50 dark:bg-gray-700/50 border border-transparent hover:bg-gray-100/50 dark:hover:bg-gray-600/50'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                      isActive ? 'bg-[#fc5d41] text-white scale-105' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`font-medium text-sm transition-colors duration-300 ${
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

        {/* دعوة للعمل (تبسيط) */}
        <div className="text-center">
          <div className="max-w-xl mx-auto space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              جاهز لتطوير أعمالك؟
            </h3>
            
            <p className="text-base text-gray-600 dark:text-gray-400">
              ابدأ اليوم واكتشف الفرق مع سطوكيها
            </p>
            
            <Link to="/tenant/signup">
              <Button
                size="lg"
                className="bg-[#fc5d41] hover:bg-[#e11d48] text-white px-8 py-3 text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
              >
                <span className="flex items-center gap-2">
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
