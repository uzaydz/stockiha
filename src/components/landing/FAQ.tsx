import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
  category: "general" | "pricing" | "features" | "support";
}

const FAQ = () => {
  const [activeCategory, setActiveCategory] = useState<
    "all" | "general" | "pricing" | "features" | "support"
  >("all");

  const faqItems: FAQItem[] = [
    {
      question: "ما هو نظام متجر الألعاب الشامل؟",
      answer:
        "نظام متجر الألعاب الشامل هو برنامج متكامل لإدارة متاجر الألعاب، يوفر حلولًا شاملة لإدارة المخزون والمبيعات والعملاء والتقارير. يتميز بواجهة سهلة الاستخدام، ودعم كامل للغة العربية، وتوافق مع المتطلبات الضريبية المحلية.",
      category: "general",
    },
    {
      question: "هل يمكنني تجربة النظام قبل الاشتراك؟",
      answer:
        "نعم، نوفر فترة تجريبية مجانية لمدة 14 يومًا لجميع الباقات، تتيح لك استكشاف جميع مميزات النظام واختبار مدى ملاءمته لاحتياجات متجرك دون أي التزام مالي.",
      category: "general",
    },
    {
      question: "كيف يمكنني البدء باستخدام النظام؟",
      answer:
        "البدء سهل للغاية. ما عليك سوى التسجيل في الموقع، واختيار الباقة المناسبة لك، وستتمكن من الوصول الفوري إلى النظام. نوفر أدلة استخدام شاملة وفيديوهات تعليمية، كما يمكننا مساعدتك في إعداد النظام ونقل البيانات من أنظمة أخرى.",
      category: "general",
    },
    {
      question: "هل يمكنني إلغاء اشتراكي في أي وقت؟",
      answer:
        "نعم، يمكنك إلغاء اشتراكك في أي وقت دون رسوم إضافية. نحن نؤمن بأن خدمتنا يجب أن تكسب ثقتك باستمرار، لذلك لا نلزمك بعقود طويلة الأمد. يمكنك الترقية أو تخفيض مستوى اشتراكك أو إلغائه تمامًا في أي وقت من لوحة التحكم الخاصة بك.",
      category: "pricing",
    },
    {
      question: "ما هي طرق الدفع المتاحة؟",
      answer:
        "نقبل مجموعة متنوعة من طرق الدفع بما في ذلك بطاقات الائتمان (فيزا، ماستركارد)، ومدى، وآبل باي، وسداد، وحوالة مصرفية. يمكنك اختيار الدفع شهريًا أو سنويًا للاستفادة من خصم يصل إلى 17% على الاشتراك السنوي.",
      category: "pricing",
    },
    {
      question: "هل يمكنني استخدام النظام على أجهزة متعددة؟",
      answer:
        "نعم، يمكنك الوصول إلى نظامك من أي جهاز متصل بالإنترنت. يعمل النظام على الأجهزة المكتبية والأجهزة اللوحية والهواتف الذكية، مما يتيح لك إدارة متجرك من أي مكان وفي أي وقت. عدد المستخدمين يعتمد على الباقة التي اخترتها.",
      category: "features",
    },
    {
      question: "هل يمكنني استيراد بياناتي من نظام آخر؟",
      answer:
        "نعم، نوفر أدوات لاستيراد بيانات المنتجات والعملاء والمخزون من معظم أنظمة إدارة المتاجر الشائعة. يمكن لفريق الدعم الفني مساعدتك في عملية نقل البيانات لضمان انتقال سلس إلى نظامنا دون فقدان أي معلومات مهمة.",
      category: "features",
    },
    {
      question: "هل النظام متوافق مع متطلبات الهيئة العامة للزكاة والدخل؟",
      answer:
        "نعم، نظامنا متوافق تمامًا مع متطلبات الهيئة العامة للزكاة والدخل، ويدعم الفواتير الإلكترونية وضريبة القيمة المضافة. نقوم بتحديث النظام باستمرار ليتوافق مع أي تغييرات في المتطلبات الضريبية.",
      category: "features",
    },
    {
      question: "ما نوع الدعم الفني المتوفر؟",
      answer:
        "نوفر دعمًا فنيًا شاملًا عبر البريد الإلكتروني والدردشة المباشرة والهاتف، اعتمادًا على الباقة التي اخترتها. باقة الأساسي تتضمن دعمًا بالبريد الإلكتروني، بينما توفر الباقات الأعلى دعمًا على مدار الساعة. كما نوفر قاعدة معرفية شاملة وفيديوهات تعليمية لمساعدتك في استخدام النظام.",
      category: "support",
    },
    {
      question: "هل يوفر النظام تحديثات منتظمة؟",
      answer:
        "نعم، نقوم بتحديث النظام بانتظام لإضافة ميزات جديدة وتحسين الأداء وإصلاح أي مشكلات. يتم نشر التحديثات تلقائيًا دون الحاجة إلى أي إجراء من جانبك، وسنبقيك على اطلاع دائم بأحدث التحسينات والإضافات عبر مدونتنا ورسائل البريد الإلكتروني.",
      category: "support",
    },
  ];

  const filteredFAQs =
    activeCategory === "all"
      ? faqItems
      : faqItems.filter((item) => item.category === activeCategory);

  const categories = [
    { id: "all", label: "الكل" },
    { id: "general", label: "عامة" },
    { id: "pricing", label: "الأسعار" },
    { id: "features", label: "الميزات" },
    { id: "support", label: "الدعم الفني" },
  ];

  return (
    <section id="الاسئلة-الشائعة" className="py-20">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="mb-4">الأسئلة الشائعة</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            إجابات على الأسئلة الأكثر شيوعًا
          </h2>
          <p className="text-lg text-muted-foreground">
            هذه بعض الأسئلة التي نتلقاها بشكل متكرر. إذا لم تجد إجابة لسؤالك، يرجى التواصل معنا
          </p>
        </div>

        <div className="flex justify-center gap-2 flex-wrap mb-8">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id as any)}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                activeCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {filteredFAQs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="border border-border rounded-lg px-6 py-2"
              >
                <AccordionTrigger className="text-right hover:no-underline">
                  <span className="text-lg font-medium">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pr-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            لم تجد إجابة لسؤالك؟ تواصل مع فريق الدعم الفني
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <a
              href="mailto:support@example.com"
              className="text-primary hover:underline"
            >
              support@example.com
            </a>
            <span className="text-muted-foreground">|</span>
            <a href="tel:+9661234567890" className="text-primary hover:underline">
              +966 123 456 7890
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ; 