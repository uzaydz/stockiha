import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, Zap, BarChart3, Package, Truck, Users, Globe, Shield } from 'lucide-react';

const CoreFeatures = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const coreFeatures = [
    {
      icon: Store,
      title: 'متجر إلكتروني احترافي',
      description: 'أنشئ متجرك الإلكتروني بتصميم عصري يناسب جمهورك المستهدف',
      features: [
        'تصاميم جاهزة قابلة للتخصيص',
        'متوافق مع جميع الأجهزة',
        'تحسين محركات البحث'
      ],
      color: 'from-amber-500 to-rose-500',
      bgColor: 'bg-amber-500/10 dark:bg-amber-900/20'
    },
    {
      icon: Zap,
      title: 'نقطة بيع سريعة',
      description: 'إدارة المبيعات بسرعة وبدقة مع دعم الباركود والدفع الإلكتروني',
      features: [
        'مدفوعات متعددة',
        'طباعة الفواتير تلقائياً',
        'إدارة العملاء'
      ],
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10 dark:bg-emerald-900/20'
    },
    {
      icon: BarChart3,
      title: 'تقارير تحليلية',
      description: 'اتخذ قرارات ذكية بناءً على بيانات دقيقة ومحدثة',
      features: [
        'تقارير مبيعات تفصيلية',
        'تحليل سلوك العملاء',
        'توقعات ذكية'
      ],
      color: 'from-blue-500 to-violet-500',
      bgColor: 'bg-blue-500/10 dark:bg-blue-900/20'
    }
  ];

  return (
    <div className="mb-24">
      {/* Feature Tabs */}
      <div className="flex gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
        {coreFeatures.map((feature, index) => {
          const Icon = feature.icon;
          
          return (
            <motion.button
              key={index}
              onClick={() => setActiveFeature(index)}
              className={`flex items-center gap-2 sm:gap-3 flex-shrink-0 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                index === activeFeature
                  ? `bg-gradient-to-r ${feature.color} text-white shadow-lg`
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Icon className="w-5 h-5" />
              <span>{feature.title}</span>
            </motion.button>
          );
        })}
      </div>
      
      {/* Feature Content */}
      <motion.div
        key={activeFeature}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-700 shadow-lg"
      >
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {coreFeatures[activeFeature].title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-base leading-relaxed">
              {coreFeatures[activeFeature].description}
            </p>
            
            <ul className="space-y-4">
              {coreFeatures[activeFeature].features.map((item, itemIndex) => (
                <motion.li 
                  key={itemIndex}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: itemIndex * 0.1 }}
                >
                  <div className={`w-6 h-6 rounded-full ${coreFeatures[activeFeature].bgColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  </div>
                  <span className="text-gray-700 dark:text-gray-300 text-base">{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>
          
          {/* Visual Representation */}
          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-sm">
              <div className={`absolute -inset-4 rounded-2xl ${coreFeatures[activeFeature].bgColor} opacity-20 blur-xl animate-pulse`}></div>
              <div className="relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-700/30 dark:to-gray-800/50 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/30 shadow-lg">
                <div className={`w-16 h-16 rounded-xl ${coreFeatures[activeFeature].bgColor} flex items-center justify-center mx-auto mb-6`}>
                  {React.createElement(coreFeatures[activeFeature].icon, { className: "w-8 h-8 text-amber-500" })}
                </div>
                <h4 className="text-center font-bold text-gray-900 dark:text-white mb-3 text-lg">
                  {coreFeatures[activeFeature].title}
                </h4>
                <p className="text-center text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  حلول متكاملة لإدارة أعمالك
                </p>
                
                {/* Feature visualization */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="bg-white dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200/50 dark:border-gray-600/30">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${coreFeatures[activeFeature].bgColor}`}></div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">ميزة {item}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CoreFeatures;