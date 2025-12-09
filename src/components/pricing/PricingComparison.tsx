import { motion } from 'framer-motion';
import { Check, Info, Star, Blocks, Crown, Diamond, Shield, Settings, Zap, Sparkles, Store, Truck, Wrench, Users, Bot, BarChart3, Gift } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SubscriptionPlan } from '@/types/subscription';
import { cn } from '@/lib/utils';

interface PricingComparisonProps {
  plans: SubscriptionPlan[];
}

// تصنيف المميزات الشاملة - جميعها متاحة في كل الخطط
const featureCategories = [
  {
    name: '🏪 إدارة نقاط البيع والمحل',
    icon: <Store className="h-4 w-4" />,
    features: [
      { name: 'العمل الهجين (Offline-First)', tooltip: 'استمرار البيع والعمليات حتى عند انقطاع الإنترنت، مع مزامنة تلقائية فور عودة الاتصال' },
      { name: 'واجهة بيع سريعة', tooltip: 'مصممة للشاشات اللمسية ولوحات المفاتيح، تدعم الباركود والبحث السريع' },
      { name: 'الفواتير المخصصة', tooltip: 'تصميم وطباعة فواتير (A4, A5, Ticket) بشعار المحل ومعلومات الضمان' },
      { name: 'إدارة المخزون الحي', tooltip: 'تتبع دقيق للكميات، تنبيهات انخفاض المخزون، وتعديل سريع للأسعار' },
      { name: 'الجرد والتسوية', tooltip: 'أدوات لتسوية المخزون (تالف، مسروق، هدايا) وجرد المخزون بسهولة' },
      { name: 'إدارة الديون (الكريدي)', tooltip: 'سجل كامل لديون العملاء والموردين مع تنبيهات وتواريخ الاستحقاق' },
      { name: 'حساب الزكاة', tooltip: 'أداة مدمجة لحساب زكاة التجارة بناءً على المخزون والأرباح' },
      { name: 'المصروفات', tooltip: 'تسجيل المصاريف اليومية (كهرباء، أكل، نقل) لخصمها من الأرباح الصافية' },
    ]
  },
  {
    name: '🌐 التجارة الإلكترونية والمزامنة',
    icon: <Blocks className="h-4 w-4" />,
    features: [
      { name: 'متجر إلكتروني فوري', tooltip: 'إنشاء موقع ويب كامل للمحل تلقائياً عند الاشتراك، يعرض منتجاتك وصورك' },
      { name: 'المزامنة الحقيقية (Real-Time)', tooltip: 'قاعدة بيانات واحدة؛ أي بيع في المحل ينقص من الموقع فوراً والعكس' },
      { name: 'اسم نطاق فرعي', tooltip: 'رابط خاص بمتجرك (store.stokiha.com) أو ربط دومين خاص' },
      { name: 'تتبع التسويق (Pixels)', tooltip: 'ربط جاهز مع Facebook Pixel و TikTok Pixel و Google Analytics لتتبع الإعلانات' },
      { name: 'سلة الشراء الذكية', tooltip: 'تجربة شراء سهلة للزبائن عبر الموبايل' },
    ]
  },
  {
    name: '🚚 التوصيل واللوجستيك',
    icon: <Truck className="h-4 w-4" />,
    features: [
      { name: 'ربط 30+ شركة توصيل', tooltip: 'تكامل (API Integration) مع ياليدين، إيكوز، Procolis، وشركات أخرى' },
      { name: 'إدارة الطلبيات', tooltip: 'تأكيد الطلبات، تغيير حالتها (قيد التجهيز، تم الشحن)، وإلغائها من شاشة واحدة' },
      { name: 'طباعة البورديرو', tooltip: 'طباعة ملصقات الشحن الرسمية لشركات التوصيل مباشرة من البرنامج' },
      { name: 'التتبع الآلي', tooltip: 'معرفة حالة الطرد (واصل، روتور، قيد التوزيع) دون مغادرة البرنامج' },
      { name: 'إدارة المرتجعات', tooltip: 'معالجة "الروتور" وإعادته للمخزون بشكل صحيح لتجنب الخسائر' },
    ]
  },
  {
    name: '🛠️ نظام الإصلاح',
    icon: <Wrench className="h-4 w-4" />,
    features: [
      { name: 'نظام التذاكر', tooltip: 'فتح ملف لكل جهاز يدخل للورشة برقم تسلسلي فريد' },
      { name: 'الملصقات المزدوجة', tooltip: 'طباعة ملصق صغير للجهاز (باركود) ووصل استلام للعميل' },
      { name: 'تحديث الحالة بالسكان', tooltip: 'الفني يمسح كود الجهاز لتغيير حالته (تم الإصلاح) فوراً' },
      { name: 'بوابة العميل', tooltip: 'رابط QR يسمح للعميل بمراقبة حالة جهازه وموقعه في الطابور أونلاين' },
      { name: 'الإشعارات الآلية', tooltip: 'إرسال رسالة جاهزية للعميل عند انتهاء الإصلاح' },
    ]
  },
  {
    name: '👥 إدارة الموظفين',
    icon: <Users className="h-4 w-4" />,
    features: [
      { name: 'الدخول الآمن (PIN)', tooltip: 'كود دخول سريع لكل موظف لتسجيل بداية ونهاية الوردية' },
      { name: 'صلاحيات مخصصة', tooltip: 'تحديد ما يمكن للموظف رؤيته (مثلاً: إخفاء سعر الشراء عن الكاشير)' },
      { name: 'توزيع العمل', tooltip: 'توزيع طلبيات الأونلاين تلقائياً (Round Robin) أو يدوياً على فريق التأكيد' },
      { name: 'تقارير الأداء', tooltip: 'معرفة مبيعات كل موظف، عدد ساعات عمله، والأخطاء التي ارتكبها' },
      { name: 'العمولات', tooltip: 'حساب عمولة الموظفين بناءً على المبيعات أو الطلبيات المؤكدة' },
    ]
  },
  {
    name: '🤖 الذكاء الاصطناعي',
    icon: <Bot className="h-4 w-4" />,
    features: [
      { name: 'المساعد الذكي (Sera)', tooltip: 'مساعد شات داخلي لتنفيذ المهام (تغيير سعر، استعلام عن رصيد) بالكتابة' },
      { name: 'التقارير الذكية', tooltip: 'إجابات فورية عن الأسئلة المالية (كم ربحت اليوم؟ كم باقي في المخزن؟)' },
      { name: 'التنبيهات الاستباقية', tooltip: 'تنبيهات عن المنتجات الراكدة أو التي قاربت على النفاد' },
    ]
  },
  {
    name: '📊 التقارير والتحليلات',
    icon: <BarChart3 className="h-4 w-4" />,
    features: [
      { name: 'لوحة القيادة', tooltip: 'نظرة عامة على أداء المحل (مبيعات اليوم، الطلبات المعلقة، الأرباح)' },
      { name: 'تقارير المبيعات', tooltip: 'تفاصيل المبيعات حسب المنتج، الفئة، الوقت، أو الموظف' },
      { name: 'تحليل الأرباح', tooltip: 'حساب صافي الربح بعد خصم تكلفة الشراء والمصاريف والروتور' },
      { name: 'تصدير البيانات', tooltip: 'إمكانية تصدير التقارير إلى Excel أو PDF' },
    ]
  },
  {
    name: '🎁 القيمة المضافة والدعم',
    icon: <Gift className="h-4 w-4" />,
    features: [
      { name: 'الدورات التدريبية', tooltip: '5 دورات حصرية مجانية (تجارة إلكترونية، تسويق رقمي، استخدام البرنامج)' },
      { name: 'الدعم المستمر', tooltip: 'لايف أسبوعي للمشتركين، دعم فني عبر التذاكر والشات' },
      { name: 'تحديثات سحابية', tooltip: 'تحديثات دورية للميزات دون الحاجة لتثبيت جديد' },
      { name: 'تعدد المنصات', tooltip: 'يعمل على Windows و Mac (وقريباً تطبيق موبايل للمدير)' },
    ]
  }
];

// ألوان حسب نوع الخطة - الخطط الجديدة
const getPlanColors = (code: string) => {
  switch (code) {
    case 'starter_v2':
      return {
        gradient: 'bg-gradient-to-r from-sky-500 to-blue-600',
        bg: 'bg-sky-50 dark:bg-sky-900/20',
        border: 'border-sky-200 dark:border-sky-800',
        text: 'text-sky-600 dark:text-sky-400',
        highlightBg: 'bg-sky-50/50 dark:bg-sky-900/10'
      };
    case 'growth_v2':
      return {
        gradient: 'bg-gradient-to-r from-indigo-500 to-purple-600',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        border: 'border-indigo-200 dark:border-indigo-800',
        text: 'text-indigo-600 dark:text-indigo-400',
        highlightBg: 'bg-indigo-50/50 dark:bg-indigo-900/10'
      };
    case 'business_v2':
      return {
        gradient: 'bg-gradient-to-r from-amber-500 to-orange-600',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-600 dark:text-amber-400',
        highlightBg: 'bg-amber-50/50 dark:bg-amber-900/10'
      };
    case 'enterprise_v2':
      return {
        gradient: 'bg-gradient-to-r from-purple-500 to-pink-600',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-600 dark:text-purple-400',
        highlightBg: 'bg-purple-50/50 dark:bg-purple-900/10'
      };
    case 'unlimited_v2':
      return {
        gradient: 'bg-gradient-to-r from-rose-500 to-red-600',
        bg: 'bg-rose-50 dark:bg-rose-900/20',
        border: 'border-rose-200 dark:border-rose-800',
        text: 'text-rose-600 dark:text-rose-400',
        highlightBg: 'bg-rose-50/50 dark:bg-rose-900/10'
      };
    default:
      return {
        gradient: 'bg-gradient-to-r from-gray-600 to-gray-500',
        bg: 'bg-gray-50 dark:bg-gray-900/20',
        border: 'border-gray-200 dark:border-gray-800',
        text: 'text-gray-600 dark:text-gray-400',
        highlightBg: 'bg-gray-50/50 dark:bg-gray-900/10'
      };
  }
};

// أيقونات الخطط
const getPlanIcon = (code: string) => {
  switch (code) {
    case 'starter_v2': return <Settings className="h-6 w-6" />;
    case 'growth_v2': return <Zap className="h-6 w-6" />;
    case 'business_v2': return <Crown className="h-6 w-6" />;
    case 'enterprise_v2': return <Diamond className="h-6 w-6" />;
    case 'unlimited_v2': return <Sparkles className="h-6 w-6" />;
    default: return <Settings className="h-6 w-6" />;
  }
};

// دالة تنسيق الحدود
const formatLimit = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '∞';
  return value.toLocaleString('ar-DZ');
};

const PricingComparison = ({ plans }: PricingComparisonProps) => {
  if (!plans || plans.length === 0) {
    return null;
  }

  // ترتيب الخطط حسب السعر
  const sortedPlans = [...plans].sort((a, b) => Number(a.monthly_price) - Number(b.monthly_price));

  return (
    <section className="relative py-20 overflow-hidden">
      {/* خلفية زخرفية */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-1/3 top-1/3 -z-10 -translate-x-1/3 blur-3xl">
          <div aria-hidden="true" className="aspect-[1155/678] w-[50.1875rem] bg-gradient-to-br from-[#80b5ff] to-[#9089fc] opacity-10 dark:opacity-5"></div>
        </div>
      </div>

      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            مقارنة تفصيلية بين الخطط
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
            جميع المميزات متاحة في كل الخطط - الاختلاف فقط في الحدود
          </p>

          {/* جدول مقارنة الحدود */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-200">📊 مقارنة الحدود</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-3 px-4 text-right font-semibold text-gray-700 dark:text-gray-300">الخطة</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-700 dark:text-gray-300">المنتجات</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-700 dark:text-gray-300">المستخدمين</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-700 dark:text-gray-300">نقاط البيع</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-700 dark:text-gray-300">الفروع</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-700 dark:text-gray-300">الشهري</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-700 dark:text-gray-300">السنوي</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlans.map((plan) => {
                    const colors = getPlanColors(plan.code);
                    return (
                      <tr key={plan.id} className={cn(
                        "border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                        plan.is_popular && "bg-indigo-50/50 dark:bg-indigo-900/10"
                      )}>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.bg)}>
                              <span className={colors.text}>{getPlanIcon(plan.code)}</span>
                            </div>
                            <div className="text-right">
                              <span className={cn("font-bold", colors.text)}>{plan.name}</span>
                              {plan.is_popular && (
                                <span className="mr-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                                  <Star className="h-3 w-3 fill-current" />
                                  الأكثر شعبية
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={cn("font-bold text-lg", colors.text)}>
                            {formatLimit(plan.limits?.max_products)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={cn("font-bold text-lg", colors.text)}>
                            {formatLimit(plan.limits?.max_users)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={cn("font-bold text-lg", colors.text)}>
                            {formatLimit(plan.limits?.max_pos)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={cn("font-bold text-lg", colors.text)}>
                            {formatLimit(plan.limits?.max_branches)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-bold text-gray-800 dark:text-gray-200">
                            {Number(plan.monthly_price).toLocaleString('ar-DZ')} دج
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {Number(plan.yearly_price).toLocaleString('ar-DZ')} دج
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* قائمة المميزات الموحدة */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">
              ✨ جميع المميزات متاحة في كل الخطط
            </h3>
            <p className="text-muted-foreground">40+ ميزة متكاملة لإدارة عملك بنجاح</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featureCategories.map((category, categoryIndex) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
                viewport={{ once: true }}
                className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-lg transition-shadow"
              >
                <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <span className="text-lg">{category.name}</span>
                </h4>
                <ul className="space-y-2">
                  {category.features.map((feature) => (
                    <li key={feature.name} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-gray-600 dark:text-gray-400 cursor-help hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                              {feature.name}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs p-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
                            <p className="text-sm">{feature.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingComparison;
