import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Star, PlayCircle, ArrowRight, Package, Users, BarChart3 } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative pt-20 pb-16 md:pt-28 md:pb-20 overflow-hidden bg-gradient-to-b from-transparent to-primary/5">
      {/* الأشكال الخلفية */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[40%] right-[10%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl opacity-20"></div>
        <div className="absolute top-[60%] -left-[10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-3xl opacity-20"></div>
      </div>

      <div className="container px-4 mx-auto">
        <div className="flex flex-col items-center justify-between md:flex-row">
          {/* محتوى النص الرئيسي */}
          <motion.div 
            className="w-full md:w-1/2 mb-10 md:mb-0 text-center md:text-right"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* شارة التميز */}
            <motion.div 
              className="inline-flex items-center justify-center gap-1 px-3 py-1 mb-4 text-sm font-medium rounded-full bg-primary/10 text-primary"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span>الحل الأمثل لإدارة المتاجر والمخازن</span>
            </motion.div>

            <h1 className="text-4xl font-bold tracking-tight mb-4 md:text-5xl lg:text-6xl bg-gradient-to-l from-primary/80 to-primary bg-clip-text text-transparent">
              نظام إدارة متكامل
              <br />
              <span className="text-foreground">لمتجرك الإلكتروني</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto md:mx-0">
              أدر متجرك بسهولة وفعالية مع نظامنا المتكامل لإدارة المخزون، المبيعات، الطلبات والخدمات. كل ما تحتاجه في منصة واحدة.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
              <Button size="lg" className="min-w-[160px] group">
                ابدأ الآن مجاناً
                <ChevronLeft className="h-4 w-4 mr-2 transition-transform group-hover:translate-x-1" />
              </Button>
              
              <Button variant="outline" size="lg" className="min-w-[160px] group">
                شاهد العرض التوضيحي
                <PlayCircle className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-center md:justify-start gap-3">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 w-10 rounded-full border-2 border-background bg-muted overflow-hidden">
                    <img 
                      src={`/images/avatar-${i}.jpg`} 
                      alt="صورة مستخدم" 
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=User+${i}&background=random`;
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <span className="font-bold text-primary">+1500</span> عميل سعيد
              </div>
            </div>
          </motion.div>

          {/* صورة العرض */}
          <motion.div 
            className="w-full md:w-1/2 relative"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="relative bg-gradient-to-tr from-primary/40 to-primary/10 rounded-2xl p-1">
              <img 
                src="/images/dashboard-preview.png" 
                alt="عرض للوحة التحكم" 
                className="rounded-xl shadow-2xl w-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='500' viewBox='0 0 800 500'%3E%3Crect width='800' height='500' fill='%23f1f5f9'/%3E%3Ctext x='400' y='250' font-family='Arial' font-size='20' fill='%2394a3b8' text-anchor='middle'%3Eصورة لوحة التحكم%3C/text%3E%3C/svg%3E";
                }}
              />
              
              {/* بطاقات المعلومات حول الصورة */}
              <motion.div 
                className="absolute -bottom-5 -left-5 bg-card rounded-lg shadow-lg p-3 flex items-center gap-3 border border-border"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">إدارة المخزون</p>
                  <p className="text-xs text-muted-foreground">تتبع سهل للمنتجات</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="absolute -top-5 right-10 bg-card rounded-lg shadow-lg p-3 flex items-center gap-3 border border-border"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">إدارة العملاء</p>
                  <p className="text-xs text-muted-foreground">تفاعل أفضل</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="absolute top-1/3 -right-5 bg-card rounded-lg shadow-lg p-3 flex items-center gap-3 border border-border"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.4 }}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">تقارير متقدمة</p>
                  <p className="text-xs text-muted-foreground">تحليل البيانات</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
        
        {/* قسم العلامات التجارية الموثوقة */}
        <motion.div 
          className="mt-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <p className="text-center text-sm text-muted-foreground mb-6">موثوق به من قبل الشركات الرائدة</p>
          <div className="flex flex-wrap justify-center gap-10">
            {['apple', 'microsoft', 'google', 'amazon', 'netflix'].map((brand) => (
              <div key={brand} className="grayscale opacity-50 hover:opacity-100 hover:grayscale-0 transition duration-300">
                <img 
                  src={`/images/brands/${brand}.svg`} 
                  alt={`شعار ${brand}`} 
                  className="h-8 w-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='40' viewBox='0 0 120 40'%3E%3Crect width='120' height='40' fill='%23ffffff'/%3E%3Ctext x='60' y='25' font-family='Arial' font-size='14' fill='%23ccc' text-anchor='middle'%3E${brand}%3C/text%3E%3C/svg%3E`;
                  }}
                />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
