import { motion } from 'framer-motion';
import { HeadphonesIcon, RefreshCw, Package, AlertCircle, FileSearch } from 'lucide-react';

const AfterSalesFeatures = () => {
  const features = [
    {
      icon: HeadphonesIcon,
      title: "إدارة الشكاوى",
      description: "نظام منظم لمعالجة شكاوى العملاء بكفاءة"
    },
    {
      icon: RefreshCw,
      title: "الاستبدال والاسترجاع",
      description: "معالجة سريعة لطلبات الاستبدال والاسترجاع"
    },
    {
      icon: Package,
      title: "تقييم حالة المنتج",
      description: "تحديد حالة المنتج المسترجع (متلف/صالح)"
    },
    {
      icon: FileSearch,
      title: "أرشيف العملاء",
      description: "تتبع العملاء المتكررين في الاسترجاع"
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
        <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-full mb-4">
          <HeadphonesIcon className="w-5 h-5" />
          <span className="font-semibold">خدمة ما بعد البيع</span>
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          دعم استثنائي للعملاء
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          حلول متكاملة لضمان رضا العملاء وولائهم
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 p-2.5">
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
    </div>
  );
};

export default AfterSalesFeatures;
