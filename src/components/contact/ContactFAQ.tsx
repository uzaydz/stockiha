import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, MessageCircle, Zap, Shield, CreditCard } from 'lucide-react';

const ContactFAQ = () => {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const faqs = [
    {
      category: "عام",
      icon: HelpCircle,
      color: "from-blue-500 to-cyan-500",
      questions: [
        {
          question: "ما هي منصة سطوكيها؟",
          answer: "سطوكيها هي منصة متكاملة لإدارة المتاجر تجمع بين نقطة البيع، المتجر الإلكتروني، إدارة المخزون، والتوصيل في نظام واحد سهل الاستخدام."
        },
        {
          question: "هل يمكنني تجربة المنصة قبل الاشتراك؟",
          answer: "نعم! نوفر فترة تجريبية مجانية لمدة 14 يوماً بدون الحاجة لبطاقة ائتمان. يمكنك تجربة جميع المميزات والتأكد من أن المنصة تناسب احتياجاتك."
        },
        {
          question: "هل تدعمون اللغة العربية بالكامل؟",
          answer: "نعم، منصة سطوكيها مصممة خصيصاً للسوق الجزائري وتدعم اللغة العربية والفرنسية بالكامل في جميع أجزاء النظام."
        }
      ]
    },
    {
      category: "تقني",
      icon: Zap,
      color: "from-purple-500 to-pink-500",
      questions: [
        {
          question: "هل يعمل النظام بدون انترنت؟",
          answer: "نعم! يمكنك الاستمرار في البيع وإدارة متجرك حتى بدون اتصال بالإنترنت. عند عودة الاتصال، تتم مزامنة جميع البيانات تلقائياً."
        },
        {
          question: "ما هي متطلبات تشغيل النظام؟",
          answer: "يعمل النظام على أي جهاز كمبيوتر أو تابلت أو هاتف ذكي مع متصفح ويب حديث. لا حاجة لأجهزة خاصة أو مواصفات عالية."
        },
        {
          question: "هل يمكنني ربط النظام مع أجهزة الباركود والطابعات؟",
          answer: "نعم، النظام متوافق مع معظم أجهزة قراءة الباركود والطابعات الحرارية المتوفرة في السوق."
        }
      ]
    },
    {
      category: "الأمان والخصوصية",
      icon: Shield,
      color: "from-green-500 to-emerald-500",
      questions: [
        {
          question: "هل بياناتي آمنة؟",
          answer: "نعم، نستخدم أحدث تقنيات التشفير لحماية بياناتك. جميع البيانات مشفرة ومحمية بأعلى معايير الأمان العالمية."
        },
        {
          question: "أين يتم تخزين البيانات؟",
          answer: "يتم تخزين البيانات في خوادم آمنة مع نسخ احتياطية يومية. يمكنك أيضاً تصدير بياناتك في أي وقت."
        },
        {
          question: "من يمكنه الوصول إلى بياناتي؟",
          answer: "فقط أنت والمستخدمون المصرح لهم من قبلك يمكنهم الوصول إلى بياناتك. فريق الدعم الفني لا يمكنه الوصول إلى بياناتك إلا بإذن صريح منك."
        }
      ]
    },
    {
      category: "الأسعار والدفع",
      icon: CreditCard,
      color: "from-orange-500 to-red-500",
      questions: [
        {
          question: "ما هي طرق الدفع المتاحة؟",
          answer: "نقبل الدفع عبر البطاقات البنكية، التحويل البنكي، بريدي موب، والدفع النقدي عند التسليم للباقات السنوية."
        },
        {
          question: "هل هناك رسوم إضافية مخفية؟",
          answer: "لا، جميع الأسعار واضحة ومحددة مسبقاً. لا توجد أي رسوم مخفية أو تكاليف إضافية."
        },
        {
          question: "هل يمكنني تغيير الباقة في أي وقت؟",
          answer: "نعم، يمكنك الترقية أو تخفيض الباقة في أي وقت. سيتم احتساب الفرق بشكل تناسبي."
        }
      ]
    }
  ];

  const handleToggle = (categoryIndex: number, questionIndex: number) => {
    const index = `${categoryIndex}-${questionIndex}`;
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="container mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-full mb-4">
          <HelpCircle className="w-5 h-5" />
          <span className="font-semibold">الأسئلة الشائعة</span>
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          إجابات لأسئلتك
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          جمعنا لك أكثر الأسئلة شيوعاً مع إجابات مفصلة لمساعدتك
        </p>
      </motion.div>

      {/* الأسئلة حسب الفئة */}
      <div className="max-w-4xl mx-auto space-y-8">
        {faqs.map((category, categoryIndex) => (
          <motion.div
            key={categoryIndex}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: categoryIndex * 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg overflow-hidden"
          >
            {/* رأس الفئة */}
            <div className={`bg-gradient-to-r ${category.color} p-6`}>
              <div className="flex items-center gap-3 text-white">
                <category.icon className="w-8 h-8" />
                <h3 className="text-2xl font-bold">{category.category}</h3>
              </div>
            </div>

            {/* الأسئلة */}
            <div className="p-6 space-y-4">
              {category.questions.map((item, questionIndex) => (
                <motion.div
                  key={questionIndex}
                  className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => handleToggle(categoryIndex, questionIndex)}
                    className="w-full p-4 flex items-center justify-between text-right hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span className="font-medium text-gray-900 dark:text-white flex-1 text-right">
                      {item.question}
                    </span>
                    <motion.div
                      animate={{ rotate: openIndex === `${categoryIndex}-${questionIndex}` ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    </motion.div>
                  </button>
                  
                  <AnimatePresence>
                    {openIndex === `${categoryIndex}-${questionIndex}` && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-0 text-gray-600 dark:text-gray-300">
                          {item.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* قسم المساعدة الإضافية */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl p-8 lg:p-12 text-center"
      >
        <MessageCircle className="w-16 h-16 text-primary mx-auto mb-6" />
        <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
          لم تجد إجابة لسؤالك؟
        </h3>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          فريق الدعم الفني جاهز لمساعدتك والإجابة على جميع استفساراتك
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.a
            href="#contact-form"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center justify-center gap-2 bg-primary text-white px-8 py-3 rounded-full font-semibold hover:bg-primary/90 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            تواصل معنا الآن
          </motion.a>
          <motion.a
            href="mailto:support@stockiha.com"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center justify-center gap-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-8 py-3 rounded-full font-semibold border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            أرسل بريد إلكتروني
          </motion.a>
        </div>
      </motion.div>
    </div>
  );
};

export default ContactFAQ;
