import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import ContactHero from '@/components/contact/ContactHero';
import ContactForm from '@/components/contact/ContactForm';
import ContactInfo from '@/components/contact/ContactInfo';
import ContactMap from '@/components/contact/ContactMap';
import ContactFAQ from '@/components/contact/ContactFAQ';
import { Badge } from '@/components/ui/badge';
import { Quote } from 'lucide-react';

const ContactPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Helmet>
        <title>تواصل معنا | stockiha</title>
        <meta name="description" content="تواصل مع فريق stockiha للحصول على المساعدة والدعم الفني أو استفسارات المبيعات. فريقنا جاهز لمساعدتك في أي وقت." />
      </Helmet>

      <Navbar />
      
      <main className="flex-1 pt-16">
        <ContactHero />
        
        <div className="container px-4 mx-auto py-16">
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <ContactForm />
            </div>
            <div className="lg:col-span-2">
              <ContactInfo />
            </div>
          </div>
        </div>
        
        <div className="container px-4 mx-auto pb-16">
          <ContactMap />
        </div>
        
        <ContactFAQ />
        
        <section className="py-16 bg-background relative overflow-hidden">
          <div className="container px-4 mx-auto">
            <div className="max-w-3xl mx-auto bg-card p-8 md:p-10 rounded-xl border border-border shadow-sm relative">
              <Quote className="h-12 w-12 text-primary/10 absolute top-5 right-5" />
              <Badge className="mb-6" variant="outline">آراء العملاء</Badge>
              <blockquote className="text-lg md:text-xl mb-6 relative z-10">
                "أنا سعيد جدًا بالدعم السريع والمهني الذي تلقيته من فريق منصة بازار. كانوا متعاونين للغاية وقاموا بحل مشكلتي في غضون ساعات قليلة."
              </blockquote>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary ml-3">
                  م
                </div>
                <div>
                  <p className="font-medium">محمد أحمد</p>
                  <p className="text-sm text-muted-foreground">صاحب متجر إلكتروني</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default ContactPage;
