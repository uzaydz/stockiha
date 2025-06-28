import { motion } from 'framer-motion';
import { ShoppingCart, BarChart, CreditCard, Receipt, Package, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OfflineSalesSystem = () => {
  const salesFeatures = [
    {
      icon: ShoppingCart,
      title: 'إدارة المبيعات',
      description: 'تسجيل المبيعات وإدارة السلة بشكل كامل حتى في وضع عدم الاتصال، مع دعم الخصومات والضرائب.'
    },
    {
      icon: CreditCard,
      title: 'معالجة المدفوعات',
      description: 'استقبال المدفوعات النقدية والشيكات وتسجيل المدفوعات بالبطاقات حتى عند انقطاع الإنترنت.'
    },
    {
      icon: Receipt,
      title: 'طباعة الإيصالات',
      description: 'إصدار وطباعة إيصالات احترافية للعملاء مباشرة من نظام نقطة البيع دون الحاجة للاتصال.'
    },
    {
      icon: BarChart,
      title: 'تقارير المبيعات',
      description: 'الوصول إلى تقارير المبيعات اليومية والأسبوعية مع إحصائيات محدثة حتى في وضع الأوفلاين.'
    },
    {
      icon: Package,
      title: 'إدارة المخزون',
      description: 'تحديث المخزون تلقائياً مع كل عملية بيع وتلقي تنبيهات للمنتجات منخفضة المخزون.'
    },
    {
      icon: User,
      title: 'حسابات العملاء',
      description: 'إدارة حسابات العملاء وتسجيل المبيعات الآجلة حتى بدون اتصال بالإنترنت.'
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              نظام مبيعات متكامل <span className="text-primary">يعمل بدون إنترنت</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              استمر في بيع منتجاتك وإدارة معاملاتك حتى عندما ينقطع الاتصال بالإنترنت، مع ضمان تحديث جميع البيانات عند عودة الاتصال.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center mb-16">
          {/* صورة لنقطة البيع */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-gradient-to-br from-primary/5 to-background p-6 rounded-2xl border border-border shadow-lg overflow-hidden">
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                {/* شريط عنوان نقطة البيع */}
                <div className="bg-muted/50 border-b border-border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">نقطة البيع</h3>
                        <div className="flex items-center gap-1 text-xs text-yellow-500">
                          <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                          <span>وضع غير متصل</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium">
                        المستخدم: أحمد
                      </div>
                      <div className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs">
                        23 سبتمبر، 14:30
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* محتوى نقطة البيع */}
                <div className="grid grid-cols-5 min-h-[360px]">
                  {/* المنتجات */}
                  <div className="col-span-3 border-l border-border p-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div 
                          key={i} 
                          className="bg-muted/30 rounded-lg p-3 border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <div className="bg-primary/5 rounded-md h-20 mb-2 flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <p className="font-medium text-sm">منتج #{i}</p>
                          <p className="text-xs text-muted-foreground mb-2">الكمية: {i * 5}</p>
                          <p className="text-sm font-semibold">{i * 750} دج</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* سلة المشتريات */}
                  <div className="col-span-2 p-4">
                    <div className="space-y-3">
                      <h4 className="font-medium mb-3">السلة</h4>
                      {[1, 2, 3].map(i => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-2 bg-muted/20 rounded-md border border-border/50"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium">{i}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">منتج #{i}</p>
                              <p className="text-xs text-muted-foreground">الكمية: {i}</p>
                            </div>
                          </div>
                          <p className="font-semibold">{i * 750} دج</p>
                        </div>
                      ))}
                      
                      <div className="mt-6 p-3 border-t border-border pt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>المجموع الفرعي:</span>
                          <span>3,000 دج</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>الضريبة (19%):</span>
                          <span>570 دج</span>
                        </div>
                        <div className="flex justify-between font-bold text-base mt-2">
                          <span>الإجمالي:</span>
                          <span>3,570 دج</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" className="w-full gap-1">
                          <CreditCard className="h-4 w-4" />
                          <span>الدفع</span>
                        </Button>
                        <Button variant="outline" size="sm" className="w-full gap-1">
                          <Receipt className="h-4 w-4" />
                          <span>طباعة</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* زخرفة */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-10 -z-10">
                <div className="absolute top-0 left-0 w-full h-full bg-grid-primary/[0.2] [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>
              </div>
            </div>
          </motion.div>
          
          {/* ميزات نظام المبيعات */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-2xl font-bold mb-8">استمر في <span className="text-primary">بيع منتجاتك</span> دون انقطاع</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {salesFeatures.slice(0, 4).map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex flex-col gap-3 p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-base mb-1">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {salesFeatures.slice(4, 6).map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: (index + 4) * 0.1 }}
                    className="flex flex-col gap-3 p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-base mb-1">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* شرح إضافي */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-4">
              <CreditCard className="h-6 w-6" />
            </div>
            <h4 className="text-xl font-semibold mb-2">معالجة جميع أنواع المدفوعات</h4>
            <p className="text-muted-foreground">
              استقبل المدفوعات النقدية، بطاقات الائتمان، أو حتى المدفوعات الآجلة. جميع المعاملات يتم تخزينها محلياً ومزامنتها لاحقاً.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
              <Package className="h-6 w-6" />
            </div>
            <h4 className="text-xl font-semibold mb-2">تحديث المخزون تلقائياً</h4>
            <p className="text-muted-foreground">
              يتم تحديث المخزون تلقائياً مع كل عملية بيع. تلقى تنبيهات للمنتجات منخفضة المخزون حتى في وضع عدم الاتصال.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4">
              <BarChart className="h-6 w-6" />
            </div>
            <h4 className="text-xl font-semibold mb-2">تقارير مبيعات محدثة</h4>
            <p className="text-muted-foreground">
              اطلع على تقارير المبيعات والأداء اليومية، حتى بدون إنترنت. جميع البيانات محدثة بآخر المعاملات المحلية.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OfflineSalesSystem;
