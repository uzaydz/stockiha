import { motion } from 'framer-motion';
import { 
  Laptop, 
  WifiOff, 
  ArrowLeftRight, 
  Shield, 
  LayoutList,
  Database,
  Zap,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const OfflineFeatures = () => {
  const features = [
    {
      title: "استمرارية العمل",
      description: "استمر في استخدام كافة وظائف النظام حتى عند انقطاع الإنترنت.",
      icon: WifiOff,
      delay: 0.1
    },
    {
      title: "مزامنة تلقائية",
      description: "بمجرد عودة الاتصال، تتم مزامنة جميع البيانات تلقائياً مع الخادم السحابي.",
      icon: ArrowLeftRight,
      delay: 0.2
    },
    {
      title: "أداء عالي",
      description: "تطبيق مكتبي خفيف وسريع الاستجابة يعمل بشكل سلس على أجهزة Windows و Mac.",
      icon: Zap,
      delay: 0.3
    },
    {
      title: "أمان البيانات",
      description: "تشفير كامل للبيانات المخزنة محلياً لضمان أمان معلوماتك وبيانات عملائك.",
      icon: Shield,
      delay: 0.4
    },
    {
      title: "إدارة المخزون محلياً",
      description: "تحديث المخزون والمبيعات دون اتصال، مع منع الازدواجية عند المزامنة.",
      icon: Database,
      delay: 0.5
    },
    {
      title: "إصدار الفواتير",
      description: "إنشاء وطباعة الفواتير والإيصالات دون الحاجة لاتصال بالإنترنت.",
      icon: LayoutList,
      delay: 0.6
    }
  ];

  return (
    <section id="offline" className="py-24 bg-muted/30">
      <div className="container px-4 mx-auto">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          {/* النص والمميزات */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:w-1/2"
          >
            <div className="inline-block mb-4 px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              العمل دون اتصال
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              لا <span className="text-primary">تتوقف</span> عن العمل <br />حتى بدون إنترنت
            </h2>
            
            <p className="text-lg text-muted-foreground mb-10">
              طورنا تطبيق سطح مكتب متكامل يعمل بشكل كامل حتى في حالة انقطاع الإنترنت، مع مزامنة البيانات تلقائياً عند عودة الاتصال.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: feature.delay }}
                  viewport={{ once: true, margin: "-50px" }}
                  className="flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <Button size="lg" className="group">
              تنزيل التطبيق المكتبي
              <Laptop className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
          
          {/* الصورة التوضيحية */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:w-1/2"
          >
            <div className="relative">
              {/* تأثير الخلفية */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl transform -rotate-2 scale-105 -z-10"></div>
              
              {/* شكل التطبيق المكتبي */}
              <div className="bg-card rounded-xl overflow-hidden border border-border shadow-xl">
                <div className="h-8 bg-muted/80 flex items-center px-4 border-b border-border">
                  <div className="flex gap-1.5 mr-4">
                    <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                  </div>
                  <div className="text-xs text-muted-foreground ml-auto">Bazaar Desktop - نظام المبيعات</div>
                  <Settings className="w-4 h-4 text-muted-foreground ml-4" />
                </div>
                
                <div className="relative bg-card p-0">
                  <img
                    src="/images/offline-app.png"
                    alt="تطبيق سطح المكتب"
                    className="w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'%3E%3Crect width='1200' height='800' fill='%23f8fafc'/%3E%3Ctext x='600' y='400' font-family='Arial' font-size='32' fill='%2394a3b8' text-anchor='middle'%3Eنموذج تطبيق سطح المكتب%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  
                  {/* مؤشر وضع عدم الاتصال */}
                  <div className="absolute top-4 right-4 px-3 py-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-800/60 text-xs font-medium flex items-center">
                    <WifiOff className="w-3.5 h-3.5 mr-1.5" />
                    <span>وضع عدم الاتصال</span>
                  </div>
                </div>
              </div>
              
              {/* معلومات عائمة */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
                className="absolute -bottom-6 -left-6 bg-background rounded-lg py-2 px-3 shadow-lg border border-primary/20 text-sm font-medium text-primary"
              >
                <div className="flex items-center">
                  <ArrowLeftRight className="w-4 h-4 mr-1.5" />
                  <span>مزامنة تلقائية</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OfflineFeatures;
