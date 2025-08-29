import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function PricingCTA() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* خلفية زخرفية */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 opacity-90"></div>
        <div className="absolute inset-y-0 right-1/2 -z-10 transform-gpu blur-3xl">
          <div aria-hidden="true" className="aspect-[1155/678] w-[36.125rem] bg-gradient-to-br from-[#6366f1] to-[#0ea5e9] opacity-20 dark:opacity-10"></div>
        </div>
      </div>

      <div className="container relative px-4 mx-auto">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden p-8 md:p-10 lg:p-14 backdrop-blur-sm border border-white/40 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 shadow-xl"
          >
            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="mb-8 max-w-xl mx-auto text-center"
              >
                <h3 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                  جاهز لبدء رحلة نمو أعمالك؟
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  ابدأ اليوم واستمتع بفترة تجريبية مجانية لمدة 5 أيام كاملة مع إمكانية استرداد الأموال خلال 14 يوماً
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              >
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-6 text-base shadow-lg shadow-indigo-500/20 border-0 rounded-xl transition-all duration-300'
                  )}
                >
                  <Link to="/signup" className="flex items-center gap-2">
                    ابدأ الفترة التجريبية المجانية
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-[-2px]" />
                  </Link>
                </Button>
                
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="bg-white/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:text-indigo-700 dark:hover:text-indigo-400 hover:border-indigo-500 dark:hover:border-indigo-500 px-8 py-6 text-base rounded-xl backdrop-blur-sm transition-all duration-300"
                >
                  <Link to="/contact">تواصل مع فريق المبيعات</Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
