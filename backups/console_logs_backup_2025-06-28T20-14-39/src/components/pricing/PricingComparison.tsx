import { motion } from 'framer-motion';
import { Check, HelpCircle, X, Zap, Info, Star, Blocks, Crown, Diamond, AlertCircle, Shield, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

// تصنيف الميزات للعرض في الجدول
const featureCategories = [
  {
    name: 'نقاط البيع',
    icon: <Zap className="h-4 w-4" />,
    features: [
      { name: 'إدارة المبيعات', tooltip: 'إدارة جميع المبيعات وتتبع الفواتير' },
      { name: 'معالجة الدفع', tooltip: 'قبول طرق دفع متعددة' },
      { name: 'إدارة العملاء', tooltip: 'إمكانية إدارة قاعدة بيانات العملاء' },
      { name: 'المبيعات عبر الإنترنت', tooltip: 'بيع منتجاتك عبر الإنترنت' },
    ]
  },
  {
    name: 'إدارة المخزون',
    icon: <Blocks className="h-4 w-4" />,
    features: [
      { name: 'تتبع المخزون', tooltip: 'متابعة مستويات المخزون ومراقبتها' },
      { name: 'إشعارات انخفاض المخزون', tooltip: 'تنبيهات عندما تصل المنتجات إلى عتبة معينة' },
      { name: 'إدارة المنتجات', tooltip: 'إضافة وتعديل وإدارة المنتجات' },
      { name: 'تحليلات المخزون', tooltip: 'تقارير مفصلة حول أداء المخزون' },
    ]
  },
  {
    name: 'الإدارة والتقارير',
    icon: <Crown className="h-4 w-4" />,
    features: [
      { name: 'لوحة المعلومات التحليلية', tooltip: 'لوحة معلومات تفاعلية لعرض مؤشرات الأداء الرئيسية' },
      { name: 'تقارير المبيعات', tooltip: 'تقارير مفصلة عن المبيعات' },
      { name: 'إدارة المستخدمين', tooltip: 'إمكانية إدارة المستخدمين وصلاحياتهم' },
      { name: 'تصدير التقارير', tooltip: 'تصدير التقارير بتنسيقات متعددة' },
    ]
  },
  {
    name: 'المتجر الإلكتروني',
    icon: <Diamond className="h-4 w-4" />,
    features: [
      { name: 'صفحة المنتجات', tooltip: 'صفحة عرض المنتجات المخصصة' },
      { name: 'سلة التسوق', tooltip: 'سلة تسوق متكاملة' },
      { name: 'بوابات الدفع', tooltip: 'دعم بوابات دفع متعددة' },
      { name: 'تخصيص المتجر', tooltip: 'إمكانية تخصيص مظهر المتجر' },
    ]
  },
  {
    name: 'الدعم الفني',
    icon: <Shield className="h-4 w-4" />,
    features: [
      { name: 'دعم العملاء', tooltip: 'مستوى وسرعة الدعم المقدم' },
      { name: 'التدريب', tooltip: 'خدمات تدريب للمستخدمين' },
      { name: 'التخصيص', tooltip: 'إمكانية تخصيص النظام حسب احتياجاتك' },
      { name: 'ترقيات النظام', tooltip: 'الحصول على آخر تحديثات النظام' },
    ]
  }
];

// تحديد حالة الميزة لكل خطة
const getFeatureStatus = (plan: SubscriptionPlan, featureName: string): 'included' | 'limited' | 'excluded' => {
  if (plan.code === 'basic') {
    if (['تحليلات المخزون', 'لوحة المعلومات التحليلية', 'تصدير التقارير', 'المبيعات عبر الإنترنت', 'تخصيص المتجر', 'التخصيص'].includes(featureName)) {
      return 'excluded';
    }
    if (['بوابات الدفع', 'إدارة المستخدمين', 'تقارير المبيعات', 'سلة التسوق', 'صفحة المنتجات', 'التدريب'].includes(featureName)) {
      return 'limited';
    }
  }
  
  if (plan.code === 'premium') {
    if (['التخصيص'].includes(featureName)) {
      return 'limited';
    }
  }
  
  return 'included';
};

// ألوان حسب نوع الخطة
const getPlanColors = (code: string) => {
  switch (code) {
    case 'basic':
      return {
        gradient: 'bg-gradient-to-r from-blue-600 to-cyan-500',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-600 dark:text-blue-400',
        highlightBg: 'bg-blue-50/50 dark:bg-blue-900/10'
      };
    case 'premium':
      return {
        gradient: 'bg-gradient-to-r from-indigo-600 to-purple-500',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        border: 'border-indigo-200 dark:border-indigo-800',
        text: 'text-indigo-600 dark:text-indigo-400',
        highlightBg: 'bg-indigo-50/50 dark:bg-indigo-900/10'
      };
    case 'enterprise':
      return {
        gradient: 'bg-gradient-to-r from-purple-600 to-pink-500',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-600 dark:text-purple-400',
        highlightBg: 'bg-purple-50/50 dark:bg-purple-900/10'
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
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            اكتشف جميع الميزات المتاحة في كل خطة واختر ما يناسب احتياجات عملك
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="overflow-x-auto"
        >
          <div className="min-w-max pb-4">
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[280px_repeat(auto-fit,minmax(180px,1fr))]">
                {/* العنوان الرئيسي */}
                <div className="p-6 border-r border-gray-200 dark:border-gray-800">
                  <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                    الميزات
                  </h3>
                </div>
                
                {/* عناوين الخطط */}
                {sortedPlans.map((plan) => {
                  const colors = getPlanColors(plan.code);
                  return (
                    <div 
                      key={plan.id} 
                      className={cn(
                        "p-6 text-center",
                        plan.is_popular ? `${colors.highlightBg} relative` : ""
                      )}
                    >
                      {plan.is_popular && (
                        <div className="absolute -top-3 right-0 left-0 flex justify-center">
                          <div className={`${colors.gradient} text-white px-4 py-1 rounded-full text-sm font-medium shadow-md transform-gpu flex items-center gap-1.5`}>
                            <Star className="h-3.5 w-3.5 fill-white" />
                            <span>الأكثر شيوعاً</span>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col items-center">
                        <span className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${colors.bg} mb-3`}>
                          {plan.code === 'basic' ? (
                            <Settings className={`h-6 w-6 ${colors.text}`} />
                          ) : plan.code === 'premium' ? (
                            <Crown className={`h-6 w-6 ${colors.text}`} />
                          ) : (
                            <Diamond className={`h-6 w-6 ${colors.text}`} />
                          )}
                        </span>
                        <h3 className={`text-lg font-bold ${colors.text}`}>{plan.name}</h3>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* محتوى الجدول - التصنيفات والميزات */}
            <div className="mt-4 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
              {featureCategories.map((category, categoryIndex) => (
                <div key={category.name} className={categoryIndex === 0 ? "" : "border-t border-gray-200 dark:border-gray-800"}>
                  {/* عنوان التصنيف */}
                  <div className="grid grid-cols-[280px_repeat(auto-fit,minmax(180px,1fr))] bg-gray-50 dark:bg-gray-900/70">
                    <div className="py-4 px-6 font-medium border-r border-gray-200 dark:border-gray-800 flex items-center gap-2.5">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        {category.icon}
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{category.name}</span>
                    </div>
                    {sortedPlans.map((plan) => {
                      const colors = getPlanColors(plan.code);
                      return (
                        <div key={plan.id} className={cn(
                          "p-4 text-center",
                          plan.is_popular ? colors.highlightBg : ""
                        )}></div>
                      );
                    })}
                  </div>
                  
                  {/* الميزات ضمن التصنيف */}
                  {category.features.map((feature, featureIndex) => (
                    <div 
                      key={feature.name} 
                      className={cn(
                        "grid grid-cols-[280px_repeat(auto-fit,minmax(180px,1fr))] hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors",
                        featureIndex !== category.features.length - 1 ? "border-b border-gray-100 dark:border-gray-800/50" : ""
                      )}
                    >
                      <div className="py-5 px-6 border-r border-gray-200 dark:border-gray-800 flex items-center">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{feature.name}</span>
                        {feature.tooltip && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="mr-2 cursor-help text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transition-colors">
                                  <Info className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs p-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
                                <p className="text-sm">{feature.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      
                      {sortedPlans.map((plan) => {
                        const status = getFeatureStatus(plan, feature.name);
                        const colors = getPlanColors(plan.code);
                        
                        return (
                          <div 
                            key={plan.id} 
                            className={cn(
                              "py-5 px-6 text-center flex items-center justify-center",
                              plan.is_popular ? colors.highlightBg : ""
                            )}
                          >
                            {status === 'included' ? (
                              <div className={`w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center shadow-sm ${colors.border}`}>
                                <Check className={`h-4 w-4 ${colors.text}`} />
                              </div>
                            ) : status === 'limited' ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shadow-sm border border-amber-200 dark:border-amber-800 cursor-help">
                                      <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="p-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
                                    <p className="text-sm">متوفر بشكل محدود في هذه الخطة</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-700">
                                <X className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingComparison;
