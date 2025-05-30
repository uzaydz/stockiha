import { motion } from 'framer-motion';
import { Sparkles, Rocket, Shield, Zap } from 'lucide-react';

const FeaturesHero = () => {
  return (
    <section className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-40">
      {/* خلفية متحركة */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-5xl mx-auto"
        >
          {/* العنوان الرئيسي */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-8 h-8 text-primary" />
            </motion.div>
            <span className="text-primary font-semibold text-lg">منصة ستوكيها المتكاملة</span>
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            كل ما تحتاجه لإدارة تجارتك
            <span className="block text-primary mt-2">في منصة واحدة متكاملة</span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto">
            نظام متكامل للتجار الجزائريين يجمع بين البيع، الإدارة، التوصيل، والأتمتة الذكية. 
            اكتشف المميزات التي ستحول طريقة إدارتك لأعمالك.
          </p>
          
          {/* بطاقات المميزات السريعة */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg"
            >
              <Rocket className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">إطلاق سريع</h3>
              <p className="text-gray-600 dark:text-gray-300">ابدأ البيع خلال دقائق</p>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg"
            >
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">أمان متقدم</h3>
              <p className="text-gray-600 dark:text-gray-300">حماية بياناتك أولويتنا</p>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg"
            >
              <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">أداء فائق</h3>
              <p className="text-gray-600 dark:text-gray-300">سرعة وكفاءة لا مثيل لها</p>
            </motion.div>
          </div>
          
          {/* زر التمرير */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block"
          >
            <div className="w-8 h-12 border-2 border-primary rounded-full flex items-start justify-center p-2">
              <div className="w-1 h-3 bg-primary rounded-full"></div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesHero;
