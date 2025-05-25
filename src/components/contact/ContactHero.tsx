import { motion } from 'framer-motion';
import { Headset, Mail, Clock, PhoneCall } from 'lucide-react';

const ContactHero = () => {
  return (
    <section className="pt-20 pb-16 bg-gradient-to-b from-background to-primary/5 relative overflow-hidden">
      {/* زخارف خلفية */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -bottom-24 w-64 h-64 bg-primary/10 rounded-full filter blur-3xl"></div>
        <div className="absolute right-0 top-1/2 w-72 h-72 bg-blue-500/10 rounded-full filter blur-3xl"></div>
      </div>
      
      <div className="container px-4 mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-10"
        >
          <div className="inline-block bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            فريقنا بانتظار رسالتك
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-primary">تواصل معنا</span> وأخبرنا كيف يمكننا مساعدتك
          </h1>
          <p className="text-lg text-muted-foreground">
            نحن هنا للإجابة على جميع استفساراتك وتقديم الدعم الفني والمساعدة في كل ما يتعلق بمنصة بازار.
          </p>
        </motion.div>
        
        {/* بطاقات معلومات التواصل السريعة */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16"
        >
          <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all hover:border-primary/20">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Headset className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">الدعم الفني</h3>
            <p className="text-muted-foreground mb-3 text-sm">نحن هنا لمساعدتك في أي مشاكل تقنية قد تواجهها</p>
            <p className="font-medium text-primary">support@stockiha.com</p>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all hover:border-primary/20">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">استفسارات عامة</h3>
            <p className="text-muted-foreground mb-3 text-sm">لأي استفسارات عامة حول خدماتنا ومنتجاتنا</p>
            <p className="font-medium text-primary">info@stockiha.com</p>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all hover:border-primary/20">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <PhoneCall className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">خدمة العملاء</h3>
            <p className="text-muted-foreground mb-3 text-sm">فريق خدمة العملاء متاح للرد على استفساراتك</p>
            <p className="font-medium text-primary">+966 123 456 789</p>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all hover:border-primary/20">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">ساعات العمل</h3>
            <p className="text-muted-foreground mb-3 text-sm">نحن متاحون للمساعدة خلال هذه الأوقات</p>
            <p className="font-medium">الأحد - الخميس: 9 ص - 5 م</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactHero; 