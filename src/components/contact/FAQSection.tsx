import { useState } from 'react';
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
    answer: "نعمل من الاثنين إلى الجمعة من 9 صباحًا حتى 6 مساءً، وفي عطلة نهاية الأسبوع من 10 صباحًا حتى 4 مساءً."
  },
  {
    question: "كيف يمكنني إلغاء طلب قمت بتقديمه؟",
    answer: "لإلغاء طلب، يرجى الاتصال بخدمة العملاء الخاصة بنا على الرقم المبين في صفحة الاتصال، أو إرسال بريد إلكتروني إلى support@stockiha.com مع رقم طلبك."
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
  }
];

export function FAQSection() {
  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      <h2 className="text-3xl font-bold text-center mb-8">الأسئلة الشائعة</h2>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger className="text-left text-lg font-medium">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-gray-600">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export default FAQSection;
