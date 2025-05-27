import { motion } from 'framer-motion';
import { Database, HardDrive, Lock, History, WifiOff, Wifi } from 'lucide-react';

const LocalDatabase = () => {
  const features = [
    {
      icon: HardDrive,
      title: 'تخزين محلي',
      description: 'تخزين سريع وآمن لجميع بيانات المعاملات والمخزون والعملاء على جهازك مباشرة.'
    },
    {
      icon: Lock,
      title: 'تشفير البيانات',
      description: 'حماية لبياناتك مع تشفير قوي يضمن خصوصية معلوماتك وأمانها حتى بدون اتصال بالإنترنت.'
    },
    {
      icon: History,
      title: 'سجل التغييرات',
      description: 'تتبع جميع العمليات المحلية بسجل كامل يمكن مراجعته ومزامنته عند عودة الاتصال.'
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              قاعدة بيانات محلية <span className="text-primary">قوية وآمنة</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              صُممت قاعدة البيانات المحلية لتوفر لك أقصى استفادة من النظام حتى بدون اتصال بالإنترنت، مع ضمان تزامن سلس عند عودة الاتصال.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* الرسم التوضيحي للمزامنة */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="order-2 md:order-1"
          >
            <div className="relative rounded-xl overflow-hidden border border-border bg-card p-8">
              <div className="grid grid-rows-3 gap-8">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <Database className="h-8 w-8" />
                  </div>
                  <p className="font-medium text-center">قاعدة البيانات المركزية</p>
                  <p className="text-sm text-muted-foreground text-center mt-1">السحابة</p>
                </div>

                <div className="relative">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-full bg-gradient-to-b from-primary/80 via-primary/50 to-primary/10"></div>
                  
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 animate-bounce">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 15L4 9L5.4 7.55L10 12.15L14.6 7.55L16 9L10 15Z" fill="currentColor" className="text-primary" />
                    </svg>
                  </div>
                  
                  <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 animate-bounce" style={{ animationDirection: 'reverse' }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 5L16 11L14.6 12.45L10 7.85L5.4 12.45L4 11L10 5Z" fill="currentColor" className="text-primary" />
                    </svg>
                  </div>
                  
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card p-2 border border-border rounded-full">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                      <Wifi className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center mb-3">
                    <HardDrive className="h-8 w-8" />
                  </div>
                  <p className="font-medium text-center">قاعدة البيانات المحلية</p>
                  <p className="text-sm text-muted-foreground text-center mt-1">الجهاز الخاص بك</p>
                </div>
              </div>

              {/* حالة بدون انترنت */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-card p-3 rounded-full border border-border shadow-md">
                <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                  <WifiOff className="h-5 w-5" />
                </div>
              </div>

              {/* حالات المزامنة */}
              <div className="absolute right-0 top-1/3 translate-x-1/3 bg-card p-2 rounded-lg border border-border shadow-md text-sm">
                <p className="font-medium">المزامنة التلقائية</p>
                <p className="text-xs text-muted-foreground">كل 15 دقيقة</p>
              </div>
              
              <div className="absolute right-0 bottom-1/3 translate-x-1/2 bg-card p-2 rounded-lg border border-border shadow-md text-sm">
                <p className="font-medium">مزامنة يدوية</p>
                <p className="text-xs text-muted-foreground">عند الطلب</p>
              </div>
            </div>
          </motion.div>

          {/* الميزات */}
          <div className="order-1 md:order-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-2xl font-bold mb-8">الميزات الرئيسية <span className="text-primary">لقاعدة البيانات المحلية</span></h3>
              
              <div className="space-y-8">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex gap-4"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">{feature.title}</h4>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-10 p-4 bg-primary/5 border border-primary/10 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mt-1">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 0C4.5 0 0 4.5 0 10C0 15.5 4.5 20 10 20C15.5 20 20 15.5 20 10C20 4.5 15.5 0 10 0ZM8 15L3 10L4.4 8.6L8 12.2L15.6 4.6L17 6L8 15Z" fill="#10B981"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-base">تعمل بشكل كامل دون إنترنت</h4>
                    <p className="text-sm text-muted-foreground">يمكنك الاستمرار في العمل بكفاءة كاملة حتى عند انقطاع الاتصال بالإنترنت، وستتم مزامنة جميع البيانات تلقائياً عند عودة الاتصال.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocalDatabase;
