import { motion } from 'framer-motion';
import { 
  BarChart4, 
  TrendingUp, 
  PieChart, 
  Users, 
  Calendar, 
  Layers, 
  ArrowUpDown,
  StoreIcon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const POSReportsFeature = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            تقارير <span className="text-primary">تفصيلية ورؤى تحليلية</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            اتخذ قرارات أعمال مدروسة بناءً على بيانات دقيقة وتقارير شاملة، مع لوحات تحكم توفر كافة المؤشرات والإحصائيات الهامة.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* قسم التقارير والمخططات */}
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
                  <BarChart4 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">لوحة تحكم المبيعات</h3>
                </div>
                <div className="flex gap-2">
                  <select className="bg-muted/50 text-xs rounded-md border border-border px-2 py-1.5">
                    <option>اليوم</option>
                    <option>هذا الأسبوع</option>
                    <option>هذا الشهر</option>
                    <option>هذه السنة</option>
                  </select>
                  <select className="bg-muted/50 text-xs rounded-md border border-border px-2 py-1.5">
                    <option>كل الفروع</option>
                    <option>الفرع الرئيسي</option>
                    <option>فرع المدينة</option>
                  </select>
                </div>
              </div>

              {/* بطاقات الإحصائيات */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { icon: <TrendingUp className="h-4 w-4 text-emerald-500" />, title: "المبيعات", value: "156,700 دج", change: "+12.5%" },
                  { icon: <Layers className="h-4 w-4 text-blue-500" />, title: "الطلبات", value: "247", change: "+8.1%" },
                  { icon: <Users className="h-4 w-4 text-indigo-500" />, title: "العملاء", value: "68", change: "+5.2%" },
                  { icon: <ArrowUpDown className="h-4 w-4 text-orange-500" />, title: "متوسط قيمة الطلب", value: "634 دج", change: "+3.7%" },
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

              {/* رسم بياني */}
              <div className="bg-muted/30 rounded-lg border border-border p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium">تطور المبيعات</h4>
                  <div className="flex gap-1">
                    {["يومي", "أسبوعي", "شهري"].map((period, i) => (
                      <span 
                        key={i} 
                        className={`text-xs px-2 py-1 rounded-md cursor-pointer ${
                          i === 0 
                            ? 'bg-primary/10 text-primary border border-primary/20' 
                            : 'text-muted-foreground border border-transparent'
                        }`}
                      >
                        {period}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* محاكاة للرسم البياني */}
                <div className="h-[200px] flex items-end gap-1">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const height = 30 + Math.sin(i / 2) * 120 + Math.random() * 40;
                    const isHighest = height > 160;
                    return (
                      <div 
                        key={i} 
                        className="relative flex-1 group"
                        style={{ height: '100%' }}
                      >
                        <div 
                          className={`w-full absolute bottom-0 rounded-sm ${
                            isHighest 
                              ? 'bg-primary' 
                              : 'bg-primary/40'
                          }`}
                          style={{ height: `${height}px` }}
                        ></div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-background border border-border rounded-md px-2 py-1 text-xs whitespace-nowrap">
                          {Math.round(height * 100)} دج
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* محور س */}
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  {["00:00", "06:00", "12:00", "18:00", "23:59"].map((time, i) => (
                    <div key={i}>{time}</div>
                  ))}
                </div>
              </div>

              {/* جدول المنتجات الأكثر مبيعاً */}
              <div className="bg-muted/30 rounded-lg border border-border p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium">أكثر المنتجات مبيعاً</h4>
                  <Button variant="ghost" size="sm" className="text-xs">
                    عرض الكل
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-right pb-2">المنتج</th>
                        <th className="text-center pb-2">الكمية</th>
                        <th className="text-center pb-2">المبيعات</th>
                        <th className="text-center pb-2">النمو</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: "هاتف سامسونج A53", qty: 26, sales: "78,000 دج", growth: "+18%" },
                        { name: "سماعات بلوتوث", qty: 45, sales: "31,500 دج", growth: "+12%" },
                        { name: "شاحن لاسلكي", qty: 32, sales: "19,200 دج", growth: "+7%" },
                        { name: "حافظة هاتف مغناطيسية", qty: 64, sales: "12,800 دج", growth: "+24%" },
                      ].map((product, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-3">{product.name}</td>
                          <td className="text-center py-3">{product.qty}</td>
                          <td className="text-center py-3">{product.sales}</td>
                          <td className="text-center py-3 text-emerald-500">{product.growth}</td>
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
                    <BarChart4 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">تتبع أداء المبيعات بدقة</h3>
                    <p className="text-muted-foreground">
                      احصل على تحليل شامل لمبيعاتك حسب الفترة والفرع والمنتج والموظف، مع مقارنات بالفترات السابقة لقياس النمو.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "مبيعات حسب الفترة", desc: "تحليل يومي، أسبوعي، شهري، سنوي" },
                    { title: "مبيعات حسب الفرع", desc: "مقارنة أداء كل فرع" },
                    { title: "مبيعات حسب المنتج", desc: "المنتجات الأكثر والأقل مبيعاً" },
                    { title: "مبيعات حسب الموظف", desc: "قياس أداء البائعين" }
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
                    <PieChart className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">رؤى تحليلية للمخزون والربحية</h3>
                    <p className="text-muted-foreground">
                      تحليل دقيق لحركة المخزون وتكاليف المنتجات وهوامش الربح، مع تنبؤات ذكية وتوصيات لتحسين الأداء.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "تقارير المخزون", desc: "المنتجات الراكدة والأكثر دوراناً" },
                    { title: "تحليل الربحية", desc: "هوامش الربح حسب المنتج والفئة" },
                    { title: "مؤشرات الأداء", desc: "متوسط قيمة الطلب ومعدل التحويل" },
                    { title: "تنبؤات المبيعات", desc: "توقعات ذكية بناءً على البيانات السابقة" }
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
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">تقارير مجدولة وتصدير متعدد الصيغ</h3>
                    <p className="text-muted-foreground">
                      جدولة تقارير دورية وإرسالها تلقائياً بالبريد الإلكتروني، مع إمكانية تصديرها بصيغ متعددة مثل PDF وExcel.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "تقارير مجدولة", desc: "إرسال تلقائي للتقارير حسب جدول زمني" },
                    { title: "تصدير متعدد الصيغ", desc: "PDF، Excel، CSV، طباعة" },
                    { title: "لوحات تحكم مخصصة", desc: "تصميم عرض البيانات حسب احتياجاتك" },
                    { title: "مشاركة التقارير", desc: "إرسال التقارير للفريق والمدراء" }
                  ].map((item, index) => (
                    <div key={index} className="p-3 border border-border rounded-lg bg-card">
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <StoreIcon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold">رؤية شاملة لأعمالك بلمسة زر</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  استفد من القوة التحليلية لنظام بازار في تسليط الضوء على فرص النمو وتحسين الأداء. احصل على تقارير شاملة ودقيقة دون الحاجة لمعرفة تقنية متقدمة.
                </p>
                <Button className="w-full">استكشف قوة التقارير التحليلية</Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default POSReportsFeature;
