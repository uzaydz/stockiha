import { motion } from 'framer-motion';
import { BarChart4, LineChart, PieChart, TrendingUp, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';

const AdvancedAnalyticsHero = () => {
  const chartRef = useRef(null);
  
  // استدعاء للتأكد من عرض المخطط بشكل صحيح بعد تحميل المكون
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
    <section className="pt-16 pb-24 bg-gradient-to-b from-background to-primary/5 relative overflow-hidden">
      {/* زخارف خلفية */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-5 -top-5 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute left-10 bottom-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container px-4 mx-auto relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* العنوان والنص */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center lg:text-right"
          >
            <div className="inline-block bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              مميزات متقدمة للشركات
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="text-primary">التحليلات المتقدمة</span>
              <br />لفهم أعمق لأداء متجرك
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mr-0">
              نظام متكامل للتحليلات المتقدمة يقدم رؤى قيمة للمحاسبة والأرباح والمصاريف والمبيعات، 
              ويساعدك على اتخاذ قرارات أفضل مبنية على بيانات دقيقة.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" asChild>
                <Link to="/signup">ابدأ الآن مجاناً</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="group">
                <Link to="/features" className="flex items-center gap-2">
                  <span>اكتشف المزيد من المميزات</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </motion.div>
          
          {/* الصورة/الرسوم التوضيحية */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="relative"
          >
            <div className="bg-card rounded-2xl border border-border shadow-xl p-4 md:p-6 overflow-visible relative">
              {/* محاكاة لوحة تحكم التحليلات */}
              <div className="p-4 bg-background rounded-xl border border-border mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart4 className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">تحليل الأداء المالي</h3>
                  </div>
                  <div className="flex gap-2">
                    <select className="text-xs bg-muted/50 rounded-md border border-border px-2 py-1">
                      <option>آخر 30 يوم</option>
                      <option>هذا الشهر</option>
                      <option>هذه السنة</option>
                    </select>
                  </div>
                </div>
                
                {/* بطاقات المؤشرات */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { icon: <TrendingUp className="h-4 w-4 text-emerald-500" />, title: "الإيرادات", value: "485,267 دج", change: "+18.3%" },
                    { icon: <LineChart className="h-4 w-4 text-blue-500" />, title: "المصاريف", value: "162,854 دج", change: "-4.2%" },
                    { icon: <PieChart className="h-4 w-4 text-indigo-500" />, title: "الأرباح", value: "322,413 دج", change: "+22.5%" },
                    { icon: <BarChart4 className="h-4 w-4 text-amber-500" />, title: "هامش الربح", value: "66.4%", change: "+3.7%" },
                  ].map((item, i) => (
                    <div key={i} className="bg-card border border-border rounded-lg p-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{item.title}</span>
                        <div className="w-6 h-6 bg-muted/50 rounded-full flex items-center justify-center">
                          {item.icon}
                        </div>
                      </div>
                      <div className="font-semibold">{item.value}</div>
                      <div className={`text-xs ${item.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                        {item.change}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* محاكاة الرسم البياني */}
                <div className="h-[200px] bg-muted/30 rounded-lg border border-border p-3 relative overflow-visible">
                  {/* محور ص */}
                  <div className="absolute top-0 left-0 bottom-0 w-8 flex flex-col justify-between text-xs text-muted-foreground p-2 z-10">
                    {["500K", "400K", "300K", "200K", "100K", "0"].map((value, i) => (
                      <div key={i}>{value}</div>
                    ))}
                  </div>
                  
                  {/* محاكاة الخطوط والمنحنيات */}
                  <div className="absolute inset-0 flex items-end pt-6 pb-6 pl-10 z-0">
                    <div className="flex-1 h-full relative">
                      {/* خط الإيرادات */}
                      <div className="absolute top-[20%] left-0 right-0 border-t-2 border-dashed border-emerald-500/40 z-10"></div>
                      
                      {/* خط المصاريف */}
                      <div className="absolute top-[60%] left-0 right-0 border-t-2 border-dashed border-blue-500/40 z-10"></div>
                      
                      {/* خط الأرباح */}
                      <div className="absolute top-[40%] left-0 right-0 border-t-2 border-dashed border-indigo-500/40 z-10"></div>
                      
                      {/* الأعمدة البيانية */}
                      <div 
                        ref={chartRef}
                        className="flex h-full items-end gap-1 relative z-0"
                        style={{ minHeight: '150px' }}
                      >
                        {Array.from({ length: 12 }).map((_, i) => {
                          // استخدام ثوابت بدلاً من قيم عشوائية
                          const revenue = 50 + Math.sin(i / 2) * 30 + (i % 5) * 2;
                          const expense = 20 + Math.sin(i / 3) * 10 + (i % 4) * 1.5;
                          return (
                            <div key={i} className="flex-1 flex flex-col gap-1 group relative h-full">
                              <div className="relative w-full h-full flex flex-col justify-end">
                                <div 
                                  className="bg-emerald-500/60 rounded-t relative" 
                                  style={{ height: `${revenue}%`, minHeight: '3px' }}
                                >
                                  <div className="absolute inset-0 bg-emerald-500/80 rounded-t" style={{ bottom: '100%', height: '3px' }}></div>
                                </div>
                                <div 
                                  className="bg-blue-500/60 rounded-t relative mt-1" 
                                  style={{ height: `${expense}%`, minHeight: '3px' }}
                                >
                                  <div className="absolute inset-0 bg-blue-500/80 rounded-t" style={{ bottom: '100%', height: '3px' }}></div>
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-16 left-1/2 -translate-x-1/2 bg-background/90 border border-border rounded-md px-2 py-1 text-xs z-20 whitespace-nowrap shadow-md pointer-events-none">
                                <div>إيرادات: {Math.round(revenue * 10000)} دج</div>
                                <div>مصاريف: {Math.round(expense * 8000)} دج</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* محور س */}
                  <div className="absolute bottom-1 left-10 right-3 flex justify-between text-xs text-muted-foreground z-10">
                    {["ج", "ف", "م", "أ", "م", "ج", "ج", "أ", "س", "أ", "ن", "د"].map((month, i) => (
                      <div key={i} className="text-center">{month}</div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* القائمة السفلية */}
              <div className="flex gap-2 justify-center flex-wrap">
                {["المبيعات", "المصاريف", "المخزون", "العملاء", "الموردين"].map((tab, i) => (
                  <div 
                    key={i} 
                    className={`px-3 py-1.5 rounded-md text-sm cursor-pointer ${
                      i === 0 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'text-muted-foreground hover:bg-muted/30'
                    }`}
                  >
                    {tab}
                  </div>
                ))}
              </div>
            </div>
            
            {/* شارات مميزات خارج الإطار */}
            <div className="absolute -left-6 top-10 w-20 h-20 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex flex-col items-center justify-center shadow-lg rotate-12 z-10">
              <TrendingUp className="h-8 w-8 text-emerald-500 mb-1" />
              <span className="text-xs font-medium text-emerald-600">النمو</span>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex flex-col items-center justify-center shadow-lg -rotate-6 z-10">
              <PieChart className="h-10 w-10 text-indigo-500 mb-1" />
              <span className="text-xs font-medium text-indigo-600">الأرباح</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AdvancedAnalyticsHero;
