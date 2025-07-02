import { motion } from 'framer-motion';
import { Wifi, WifiOff, Cloud, HardDrive } from 'lucide-react';

const OfflineFeatures = () => {
  const features = [
    {
      icon: Wifi,
      title: "الوضع أونلاين",
      description: "مزامنة مباشرة مع قاعدة البيانات السحابية لضمان الوصول من أي مكان"
    },
    {
      icon: WifiOff,
      title: "الوضع أوفلاين",
      description: "واصل البيع حتى بدون إنترنت مع حفظ كل البيانات محلياً"
    },
    {
      icon: Cloud,
      title: "مزامنة تلقائية",
      description: "بمجرد عودة الاتصال، تتم المزامنة تلقائياً دون تدخل"
    },
    {
      icon: HardDrive,
      title: "تخزين آمن",
      description: "بياناتك محفوظة ومؤمنة سواء كنت متصلاً أو غير متصل"
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
        <div className="inline-flex items-center gap-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 px-4 py-2 rounded-full mb-4">
          <Wifi className="w-5 h-5" />
          <span className="font-semibold">أوفلاين / أونلاين</span>
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          اعمل بدون توقف
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          لا تدع انقطاع الإنترنت يوقف أعمالك
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 p-2.5">
                <feature.icon className="w-full h-full text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* قسم توضيحي */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10 rounded-3xl p-8 lg:p-12 text-center"
      >
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          مناسب لجميع البيئات
        </h3>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          سواء كان محلك في وسط المدينة مع إنترنت عالي السرعة، أو في منطقة نائية مع اتصال ضعيف،
          منصة سطوكيها تضمن لك الاستمرارية في العمل دون أي انقطاع
        </p>
      </motion.div>
    </div>
  );
};

export default OfflineFeatures;
