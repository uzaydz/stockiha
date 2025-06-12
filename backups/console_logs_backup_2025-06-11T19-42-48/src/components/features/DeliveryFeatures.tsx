import { motion } from 'framer-motion';
import { Truck, Link, Package, MapPin } from 'lucide-react';

const DeliveryFeatures = () => {
  const companies = [
    "يالدين", "Maystro", "Procolis", "ZR Express", "Careem Box",
    "Guepex", "Pony Express", "Aswak Delivery", "Speed Post"
  ];

  return (
    <div className="container mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-4 py-2 rounded-full mb-4">
          <Truck className="w-5 h-5" />
          <span className="font-semibold">الربط مع شركات التوصيل</span>
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          توصيل سريع وموثوق
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          ربط مباشر مع أكثر من 20 شركة توصيل جزائرية
        </p>
      </motion.div>

      {/* المميزات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg text-center"
        >
          <Link className="w-12 h-12 text-purple-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">ربط تلقائي</h3>
          <p className="text-gray-600 dark:text-gray-300">إرسال الطلبيات أوتوماتيكياً</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg text-center"
        >
          <Package className="w-12 h-12 text-purple-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">متابعة مباشرة</h3>
          <p className="text-gray-600 dark:text-gray-300">تتبع حالة كل شحنة</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg text-center"
        >
          <MapPin className="w-12 h-12 text-purple-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">توزيع ذكي</h3>
          <p className="text-gray-600 dark:text-gray-300">شركة افتراضية لكل ولاية</p>
        </motion.div>
      </div>

      {/* شركات التوصيل */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-3xl p-8"
      >
        <h3 className="text-xl font-semibold text-center mb-6">شركات التوصيل المتاحة</h3>
        <div className="flex flex-wrap justify-center gap-3">
          {companies.map((company, index) => (
            <span
              key={index}
              className="bg-white dark:bg-slate-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm"
            >
              {company}
            </span>
          ))}
          <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-4 py-2 rounded-full text-sm font-medium">
            +10 شركات أخرى
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default DeliveryFeatures; 