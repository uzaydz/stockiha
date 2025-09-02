import React from 'react';
import { motion } from 'framer-motion';

const FeaturesHeader = () => {
  return (
    <div className="text-center max-w-4xl mx-auto mb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
          <div className="w-2 h-2 bg-gradient-to-r from-amber-500 to-rose-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">المميزات الكاملة</span>
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        viewport={{ once: true }}
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight"
      >
        <span className="block">نظام شامل</span>
        <span className="block mt-2 bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">
          لإدارة تجاربك
        </span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        viewport={{ once: true }}
        className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed"
      >
        منصة متكاملة تجمع بين جميع أدوات إدارة المتاجر في مكان واحد. 
        اكتشف كيف تدير أعمالك بسهولة مع أدوات احترافية مصممة خصيصاً لك.
      </motion.p>
    </div>
  );
};

export default FeaturesHeader;