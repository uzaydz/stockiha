import { motion } from 'framer-motion';
import { 
  BarChart4, 
  LineChart, 
  PieChart, 
  Download, 
  Calendar, 
  Settings, 
  Users,
  DollarSign,
  Wallet,
  Smartphone,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const POSReportingFeature = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            تقارير و<span className="text-primary">تحليلات ذكية</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            قم بتحليل أداء متجرك باستخدام تقارير ورسوم بيانية متقدمة تساعدك على فهم سلوك العملاء واتخاذ قرارات تجارية أفضل.
          </p>
        </div>

        {/* وحدة التقارير الرئيسية */}
        <div className="grid md:grid-cols-2 gap-16 items-center mb-24">
          {/* جانب الصورة التوضيحية للوحة التحكم */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border shadow-xl overflow-hidden bg-card order-2 md:order-1"
          >
            {/* رأس لوحة التحكم */}
            <div className="border-b border-border px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BarChart4 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">لوحة التحكم</h3>
              </div>
              <div className="flex gap-3">
                <div className="text-xs bg-muted px-2.5 py-1.5 rounded flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>آخر 30 يوم</span>
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* محتوى لوحة التحكم */}
            <div className="p-6">
              {/* ملخص الأرقام */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  {
                    label: "إجمالي المبيعات",
                    value: "126,500 دج",
                    change: "+12.5%",
                    icon: <DollarSign className="h-5 w-5 text-primary" />,
                    positive: true
                  },
                  {
                    label: "عدد العملاء",
                    value: "287",
                    change: "+8.3%",
                    icon: <Users className="h-5 w-5 text-primary" />,
                    positive: true
                  },
                  {
                    label: "متوسط الشراء",
                    value: "2,300 دج",
                    change: "+3.7%",
                    icon: <Wallet className="h-5 w-5 text-primary" />,
                    positive: true
                  },
                  {
                    label: "معدل التحويل",
                    value: "73%",
                    change: "-2.1%",
                    icon: <TrendingUp className="h-5 w-5 text-primary" />,
                    positive: false
                  }
                ].map((item, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-4 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      {item.icon}
                    </div>
                    <div className="font-bold text-lg">{item.value}</div>
                    <div className={`text-xs mt-1 ${item.positive ? 'text-green-500' : 'text-red-500'}`}>
                      {item.change}
                    </div>
                  </div>
                ))}
              </div>

              {/* الرسم البياني */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium">تحليل المبيعات</h4>
                  <div className="flex gap-2">
                    <button className="text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground">يومي</button>
                    <button className="text-xs px-2.5 py-1 rounded text-muted-foreground">أسبوعي</button>
                    <button className="text-xs px-2.5 py-1 rounded text-muted-foreground">شهري</button>
                  </div>
                </div>
                
                <div className="h-64 border border-border rounded-lg p-4 flex flex-col">
                  {/* محاكاة للرسم البياني */}
                  <div className="flex gap-0.5 flex-grow items-end">
                    {[35, 45, 30, 65, 40, 80, 60, 75, 50, 70, 90, 55, 40, 60].map((height, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-gradient-to-t from-primary/50 to-primary/80 rounded-t"
                        style={{ height: `${height}%` }}
                      ></div>
                    ))}
                  </div>
                  
                  {/* محور X */}
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>1 أوت</span>
                    <span>7 أوت</span>
                    <span>14 أوت</span>
                    <span>اليوم</span>
                  </div>
                </div>
              </div>

              {/* أهم المنتجات */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium">أكثر المنتجات مبيعاً</h4>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <Download className="w-3.5 h-3.5 mr-1" /> تصدير
                  </Button>
                </div>
                
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/30 py-2.5 px-4 text-xs font-medium grid grid-cols-12 gap-2">
                    <div className="col-span-6">المنتج</div>
                    <div className="col-span-2 text-center">المبيعات</div>
                    <div className="col-span-2 text-center">الإيرادات</div>
                    <div className="col-span-2 text-center">النمو</div>
                  </div>
                  
                  {/* صفوف الجدول */}
                  {[
                    { 
                      name: "ساعة ذكية Galaxy",
                      sales: 28,
                      revenue: "336,000 دج",
                      growth: "+18%",
                      positive: true
                    },
                    { 
                      name: "هاتف سامسونج A53",
                      sales: 24,
                      revenue: "254,000 دج",
                      growth: "+12%",
                      positive: true
                    },
                    { 
                      name: "شاحن لاسلكي سريع",
                      sales: 19,
                      revenue: "95,000 دج",
                      growth: "-5%",
                      positive: false
                    },
                    { 
                      name: "سماعات بلوتوث JBL",
                      sales: 14,
                      revenue: "49,000 دج",
                      growth: "+7%",
                      positive: true
                    },
                  ].map((product, i) => (
                    <div 
                      key={i} 
                      className="py-3 px-4 text-sm grid grid-cols-12 gap-2 items-center border-t border-border"
                    >
                      <div className="col-span-6 font-medium">{product.name}</div>
                      <div className="col-span-2 text-center">{product.sales}</div>
                      <div className="col-span-2 text-center">{product.revenue}</div>
                      <div className={`col-span-2 text-center ${product.positive ? 'text-green-500' : 'text-red-500'}`}>
                        {product.growth}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* جانب الميزات */}
          <div className="space-y-10 order-1 md:order-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mt-1 flex-shrink-0">
                  <BarChart4 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">تقارير شاملة للمبيعات</h3>
                  <p className="text-muted-foreground">
                    احصل على تقارير مفصلة عن المبيعات حسب المنتج، الفئة، الفرع، الموظف، أو الفترة الزمنية، مع خيارات تصفية متقدمة.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {[
                      "تقارير يومية",
                      "تقارير أسبوعية",
                      "تقارير شهرية",
                      "تقارير مخصصة"
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span className="text-sm">{item}</span>
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
                  <PieChart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">تحليلات رسومية متقدمة</h3>
                  <p className="text-muted-foreground">
                    رؤية جميع البيانات بشكل رسومي لفهم أفضل للأنماط والاتجاهات، مع مخططات ورسوم بيانية تفاعلية سهلة الفهم.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {[
                      { label: "مخططات خطية", icon: <LineChart className="h-3.5 w-3.5" /> },
                      { label: "مخططات دائرية", icon: <PieChart className="h-3.5 w-3.5" /> },
                      { label: "مخططات أعمدة", icon: <BarChart4 className="h-3.5 w-3.5" /> },
                      { label: "مؤشرات أداء", icon: <TrendingUp className="h-3.5 w-3.5" /> }
                    ].map((item, i) => (
                      <div 
                        key={i} 
                        className="flex items-center gap-1.5 border border-border rounded-full px-3 py-1 bg-card text-xs"
                      >
                        {item.icon}
                        <span>{item.label}</span>
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
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">تقارير في أي وقت ومكان</h3>
                  <p className="text-muted-foreground">
                    الوصول إلى التقارير من أي جهاز، مع تطبيق محمول مخصص وإمكانية مشاركة التقارير وتصديرها بتنسيقات متعددة.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 mt-4">
                    {[
                      {
                        title: "تقارير عبر البريد الإلكتروني",
                        description: "استلم تقارير تلقائية على بريدك الإلكتروني يومياً أو أسبوعياً أو شهرياً"
                      },
                      {
                        title: "تنبيهات مخصصة",
                        description: "إعداد تنبيهات للحالات الخاصة مثل المبيعات العالية أو المنخفضة"
                      }
                    ].map((item, i) => (
                      <div key={i} className="p-3 border border-border rounded-lg bg-card">
                        <h4 className="font-medium text-sm">{item.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* قسم الميزات المتقدمة للتقارير */}
        <div>
          <h3 className="text-2xl font-bold text-center mb-12">
            تحليلات متقدمة لنمو متجرك
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Users className="h-8 w-8 text-primary" />,
                title: "تحليل سلوك العملاء",
                description: "فهم أنماط شراء عملائك وتحديد العملاء الأكثر قيمة وإنشاء برامج ولاء مستهدفة"
              },
              {
                icon: <Calendar className="h-8 w-8 text-primary" />,
                title: "تحليل الموسمية والاتجاهات",
                description: "تحديد الفترات الزمنية ذات الأداء الأفضل أو الأسوأ والتنبؤ بالمبيعات المستقبلية لتحسين المخزون"
              },
              {
                icon: <TrendingUp className="h-8 w-8 text-primary" />,
                title: "مؤشرات الأداء الرئيسية",
                description: "متابعة مؤشرات الأداء الرئيسية مثل متوسط قيمة الطلب ومعدل التحويل ونسبة العائد على الاستثمار"
              },
              {
                icon: <DollarSign className="h-8 w-8 text-primary" />,
                title: "تحليل الربحية",
                description: "تحديد المنتجات والفئات الأكثر ربحية والتكاليف التشغيلية لتحسين هوامش الربح"
              },
              {
                icon: <Wallet className="h-8 w-8 text-primary" />,
                title: "تحليل طرق الدفع",
                description: "متابعة وتحليل استخدام طرق الدفع المختلفة وتحسين عمليات الدفع لزيادة معدلات التحويل"
              },
              {
                icon: <Download className="h-8 w-8 text-primary" />,
                title: "تصدير وحفظ التقارير",
                description: "تصدير التقارير بتنسيقات PDF وExcel وCSV وجدولة تقارير منتظمة يتم إرسالها تلقائياً"
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
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5 mx-auto">
                  {feature.icon}
                </div>
                <h4 className="text-xl font-bold mb-3 text-center">{feature.title}</h4>
                <p className="text-muted-foreground text-center">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* دعوة للعمل */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <Button size="lg" className="rounded-full px-8">
            اكتشف جميع ميزات التقارير
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default POSReportingFeature; 