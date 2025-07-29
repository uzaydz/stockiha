import { motion } from 'framer-motion';
import { 
  Package, 
  History, 
  BarChart2, 
  ListChecks, 
  AlertTriangle, 
  Archive,
  Gauge,
  PackageCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const InventoryAnalyticsFeature = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-primary">تحليلات المخزون</span> الذكية وإدارة المنتجات
          </h2>
          <p className="text-lg text-muted-foreground">
            مراقبة مستويات المخزون وتحليل أداء المنتجات في الوقت الفعلي، 
            لتحسين إدارة المخزون وتقليل التكاليف وزيادة الكفاءة.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* واجهة تحليلات المخزون */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            <div className="bg-card rounded-2xl border border-border shadow-lg p-6 overflow-hidden">
              {/* شريط الأدوات العلوي */}
              <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">تحليل أداء المخزون</h3>
                </div>
                <div className="flex gap-2">
                  <select className="bg-muted/50 text-xs rounded-md border border-border px-2 py-1.5">
                    <option>كل الفئات</option>
                    <option>الإلكترونيات</option>
                    <option>الملابس</option>
                    <option>الأدوات المنزلية</option>
                  </select>
                </div>
              </div>

              {/* مؤشرات المخزون الرئيسية */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { icon: <Package className="h-4 w-4 text-blue-500" />, title: "إجمالي المنتجات", value: "1,254", change: "+34" },
                  { icon: <Gauge className="h-4 w-4 text-amber-500" />, title: "معدل الدوران", value: "4.7 مرات", change: "+0.5" },
                  { icon: <AlertTriangle className="h-4 w-4 text-red-500" />, title: "منتجات منخفضة", value: "43", change: "-12" },
                  { icon: <Archive className="h-4 w-4 text-indigo-500" />, title: "قيمة المخزون", value: "1.4M دج", change: "+8.6%" },
                ].map((stat, i) => (
                  <div key={i} className="bg-background border border-border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs text-muted-foreground">{stat.title}</div>
                      <div className="w-6 h-6 bg-muted/50 rounded-full flex items-center justify-center">
                        {stat.icon}
                      </div>
                    </div>
                    <div className="font-semibold">{stat.value}</div>
                    <div className={`text-xs ${stat.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'} mt-1`}>{stat.change}</div>
                  </div>
                ))}
              </div>

              {/* تحليل معدل دوران المخزون */}
              <div className="bg-muted/30 rounded-lg border border-border p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium">تحليل معدل دوران المخزون حسب الفئة</h4>
                </div>
                
                <div className="space-y-4">
                  {[
                    { category: "الإلكترونيات", turnover: 6.8, color: "bg-blue-500" },
                    { category: "الملابس والأحذية", turnover: 5.2, color: "bg-indigo-500" },
                    { category: "مستلزمات الهواتف", turnover: 8.4, color: "bg-emerald-500" },
                    { category: "الإكسسوارات", turnover: 4.7, color: "bg-amber-500" },
                    { category: "أدوات منزلية", turnover: 3.1, color: "bg-red-500" },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{item.category}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{item.turnover} مرات/سنة</span>
                          <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${item.color}`}
                          style={{ width: `${(item.turnover / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* جدول المنتجات منخفضة المخزون */}
              <div className="bg-muted/30 rounded-lg border border-border p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium">المنتجات منخفضة المخزون</h4>
                  <Button variant="ghost" size="sm" className="text-xs">
                    تجديد المخزون
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-right pb-2">المنتج</th>
                        <th className="text-center pb-2">الكمية المتبقية</th>
                        <th className="text-center pb-2">الحد الأدنى</th>
                        <th className="text-center pb-2">معدل البيع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: "سماعات بلوتوث", qty: 5, min: 15, rate: "3 / يوم" },
                        { name: "شواحن لاسلكية", qty: 8, min: 20, rate: "4 / يوم" },
                        { name: "حافظات آيفون 14", qty: 12, min: 25, rate: "6 / يوم" },
                        { name: "كابلات USB-C", qty: 14, min: 30, rate: "8 / يوم" },
                      ].map((product, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-3 flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${product.qty < product.min / 2 ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                            {product.name}
                          </td>
                          <td className="text-center py-3">{product.qty} وحدة</td>
                          <td className="text-center py-3">{product.min} وحدة</td>
                          <td className="text-center py-3">{product.rate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* النص والميزات */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <div className="space-y-8">
              <div>
                <div className="flex gap-3 items-start mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                    <PackageCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">مراقبة المخزون في الوقت الفعلي</h3>
                    <p className="text-muted-foreground">
                      متابعة مستويات المخزون بشكل لحظي مع تنبيهات تلقائية للمنتجات التي تقترب من الحد الأدنى
                      وتوصيات لإعادة الطلب.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "مستويات المخزون", desc: "متابعة آنية لكميات المنتجات" },
                    { title: "تنبيهات المخزون", desc: "إشعارات للمنتجات منخفضة المخزون" },
                    { title: "نقاط إعادة الطلب", desc: "تحديد آلي لكميات الطلب المثالية" },
                    { title: "تتبع انتهاء الصلاحية", desc: "مراقبة تواريخ انتهاء صلاحية المنتجات" }
                  ].map((item, index) => (
                    <div key={index} className="p-3 border border-border rounded-lg bg-card">
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex gap-3 items-start mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                    <BarChart2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">تحليل أداء المخزون</h3>
                    <p className="text-muted-foreground">
                      تحليل متقدم لمعدل دوران المخزون وتكلفة الاحتفاظ بالمخزون والمنتجات الراكدة،
                      لاتخاذ قرارات مبنية على البيانات.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "معدل دوران المخزون", desc: "قياس كفاءة إدارة المخزون" },
                    { title: "تكلفة المخزون", desc: "حساب تكاليف الاحتفاظ بالمخزون" },
                    { title: "تحليل المنتجات الراكدة", desc: "تحديد المنتجات بطيئة الحركة" },
                    { title: "نسب نفاد المخزون", desc: "تتبع حالات نفاد المخزون وتأثيرها" }
                  ].map((item, index) => (
                    <div key={index} className="p-3 border border-border rounded-lg bg-card">
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex gap-3 items-start mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                    <ListChecks className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">توقعات وتخطيط المخزون</h3>
                    <p className="text-muted-foreground">
                      تنبؤات ذكية لاحتياجات المخزون المستقبلية مبنية على بيانات المبيعات التاريخية
                      والموسمية واتجاهات السوق.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "التنبؤ بالمبيعات", desc: "توقع احتياجات المخزون المستقبلية" },
                    { title: "تحليل الموسمية", desc: "تحديد أنماط الطلب الموسمية" },
                    { title: "الكميات الاقتصادية", desc: "حساب كميات الطلب المثلى" },
                    { title: "جدولة الطلبات", desc: "جدولة تلقائية لأوامر الشراء" }
                  ].map((item, index) => (
                    <div key={index} className="p-3 border border-border rounded-lg bg-card">
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default InventoryAnalyticsFeature;
