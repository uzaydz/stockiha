import { motion } from 'framer-motion';
import { WifiOff, Rocket, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OfflineCTA = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container px-4 mx-auto">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border border-border p-8 md:p-12 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <WifiOff className="h-8 w-8 text-primary" />
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              استمر في إدارة عملك <span className="text-primary">حتى بدون إنترنت</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              لا تدع انقطاع الإنترنت يعطل أعمالك. مع بازار، يمكنك الاستمرار في إدارة مبيعاتك، مخزونك، وخدمة عملائك بكفاءة كاملة حتى بدون اتصال.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Button size="lg" className="gap-2">
                <Rocket className="h-5 w-5" />
                <span>جرب بازار مجاناً</span>
              </Button>
              <Button variant="outline" size="lg" className="gap-2">
                <span>طلب عرض توضيحي</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card border border-border rounded-lg p-4 md:p-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6V18C3 19.1 3.9 20 5 20H19C20.1 20 21 19.1 21 18V6C21 4.9 20.1 4 19 4H5C3.9 4 3 4.9 3 6ZM13 10C13 10.5304 12.7893 11.0391 12.4142 11.4142C12.0391 11.7893 11.5304 12 11 12C10.4696 12 9.96086 11.7893 9.58579 11.4142C9.21071 11.0391 9 10.5304 9 10C9 9.46957 9.21071 8.96086 9.58579 8.58579C9.96086 8.21071 10.4696 8 11 8C11.5304 8 12.0391 8.21071 12.4142 8.58579C12.7893 8.96086 13 9.46957 13 10ZM15 16H7V15C7 13.67 9.67 13 11 13C12.33 13 15 13.67 15 15V16Z" fill="currentColor" className="text-primary" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2 text-center">مستخدم واحد</h3>
                <p className="text-sm text-muted-foreground text-center">
                  مناسب للمتاجر الصغيرة مع خدمة عملاء ومبيعات كاملة في وضع الأوفلاين.
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4 md:p-6 relative">
                <div className="absolute -top-3 right-1/2 transform translate-x-1/2 bg-primary px-3 py-1 rounded-full text-xs text-primary-foreground font-medium">
                  الأكثر شعبية
                </div>
                
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 13C6.33 13 1 14.33 1 17V20H17V17C17 14.33 11.67 13 9 13ZM4.74 17.96C5.53 17.25 7.5 16 9 16C10.5 16 12.47 17.25 13.26 17.96H4.74ZM9 11C11.21 11 13 9.21 13 7C13 4.79 11.21 3 9 3C6.79 3 5 4.79 5 7C5 9.21 6.79 11 9 11ZM9 5C10.1 5 11 5.9 11 7C11 8.1 10.1 9 9 9C7.9 9 7 8.1 7 7C7 5.9 7.9 5 9 5ZM16.04 13.13C17.2 13.43 18 14.53 18 15.85V17H23V15.85C23 14.35 19.12 13.3 16.04 13.13ZM15 11C17.21 11 19 9.21 19 7C19 4.79 17.21 3 15 3C14.78 3 14.56 3.02 14.34 3.06C15.04 4.17 15.5 5.52 15.5 7C15.5 8.48 15.04 9.83 14.34 10.94C14.56 10.98 14.78 11 15 11Z" fill="currentColor" className="text-primary" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2 text-center">فريق متوسط</h3>
                <p className="text-sm text-muted-foreground text-center">
                  للشركات الصغيرة والمتوسطة، مع دعم لعدة مستخدمين ومزامنة متقدمة.
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4 md:p-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6H16V4C16 2.9 15.1 2 14 2H10C8.9 2 8 2.9 8 4V6H4C2.9 6 2 6.9 2 8V20C2 21.1 2.9 22 4 22H20C21.1 22 22 21.1 22 20V8C22 6.9 21.1 6 20 6ZM10 4H14V6H10V4ZM20 20H4V8H20V20Z" fill="currentColor" className="text-primary" />
                    <path d="M13 10H11V12H9V14H11V16H13V14H15V12H13V10Z" fill="currentColor" className="text-primary" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2 text-center">شركات كبيرة</h3>
                <p className="text-sm text-muted-foreground text-center">
                  للشركات الكبيرة، مع دعم فني متخصص وقاعدة بيانات موزعة للعمل بدون إنترنت.
                </p>
              </div>
            </div>
            
            <div className="mt-10 flex items-center justify-center gap-2 flex-wrap text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                بدون التزامات
              </span>
              <span className="border-r border-border h-4 mx-2"></span>
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                فترة تجريبية 14 يوم
              </span>
              <span className="border-r border-border h-4 mx-2"></span>
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                دعم فني متخصص
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OfflineCTA;
