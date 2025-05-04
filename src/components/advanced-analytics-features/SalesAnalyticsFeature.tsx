import { motion } from 'framer-motion';
import { 
  BarChart, 
  ShoppingCart, 
  Users, 
  Map, 
  Repeat, 
  Smartphone,
  CircleDollarSign,
  ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';

const SalesAnalyticsFeature = () => {
  const chartContainerRef = useRef(null);
  const [chartKey, setChartKey] = useState(Date.now());
  
  // استدعاء للتأكد من عرض المخطط بشكل صحيح بعد تحميل المكون
  useEffect(() => {
    // إعادة تحديث المخطط بعد تحميل المكون
    const timer = setTimeout(() => {
      setChartKey(Date.now()); // هذا سيجبر المكون على إعادة الرسم
    }, 200);
    
    // تطبيق إعادة الرسم مرة أخرى بعد تفاعل المستخدم مع الصفحة
    const handleUserInteraction = () => {
      if (chartContainerRef.current) {
        setTimeout(() => {
          setChartKey(Date.now());
        }, 50);
      }
    };
    
    // استمع إلى أحداث التفاعل
    window.addEventListener('scroll', handleUserInteraction, { once: true });
    window.addEventListener('click', handleUserInteraction, { once: true });
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleUserInteraction);
      window.removeEventListener('click', handleUserInteraction);
    };
  }, []);
  
  // إنشاء بيانات المبيعات لتكون ثابتة
  const generateSalesData = () => {
    const data = [];
    for (let i = 0; i < 12; i++) {
      // جعل البيانات أكثر وضوحًا وثباتًا
      const height = 30 + Math.sin(i / 2) * 35 + (i % 5) * 5;
      data.push({
        x: (i + 1) * (100 / 12),
        y: 100 - height
      });
    }
    return data;
  };
  
  const salesData = generateSalesData();
  
  // إنشاء مسار SVG من البيانات
  const createLinePath = () => {
    let path = `M0,${100 - 30}`;
    
    salesData.forEach(point => {
      path += ` L${point.x},${point.y}`;
    });
    
    return path;
  };
  
  // إنشاء مسار منطقة SVG من البيانات
  const createAreaPath = () => {
    let path = `M0,${100 - 30}`;
    
    salesData.forEach(point => {
      path += ` L${point.x},${point.y}`;
    });
    
    path += ' L100,100 L0,100 Z';
    return path;
  };
  
  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-primary">تحليلات المبيعات</span> الذكية للمنتجات والعملاء
          </h2>
          <p className="text-lg text-muted-foreground">
            فهم عميق لأداء المبيعات والمنتجات الأكثر ربحاً وسلوك العملاء،
            مع تحليلات متقدمة لاتخاذ قرارات مبنية على البيانات.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* النص والميزات */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="space-y-8">
              <div>
                <div className="flex gap-3 items-start mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">تحليل شامل لأداء المبيعات</h3>
                    <p className="text-muted-foreground">
                      تحليل دقيق لحجم المبيعات ومعدل النمو والتوزيع الجغرافي والزمني،
                      مع مقارنات ديناميكية بين الفترات والمنتجات.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "تحليل الاتجاهات", desc: "تتبع اتجاهات المبيعات عبر الزمن" },
                    { title: "المقارنات الزمنية", desc: "مقارنة المبيعات بين فترات مختلفة" },
                    { title: "التحليل الجغرافي", desc: "توزيع المبيعات حسب المناطق" },
                    { title: "تحليل قنوات البيع", desc: "أداء المبيعات عبر قنوات متعددة" }
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
                    <ShoppingBag className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">تحليل أداء المنتجات</h3>
                    <p className="text-muted-foreground">
                      تقييم شامل لأداء المنتجات من حيث المبيعات والربحية ومعدل الدوران،
                      مع تحديد المنتجات الأكثر والأقل مبيعاً وربحية.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "ترتيب المنتجات", desc: "تصنيف المنتجات حسب المبيعات والربحية" },
                    { title: "تحليل الفئات", desc: "أداء فئات المنتجات المختلفة" },
                    { title: "تحليل الخصومات", desc: "تأثير الخصومات على المبيعات والأرباح" },
                    { title: "تحليل المخزون", desc: "علاقة مستويات المخزون بالمبيعات" }
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
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">تحليل سلوك العملاء</h3>
                    <p className="text-muted-foreground">
                      فهم عميق لسلوك الشراء وتفضيلات العملاء ومعدل الاحتفاظ والقيمة العمرية،
                      لتحسين استراتيجيات التسويق والمبيعات.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "تحليل العملاء", desc: "تقسيم العملاء وتحليل سلوكهم" },
                    { title: "القيمة العمرية", desc: "حساب القيمة العمرية للعملاء" },
                    { title: "معدل التحويل", desc: "تحليل معدلات تحويل الزوار لعملاء" },
                    { title: "ولاء العملاء", desc: "قياس معدلات الاحتفاظ والولاء" }
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
          
          {/* واجهة تحليلات المبيعات */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="bg-card rounded-2xl border border-border shadow-lg p-6 overflow-visible">
              {/* شريط الأدوات العلوي */}
              <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">تحليل أداء المبيعات</h3>
                </div>
                <div className="flex gap-2">
                  <select className="bg-muted/50 text-xs rounded-md border border-border px-2 py-1.5">
                    <option>آخر 30 يوم</option>
                    <option>آخر 3 أشهر</option>
                    <option>هذه السنة</option>
                  </select>
                </div>
              </div>

              {/* أرقام المبيعات الرئيسية */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { icon: <ShoppingCart className="h-4 w-4 text-emerald-500" />, title: "المبيعات", value: "345,770 دج", change: "+16.8%" },
                  { icon: <CircleDollarSign className="h-4 w-4 text-indigo-500" />, title: "متوسط الطلب", value: "1,280 دج", change: "+9.2%" },
                  { icon: <Repeat className="h-4 w-4 text-amber-500" />, title: "معدل التكرار", value: "2.4 مرة", change: "+14.3%" },
                  { icon: <Smartphone className="h-4 w-4 text-blue-500" />, title: "تحويل الزوار", value: "28.6%", change: "+5.7%" },
                ].map((stat, i) => (
                  <div key={i} className="bg-background border border-border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs text-muted-foreground">{stat.title}</div>
                      <div className="w-6 h-6 bg-muted/50 rounded-full flex items-center justify-center">
                        {stat.icon}
                      </div>
                    </div>
                    <div className="font-semibold">{stat.value}</div>
                    <div className="text-xs text-emerald-500 mt-1">{stat.change}</div>
                  </div>
                ))}
              </div>

              {/* رسم بياني للمبيعات والتوزيع */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* رسم بياني للمبيعات */}
                <div className="bg-muted/30 rounded-lg border border-border p-4 overflow-visible">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-medium">اتجاه المبيعات</h4>
                  </div>
                  
                  {/* محاكاة الرسم البياني */}
                  <div 
                    ref={chartContainerRef}
                    key={chartKey}
                    className="h-[150px] relative w-full overflow-visible"
                    style={{ minHeight: '150px' }}
                  >
                    {/* خطوط الشبكة */}
                    {[20, 40, 60, 80, 100].map((value, i) => (
                      <div 
                        key={i} 
                        className="absolute w-full border-t border-border/30 z-0"
                        style={{ top: `${100 - value}%` }}
                      ></div>
                    ))}
                    
                    {/* منطقة أسفل الخط - تم رسمها مباشرة بدون SVG للتبسيط */}
                    <div 
                      className="absolute inset-0 z-10"
                      style={{
                        background: `linear-gradient(to bottom, hsla(var(--primary), 0.3) 0%, hsla(var(--primary), 0.05) 100%)`,
                        clipPath: `polygon(${createAreaPath()})`,
                      }}
                    ></div>
                    
                    {/* خط المبيعات برسم مباشر */}
                    <div className="absolute inset-0 z-20">
                      <svg 
                        width="100%" 
                        height="100%" 
                        viewBox="0 0 100 100" 
                        preserveAspectRatio="none"
                        style={{ overflow: 'visible' }}
                      >
                        <path 
                          d={createLinePath()}
                          fill="none"
                          strokeWidth="2.5"
                          stroke="hsl(var(--primary))"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                        
                        {/* النقاط على الخط */}
                        {salesData.map((point, index) => (
                          <circle
                            key={index}
                            cx={point.x}
                            cy={point.y}
                            r="3"
                            fill="hsl(var(--primary))"
                            stroke="white"
                            strokeWidth="1.5"
                            className="opacity-0 hover:opacity-100 transition-opacity"
                          />
                        ))}
                      </svg>
                    </div>
                  </div>
                  
                  {/* محور س */}
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    {["ج", "ف", "م", "أ", "م", "ج", "ج", "أ", "س", "أ", "ن", "د"].map((month, i) => (
                      <div key={i} className="text-center w-full">{month}</div>
                    ))}
                  </div>
                </div>
                
                {/* توزيع المبيعات */}
                <div className="bg-muted/30 rounded-lg border border-border p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-medium">توزيع المبيعات</h4>
                  </div>
                  
                  {/* مخطط دائري */}
                  <div className="h-[150px] flex justify-center items-center relative">
                    {/* محاكاة لمخطط دائري */}
                    <div className="w-[120px] h-[120px] rounded-full relative overflow-hidden">
                      <div className="absolute inset-0 bg-emerald-500/80" style={{ clipPath: 'polygon(50% 50%, 0 0, 0 50%, 0 100%, 50% 100%, 100% 100%, 100% 80%)' }}></div>
                      <div className="absolute inset-0 bg-indigo-500/80" style={{ clipPath: 'polygon(50% 50%, 100% 0, 50% 0, 0 0, 0 50%)' }}></div>
                      <div className="absolute inset-0 bg-blue-500/80" style={{ clipPath: 'polygon(50% 50%, 100% 80%, 100% 40%, 100% 0, 50% 0)' }}></div>
                      <div className="absolute inset-0 border-4 border-background rounded-full"></div>
                    </div>
                    <div className="absolute inset-0">
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-xs">متجر فعلي (45%)</span>
                      </div>
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-xs">تطبيق (25%)</span>
                      </div>
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                        <span className="text-xs">موقع إلكتروني (30%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* جدول أفضل المنتجات المباعة */}
              <div className="bg-muted/30 rounded-lg border border-border p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium">أفضل المنتجات مبيعاً</h4>
                  <Button variant="ghost" size="sm" className="text-xs">
                    عرض الكل
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-right pb-2">المنتج</th>
                        <th className="text-center pb-2">المبيعات</th>
                        <th className="text-center pb-2">الكمية</th>
                        <th className="text-center pb-2">الربح</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: "سماعة لاسلكية", sales: "75,600 دج", qty: 63, profit: "38%" },
                        { name: "حقيبة لابتوب", sales: "63,200 دج", qty: 48, profit: "42%" },
                        { name: "شاحن سريع", sales: "45,300 دج", qty: 151, profit: "35%" },
                        { name: "حافظة جوال", sales: "36,740 دج", qty: 184, profit: "48%" },
                      ].map((product, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-3">{product.name}</td>
                          <td className="text-center py-3">{product.sales}</td>
                          <td className="text-center py-3">{product.qty}</td>
                          <td className="text-center py-3 text-emerald-500">{product.profit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SalesAnalyticsFeature; 