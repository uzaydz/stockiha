import { motion } from 'framer-motion';
import { 
  WalletCards, 
  TrendingUp, 
  BellDot, 
  FileBarChart, 
  DollarSign, 
  Receipt,
  CreditCard,
  BadgeDollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useRef } from 'react';

const FinancialAnalyticsFeature = () => {
  const chartRef = useRef(null);
  
  // تعديل التأثيرات البصرية عند تحميل المكون
  useEffect(() => {
    
    // تطبيق التأثيرات البصرية عند الحاجة
  }, []);
  
  // استدعاء إضافي للتأكد من عرض المخطط بشكل صحيح بعد تحميل المكون
  useEffect(() => {
    if (chartRef.current) {
      // إعادة تحديث العرض بعد تحميل المكون
      const timer = setTimeout(() => {
        if (chartRef.current) {
          // تحديث بالقوة
          const element = chartRef.current;
          element.style.display = 'none';
          setTimeout(() => {
            element.style.display = 'flex';
          }, 10);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [chartRef]);
  
  return (
    <section className="py-20 bg-background">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-primary">تحليل مالي</span> متكامل للمصاريف والإيرادات
          </h2>
          <p className="text-lg text-muted-foreground">
            مراقبة شاملة للأداء المالي مع تحليلات متقدمة للمصاريف والإيرادات،
            وتتبع دقيق للمحاسبة وإدارة التدفقات النقدية.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* واجهة التحليل المالي */}
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
                  <WalletCards className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">لوحة التحليل المالي</h3>
                </div>
                <div className="flex gap-2">
                  <select className="bg-muted/50 text-xs rounded-md border border-border px-2 py-1.5">
                    <option>هذا الشهر</option>
                    <option>الربع الحالي</option>
                    <option>هذه السنة</option>
                    <option>السنة المالية</option>
                  </select>
                </div>
              </div>

              {/* بطاقات الإحصائيات المالية */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { icon: <DollarSign className="h-4 w-4 text-emerald-500" />, title: "الإيرادات", value: "1,245,670 دج", change: "+15.2%" },
                  { icon: <CreditCard className="h-4 w-4 text-red-500" />, title: "المصاريف", value: "432,890 دج", change: "-8.4%" },
                  { icon: <BadgeDollarSign className="h-4 w-4 text-indigo-500" />, title: "صافي الأرباح", value: "812,780 دج", change: "+22.7%" },
                  { icon: <Receipt className="h-4 w-4 text-amber-500" />, title: "الفواتير", value: "487", change: "+5.3%" },
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

              {/* مخطط التدفق النقدي */}
              <div className="bg-muted/30 rounded-lg border border-border p-4 mb-6 overflow-visible">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium">التدفق النقدي</h4>
                  <div className="flex gap-2 items-center">
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                      <span className="text-xs">الإيرادات</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                      <span className="text-xs">المصاريف</span>
                    </span>
                  </div>
                </div>
                
                {/* محاكاة لمخطط التدفق النقدي */}
                <div 
                  ref={chartRef}
                  className="h-[200px] flex items-end gap-1 relative z-0 overflow-visible"
                  style={{ minHeight: '200px' }} // ضمان حد أدنى للارتفاع
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    // استخدام ثوابت بدلاً من قيم عشوائية لضمان ثبات القيم
                    const income = 40 + Math.sin(i / 2) * 30 + (i % 5) * 4;
                    const expense = 30 + Math.cos(i / 3) * 15 + (i % 3) * 3;
                    return (
                      <div key={i} className="flex-1 h-full flex flex-col justify-end group relative">
                        <div className="relative w-full h-full flex flex-col justify-end">
                          <div 
                            className="w-full bg-emerald-500/80 rounded-t"
                            style={{ height: `${income}%`, minHeight: '3px' }}
                          ></div>
                          <div 
                            className="w-full bg-red-500/80 rounded-t mt-1"
                            style={{ height: `${expense}%`, minHeight: '3px' }}
                          ></div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-16 left-1/2 -translate-x-1/2 bg-background/90 border border-border rounded-md px-2 py-1 text-xs z-10 whitespace-nowrap shadow-md pointer-events-none">
                          <div>إيرادات: {Math.round(income * 1000)} دج</div>
                          <div>مصاريف: {Math.round(expense * 1000)} دج</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* محور س */}
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  {["ج", "ف", "م", "أ", "م", "ج", "ج", "أ", "س", "أ", "ن", "د"].map((month, i) => (
                    <div key={i} className="text-center w-full">{month}</div>
                  ))}
                </div>
              </div>

              {/* جدول فئات المصاريف */}
              <div className="bg-muted/30 rounded-lg border border-border p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium">توزيع المصاريف حسب الفئة</h4>
                  <Button variant="ghost" size="sm" className="text-xs">
                    عرض التفاصيل
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {[
                    { category: "مشتريات المخزون", amount: "185,420 دج", percentage: 42.8 },
                    { category: "رواتب الموظفين", amount: "132,700 دج", percentage: 30.7 },
                    { category: "إيجار وخدمات", amount: "65,200 دج", percentage: 15.1 },
                    { category: "تسويق وإعلانات", amount: "28,570 دج", percentage: 6.6 },
                    { category: "مصاريف أخرى", amount: "21,000 دج", percentage: 4.8 },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-center text-sm mb-1">
                        <span>{item.category}</span>
                        <span className="font-medium">{item.amount}</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-muted-foreground text-left mt-1">
                        {item.percentage}%
                      </div>
                    </div>
                  ))}
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
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">تتبع المصاريف والإيرادات بدقة</h3>
                    <p className="text-muted-foreground">
                      مراقبة شاملة للتدفقات النقدية مع تصنيف ذكي للمصاريف وتحليل تفصيلي للإيرادات حسب المصدر والفترة الزمنية.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "تصنيف المصاريف", desc: "تصنيف تلقائي للمصاريف حسب الفئة" },
                    { title: "مصادر الإيرادات", desc: "تحليل مفصل لمصادر الدخل" },
                    { title: "مقارنات زمنية", desc: "مقارنة الأداء المالي بين الفترات" },
                    { title: "تقارير الربحية", desc: "حساب الهوامش وتحليل الربحية" }
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
                    <BellDot className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">تنبيهات وإشعارات ذكية</h3>
                    <p className="text-muted-foreground">
                      تنبيهات مخصصة لتجاوز الميزانية أو انخفاض الإيرادات، مع توصيات ذكية بناءً على الأنماط والتوجهات المالية.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "تنبيهات الميزانية", desc: "إشعارات عند تجاوز حدود الإنفاق" },
                    { title: "مراقبة التدفق النقدي", desc: "تنبيه بشأن السيولة المالية" },
                    { title: "توقعات الإيرادات", desc: "تنبؤات بالإيرادات المستقبلية" },
                    { title: "تنبيهات الضرائب", desc: "تذكير بمواعيد الدفع الضريبي" }
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
                    <FileBarChart className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">تقارير محاسبية متكاملة</h3>
                    <p className="text-muted-foreground">
                      تقارير احترافية للميزانية العمومية وقائمة الدخل والتدفقات النقدية،
                      مع إمكانية التصدير والمشاركة.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "الميزانية العمومية", desc: "تقرير شامل للأصول والخصوم" },
                    { title: "قائمة الدخل", desc: "تحليل الإيرادات والمصاريف والأرباح" },
                    { title: "التدفقات النقدية", desc: "تتبع حركة النقد في المؤسسة" },
                    { title: "التقارير الضريبية", desc: "تقارير جاهزة للامتثال الضريبي" }
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

export default FinancialAnalyticsFeature; 