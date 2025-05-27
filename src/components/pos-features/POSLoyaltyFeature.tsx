import { motion } from 'framer-motion';
import { 
  Heart, 
  Gift, 
  Award, 
  BarChart2, 
  MessageSquare, 
  CreditCard, 
  Mail,
  Calendar,
  User,
  BadgePercent,
  Sparkles,
  Zap,
  Smartphone,
  Badge,
  History,
  Link,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const POSLoyaltyFeature = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            برنامج <span className="text-primary">ولاء متكامل</span> لعملائك
          </h2>
          <p className="text-lg text-muted-foreground">
            أنشئ برنامج ولاء قوي لمكافأة عملائك المخلصين وزيادة قيمة العميل على المدى الطويل مع تعزيز التكرار والنمو.
          </p>
        </div>

        {/* وحدة بطاقة العضوية */}
        <div className="grid md:grid-cols-2 gap-16 items-center mb-24">
          {/* جانب النص والميزات */}
          <div className="space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mt-1 flex-shrink-0">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">مكافآت مخصصة متعددة</h3>
                  <p className="text-muted-foreground">
                    منح العملاء نقاط على كل عملية شراء، مع مكافآت مخصصة مثل الخصومات، الهدايا المجانية، والعروض الحصرية.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {[
                      "خصومات على المشتريات",
                      "منتجات مجانية",
                      "عروض خاصة",
                      "دعوات لفعاليات حصرية"
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
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">مستويات عضوية متدرجة</h3>
                  <p className="text-muted-foreground">
                    تصميم نظام مستويات متعدد (برونزي، فضي، ذهبي، ماسي) مع مزايا متزايدة لكل مستوى لتشجيع العملاء على الشراء المتكرر.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {[
                      { name: "برونزي", color: "bg-amber-700" },
                      { name: "فضي", color: "bg-zinc-400" },
                      { name: "ذهبي", color: "bg-amber-400" },
                      { name: "ماسي", color: "bg-sky-300" }
                    ].map((level, i) => (
                      <div key={i} className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5 bg-card text-sm">
                        <div className={`w-3 h-3 rounded-full ${level.color}`}></div>
                        <span>{level.name}</span>
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
                  <BarChart2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">تحليلات وإحصائيات شاملة</h3>
                  <p className="text-muted-foreground">
                    مراقبة أداء برنامج الولاء، ومعرفة العملاء الأكثر نشاطاً، وقياس تأثير البرنامج على المبيعات والاحتفاظ بالعملاء.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 mt-4">
                    {[
                      {
                        title: "معدل الاحتفاظ بالعملاء",
                        value: "87%",
                        trend: "+12%",
                        positive: true
                      },
                      {
                        title: "متوسط قيمة العميل",
                        value: "28,500 دج",
                        trend: "+23%",
                        positive: true
                      }
                    ].map((stat, i) => (
                      <div key={i} className="p-3 border border-border rounded-lg bg-card">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-sm">{stat.title}</h4>
                          <span className={`text-xs ${stat.positive ? 'text-green-500' : 'text-red-500'}`}>
                            {stat.trend}
                          </span>
                        </div>
                        <p className="font-bold text-lg mt-1">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* جانب بطاقة العضوية */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* خلفية زخرفية */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl -z-10 blur-2xl opacity-70"></div>
            
            {/* بطاقة العضوية الافتراضية */}
            <div className="relative w-full max-w-md mx-auto">
              <div className="absolute top-10 right-10 w-72 h-44 bg-gradient-to-br from-amber-300 to-amber-500 rounded-xl rotate-6 shadow-lg"></div>
              
              <div className="relative w-full max-w-md mx-auto bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 rounded-xl shadow-xl border border-zinc-700">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-zinc-400 text-sm">بطاقة عضوية</div>
                    <div className="text-xl font-bold text-white mt-1">متجر التقنية</div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-400 text-amber-950 px-2 py-1 rounded text-xs font-semibold">
                    <Sparkles className="w-3 h-3" />
                    <span>ذهبي</span>
                  </div>
                </div>
                
                <div className="mt-10 flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">أحمد محمود</div>
                    <div className="text-zinc-400 text-sm">عضو منذ: 2023/05/12</div>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center justify-between">
                  <div>
                    <div className="text-zinc-400 text-xs">رصيد النقاط</div>
                    <div className="text-white text-xl font-bold">3,750</div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-xs">المستوى التالي</div>
                    <div className="w-32 h-2 bg-zinc-700 rounded-full mt-1">
                      <div className="w-3/4 h-full bg-primary rounded-full"></div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-between text-white">
                  <div className="text-center">
                    <BadgePercent className="w-5 h-5 mx-auto mb-1" />
                    <div className="text-xs">خصم 15%</div>
                  </div>
                  <div className="text-center">
                    <Gift className="w-5 h-5 mx-auto mb-1" />
                    <div className="text-xs">3 هدايا</div>
                  </div>
                  <div className="text-center">
                    <Calendar className="w-5 h-5 mx-auto mb-1" />
                    <div className="text-xs">عرض شهري</div>
                  </div>
                </div>
                
                <div className="mt-8 text-center">
                  <div className="border-t border-zinc-700 pt-3">
                    <div className="text-xs text-zinc-400">رمز العضوية</div>
                    <div className="text-white font-mono tracking-widest mt-1">GOLD-7349-8221</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* تطبيق الولاء */}
            <div className="max-w-[200px] bg-card border border-border rounded-xl overflow-hidden shadow-lg absolute -bottom-6 -right-6">
              <div className="bg-muted p-2 text-center">
                <Smartphone className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs font-medium">تطبيق الولاء</div>
              </div>
              <div className="p-3 space-y-2">
                {[
                  { icon: <Gift className="w-4 h-4" />, label: "المكافآت" },
                  { icon: <Badge className="w-4 h-4" />, label: "المستوى" },
                  { icon: <History className="w-4 h-4" />, label: "السجل" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* منصة التسويق المتكاملة */}
        <div className="mb-24">
          <h3 className="text-2xl font-bold text-center mb-12">
            تسويق ذكي <span className="text-primary">لبرنامج الولاء</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-lg p-6 md:col-span-2"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <Mail className="h-8 w-8 text-primary mb-3" />
                  <h4 className="text-xl font-bold mb-2">حملات ترويجية متكاملة</h4>
                  <p className="text-muted-foreground">
                    إنشاء وإدارة حملات ترويجية مخصصة لعملائك حسب سلوكهم الشرائي وتفضيلاتهم
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 border border-border rounded-full px-3 py-1 text-xs">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>معدل فتح 42%</span>
                  </div>
                  <div className="flex items-center gap-2 border border-border rounded-full px-3 py-1 text-xs">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span>معدل تحويل 18%</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: <Mail className="h-5 w-5 text-primary" />,
                    title: "البريد الإلكتروني",
                    description: "حملات بريدية مخصصة بناءً على سلوك العميل وتاريخ مشترياته"
                  },
                  {
                    icon: <MessageSquare className="h-5 w-5 text-primary" />,
                    title: "الرسائل النصية",
                    description: "إشعارات فورية بالعروض والمكافآت المتاحة عبر الرسائل النصية"
                  },
                  {
                    icon: <Zap className="h-5 w-5 text-primary" />,
                    title: "إشعارات التطبيق",
                    description: "تنبيهات في الوقت الحقيقي عبر تطبيق الهاتف لتفعيل المكافآت"
                  }
                ].map((channel, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 bg-background">
                    <div className="flex items-center gap-2 mb-3">
                      {channel.icon}
                      <h5 className="font-medium">{channel.title}</h5>
                    </div>
                    <p className="text-xs text-muted-foreground">{channel.description}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h5 className="font-medium">نموذج حملة ترويجية</h5>
                  </div>
                  <div className="p-4 flex gap-4 items-start">
                    <div className="flex-shrink-0 bg-primary/10 rounded-lg p-3">
                      <Gift className="h-10 w-10 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">عيد ميلاد سعيد أحمد! 🎂</div>
                      <div className="text-xs text-muted-foreground mb-3">
                        بمناسبة عيد ميلادك، استمتع بخصم خاص 25% على أي منتج من اختيارك!
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="default" className="text-xs h-8">
                          استخدم الآن
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-8">
                          عرض التفاصيل
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-lg p-6"
            >
              <CreditCard className="h-8 w-8 text-primary mb-3" />
              <h4 className="text-xl font-bold mb-2">برامج الإحالة</h4>
              <p className="text-muted-foreground mb-6">
                مكافأة العملاء الحاليين عند إحالة أصدقائهم، مما يساعد على توسيع قاعدة عملائك بتكلفة أقل
              </p>
              
              <div className="space-y-4">
                <div className="bg-muted/40 rounded-lg p-4 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">مكافأة المُحيل</div>
                    <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      500 نقطة
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    يحصل العميل على 500 نقطة عند تسجيل صديق جديد وإجراء أول عملية شراء
                  </p>
                </div>
                
                <div className="bg-muted/40 rounded-lg p-4 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">مكافأة الصديق</div>
                    <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      خصم 15%
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    يحصل الصديق المُحال على خصم 15% على أول عملية شراء له
                  </p>
                </div>
                
                <div className="p-4 border border-dashed border-primary/60 rounded-lg bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">كود الإحالة الخاص بك</div>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      نسخ
                    </Button>
                  </div>
                  <div className="mt-2 bg-background p-2 rounded font-mono text-center tracking-wider">
                    AHMED25
                  </div>
                  
                  <div className="mt-4 flex gap-3 justify-center">
                    <Button size="sm" variant="outline" className="h-8 text-xs rounded-full px-3">
                      <Mail className="w-3.5 h-3.5 mr-1" /> البريد
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs rounded-full px-3">
                      <MessageSquare className="w-3.5 h-3.5 mr-1" /> الرسائل
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs rounded-full px-3">
                      <Link className="w-3.5 h-3.5 mr-1" /> رابط
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ميزات إضافية */}
        <div>
          <h3 className="text-2xl font-bold text-center mb-12">
            ميزات <span className="text-primary">إضافية</span> لبرنامج الولاء
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Calendar className="h-8 w-8 text-primary" />,
                title: "عروض المناسبات الخاصة",
                description: "عروض خاصة في أعياد الميلاد والمناسبات الهامة لزيادة ارتباط العملاء بعلامتك التجارية"
              },
              {
                icon: <Heart className="h-8 w-8 text-primary" />,
                title: "قائمة المفضلة",
                description: "السماح للعملاء بإنشاء قوائم المنتجات المفضلة مع إشعارهم بالعروض الخاصة عليها"
              },
              {
                icon: <BadgePercent className="h-8 w-8 text-primary" />,
                title: "خصومات فورية",
                description: "تقديم خصومات فورية بدلاً من تجميع النقاط للعملاء الذين يفضلون المكافآت السريعة"
              },
              {
                icon: <Zap className="h-8 w-8 text-primary" />,
                title: "مكافآت لحظية",
                description: "مفاجأة العملاء بمكافآت لحظية عند الوصول لمبلغ معين أو عدد معين من الزيارات"
              },
              {
                icon: <MessageSquare className="h-8 w-8 text-primary" />,
                title: "استطلاعات رأي العملاء",
                description: "جمع آراء العملاء مع منحهم نقاط إضافية مقابل المشاركة في الاستطلاعات"
              },
              {
                icon: <Users className="h-8 w-8 text-primary" />,
                title: "برامج ولاء للشركات",
                description: "برامج ولاء خاصة للعملاء من الشركات والمؤسسات مع مزايا ومكافآت مخصصة"
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
            ابدأ برنامج الولاء اليوم
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default POSLoyaltyFeature;
