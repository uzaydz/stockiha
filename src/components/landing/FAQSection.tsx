import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, HelpCircle, Search as SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
  index: number;
}

const FAQItem = ({ question, answer, isOpen, onClick, index }: FAQItemProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      viewport={{ once: true, margin: "-100px" }}
      className={cn(
        "border rounded-lg overflow-hidden transition-all",
        isOpen ? "border-primary/40 bg-card shadow-sm" : "border-border hover:border-primary/20"
      )}
    >
      <button
        onClick={onClick}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <span className="font-medium">{question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-primary flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      
      <div 
        className={cn(
          "px-6 transition-all duration-300 overflow-hidden",
          isOpen ? "pb-4 max-h-80" : "max-h-0"
        )}
      >
        <p className="text-muted-foreground">{answer}</p>
      </div>
    </motion.div>
  );
};

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const faqs = [
    {
      question: "كيف يمكنني البدء باستخدام المنصة؟",
      answer: "البدء سهل للغاية! ما عليك سوى التسجيل في الموقع، والحصول على فترة تجريبية مجانية لمدة 5 أيام. يمكنك إعداد متجرك خلال دقائق، وإضافة المنتجات والخدمات، وتخصيص إعدادات المتجر. لدينا دليل إعداد بسيط ومقاطع فيديو توضيحية باللهجة المحلية لمساعدتك في كل خطوة."
    },
    {
      question: "هل أحتاج إلى مهارات تقنية لاستخدام النظام؟",
      answer: "لا على الإطلاق! صممنا النظام ليكون سهل الاستخدام للجميع، حتى غير التقنيين. واجهة المستخدم بسيطة وبديهية، مع إرشادات وتلميحات في كل خطوة. إذا واجهتك أي صعوبات، فريق الدعم الفني متاح للمساعدة."
    },
    {
      question: "كيف يعمل المتجر الإلكتروني التلقائي؟",
      answer: "بمجرد التسجيل في المنصة، يتم إنشاء متجر إلكتروني خاص بك تلقائياً مع دومين فرعي (مثل متجرك.بازار.كوم). المنتجات التي تضيفها إلى نظام إدارة المتجر تظهر تلقائياً في متجرك الإلكتروني، والمخزون يتحدث بشكل مباشر، فعندما تبيع منتجاً في المتجر الفعلي، ينخفض المخزون في المتجر الإلكتروني والعكس صحيح."
    },
    {
      question: "كيف يمكنني تتبع الطلبات والمبيعات؟",
      answer: "توفر لوحة التحكم عرضاً شاملاً لجميع الطلبات والمبيعات في مكان واحد، سواء كانت من المتجر الفعلي أو المتجر الإلكتروني. يمكنك تصفية المبيعات حسب التاريخ والمنتجات والعملاء وطرق الدفع. كما يمكنك إنشاء تقارير مخصصة وتصديرها بتنسيقات مختلفة."
    },
    {
      question: "هل يمكن استخدام النظام بدون إنترنت؟",
      answer: "نعم! أحد أهم مميزات منصتنا هو توفر تطبيق سطح مكتب يعمل حتى بدون اتصال بالإنترنت. يمكنك متابعة عمليات البيع وإدارة المخزون بشكل طبيعي، وعند عودة الاتصال بالإنترنت، تتم مزامنة جميع البيانات تلقائياً مع السحابة."
    },
    {
      question: "كيف تعمل ميزة تتبع الخدمات؟",
      answer: "عندما تسجل خدمة جديدة (مثل صيانة هاتف)، ينشئ النظام تلقائياً رمز QR وكود تتبع فريد. يمكنك طباعة إيصال للعميل يحتوي على هذه المعلومات. يمكن للعميل مسح رمز QR أو إدخال كود التتبع في موقعك لمتابعة حالة الخدمة في الوقت الفعلي. كما يمكنك إرسال إشعارات للعميل عند تغيير حالة الخدمة."
    },
    {
      question: "هل يدعم النظام تعدد الفروع والموظفين؟",
      answer: "نعم، الخطة المتقدمة تدعم إدارة متعددة الفروع وتعدد الموظفين مع صلاحيات مختلفة. يمكنك تحديد أدوار مختلفة للموظفين وتعيين صلاحيات محددة لكل دور، مثل إدارة المبيعات أو إدارة المخزون أو الوصول إلى التقارير."
    },
    {
      question: "كيف يتم الدفع مقابل الاشتراك؟",
      answer: "نقدم خيارات دفع متنوعة تشمل البطاقات الائتمانية والدفع الإلكتروني المحلي والتحويل البنكي. الاشتراك شهري ويمكن إلغاؤه في أي وقت. نقدم أيضاً خصماً على الاشتراكات السنوية. للعملاء المستفيدين من عرض الإطلاق، يتم تثبيت السعر مدى الحياة."
    }
  ];
  
  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };
  
  // Filter FAQs based on search query
  const filteredFAQs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="py-20 bg-muted/30">
      <div className="container px-4 mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center max-w-3xl mx-auto mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            الأسئلة <span className="text-primary">الشائعة</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            إليك إجابات عن الأسئلة الأكثر شيوعاً حول منصتنا وكيفية استخدامها
          </p>
          
          <div className="relative max-w-xl mx-auto mb-12">
            <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="ابحث عن سؤالك هنا..."
              className="pr-10 pl-4 py-6 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </motion.div>
        
        {filteredFAQs.length > 0 ? (
          <div className="max-w-3xl mx-auto space-y-4">
            {filteredFAQs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openIndex === index}
                onClick={() => handleToggle(index)}
                index={index}
              />
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-lg mx-auto text-center p-8 rounded-lg border border-border"
          >
            <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">لم يتم العثور على نتائج</h3>
            <p className="text-muted-foreground">
              لم نجد إجابات تطابق بحثك. حاول استخدام كلمات مختلفة أو تواصل معنا مباشرة.
            </p>
          </motion.div>
        )}
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground">
            هل لديك المزيد من الأسئلة؟{" "}
            <a href="#contact" className="text-primary hover:underline">
              تواصل معنا
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
