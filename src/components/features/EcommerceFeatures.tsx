import { motion } from 'framer-motion';
import { 
  ShoppingBag, Globe, Target, BarChart3, Shield, QrCode,
  Palette, Link, FileText, Users, TrendingUp, Eye
} from 'lucide-react';

const EcommerceFeatures = () => {
  const features = [
    {
      icon: Globe,
      title: "متجر إلكتروني احترافي",
      description: "متجر جاهز بدومين فرعي خاص بك مع مزامنة فورية مع المخزون",
      highlights: ["دومين فرعي مخصص", "مزامنة فورية", "دفع عند الاستلام"],
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Target,
      title: "صفحات هبوط ديناميكية",
      description: "إنشاء صفحة هبوط لكل منتج أو عرض بتصميم احترافي",
      highlights: ["تصميم قابل للتعديل", "مناسب للإعلانات", "تحويل عالي"],
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: BarChart3,
      title: "تحليلات ذكية",
      description: "تقارير مفصلة عن أداء كل منتج وحملة وزبون",
      highlights: ["تحليل المصادر", "الطلبات المتروكة", "إحصائيات تفاعلية"],
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: QrCode,
      title: "نظام تتبع إعلاني",
      description: "Pixel خاص لكل منتج مع دعم لا محدود للبيكسلات",
      highlights: ["Meta Pixel", "TikTok Pixel", "تحليل دقيق"],
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Shield,
      title: "حماية متقدمة",
      description: "نظام حماية تلقائي من الطلبات الوهمية والسبام",
      highlights: ["تحقق ذكي", "رصد الهجمات", "حماية تلقائية"],
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: Palette,
      title: "تخصيص كامل",
      description: "واجهة قابلة للتخصيص التام حسب هويتك البصرية",
      highlights: ["شعار وألوان", "خطوط مخصصة", "صور وتصاميم"],
      color: "from-pink-500 to-rose-500"
    }
  ];

  return (
    <div className="container mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full mb-4">
          <ShoppingBag className="w-5 h-5" />
          <span className="font-semibold">التجارة الإلكترونية</span>
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          متجرك الإلكتروني المتكامل
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          كل ما تحتاجه لبناء تواجد قوي على الإنترنت وزيادة مبيعاتك
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="relative group"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
              {/* الأيقونة */}
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} p-3 mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-full h-full text-white" />
              </div>

              {/* المحتوى */}
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {feature.description}
              </p>

              {/* النقاط البارزة */}
              <ul className="space-y-2">
                {feature.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="w-1.5 h-1.5 bg-gradient-to-r from-primary to-primary/60 rounded-full"></div>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              {/* التأثير عند التحويم */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity`}></div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* قسم إضافي للميزة البارزة */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl p-8 lg:p-12"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              انطلق في عالم التجارة الإلكترونية بثقة
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              مع منصة ستوكيها، احصل على متجر إلكتروني احترافي جاهز للعمل فوراً. 
              لا حاجة لخبرة تقنية أو استثمار كبير - فقط ابدأ البيع واترك الباقي علينا.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                <span className="font-medium">زوار حقيقيون</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="font-medium">نمو مستمر</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-medium">عملاء مخلصون</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-24 h-24 text-primary/40" />
              </div>
            </div>
            {/* عناصر زخرفية */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/20 rounded-full blur-2xl"></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EcommerceFeatures; 