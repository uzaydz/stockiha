import { motion } from 'framer-motion';
import { 
  LineChart, 
  Brain, 
  BarChart4, 
  Target, 
  Lightbulb, 
  TrendingUp,
  CalendarClock,
  HandCoins
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const PredictiveAnalyticsFeature = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-primary">التحليلات التنبؤية</span> والذكاء الاصطناعي
          </h2>
          <p className="text-lg text-muted-foreground">
            استفد من قوة الذكاء الاصطناعي والتعلم الآلي للتنبؤ بالاتجاهات المستقبلية
            واكتشاف الفرص الخفية وتحسين الأداء العام للأعمال.
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
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">التنبؤ بالمبيعات والإيرادات</h3>
                    <p className="text-muted-foreground">
                      نماذج تنبؤية متقدمة للمبيعات والإيرادات المستقبلية مبنية على البيانات التاريخية
                      والعوامل الموسمية واتجاهات السوق.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "توقعات المبيعات", desc: "تنبؤات دقيقة بحجم المبيعات المستقبلية" },
                    { title: "تحليل الموسمية", desc: "تحديد الأنماط الموسمية والدورية" },
                    { title: "سيناريوهات متعددة", desc: "محاكاة سيناريوهات مبيعات مختلفة" },
                    { title: "دقة التنبؤات", desc: "قياس ومراقبة دقة التوقعات" }
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
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">تحليل سلوك العملاء بالذكاء الاصطناعي</h3>
                    <p className="text-muted-foreground">
                      فهم عميق لسلوك العملاء وتفضيلاتهم باستخدام تقنيات الذكاء الاصطناعي،
                      مع توقع احتياجاتهم المستقبلية وتحسين استراتيجيات التسويق.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "تقسيم العملاء", desc: "تصنيف العملاء إلى شرائح معنوية" },
                    { title: "توقع تسرب العملاء", desc: "التنبؤ بالعملاء المعرضين للتسرب" },
                    { title: "تحليل سلة المشتريات", desc: "اكتشاف المنتجات المتلازمة" },
                    { title: "توصيات مخصصة", desc: "اقتراحات منتجات مناسبة للعملاء" }
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
                    <Lightbulb className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">اكتشاف الرؤى وتحسين الأداء</h3>
                    <p className="text-muted-foreground">
                      اكتشاف تلقائي للاتجاهات والأنماط والعلاقات الخفية في البيانات،
                      مع توصيات ذكية لتحسين أداء الأعمال وزيادة الربحية.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "اكتشاف الأنماط", desc: "تحديد العلاقات الخفية في البيانات" },
                    { title: "تحليل الانحرافات", desc: "كشف التغيرات غير الاعتيادية" },
                    { title: "تحسين التسعير", desc: "توصيات لاستراتيجية تسعير مثالية" },
                    { title: "تحسين المخزون", desc: "توصيات لإدارة المخزون بكفاءة" }
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
          
          {/* واجهة التحليلات التنبؤية */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="bg-card rounded-2xl border border-border shadow-lg p-6 overflow-hidden">
              {/* شريط الأدوات العلوي */}
              <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">التحليلات التنبؤية</h3>
                </div>
                <div className="flex gap-2">
                  <select className="bg-muted/50 text-xs rounded-md border border-border px-2 py-1.5">
                    <option>الربع القادم</option>
                    <option>6 أشهر قادمة</option>
                    <option>سنة قادمة</option>
                  </select>
                </div>
              </div>

              {/* مؤشرات التنبؤات الرئيسية */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { icon: <HandCoins className="h-4 w-4 text-emerald-500" />, title: "المبيعات المتوقعة", value: "1.65M دج", change: "+18.3%" },
                  { icon: <Target className="h-4 w-4 text-indigo-500" />, title: "معدل النمو", value: "23.7%", change: "+4.2%" },
                  { icon: <BarChart4 className="h-4 w-4 text-blue-500" />, title: "دقة التنبؤ", value: "92.4%", change: "+1.8%" },
                  { icon: <CalendarClock className="h-4 w-4 text-amber-500" />, title: "فترة التنبؤ", value: "3 أشهر", change: "" },
                ].map((stat, i) => (
                  <div key={i} className="bg-background border border-border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs text-muted-foreground">{stat.title}</div>
                      <div className="w-6 h-6 bg-muted/50 rounded-full flex items-center justify-center">
                        {stat.icon}
                      </div>
                    </div>
                    <div className="font-semibold">{stat.value}</div>
                    {stat.change && <div className="text-xs text-emerald-500 mt-1">{stat.change}</div>}
                  </div>
                ))}
              </div>

              {/* رسم بياني للتنبؤ بالمبيعات */}
              <div className="bg-muted/30 rounded-lg border border-border p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium">تنبؤ المبيعات للأشهر القادمة</h4>
                  <div className="flex gap-2 items-center">
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                      <span className="text-xs">بيانات فعلية</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-xs">تنبؤات</span>
                    </span>
                  </div>
                </div>
                
                {/* محاكاة للرسم البياني التنبؤي */}
                <div className="h-[220px] relative">
                  {/* خطوط الشبكة */}
                  {[20, 40, 60, 80, 100].map((value, i) => (
                    <div 
                      key={i} 
                      className="absolute w-full border-t border-border/30"
                      style={{ top: `${100 - value}%` }}
                    ></div>
                  ))}
                  
                  {/* الخط الفاصل بين البيانات الفعلية والتنبؤات */}
                  <div className="absolute top-0 bottom-0 w-px bg-border/60 border-dashed" style={{ left: '40%' }}></div>
                  <div className="absolute text-xs text-muted-foreground" style={{ top: '5px', left: 'calc(40% - 30px)' }}>
                    اليوم
                  </div>
                  
                  {/* خط البيانات الفعلية والتنبؤات */}
                  <svg className="absolute inset-0 h-full w-full">
                    {/* البيانات الفعلية */}
                    <path 
                      d={`M0,${100 - 40} ${Array.from({ length: 5 }).map((_, i) => {
                        const height = 40 + Math.sin(i / 2) * 15 + Math.random() * 10;
                        return `L${(i + 1) * (40 / 5)},${100 - height}`;
                      }).join(' ')}`}
                      fill="none"
                      strokeWidth="2"
                      stroke="hsl(var(--indigo-500))"
                      strokeLinecap="round"
                    />
                    
                    {/* التنبؤات */}
                    <path 
                      d={`M40,${100 - 65} ${Array.from({ length: 6 }).map((_, i) => {
                        const height = 65 + Math.sin(i / 2) * 20 + Math.random() * 5;
                        return `L${40 + (i + 1) * (60 / 6)},${100 - height}`;
                      }).join(' ')}`}
                      fill="none"
                      strokeWidth="2"
                      stroke="hsl(var(--emerald-500))"
                      strokeLinecap="round"
                      strokeDasharray="4 2"
                    />
                    
                    {/* نقطة التقاء البيانات الفعلية والتنبؤات */}
                    <circle cx="40" cy={100 - 65} r="3" fill="hsl(var(--background))" stroke="hsl(var(--emerald-500))" strokeWidth="2" />
                  </svg>
                  
                  {/* منطقة الثقة حول التنبؤات */}
                  <svg className="absolute inset-0 h-full w-full">
                    <defs>
                      <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--emerald-500))" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="hsl(var(--emerald-500))" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    <path 
                      d={`
                        M40,${100 - 65 + 10} 
                        ${Array.from({ length: 6 }).map((_, i) => {
                          const height = 65 + Math.sin(i / 2) * 20 + Math.random() * 5;
                          return `L${40 + (i + 1) * (60 / 6)},${100 - height + 10}`;
                        }).join(' ')}
                        L100,${100 - 75 + 10}
                        L100,${100 - 75 - 10}
                        ${Array.from({ length: 6 }).reverse().map((_, i) => {
                          const height = 65 + Math.sin((5 - i) / 2) * 20 + Math.random() * 5;
                          return `L${40 + (6 - i) * (60 / 6)},${100 - height - 10}`;
                        }).join(' ')}
                        L40,${100 - 65 - 10}
                        Z
                      `}
                      fill="url(#confidenceGradient)"
                    />
                  </svg>
                  
                  {/* محور س */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 pt-2 text-xs text-muted-foreground">
                    {["3 أشهر سابقة", "اليوم", "3 أشهر قادمة"].map((label, i) => (
                      <div key={i} style={{ left: `${i * 40}%` }}>{label}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* تحليل العملاء والتوصيات */}
              <div className="grid grid-cols-1 gap-6">
                {/* تقسيم العملاء وتنبؤات التسرب */}
                <div className="bg-muted/30 rounded-lg border border-border p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-medium">توقعات سلوك العملاء</h4>
                    <Button variant="ghost" size="sm" className="text-xs">
                      عرض التفاصيل
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* تقسيم العملاء */}
                    <div>
                      <div className="text-sm mb-2">تقسيم العملاء المتوقع (الربع القادم)</div>
                      <div className="flex h-6 rounded-md overflow-hidden mb-1">
                        {[
                          { label: "عملاء نشطون", percentage: 45, color: "bg-emerald-500" },
                          { label: "عملاء جدد", percentage: 30, color: "bg-blue-500" },
                          { label: "عملاء متراجعون", percentage: 15, color: "bg-amber-500" },
                          { label: "عملاء معرضون للتسرب", percentage: 10, color: "bg-red-500" },
                        ].map((segment, i) => (
                          <div 
                            key={i} 
                            className={`${segment.color} h-full`}
                            style={{ width: `${segment.percentage}%` }}
                            title={`${segment.label}: ${segment.percentage}%`}
                          ></div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs mt-2">
                        {[
                          { label: "عملاء نشطون", percentage: 45, color: "bg-emerald-500" },
                          { label: "عملاء جدد", percentage: 30, color: "bg-blue-500" },
                          { label: "عملاء متراجعون", percentage: 15, color: "bg-amber-500" },
                          { label: "عملاء معرضون للتسرب", percentage: 10, color: "bg-red-500" },
                        ].map((segment, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <div className={`w-3 h-3 rounded-full ${segment.color}`}></div>
                            <span>{segment.label} ({segment.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* توصيات العملاء */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="text-sm mb-3">توصيات لتحسين ولاء العملاء</div>
                      <ul className="space-y-2 text-xs">
                        <li className="flex items-start gap-2">
                          <div className="w-4 h-4 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                          </div>
                          <span>تقديم عروض خاصة للعملاء الأكثر عرضة للتسرب (10% من العملاء)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-4 h-4 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                          </div>
                          <span>زيادة التواصل مع شريحة العملاء المتراجعين لفهم احتياجاتهم</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-4 h-4 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                          </div>
                          <span>تطوير برنامج ولاء للمحافظة على العملاء النشطين وزيادة مشترياتهم</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PredictiveAnalyticsFeature;
