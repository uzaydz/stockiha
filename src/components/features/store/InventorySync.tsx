import { motion } from 'framer-motion';
import { RefreshCw, Database, ShoppingCart, CreditCard, AlertTriangle, CheckCircle, BarChart, Store } from 'lucide-react';

const InventorySync = () => {
  return (
    <section id="inventory-sync" className="py-24 bg-gradient-to-b from-background to-primary/5 relative overflow-hidden">
      {/* عناصر الخلفية الزخرفية */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-80 h-80 bg-primary/10 rounded-full filter blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl opacity-30"></div>
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
            تزامن المخزون
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            مخزون <span className="text-primary">متكامل</span> بين كل منصات البيع
          </h2>
          <p className="text-lg text-muted-foreground">
            تزامن تلقائي للمخزون بين المتجر الإلكتروني ونقاط البيع الفعلية (POS) لضمان دقة المعلومات 
            وتجنب مشاكل نفاذ المخزون أو الحجوزات المزدوجة.
          </p>
        </motion.div>

        {/* رسم توضيحي للتزامن */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative max-w-5xl mx-auto mb-20"
        >
          <div className="bg-card border border-border/50 shadow-lg rounded-xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
              {/* العمود الأول - المتجر الإلكتروني */}
              <div className="relative">
                <div className="bg-background rounded-lg border border-border/70 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">المتجر الإلكتروني</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium">سماعات بلوتوث</div>
                        <div className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">باقي 3 قطع</div>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <div>رقم المنتج: #1234</div>
                        <div>199 دج</div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium">حامل هاتف للسيارة</div>
                        <div className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">متوفر</div>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <div>رقم المنتج: #1235</div>
                        <div>59 دج</div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium">شاحن سريع</div>
                        <div className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">نفذ المخزون</div>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <div>رقم المنتج: #1236</div>
                        <div>89 دج</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CreditCard className="w-4 h-4" />
                      <span>طلب جديد</span>
                    </div>
                    <motion.div
                      initial={{ scale: 1 }}
                      whileInView={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                      viewport={{ once: false }}
                    >
                      <div className="flex items-center gap-1 text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        <span>يتم تحديث المخزون...</span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
              
              {/* العمود الثاني - نقاط البيع */}
              <div className="relative">
                <div className="bg-background rounded-lg border border-border/70 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Store className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">نقاط البيع (POS)</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium">سماعات بلوتوث</div>
                        <div className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">باقي 3 قطع</div>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <div>رقم المنتج: #1234</div>
                        <div>199 دج</div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium">حامل هاتف للسيارة</div>
                        <div className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">متوفر</div>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <div>رقم المنتج: #1235</div>
                        <div>59 دج</div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium">شاحن سريع</div>
                        <div className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">نفذ المخزون</div>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <div>رقم المنتج: #1236</div>
                        <div>89 دج</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BarChart className="w-4 h-4" />
                      <span>بيع مباشر</span>
                    </div>
                    <motion.div
                      initial={{ scale: 1 }}
                      whileInView={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1, delay: 0.5, repeat: Infinity, repeatDelay: 2 }}
                      viewport={{ once: false }}
                    >
                      <div className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        <span>المخزون محدّث</span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* رمز التزامن في الوسط */}
            <motion.div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <div className="w-16 h-16 bg-card border-4 border-primary/30 shadow-lg rounded-full flex items-center justify-center">
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="w-8 h-8 text-primary" />
                </motion.div>
              </div>
            </motion.div>
            
            {/* الخط بين العمودين */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md border-t-2 border-dashed border-primary/30 hidden md:block"></div>
          </div>
          
          {/* قاعدة البيانات في الأسفل */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            viewport={{ once: true }}
            className="absolute -bottom-14 left-1/2 transform -translate-x-1/2 bg-card p-4 rounded-lg shadow-lg border border-border flex items-center gap-3 max-w-xs mx-auto"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium">قاعدة بيانات مركزية</div>
              <div className="text-xs text-muted-foreground">تزامن فوري لجميع المنصات</div>
            </div>
          </motion.div>
        </motion.div>
        
        {/* مميزات التزامن */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="bg-card border border-border/40 p-6 rounded-xl"
          >
            <div className="w-12 h-12 rounded-lg bg-green-100 text-green-600 mb-4 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">منع البيع المزدوج</h3>
            <p className="text-sm text-muted-foreground">
              لا مزيد من الطلبات لمنتجات غير متوفرة، حيث يتم تحديث المخزون بشكل فوري عند كل عملية بيع.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
            className="bg-card border border-border/40 p-6 rounded-xl"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 mb-4 flex items-center justify-center">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">تزامن تلقائي</h3>
            <p className="text-sm text-muted-foreground">
              تزامن فوري بين المخزون في المتجر الإلكتروني ونقاط البيع بدون أي تدخل يدوي من طرفك.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            viewport={{ once: true }}
            className="bg-card border border-border/40 p-6 rounded-xl"
          >
            <div className="w-12 h-12 rounded-lg bg-amber-100 text-amber-600 mb-4 flex items-center justify-center">
              <BarChart className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">إحصائيات موحدة</h3>
            <p className="text-sm text-muted-foreground">
              رؤية موحدة لأداء مبيعاتك عبر جميع القنوات مع تقارير وإحصائيات دقيقة ومحدثة.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default InventorySync;
