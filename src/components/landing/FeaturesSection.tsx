import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  Store,
  Package, 
  BarChart3, 
  Users,
  Globe,
  Shield,
  Zap,
  CheckCircle,
  Truck,
  Smartphone,
  Target
} from 'lucide-react';

const FeaturesSection = () => {
  // المميزات الرئيسية - التركيز على التجارة الإلكترونية أولاً
  const mainFeatures = [
    {
      icon: ShoppingCart,
      title: 'متجرك الإلكتروني المتكامل',
      description: 'أنشئ متجرك الإلكتروني بتصميم مثالي وسرعة فائقة مع صفحات هبوط وشراء احترافية',
      features: [
        'تصاميم مثالية وسريعة التحميل',
        'صفحات هبوط وشراء منتج',
        'تكامل مع جميع شركات التوصيل بالجزائر',
        'دفع آمن ومتعدد الطرق'
      ]
    },
    {
      icon: Store,
      title: 'نقطة البيع الذكية',
      description: 'نظام نقطة بيع سريع وبسيط لإدارة مبيعاتك اليومية',
      features: [
        'مسح الباركود السريع',
        'طباعة فواتير فورية',
        'إدارة المديونيات',
        'تقارير يومية مفصلة'
      ]
    },
    {
      icon: Package,
      title: 'إدارة المخزون',
      description: 'تتبع مخزونك بدقة واحصل على تنبيهات عند النفاد',
      features: [
        'تتبع فوري للكميات',
        'تنبيهات المخزون المنخفض',
        'إدارة أكثر من مستودع',
        'تقارير حركة المخزون'
      ]
    },
    {
      icon: BarChart3,
      title: 'تتبع وتحليل متقدم',
      description: 'تكامل كامل مع Facebook Pixel و Google Analytics و TikTok لتتبع دقيق',
      features: [
        'تكامل Facebook Pixel و Conversion API',
        'تتبع Google Analytics و Google Ads',
        'تكامل TikTok Pixel للإعلانات',
        'تقارير تحويل مفصلة'
      ]
    }
  ];

  // المميزات الإضافية - شاملة ومتقدمة
  const additionalFeatures = [
    {
      icon: Truck,
      title: 'شركات التوصيل الجزائرية',
      description: 'تكامل مع جميع شركات التوصيل في الجزائر (Yalidine، ZR Express، وغيرها)'
    },
    {
      icon: Smartphone,
      title: 'صفحات هبوط احترافية',
      description: 'أنشئ صفحات هبوط وشراء منتج بتصميم مثالي وسرعة تحميل فائقة'
    },
    {
      icon: Target,
      title: 'تتبع الإعلانات المتقدم',
      description: 'تكامل كامل مع Facebook و TikTok و Google Ads لتتبع التحويلات بدقة'
    },
    {
      icon: Users,
      title: 'إدارة العملاء الذكية',
      description: 'احتفظ ببيانات عملائك وتاريخ مشترياتهم مع تحليلات سلوكية متقدمة'
    },
    {
      icon: Globe,
      title: 'يعمل بدون إنترنت',
      description: 'استمر في العمل حتى لو انقطع الإنترنت مع مزامنة تلقائية'
    },
    {
      icon: Shield,
      title: 'أمان وسرعة عالية',
      description: 'بياناتك محمية بأعلى المعايير مع سرعة تحميل استثنائية'
    }
  ];

  return (
    <section dir="rtl" className="py-20 landing-bg-secondary landing-section-transition">
      <div className="container mx-auto px-4">
        {/* العنوان الرئيسي */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full border border-gray-200/50 dark:border-gray-700/50 shadow-sm mb-6">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">كل ما تحتاجه لتجارتك</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            <span className="block">ابدأ تجارتك الإلكترونية</span>
            <span className="block mt-2 bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">
              وأدر متجرك بذكاء
            </span>
          </h2>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            من صفحات الهبوط الاحترافية إلى التكامل مع شركات التوصيل والتتبع المتقدم للإعلانات، سطوكيها يوفر لك كل الأدوات المتطورة
          </p>
        </motion.div>

        {/* المميزات الرئيسية */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          {mainFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-rose-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                      {feature.description}
                    </p>
                    <ul className="space-y-3">
                      {feature.features.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* المميزات الإضافية */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              مميزات إضافية تجعل الفرق
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              أدوات أخرى مهمة تساعدك في إدارة أعمالك بكفاءة أكبر
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-14 h-14 bg-gradient-to-r from-amber-500 to-rose-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* دعوة للعمل */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-amber-500 to-rose-500 rounded-2xl p-8 md:p-12 text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              جاهز لبدء تجارتك الإلكترونية؟
            </h3>
            <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
              انضم لآلاف التجار الذين يثقون بسطوكيها لإدارة أعمالهم وتنمية تجارتهم
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-amber-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-300 shadow-lg transform hover:-translate-y-1">
                <span className="flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5" />
                  ابدأ مجاناً الآن
                </span>
              </button>
              <button className="border-2 border-white/30 text-white px-8 py-4 rounded-xl font-bold hover:bg-white/10 transition-all duration-300">
                شاهد كيف يعمل
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
