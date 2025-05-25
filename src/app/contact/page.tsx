import { Metadata } from "next";
import ContactForm from '@/components/contact/ContactForm';
import ContactInfo from '@/components/contact/ContactInfo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PhoneCall, Mail, HelpCircle } from 'lucide-react';
import FAQSection from '@/components/contact/FAQSection';

export const metadata: Metadata = {
  title: 'تواصل معنا | stockiha',
  description: 'تواصل مع فريق stockiha للحصول على المساعدة والدعم الفني أو استفسارات المبيعات. فريقنا جاهز لمساعدتك في أي وقت.',
};

export default function ContactPage() {
  return (
    <div className="container py-8 md:py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">تواصل معنا</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          نحن هنا لمساعدتك! اختر الطريقة المناسبة للتواصل معنا وسنرد على استفسارك في أقرب وقت ممكن.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto mb-12">
        <div className="flex flex-col items-center text-center p-6 bg-muted rounded-lg">
          <div className="p-3 bg-primary/10 rounded-full mb-4">
            <PhoneCall className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-xl mb-2">اتصل بنا</h3>
          <p className="text-muted-foreground mb-4">تحدث مباشرة مع فريق خدمة العملاء</p>
          <Button variant="outline">0540240886</Button>
        </div>
        
        <div className="flex flex-col items-center text-center p-6 bg-muted rounded-lg">
          <div className="p-3 bg-primary/10 rounded-full mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-xl mb-2">البريد الإلكتروني</h3>
          <p className="text-muted-foreground mb-4">أرسل لنا رسالة وسنرد عليك قريبًا</p>
          <Button variant="outline">info@stockiha.com</Button>
        </div>
        
        <div className="flex flex-col items-center text-center p-6 bg-muted rounded-lg">
          <div className="p-3 bg-primary/10 rounded-full mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-xl mb-2">الأسئلة الشائعة</h3>
          <p className="text-muted-foreground mb-4">اطلع على إجابات الأسئلة المتكررة</p>
          <Button variant="outline">عرض الأسئلة</Button>
        </div>
      </div>

      <Tabs defaultValue="form" className="max-w-5xl mx-auto">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="form">نموذج التواصل</TabsTrigger>
          <TabsTrigger value="info">معلومات الاتصال</TabsTrigger>
          <TabsTrigger value="faq">الأسئلة الشائعة</TabsTrigger>
        </TabsList>
        <TabsContent value="form">
          <ContactForm />
        </TabsContent>
        <TabsContent value="info">
          <ContactInfo />
        </TabsContent>
        <TabsContent value="faq">
          <FAQSection />
        </TabsContent>
      </Tabs>

      <div className="mt-16">
        <div className="rounded-lg overflow-hidden h-96 mb-8">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3624.674021067838!2d46.67597491537636!3d24.713454657424506!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e2f03890d489399%3A0xba974d1c98e79fd5!2sKing%20Fahd%20Rd%2C%20Riyadh%20Saudi%20Arabia!5e0!3m2!1sen!2s!4v1655909102292!5m2!1sen!2s" 
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">زورنا في المقر الرئيسي</h2>
          <p className="text-muted-foreground">برج المملكة، طريق الملك فهد، الرياض، المملكة العربية السعودية</p>
        </div>
      </div>
    </div>
  );
} 