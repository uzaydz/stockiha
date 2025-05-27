import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "ما هي خيارات الدفع المتاحة؟",
    answer: "نقبل جميع البطاقات الائتمانية الرئيسية ودفعات PayPal. بالنسبة للحسابات التجارية، يمكننا أيضًا إصدار فواتير وقبول التحويلات المصرفية."
  },
  {
    question: "هل يمكنني الترقية من خطة إلى أخرى؟",
    answer: "نعم، يمكنك ترقية اشتراكك في أي وقت. سيتم احتساب الفرق في السعر على أساس تناسبي للفترة المتبقية من اشتراكك الحالي."
  },
  {
    question: "هل هناك عقد طويل الأمد؟",
    answer: "لا، جميع خططنا تعمل على أساس الاشتراك الشهري أو السنوي دون أي التزامات طويلة الأمد. يمكنك إلغاء اشتراكك في أي وقت."
  },
  {
    question: "هل تقدمون فترة تجريبية مجانية؟",
    answer: "نعم، نقدم فترة تجريبية مجانية لمدة 5 أيام لجميع الخطط. لا حاجة لبطاقة ائتمان للتسجيل في الفترة التجريبية."
  },
  {
    question: "كيف يمكنني إلغاء اشتراكي؟",
    answer: "يمكنك إلغاء اشتراكك بسهولة من لوحة التحكم الخاصة بك في أي وقت. بعد الإلغاء، ستظل خدمتك نشطة حتى نهاية فترة الفوترة الحالية."
  },
  {
    question: "هل تقدمون أسعارًا خاصة للمؤسسات التعليمية أو غير الربحية؟",
    answer: "نعم، نقدم خصومات خاصة للمؤسسات التعليمية والمنظمات غير الربحية والشركات الناشئة. يرجى التواصل مع فريق المبيعات لدينا للحصول على مزيد من المعلومات."
  }
];

const FAQItem = ({ item, isOpen, toggleOpen }: { item: FAQItem, isOpen: boolean, toggleOpen: () => void }) => {
  return (
    <motion.div 
      initial={false}
      className={cn(
        "border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-300",
        isOpen && "shadow-lg border-gray-300 dark:border-gray-700"
      )}
    >
      <button
        onClick={toggleOpen}
        className="flex justify-between items-center w-full p-6 text-right"
      >
        <span className={cn(
          "text-lg font-semibold transition-colors",
          isOpen 
            ? "text-gray-900 dark:text-white" 
            : "text-gray-700 dark:text-gray-300"
        )}>
          {item.question}
        </span>
        <span className={cn(
          "transform transition-transform duration-300 flex-shrink-0 ml-4",
          isOpen ? "text-primary" : "text-gray-400 dark:text-gray-500"
        )}>
          {isOpen ? <MinusCircle className="h-6 w-6" /> : <PlusCircle className="h-6 w-6" />}
        </span>
      </button>
      
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ 
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="p-6 pt-0 text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
          <p>{item.answer}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const PricingFAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="relative py-20 overflow-hidden">
      {/* خلفية زخرفية */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute right-[30%] bottom-0 -z-10 transform-gpu blur-3xl">
          <div aria-hidden="true" className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#a78bfa] to-[#3b82f6] opacity-10 dark:opacity-5"></div>
        </div>
      </div>
      
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            الأسئلة الشائعة
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            إجابات على الأسئلة الأكثر شيوعاً حول خططنا واشتراكاتنا
          </p>
        </motion.div>
        
        <div className="max-w-3xl mx-auto">
          <motion.div 
            className="space-y-4"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {faqItems.map((item, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
                }}
              >
                <FAQItem 
                  item={item} 
                  isOpen={openIndex === index} 
                  toggleOpen={() => toggleFAQ(index)} 
                />
              </motion.div>
            ))}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            viewport={{ once: true }}
            className="mt-14 text-center"
          >
            <p className="text-muted-foreground">
              هل لديك سؤال آخر؟{' '}
              <a href="/contact" className="text-primary font-medium hover:text-primary/80 transition-colors underline underline-offset-4">
                تواصل معنا
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PricingFAQ;
