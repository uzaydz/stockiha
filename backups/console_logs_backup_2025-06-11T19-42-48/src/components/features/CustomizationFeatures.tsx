import { motion } from 'framer-motion';
import { Palette, Layout, Globe, Settings } from 'lucide-react';

const CustomizationFeatures = () => {
  const features = [
    {
      icon: Layout,
      title: "تخصيص لوحة التحكم",
      description: "رتب الواجهة والأقسام حسب احتياجاتك"
    },
    {
      icon: Palette,
      title: "هوية بصرية كاملة", 
      description: "فواتير وإشعارات بهويتك البصرية"
    },
    {
      icon: Globe,
      title: "دعم اللغات المحلية",
      description: "دعم كامل للغات واللهجات المحلية"
    },
    {
      icon: Settings,
      title: "إعدادات متقدمة",
      description: "تحكم كامل في كل تفاصيل النظام"
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
        <div className="inline-flex items-center gap-2 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 px-4 py-2 rounded-full mb-4">
          <Palette className="w-5 h-5" />
          <span className="font-semibold">تخصيص شامل للنظام</span>
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          نظام يتأقلم مع احتياجاتك
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          خصص كل شيء ليتماشى مع هويتك وطريقة عملك
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all text-center"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 p-3 mx-auto mb-4">
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
    </div>
  );
};

export default CustomizationFeatures; 