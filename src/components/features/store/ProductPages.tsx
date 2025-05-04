import { motion } from 'framer-motion';
import { FileText, ExternalLink, Share2, Smartphone, BarChart2, ShoppingBag } from 'lucide-react';

const ProductPages = () => {
  const features = [
    {
      icon: FileText,
      title: "إنشاء تلقائي",
      description: "إنشاء صفحة هبوط خاصة لكل منتج تضيفه إلى المخزون دون أي جهد إضافي",
      delay: 0.1
    },
    {
      icon: ExternalLink,
      title: "رابط فريد",
      description: "لكل منتج رابط خاص به يمكن مشاركته مباشرة مع العملاء عبر أي منصة",
      delay: 0.2
    },
    {
      icon: Smartphone,
      title: "تصميم متجاوب",
      description: "صفحات هبوط متوافقة مع جميع أحجام الشاشات من الهواتف الذكية إلى أجهزة الكمبيوتر",
      delay: 0.3
    },
    {
      icon: ShoppingBag,
      title: "شراء فوري",
      description: "زر شراء مباشر يتيح للعميل الطلب دون الحاجة للتنقل في صفحات المتجر",
      delay: 0.4
    },
    {
      icon: Share2,
      title: "مشاركة سهلة",
      description: "أزرار مشاركة مدمجة للتواصل الاجتماعي تزيد من انتشار منتجاتك",
      delay: 0.5
    },
    {
      icon: BarChart2,
      title: "تحليلات مفصلة",
      description: "إحصائيات دقيقة لكل صفحة منتج تساعدك على فهم سلوك الزوار وتحسين المبيعات",
      delay: 0.6
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-primary/5 to-background relative overflow-hidden">
      {/* عناصر الخلفية الزخرفية */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 right-0 w-72 h-72 bg-blue-500/10 rounded-full filter blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-primary/10 rounded-full filter blur-3xl opacity-40"></div>
      </div>

      <div className="container px-4 mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* الصورة التوضيحية */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:w-1/2"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-2xl transform rotate-2 scale-105 -z-10"></div>
              
              <div className="bg-card border border-border/40 shadow-lg rounded-xl overflow-hidden">
                <div className="h-8 bg-muted/80 flex items-center gap-1.5 px-4 border-b border-border">
                  <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                  <div className="h-5 w-72 mx-auto bg-background/80 rounded-md flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">store.stockiha.com/products/headphones</span>
                  </div>
                </div>
                
                <div className="relative">
                  <img
                    src="/images/product-page.png"
                    alt="صفحة منتج"
                    className="w-full h-auto"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'%3E%3Crect width='1200' height='800' fill='%23f8fafc'/%3E%3Ctext x='600' y='400' font-family='Arial' font-size='32' fill='%2394a3b8' text-anchor='middle'%3Eصفحة منتج نموذجية%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
              </div>
              
              {/* عناصر عائمة */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                viewport={{ once: true }}
                className="absolute -bottom-10 right-10 bg-card p-3 rounded-lg shadow-lg border border-border flex items-center gap-2 max-w-[150px]"
              >
                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-medium">مشاركة المنتج</div>
                  <div className="text-muted-foreground">زيادة المبيعات 30%</div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: -30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                viewport={{ once: true }}
                className="absolute -top-10 left-10 bg-card p-3 rounded-lg shadow-lg border border-border flex items-center gap-2 max-w-[180px]"
              >
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-medium">صفحة هبوط خاصة</div>
                  <div className="text-muted-foreground">إنشاء تلقائي مع المنتج</div>
                </div>
              </motion.div>
            </div>
          </motion.div>
          
          {/* النص والميزات */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:w-1/2"
          >
            <div className="inline-block mb-4 px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              صفحات المنتجات
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              صفحات <span className="text-primary">هبوط</span> لكل منتج
            </h2>
            
            <p className="text-lg text-muted-foreground mb-10">
              استفد من ميزة إنشاء صفحات هبوط خاصة بكل منتج تتيح لك مشاركة روابط مباشرة للمنتجات.
              صفحات مصممة لتحويل الزوار إلى مشترين مع كل ما تحتاجه من معلومات وصور وأزرار للشراء.
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

export default ProductPages; 