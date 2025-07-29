import { motion } from 'framer-motion';
import { Zap, PaintBucket, Layout, Globe, LayoutTemplate, Image } from 'lucide-react';

const AutomatedStore = () => {
  const features = [
    {
      icon: Zap,
      title: "إنشاء فوري",
      description: "يتم إنشاء متجرك الإلكتروني بمجرد إكمال التسجيل في المنصة، دون أي إعدادات معقدة",
      delay: 0.1
    },
    {
      icon: Globe,
      title: "دومين فرعي خاص",
      description: "احصل على رابط متجر خاص يمكنك مشاركته مع عملائك (مثال: store.stockiha.com)",
      delay: 0.2
    },
    {
      icon: LayoutTemplate,
      title: "قوالب احترافية",
      description: "اختر من بين مجموعة من القوالب الاحترافية المصممة لمختلف أنواع المتاجر",
      delay: 0.3
    },
    {
      icon: PaintBucket,
      title: "تخصيص الألوان",
      description: "غير ألوان متجرك لتتناسب مع هوية علامتك التجارية بضغطة زر واحدة",
      delay: 0.4
    },
    {
      icon: Layout,
      title: "تنظيم محتوى الصفحة",
      description: "تحكم في ترتيب وظهور الأقسام المختلفة للمتجر بما يناسب احتياجاتك",
      delay: 0.5
    },
    {
      icon: Image,
      title: "محتوى بصري",
      description: "أضف صوراً وشعارات خاصة بك لإضفاء الطابع الشخصي على متجرك الإلكتروني",
      delay: 0.6
    }
  ];

  return (
    <section id="store-features" className="py-24 bg-gradient-to-b from-background to-primary/5 relative overflow-hidden">
      {/* عناصر الخلفية الزخرفية */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full filter blur-3xl opacity-30"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl opacity-30"></div>
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
            إنشاء وتخصيص
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            متجر <span className="text-primary">جاهز للعمل</span> فور التسجيل
          </h2>
          <p className="text-lg text-muted-foreground">
            استفد من تقنية الإنشاء التلقائي للمتجر الإلكتروني مع خيارات تخصيص واسعة 
            تتيح لك إنشاء متجر فريد يعكس هوية علامتك التجارية دون الحاجة لأي مهارات تقنية.
          </p>
        </motion.div>

        {/* لوحة التحكم */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto mb-24"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-2xl transform -rotate-1 scale-105 -z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-primary/20 rounded-2xl transform rotate-1 scale-105 -z-10 opacity-70"></div>

          <div className="bg-card shadow-xl rounded-xl overflow-hidden border border-border/50">
            <div className="h-10 bg-muted/80 flex items-center gap-1.5 px-4 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
              <div className="h-5 w-72 mx-auto bg-background/80 rounded-md flex items-center justify-center">
                <span className="text-xs text-muted-foreground">لوحة تحكم المتجر</span>
              </div>
            </div>
            
            <div className="relative bg-muted/30">
              <img
                src="/images/store-customization.png"
                alt="تخصيص المتجر الإلكتروني"
                className="w-full h-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='675' viewBox='0 0 1200 675'%3E%3Crect width='1200' height='675' fill='%23f8fafc'/%3E%3Ctext x='600' y='337.5' font-family='Arial' font-size='32' fill='%2394a3b8' text-anchor='middle'%3Eلوحة تحكم تخصيص المتجر%3C/text%3E%3C/svg%3E";
                }}
              />
              
              {/* شريط تقدم الإنشاء */}
              <div className="absolute top-4 right-4 left-4 bg-card shadow-lg border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">جاري إنشاء متجرك الإلكتروني...</div>
                  <div className="text-xs text-muted-foreground">80%</div>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '80%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* المميزات */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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

export default AutomatedStore;
