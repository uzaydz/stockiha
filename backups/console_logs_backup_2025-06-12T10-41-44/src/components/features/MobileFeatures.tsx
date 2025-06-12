import { motion } from 'framer-motion';
import { Smartphone, Bell, Moon, Gauge, Apple, Bot } from 'lucide-react';

const MobileFeatures = () => {
  const features = [
    {
      icon: Smartphone,
      title: "تطبيق خفيف وسريع",
      description: "تطبيق محسّن للأداء يعمل بسلاسة على جميع الأجهزة"
    },
    {
      icon: Bell,
      title: "إشعارات فورية",
      description: "تابع كل تحديث على متجرك بإشعارات لحظية"
    },
    {
      icon: Moon,
      title: "الوضع الليلي",
      description: "دعم كامل للوضع الداكن لراحة عينيك"
    },
    {
      icon: Gauge,
      title: "لوحة تحكم متنقلة",
      description: "أدر متجرك بالكامل من هاتفك أينما كنت"
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
        <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-full mb-4">
          <Smartphone className="w-5 h-5" />
          <span className="font-semibold">تطبيق الهاتف</span>
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          متجرك في جيبك
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          تطبيق محمول متكامل لإدارة أعمالك من أي مكان
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* المميزات */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 p-3 mb-4">
                <feature.icon className="w-full h-full text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* صورة الجوال */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="mx-auto max-w-sm">
            <div className="bg-slate-800 rounded-[3rem] p-3 shadow-2xl">
              <div className="bg-slate-900 rounded-[2.5rem] p-2">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-[2rem] p-8 aspect-[9/19.5]">
                  <div className="text-center mb-6">
                    <Smartphone className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">تطبيق سطوكيها</h4>
                  </div>
                  
                  {/* محتوى تجريبي */}
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
                        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                        <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* متاجر التطبيقات */}
            <div className="mt-8 flex justify-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-black text-white px-6 py-3 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Apple className="w-5 h-5" />
                <div className="text-right">
                  <div className="text-xs">قريباً على</div>
                  <div className="font-semibold">App Store</div>
                </div>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-black text-white px-6 py-3 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Bot className="w-5 h-5" />
                <div className="text-right">
                  <div className="text-xs">متوفر على</div>
                  <div className="font-semibold">Google Play</div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MobileFeatures;
