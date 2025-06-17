import { motion } from 'framer-motion';
import { 
  Globe, 
  ShoppingCart, 
  Smartphone, 
  Zap, 
  PaintBucket, 
  Search, 
  CreditCard,
  LayoutGrid
} from 'lucide-react';

const OnlineStore = () => {
  const features = [
    {
      icon: Globe,
      title: "دومين فرعي خاص",
      description: "احصل على دومين فرعي خاص بمتجرك فور التسجيل (مثال: store.stockiha.com)",
      delay: 0.1
    },
    {
      icon: Zap,
      title: "إنشاء تلقائي",
      description: "المنتجات التي تضيفها في نظام إدارة المتجر تظهر تلقائياً في متجرك الإلكتروني",
      delay: 0.2
    },
    {
      icon: LayoutGrid,
      title: "تصنيفات متعددة",
      description: "عرض المنتجات في تصنيفات سهلة التصفح، مع إمكانية البحث المتقدم",
      delay: 0.3
    },
    {
      icon: ShoppingCart,
      title: "سلة تسوق متكاملة",
      description: "تجربة شراء سلسة مع سلة تسوق سهلة الاستخدام وعملية دفع بسيطة",
      delay: 0.4
    },
    {
      icon: Smartphone,
      title: "متوافق مع الجوال",
      description: "متجر متوافق تماماً مع جميع الأجهزة، من الهواتف الذكية إلى أجهزة الكمبيوتر",
      delay: 0.5
    },
    {
      icon: CreditCard,
      title: "طرق دفع متعددة",
      description: "دعم لمختلف طرق الدفع من البطاقات البنكية إلى الدفع عند الاستلام",
      delay: 0.6
    },
    {
      icon: PaintBucket,
      title: "تخصيص كامل",
      description: "تخصيص مظهر المتجر بألوان علامتك التجارية وشعارك وصورك المخصصة",
      delay: 0.7
    },
    {
      icon: Search,
      title: "تحسين محركات البحث",
      description: "متجر مُحسّن لمحركات البحث (SEO) لزيادة ظهور منتجاتك في نتائج البحث",
      delay: 0.8
    }
  ];

  return (
    <section id="store" className="py-24 bg-gradient-to-b from-background to-primary/5 relative overflow-hidden">
      {/* عناصر الخلفية الزخرفية */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-primary/5 rounded-full filter blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-500/5 rounded-full filter blur-3xl opacity-50"></div>
      </div>

      <div className="container px-4 mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* الصورة التوضيحية */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:w-1/2 order-2 lg:order-1"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl transform rotate-3 scale-105 -z-10"></div>
              
              <div className="bg-card border border-border/40 shadow-lg rounded-xl overflow-hidden">
                <div className="h-8 bg-muted/80 flex items-center gap-1.5 px-4 border-b border-border">
                  <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                  <div className="h-5 w-72 mx-auto bg-background/80 rounded-md flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">store.stockiha.com</span>
                  </div>
                </div>
                
                <div className="relative aspect-[4/3]">
                  <img
                    src="/images/online-store.png"
                    alt="المتجر الإلكتروني"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='900' viewBox='0 0 1200 900'%3E%3Crect width='1200' height='900' fill='%23f8fafc'/%3E%3Ctext x='600' y='450' font-family='Arial' font-size='32' fill='%2394a3b8' text-anchor='middle'%3Eواجهة المتجر الإلكتروني%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
              </div>
              
              {/* Floating device mockups */}
              <div className="absolute -bottom-10 -right-10 w-40 h-auto shadow-xl rounded-lg overflow-hidden border border-border transform rotate-6">
                <div className="bg-card h-4 border-b border-border"></div>
                <img
                  src="/images/store-mobile.png"
                  alt="المتجر على الهاتف"
                  className="w-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='600' viewBox='0 0 300 600'%3E%3Crect width='300' height='600' fill='%23f8fafc'/%3E%3Ctext x='150' y='300' font-family='Arial' font-size='16' fill='%2394a3b8' text-anchor='middle'%3Eالمتجر على الجوال%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
            </div>
          </motion.div>
          
          {/* النص والمميزات */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:w-1/2 order-1 lg:order-2"
          >
            <div className="inline-block mb-4 px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              المتجر الإلكتروني
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              متجرك الإلكتروني <span className="text-primary">الفوري</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-10">
              بمجرد تسجيلك في المنصة، يتم إنشاء متجر إلكتروني خاص بك تلقائياً مع عرض جميع منتجاتك. 
              كما يتم ربط المخزون مع المبيعات الإلكترونية لتجنب المشاكل.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OnlineStore;
