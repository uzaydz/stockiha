import React, { memo } from 'react';
import { motion } from 'framer-motion';
import StoreEditorLayout from './layouts/StoreEditorLayout';

interface StoreEditorV2Props {
  organizationId: string;
  className?: string;
}

const StoreEditorV2: React.FC<StoreEditorV2Props> = memo(({ 
  organizationId, 
  className 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <StoreEditorLayout>
        {/* هنا سيتم إضافة محتوى المحرر في المراحل القادمة */}
        <div className="h-full flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="text-center space-y-6 max-w-lg"
          >
            {/* أيقونة رئيسية */}
            <div className="relative">
              <motion.div
                animate={{ 
                  rotate: [0, 2, -2, 0],
                  scale: [1, 1.02, 1]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-32 h-32 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900 rounded-3xl flex items-center justify-center mx-auto shadow-2xl"
              >
                <span className="text-6xl">🏪</span>
              </motion.div>
              
              {/* تأثير الإضاءة */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-3xl blur-2xl -z-10" />
            </div>

            {/* النص الترحيبي */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                محرر المتجر المحسن
              </h1>
              
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                تجربة تصميم جديدة ومحسنة مع واجهة أكثر بساطة وسهولة في الاستخدام
              </p>
            </motion.div>

            {/* الميزات */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-2 gap-4 mt-8"
            >
              {[
                { icon: '🎨', title: 'واجهة محسنة', desc: 'تصميم أنيق وبسيط' },
                { icon: '📱', title: 'متجاوب', desc: 'يعمل على جميع الأجهزة' },
                { icon: '⚡', title: 'أداء سريع', desc: 'تحميل وتفاعل محسن' },
                { icon: '🛠️', title: 'سهل الاستخدام', desc: 'أدوات واضحة ومنظمة' }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  <div className="text-2xl mb-2">{feature.icon}</div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {feature.desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* رسالة البدء */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800"
            >
              <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-2">
                💡 نصيحة للبدء
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                استخدم شريط الأدوات العلوي لبدء تخصيص متجرك. يمكنك البدء بالتصميم أو إضافة المكونات.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </StoreEditorLayout>
    </motion.div>
  );
});

StoreEditorV2.displayName = 'StoreEditorV2';

export default StoreEditorV2;
