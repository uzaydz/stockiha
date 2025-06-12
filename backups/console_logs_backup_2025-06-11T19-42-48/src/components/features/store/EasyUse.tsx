import { motion } from 'framer-motion';
import { Lightbulb, MousePointer, Wand2, BarChart, Hand, Sparkles } from 'lucide-react';

const EasyUse = () => {
  const features = [
    {
      icon: MousePointer,
      title: "واجهة سهلة الاستخدام",
      description: "لوحة تحكم بديهية وواضحة تمكنك من إدارة متجرك بسهولة حتى دون أي خبرة تقنية سابقة",
      delay: 0.1
    },
    {
      icon: Wand2,
      title: "بدون برمجة",
      description: "لا حاجة لمعرفة أي لغات برمجة أو تصميم، كل شيء يتم بنقرات بسيطة من خلال واجهة سهلة",
      delay: 0.2
    },
    {
      icon: Lightbulb,
      title: "أدوات ذكية",
      description: "أدوات ذكية تقترح لك التحسينات وتساعدك على تحسين أداء متجرك وزيادة المبيعات",
      delay: 0.3
    },
    {
      icon: BarChart,
      title: "تقارير واضحة",
      description: "تقارير مبسطة وسهلة الفهم لمساعدتك على اتخاذ قرارات تجارية أفضل بناءً على بيانات دقيقة",
      delay: 0.4
    },
    {
      icon: Hand,
      title: "السحب والإفلات",
      description: "تخصيص تصميم متجرك عن طريق السحب والإفلات، مما يتيح لك تغيير مظهر المتجر بسهولة",
      delay: 0.5
    },
    {
      icon: Sparkles,
      title: "قوالب جاهزة",
      description: "مجموعة من القوالب الجاهزة عالية الجودة لمتجرك وصفحات المنتجات تناسب مختلف القطاعات",
      delay: 0.6
    }
  ];

  return (
    <section id="easy-use" className="py-24 bg-gradient-to-b from-primary/5 to-background relative overflow-hidden">
      {/* عناصر الخلفية الزخرفية */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 left-10 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl opacity-30"></div>
        <div className="absolute -bottom-40 right-0 w-96 h-96 bg-primary/10 rounded-full filter blur-3xl opacity-30"></div>
      </div>

      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="inline-block mb-4 px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            سهولة الاستخدام
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            واجهة <span className="text-primary">بسيطة</span> لنتائج احترافية
          </h2>
          <p className="text-lg text-muted-foreground">
            صممنا المتجر الإلكتروني ليكون سهل الاستخدام للجميع، بغض النظر عن مستوى خبرتك التقنية.
            إنشاء وإدارة متجر احترافي لم يعد يتطلب خبرة في البرمجة أو التصميم.
          </p>
        </motion.div>

        {/* عرض توضيحي لسهولة الاستخدام */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto mb-24 relative"
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* لوحة الخطوات - الجانب الأيمن */}
            <div className="md:col-span-2 bg-card border border-border/50 rounded-xl shadow-lg p-6 md:p-8 order-2 md:order-1">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary/10 rounded-full text-primary flex items-center justify-center text-sm">
                  <Lightbulb className="w-4 h-4" />
                </span>
                <span>أربع خطوات بسيطة</span>
              </h3>
              
              <div className="space-y-8">
                <div className="relative">
                  <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-muted"></div>
                  
                  <div className="space-y-8">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      viewport={{ once: true }}
                      className="relative pr-10"
                    >
                      <div className="absolute right-0 top-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">1</div>
                      <div>
                        <h4 className="font-medium mb-1">التسجيل وإنشاء الحساب</h4>
                        <p className="text-sm text-muted-foreground">
                          أنشئ حسابك في دقائق واحصل فوراً على متجر إلكتروني مجاني
                        </p>
                      </div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      viewport={{ once: true }}
                      className="relative pr-10"
                    >
                      <div className="absolute right-0 top-0 w-8 h-8 bg-muted-foreground text-primary-foreground rounded-full flex items-center justify-center font-medium">2</div>
                      <div>
                        <h4 className="font-medium mb-1">إضافة المنتجات</h4>
                        <p className="text-sm text-muted-foreground">
                          أضف منتجاتك مع الصور والأوصاف والأسعار من خلال نموذج بسيط
                        </p>
                      </div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                      viewport={{ once: true }}
                      className="relative pr-10"
                    >
                      <div className="absolute right-0 top-0 w-8 h-8 bg-muted-foreground text-primary-foreground rounded-full flex items-center justify-center font-medium">3</div>
                      <div>
                        <h4 className="font-medium mb-1">تخصيص المتجر</h4>
                        <p className="text-sm text-muted-foreground">
                          خصص مظهر متجرك باختيار الألوان والقوالب التي تناسب علامتك التجارية
                        </p>
                      </div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 }}
                      viewport={{ once: true }}
                      className="relative pr-10"
                    >
                      <div className="absolute right-0 top-0 w-8 h-8 bg-muted-foreground text-primary-foreground rounded-full flex items-center justify-center font-medium">4</div>
                      <div>
                        <h4 className="font-medium mb-1">نشر والبدء بالبيع</h4>
                        <p className="text-sm text-muted-foreground">
                          انشر متجرك وشارك الرابط مع عملائك وابدأ باستقبال الطلبات فوراً
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    الوقت المتوقع للإعداد
                  </div>
                  <div className="text-primary font-medium">
                    أقل من 30 دقيقة
                  </div>
                </div>
              </div>
            </div>
            
            {/* العرض التوضيحي - الجانب الأيسر */}
            <div className="md:col-span-3 order-1 md:order-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-2xl transform -rotate-1 scale-105 -z-10"></div>
                
                <div className="bg-card border border-border/40 shadow-lg rounded-xl overflow-hidden">
                  <div className="h-8 bg-muted/80 flex items-center gap-1.5 px-4 border-b border-border">
                    <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                    <div className="h-5 w-72 mx-auto bg-background/80 rounded-md flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">لوحة تحكم المتجر</span>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <img
                      src="/images/store-easy-use.png"
                      alt="واجهة سهلة الاستخدام"
                      className="w-full h-auto"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'%3E%3Crect width='1200' height='800' fill='%23f8fafc'/%3E%3Ctext x='600' y='400' font-family='Arial' font-size='32' fill='%2394a3b8' text-anchor='middle'%3Eلوحة تحكم سهلة الاستخدام%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    
                    {/* الفأرة المتحركة */}
                    <motion.div
                      initial={{ x: 100, y: 150 }}
                      animate={{ x: [100, 300, 400, 300, 100], y: [150, 200, 250, 300, 150] }}
                      transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }}
                      className="absolute w-8 h-8 pointer-events-none"
                    >
                      <MousePointer className="w-6 h-6 text-primary drop-shadow-md" />
                    </motion.div>
                    
                    {/* عناصر تفاعلية */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.8] }}
                      transition={{ duration: 4, repeat: Infinity, repeatDelay: 4 }}
                      className="absolute top-1/4 right-1/4 bg-primary text-primary-foreground text-sm px-3 py-1 rounded-lg shadow-lg"
                    >
                      انقر لإضافة منتج
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.8, 0.8, 1, 1, 0.8] }}
                      transition={{ duration: 4, delay: 4, repeat: Infinity, repeatDelay: 4 }}
                      className="absolute bottom-1/3 left-1/3 bg-card shadow-lg border border-border text-sm px-3 py-2 rounded-lg max-w-[200px]"
                    >
                      <div className="font-medium mb-1">تم إنشاء صفحة المنتج</div>
                      <div className="text-xs text-muted-foreground">صفحة المنتج جاهزة للمشاركة</div>
                    </motion.div>
                  </div>
                </div>
                
                {/* علامات تجربة المستخدم */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.7 }}
                  viewport={{ once: true }}
                  className="absolute -bottom-6 -right-6 bg-card p-3 rounded-lg shadow-lg border border-border flex gap-2 items-center"
                >
                  <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <Hand className="w-5 h-5" />
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">تصميم سهل الاستخدام</div>
                    <div className="text-xs text-muted-foreground">لمستخدمين من جميع المستويات</div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* مميزات سهولة الاستخدام */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: feature.delay }}
              viewport={{ once: true }}
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
        
        {/* خاتمة القسم */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mt-16 pt-8 border-t border-border/30"
        >
          <p className="text-lg text-muted-foreground">
            <span className="text-primary font-semibold">ستوكها</span> يجعل بناء متجرك الإلكتروني عملية سهلة وممتعة.
            ركز على تنمية أعمالك، ودع تعقيدات التقنية لنا.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default EasyUse;
