import { motion } from 'framer-motion';
import { Building, ShoppingBag, TrendingUp, Target, ArrowRightLeft, Lock, BadgePercent, Star } from 'lucide-react';

const MarketplaceFeatures = () => {
  const features = [
    {
      title: "الظهور في السوق الرئيسي",
      description: "عرض جميع منتجاتك تلقائياً في منصة السوق الإلكتروني الرئيسية مع الآلاف من المنتجات الأخرى.",
      icon: Building,
      delay: 0.1
    },
    {
      title: "زيادة الوصول",
      description: "فرصة الوصول إلى قاعدة عملاء أوسع من جميع أنحاء البلاد والمنطقة.",
      icon: Target,
      delay: 0.2
    },
    {
      title: "إدارة مركزية للطلبات",
      description: "استلام وإدارة طلبات السوق الإلكتروني مباشرة من نفس لوحة التحكم الخاصة بمتجرك.",
      icon: ShoppingBag,
      delay: 0.3
    },
    {
      title: "تكامل المخزون",
      description: "ربط تلقائي بين مخزونك والسوق العام، مع تحديث فوري عند نفاذ المخزون.",
      icon: ArrowRightLeft,
      delay: 0.4
    },
    {
      title: "الدعم والضمان",
      description: "آليات متطورة لحماية كل من التاجر والمشتري، مع نظام حل النزاعات المتكامل.",
      icon: Lock,
      delay: 0.5
    },
    {
      title: "الترويج للمنتجات",
      description: "فرص للمشاركة في الحملات الترويجية والعروض الخاصة على مستوى السوق بأكمله.",
      icon: BadgePercent,
      delay: 0.6
    },
    {
      title: "تقييمات ومراجعات",
      description: "بناء سمعة متجرك من خلال نظام تقييمات موثوق يزيد من ثقة العملاء.",
      icon: Star,
      delay: 0.7
    },
    {
      title: "تحليلات وإحصائيات",
      description: "بيانات دقيقة عن أداء منتجاتك في السوق العام لمساعدتك على النمو.",
      icon: TrendingUp,
      delay: 0.8
    }
  ];

  return (
    <section id="marketplace" className="py-24 bg-gradient-to-b from-background to-primary/5 relative overflow-hidden">
      {/* عناصر الخلفية الزخرفية */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full filter blur-3xl opacity-30"></div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl opacity-30"></div>
      </div>

      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-block mb-4 px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            السوق الإلكتروني
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            وصول <span className="text-primary">أوسع</span> لعملاء جدد
          </h2>
          <p className="text-lg text-muted-foreground">
            استفد من قوة السوق الإلكتروني المتكامل الذي يجمع منتجات كافة التجار في مكان واحد،
            مما يتيح لك الوصول إلى عملاء جدد وتنمية مبيعاتك بشكل أسرع.
          </p>
        </motion.div>

        {/* الصورة التوضيحية */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="relative max-w-5xl mx-auto mb-20"
        >
          <div className="bg-card shadow-xl rounded-xl overflow-hidden border border-border/50">
            <div className="h-8 bg-muted/80 flex items-center gap-1.5 px-4 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
              <div className="h-5 w-72 mx-auto bg-background/80 rounded-md flex items-center justify-center">
                <span className="text-xs text-muted-foreground">stockiha.com/marketplace</span>
              </div>
            </div>
            
            <div className="relative bg-muted/30 aspect-[16/9]">
              <img
                src="/images/marketplace.png"
                alt="السوق الإلكتروني"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='675' viewBox='0 0 1200 675'%3E%3Crect width='1200' height='675' fill='%23f8fafc'/%3E%3Ctext x='600' y='337.5' font-family='Arial' font-size='32' fill='%2394a3b8' text-anchor='middle'%3Eالسوق الإلكتروني الرئيسي%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
          </div>
          
          {/* عناصر عائمة */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            viewport={{ once: true }}
            className="absolute -top-10 -right-10 bg-card rounded-lg p-4 shadow-lg border border-border w-40 transform -rotate-6"
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">5,000+</div>
              <div className="text-sm text-muted-foreground">تاجر نشط</div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            viewport={{ once: true }}
            className="absolute -bottom-10 -left-10 bg-card rounded-lg p-4 shadow-lg border border-border w-48 transform rotate-3"
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">100,000+</div>
              <div className="text-sm text-muted-foreground">منتج متاح للبيع</div>
            </div>
          </motion.div>
        </motion.div>

        {/* المميزات */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: feature.delay }}
              viewport={{ once: true, margin: "-100px" }}
              className="bg-card border border-border/40 p-6 rounded-xl hover:shadow-md hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 mb-4 flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MarketplaceFeatures;
