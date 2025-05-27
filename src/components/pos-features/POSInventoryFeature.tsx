import { motion } from 'framer-motion';
import { 
  BarChart3, 
  PackageSearch, 
  Boxes, 
  QrCode, 
  ScanBarcode, 
  Tag,
  AlertTriangle,
  TrendingUp,
  FileSpreadsheet,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const POSInventoryFeature = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            إدارة <span className="text-primary">المخزون المتقدمة</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            راقب مخزونك بكفاءة عالية مع أدوات متطورة لتتبع المنتجات والمستويات وتنبيهات انخفاض المخزون وإعداد التقارير الشاملة.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
          {/* جانب الخصائص */}
          <div className="space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mt-1 flex-shrink-0">
                  <Boxes className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">تنظيم كامل للمخزون</h3>
                  <p className="text-muted-foreground mb-4">
                    قم بتنظيم المنتجات حسب الفئات والعلامات التجارية والموردين، مع دعم للمنتجات ذات الخصائص والمتغيرات المتعددة.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {[
                      { icon: <Tag className="h-4 w-4" />, text: "سمات وخصائص متعددة" },
                      { icon: <PackageSearch className="h-4 w-4" />, text: "بحث متقدم للمنتجات" },
                      { icon: <QrCode className="h-4 w-4" />, text: "دعم الباركود والـ QR" },
                      { icon: <AlertTriangle className="h-4 w-4" />, text: "تنبيهات انخفاض المخزون" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {item.icon}
                        </div>
                        <span className="text-sm">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mt-1 flex-shrink-0">
                  <ScanBarcode className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">استلام وجرد سريع للمنتجات</h3>
                  <p className="text-muted-foreground mb-4">
                    استلم البضائع وتتبعها بسهولة مع إمكانية المسح الضوئي للباركود، واستخدم تطبيق الهاتف المحمول لجرد المخزون بدقة.
                  </p>
                  <div className="grid grid-cols-1 gap-3 mt-4">
                    {[
                      {
                        title: "جرد باستخدام الهاتف المحمول",
                        desc: "قم بجرد المخزون باستخدام الهاتف المحمول، حتى بدون إنترنت"
                      },
                      {
                        title: "استلام آلي للشحنات",
                        desc: "استلم البضائع وأضفها للمخزون تلقائياً مع التحقق من الكميات والأسعار"
                      },
                    ].map((item, i) => (
                      <div key={i} className="p-3 border border-border rounded-lg bg-card">
                        <h4 className="font-medium text-sm">{item.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mt-1 flex-shrink-0">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">تحليلات وتقارير المخزون</h3>
                  <p className="text-muted-foreground mb-4">
                    احصل على نظرة شاملة على حركة المخزون مع تقارير مخصصة للمنتجات الأكثر والأقل مبيعاً، وقيمة المخزون الحالية.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {[
                      { icon: <TrendingUp className="h-4 w-4" />, text: "تحليل حركة المخزون" },
                      { icon: <FileSpreadsheet className="h-4 w-4" />, text: "تصدير التقارير" },
                      { icon: <History className="h-4 w-4" />, text: "سجل حركة المنتجات" },
                      { icon: <AlertTriangle className="h-4 w-4" />, text: "تنبيهات نفاذ المخزون" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {item.icon}
                        </div>
                        <span className="text-sm">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* جانب الصورة التوضيحية */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border shadow-xl overflow-hidden bg-card"
          >
            {/* واجهة إدارة المخزون */}
            <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="h-5 w-5 text-primary" />
                <span className="font-medium">إدارة المخزون</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs bg-muted px-2 py-1 rounded">
                  الفرع الرئيسي
                </div>
              </div>
            </div>

            {/* محتوى واجهة المخزون */}
            <div className="p-5">
              {/* ملخص المخزون */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: "إجمالي المنتجات", value: "1,256", trend: "+12%" },
                  { label: "قيمة المخزون", value: "834,500 دج", trend: "+5%" },
                  { label: "منتجات تحت الحد", value: "24", trend: "-3", color: "text-amber-500" },
                ].map((stat, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-3 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">{stat.label}</div>
                    <div className="font-bold">{stat.value}</div>
                    <div className={`text-xs mt-1 ${stat.color || "text-green-500"}`}>
                      {stat.trend}
                    </div>
                  </div>
                ))}
              </div>

              {/* البحث والفلترة */}
              <div className="flex gap-3 mb-5">
                <div className="flex-grow relative">
                  <input
                    type="text"
                    placeholder="بحث عن منتج..."
                    className="w-full bg-muted/40 border border-border rounded-lg text-sm px-4 py-2.5 pl-10"
                  />
                  <span className="absolute left-3 top-2.5 text-muted-foreground">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                </div>
                <button className="bg-primary/10 text-primary rounded-lg px-3 py-2 text-sm font-medium">
                  الفئات
                </button>
                <button className="bg-primary/10 text-primary rounded-lg px-3 py-2 text-sm font-medium">
                  تصفية
                </button>
              </div>

              {/* جدول المنتجات */}
              <div className="border border-border rounded-lg overflow-hidden mb-4">
                <div className="bg-muted/30 py-2.5 px-4 text-xs font-medium grid grid-cols-6 gap-2">
                  <div className="col-span-2">المنتج</div>
                  <div className="text-center">المخزون</div>
                  <div className="text-center">سعر الشراء</div>
                  <div className="text-center">سعر البيع</div>
                  <div className="text-center">الإجراءات</div>
                </div>
                
                {/* صفوف الجدول */}
                {[
                  { name: "هاتف سامسونج A53", sku: "SM-A536", stock: 15, cost: "35,000 دج", price: "45,000 دج", status: "normal" },
                  { name: "سماعات بلوتوث JBL", sku: "JBL-45T", stock: 8, cost: "2,500 دج", price: "3,500 دج", status: "normal" },
                  { name: "شاحن لاسلكي", sku: "CHG-100", stock: 3, cost: "1,800 دج", price: "2,500 دج", status: "low" },
                  { name: "حافظة هاتف مغناطيسية", sku: "CS-200M", stock: 0, cost: "600 دج", price: "1,200 دج", status: "out" },
                  { name: "ساعة ذكية Galaxy", sku: "SMW-44", stock: 6, cost: "9,000 دج", price: "12,000 دج", status: "normal" },
                ].map((product, i) => (
                  <div 
                    key={i} 
                    className="py-3 px-4 text-sm grid grid-cols-6 gap-2 items-center border-t border-border first:border-0"
                  >
                    <div className="col-span-2">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">{product.sku}</div>
                    </div>
                    <div className="text-center">
                      <span className={`
                        px-2 py-0.5 rounded text-xs
                        ${product.status === 'normal' ? 'bg-green-100 text-green-800' : 
                          product.status === 'low' ? 'bg-amber-100 text-amber-800' : 
                          'bg-red-100 text-red-800'}
                      `}>
                        {product.stock}
                      </span>
                    </div>
                    <div className="text-center text-sm">{product.cost}</div>
                    <div className="text-center text-sm">{product.price}</div>
                    <div className="flex justify-center gap-1">
                      <button className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                        </svg>
                      </button>
                      <button className="p-1.5 rounded-md bg-muted/40 text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                      <button className="p-1.5 rounded-md bg-muted/40 text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* أزرار الإجراءات */}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" size="sm">
                  تصدير CSV
                </Button>
                <Button size="sm">
                  إضافة منتج جديد
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ميزات إضافية في الأسفل */}
        <div>
          <h3 className="text-2xl font-bold text-center mb-10">
            المزيد من ميزات إدارة المخزون
          </h3>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <QrCode className="h-6 w-6 text-primary" />,
                title: "إنشاء الباركود وطباعته",
                description: "أنشئ واطبع ملصقات الباركود والـ QR لمنتجاتك بسهولة مع مختلف خيارات التخصيص"
              },
              {
                icon: <Boxes className="h-6 w-6 text-primary" />,
                title: "إدارة تحويل المخزون",
                description: "نقل المخزون بين الفروع المختلفة وتتبع كل حركة نقل مع سجل كامل للعمليات"
              },
              {
                icon: <AlertTriangle className="h-6 w-6 text-primary" />,
                title: "تنبيهات المخزون",
                description: "إعداد تنبيهات مخصصة لانخفاض المخزون والمنتجات منتهية الصلاحية لتجنب نفاذ المخزون"
              },
              {
                icon: <BarChart3 className="h-6 w-6 text-primary" />,
                title: "تحليلات متقدمة للمخزون",
                description: "تحليل أداء المخزون وتتبع المنتجات الأكثر والأقل مبيعاً لاتخاذ قرارات أفضل"
              },
              {
                icon: <TrendingUp className="h-6 w-6 text-primary" />,
                title: "التنبؤ بالمخزون",
                description: "تنبؤات ذكية لمستويات المخزون المطلوبة بناءً على بيانات المبيعات السابقة"
              },
              {
                icon: <History className="h-6 w-6 text-primary" />,
                title: "سجل كامل للتغييرات",
                description: "تتبع جميع التغييرات على المخزون مع معلومات من قام بالتغيير ومتى لرقابة كاملة"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h4 className="text-lg font-bold mb-2">{feature.title}</h4>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default POSInventoryFeature;
