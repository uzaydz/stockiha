import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { useState } from 'react';

const OfflineFAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'كيف يمكنني استخدام النظام عندما لا يوجد اتصال بالإنترنت؟',
      answer: 'يعمل النظام تلقائياً في وضع عدم الاتصال عندما يكتشف انقطاع الإنترنت. يمكنك الاستمرار في استخدام جميع الوظائف الأساسية مثل البيع، إدارة المخزون، وإنشاء الفواتير. ستتم مزامنة جميع البيانات عند عودة الاتصال.'
    },
    {
      question: 'هل يمكنني معالجة المدفوعات ببطاقات الائتمان في وضع عدم الاتصال؟',
      answer: 'يمكنك تسجيل معاملات بطاقات الائتمان في وضع عدم الاتصال، لكن المعالجة الفعلية ستتم عند عودة الاتصال بالإنترنت. في غضون ذلك، يمكنك قبول المدفوعات النقدية أو تسجيل مبيعات آجلة للعملاء المعروفين.'
    },
    {
      question: 'ماذا يحدث للبيانات التي أدخلتها عندما كنت في وضع عدم الاتصال؟',
      answer: 'جميع البيانات التي تدخلها في وضع عدم الاتصال يتم تخزينها بشكل آمن في قاعدة البيانات المحلية. عند استعادة الاتصال، يقوم النظام تلقائياً بمزامنة هذه البيانات مع السحابة، مع حل أي تعارضات محتملة.'
    },
    {
      question: 'هل هناك حد لمدة العمل في وضع عدم الاتصال؟',
      answer: 'لا يوجد حد زمني للعمل في وضع عدم الاتصال. يمكنك الاستمرار في استخدام النظام لأيام أو حتى أسابيع دون اتصال بالإنترنت. المحدد الوحيد هو مساحة التخزين على جهازك، والتي عادة ما تكون كافية لآلاف المعاملات.'
    },
    {
      question: 'كيف يتم حل التعارضات عند المزامنة؟',
      answer: 'يستخدم نظامنا خوارزميات ذكية لحل التعارضات. في معظم الحالات، يتم دمج البيانات تلقائياً. في الحالات النادرة التي تتطلب تدخلاً، سيعرض النظام خيارات لحل التعارض يدوياً، مع إظهار جميع المعلومات الضرورية لاتخاذ قرار مدروس.'
    },
    {
      question: 'هل يمكنني إدارة حسابات العملاء في وضع عدم الاتصال؟',
      answer: 'نعم، يمكنك إدارة حسابات العملاء بالكامل في وضع عدم الاتصال. يمكنك إضافة عملاء جدد، تحديث معلومات العملاء الحاليين، وتسجيل المبيعات الآجلة. ستتم مزامنة جميع هذه التغييرات عند استعادة الاتصال.'
    },
    {
      question: 'هل يمكنني رؤية تقارير المبيعات في وضع عدم الاتصال؟',
      answer: 'نعم، يمكنك الوصول إلى تقارير المبيعات المحدثة بآخر البيانات المحلية. ستعكس هذه التقارير جميع المعاملات التي تمت محلياً، مع إشارة واضحة إلى أنها تستند إلى بيانات غير متصلة.'
    },
    {
      question: 'كيف أعرف أنني في وضع عدم الاتصال؟',
      answer: 'يعرض النظام مؤشراً واضحاً في الواجهة عندما يكون في وضع عدم الاتصال. ستلاحظ أيقونة "غير متصل" في شريط الحالة، وسيتم عرض إشعار عند التحول إلى وضع عدم الاتصال.'
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-muted/30">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            الأسئلة الشائعة <span className="text-primary">حول وضع الأوفلاين</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            إليك أجوبة على أكثر الأسئلة شيوعاً حول استخدام المنصة في وضع عدم الاتصال بالإنترنت.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-border overflow-hidden">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div
                  className={`border-b border-border ${
                    index === faqs.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className={`w-full px-6 py-4 flex items-center justify-between text-right transition-colors ${
                      openIndex === index ? 'bg-muted/50' : 'hover:bg-muted/30'
                    }`}
                  >
                    <span className="font-medium">{faq.question}</span>
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {openIndex === index ? (
                        <Minus className="h-3 w-3 text-primary" />
                      ) : (
                        <Plus className="h-3 w-3 text-primary" />
                      )}
                    </div>
                  </button>
                  
                  <div
                    className={`overflow-hidden transition-all ${
                      openIndex === index ? 'max-h-40' : 'max-h-0'
                    }`}
                  >
                    <div className="p-6 pt-0 text-muted-foreground">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-lg text-center"
          >
            <p className="text-sm">
              هل لديك سؤال آخر حول وضع الأوفلاين؟{' '}
              <a href="/contact" className="text-primary font-medium hover:underline">
                تواصل مع فريق الدعم
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OfflineFAQ; 