import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';

const FeaturesCTA = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="text-center"
    >
      <div className="max-w-4xl mx-auto bg-gradient-to-r from-amber-500/5 to-rose-500/5 rounded-3xl p-8 md:p-12 border border-amber-200 dark:border-gray-700 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-3xl -translate-x-32 -translate-y-32"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-br from-rose-500/20 to-transparent rounded-full blur-3xl translate-x-32 translate-y-32"></div>
        </div>
        
        <div className="relative z-10">
          <motion.div
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white px-4 py-2 rounded-full text-sm font-medium mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
          >
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              عرض حصري
            </span>
          </motion.div>

          <motion.h3
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
          >
            جاهز لتطوير تجاربك؟
          </motion.h3>
          
          <motion.p
            className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            viewport={{ once: true }}
          >
            ابدأ مجاناً اليوم ولا تدفع أي رسوم حتى تنمو تجاربك
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          >
            <Link to="/tenant/signup">
              <Button
                size="lg"
                className="group min-w-[240px] h-14 text-base font-semibold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
              >
                <span className="flex items-center gap-2">
                  ابدأ تجربتك المجانية
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:-translate-x-1 transition-transform" />
                </span>
              </Button>
            </Link>
          </motion.div>

          {/* Benefits list */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-6 text-sm"
          >
            {[
              { text: 'تجربة مجانية لمدة 14 يوم', icon: CheckCircle },
              { text: 'لا توجد رسوم إعداد', icon: CheckCircle },
              { text: 'إلغاء في أي وقت', icon: CheckCircle }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <item.icon className="w-4 h-4 text-amber-500" />
                <span>{item.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default FeaturesCTA;