import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    question: "ما هي ساعات العمل الخاصة بكم؟",
    answer: "نعمل من الأحد إلى الخميس من 9 صباحًا حتى 6 مساءً، وفي عطلة نهاية الأسبوع من 10 صباحًا حتى 4 مساءً."
  },
  {
    question: "كيف يمكنني إلغاء طلب قمت بتقديمه؟",
    answer: "لإلغاء طلب، يرجى الاتصال بخدمة العملاء الخاصة بنا على الرقم المبين في صفحة الاتصال، أو إرسال بريد إلكتروني إلى support@bazaar.com مع رقم طلبك."
  },
  {
    question: "هل تقدمون خدمات التوصيل الدولي؟",
    answer: "نعم، نقدم خدمات التوصيل الدولي لمعظم البلدان. تختلف الرسوم والوقت اللازم للتوصيل حسب الموقع."
  },
  {
    question: "كم من الوقت يستغرق الرد على استفساراتي؟",
    answer: "نحن نسعى للرد على جميع الاستفسارات في غضون 24 ساعة خلال أيام العمل."
  },
  {
    question: "هل يمكنني زيارة مكاتبكم شخصيًا؟",
    answer: "نعم، يمكنك زيارة مكاتبنا خلال ساعات العمل. نوصي بتحديد موعد مسبق لضمان توفر فريقنا لمساعدتك."
  },
  {
    question: "ما هي سياسة الإرجاع الخاصة بكم؟",
    answer: "نقبل إرجاع المنتجات في غضون 30 يومًا من تاريخ الشراء، بشرط أن تكون في حالتها الأصلية وبدون تلف."
  },
  {
    question: "هل يمكنني تتبع طلبي؟",
    answer: "نعم، يمكنك تتبع طلبك من خلال رقم التتبع الذي سيتم إرساله إلى بريدك الإلكتروني بعد إتمام عملية الشراء."
  },
  {
    question: "هل تقدمون خدمات ما بعد البيع؟",
    answer: "نعم، نقدم خدمات صيانة وضمان على جميع منتجاتنا. يرجى الاطلاع على شروط الضمان المرفقة مع كل منتج."
  }
];

const ContactFAQ = () => {
  return (
    <section className="py-16 relative overflow-hidden bg-muted/30">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">الأسئلة الشائعة</h2>
          <p className="text-muted-foreground">
            إليك إجابات على الأسئلة المتكررة. إذا لم تجد ما تبحث عنه، يرجى التواصل معنا مباشرة.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto bg-card rounded-xl border border-border shadow-sm p-6"
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border-b border-border last:border-0"
              >
                <AccordionTrigger className="text-right py-5 text-lg font-medium hover:text-primary transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactFAQ; 