import { motion } from 'framer-motion';
import { ShoppingCart, CheckCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const POSHero = () => {
  return (
    <section className="py-20 overflow-hidden bg-gradient-to-b from-background to-background/90">
      <div className="container px-4 mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* النص والعنوان */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center lg:text-right"
          >
            <div className="inline-block mb-6 px-6 py-2 bg-primary/10 text-primary rounded-full">
              <span>نظام نقاط البيع متكامل</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="block">أدر مبيعاتك</span>
              <span className="block text-primary">بكفاءة وسرعة</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              نظام نقاط بيع قوي ومرن يدعم المبيعات المباشرة والخدمات، ويعمل بدون إنترنت مع ميزات متقدمة لإدارة المخزون والعملاء والمدفوعات.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span>جرب نظام نقاط البيع</span>
              </Button>
              <Button variant="outline" size="lg" className="gap-2">
                <Zap className="h-5 w-5" />
                <span>اطلب عرض توضيحي</span>
              </Button>
            </div>
            
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
              {[
                { icon: ShoppingCart, text: "معالجة مبيعات سريعة" },
                { icon: Zap, text: "واجهة مستخدم سهلة" },
                { icon: CheckCircle, text: "يعمل بدون إنترنت" }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  className="flex items-center justify-center sm:justify-start gap-2"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span>{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          {/* صورة المنتج */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="relative bg-gradient-to-tr from-primary/20 via-primary/10 to-background p-4 rounded-2xl border border-border shadow-xl overflow-hidden">
              {/* نافذة نقطة البيع التوضيحية */}
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                {/* شريط العنوان */}
                <div className="bg-muted/50 border-b border-border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">نقطة البيع</h3>
                        <p className="text-xs text-muted-foreground">الفرع الرئيسي</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-medium">
                      متصل
                    </div>
                  </div>
                </div>
                
                {/* محتوى نقطة البيع */}
                <div className="grid grid-cols-3 min-h-[360px]">
                  {/* واجهة المنتجات (المعروضة بالشبكة) */}
                  <div className="col-span-2 border-l border-border p-4">
                    {/* أقسام المنتجات */}
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                      {['الكل', 'إلكترونيات', 'ملابس', 'أحذية', 'إكسسوارات'].map((category, i) => (
                        <div 
                          key={i}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            i === 0 
                              ? 'bg-primary/10 text-primary border border-primary/30' 
                              : 'bg-muted/50 text-muted-foreground border border-border/50'
                          }`}
                        >
                          {category}
                        </div>
                      ))}
                    </div>
                    
                    {/* شبكة المنتجات */}
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div 
                          key={i} 
                          className="bg-muted/30 rounded-lg p-3 border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <div className="bg-primary/5 rounded-md h-16 mb-2 flex items-center justify-center">
                            {/* صورة المنتج الرمزية */}
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">{i}</span>
                            </div>
                          </div>
                          <p className="font-medium text-sm">منتج #{i}</p>
                          <p className="text-xs text-muted-foreground mb-1">الكمية: {i * 5}</p>
                          <p className="text-sm font-semibold">{i * 750} دج</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* سلة المشتريات */}
                  <div className="p-4">
                    <h4 className="font-medium mb-3">السلة</h4>
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="p-2 border border-border/50 rounded-md bg-muted/30">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">منتج #{i}</span>
                            <span className="text-sm">{i * 750} دج</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-muted-foreground">الكمية: {i}</span>
                            <span className="text-xs text-muted-foreground">المجموع: {i * i * 750} دج</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 border-t border-border pt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>المجموع:</span>
                        <span>3,000 دج</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>الضريبة:</span>
                        <span>0 دج</span>
                      </div>
                      <div className="flex justify-between font-bold mt-2">
                        <span>الإجمالي:</span>
                        <span>3,000 دج</span>
                      </div>
                      <div className="mt-3">
                        <button className="w-full py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium">
                          إتمام البيع
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* زخرفة الخلفية */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-10 -z-10">
                <div className="absolute top-0 left-0 w-full h-full bg-grid-primary/[0.2] [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>
              </div>
            </div>
            
            {/* مؤشرات الميزات */}
            <div className="absolute top-16 -right-4 hidden lg:block">
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="bg-card p-3 rounded-lg border border-border shadow-md"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">سهل الاستخدام</p>
                    <p className="text-xs text-muted-foreground">تدريب سريع للموظفين</p>
                  </div>
                </div>
              </motion.div>
            </div>
            
            <div className="absolute -bottom-4 left-1/3 hidden lg:block">
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="bg-card p-3 rounded-lg border border-border shadow-md"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">معالجة سريعة</p>
                    <p className="text-xs text-muted-foreground">عمليات بيع فورية</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default POSHero; 