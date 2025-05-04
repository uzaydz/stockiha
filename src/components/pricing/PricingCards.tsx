import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles, X, Zap, Shield, BarChart4, Users, Settings, ArrowRight, Crown, Diamond, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SubscriptionPlan } from '@/types/subscription';

interface PricingCardsProps {
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: string | null;
}

// أيقونات وألوان حسب نوع الخطة
const planDetails = {
  basic: {
    icon: <Settings className="h-6 w-6" />,
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-cyan-500',
    bgClass: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
    borderClass: 'border-blue-200 dark:border-blue-800',
    shadowClass: 'shadow-blue-500/10',
    iconClass: 'text-blue-600 dark:text-blue-400'
  },
  premium: {
    icon: <Crown className="h-6 w-6" />,
    gradientFrom: 'from-indigo-600',
    gradientTo: 'to-purple-500',
    bgClass: 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20',
    borderClass: 'border-indigo-200 dark:border-indigo-800',
    shadowClass: 'shadow-indigo-500/10',
    iconClass: 'text-indigo-600 dark:text-indigo-400'
  },
  enterprise: {
    icon: <Diamond className="h-6 w-6" />,
    gradientFrom: 'from-purple-600',
    gradientTo: 'to-pink-500',
    bgClass: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20',
    borderClass: 'border-purple-200 dark:border-purple-800',
    shadowClass: 'shadow-purple-500/10',
    iconClass: 'text-purple-600 dark:text-purple-400'
  }
};

const PricingCards = ({ plans, isLoading, error }: PricingCardsProps) => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // حساب النسبة المئوية للتوفير عند الدفع السنوي
  const calculateSavings = (monthlyPrice: number, yearlyPrice: number) => {
    if (monthlyPrice === 0) return 0;
    const monthlyTotal = monthlyPrice * 12;
    const savings = ((monthlyTotal - yearlyPrice) / monthlyTotal) * 100;
    return Math.round(savings);
  };

  // تنسيق السعر
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  if (error) {
    return (
      <section className="py-12">
        <div className="container px-4 mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-6 rounded-lg text-center backdrop-blur-sm border border-red-100 dark:border-red-900">
            <p className="font-medium">{error}</p>
            <p className="mt-2 text-sm">يرجى المحاولة مرة أخرى لاحقاً أو التواصل مع فريق الدعم الفني.</p>
          </div>
        </div>
      </section>
    );
  }

  // استخراج قيمة التوفير القصوى للدفع السنوي
  const maxSavings = plans.length > 0 
    ? Math.max(...plans.map(plan => 
      calculateSavings(Number(plan.monthly_price), Number(plan.yearly_price))
    ))
    : 17;

  return (
    <section className="relative py-20 overflow-hidden">
      {/* خلفية زخرفية */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl xl:translate-x-0">
          <div aria-hidden="true" className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-10 dark:opacity-5"></div>
        </div>
        <div className="absolute right-0 bottom-0 -z-10 transform-gpu blur-3xl">
          <div aria-hidden="true" className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-l from-[#ff80b5] to-[#9089fc] opacity-10 dark:opacity-5"></div>
        </div>
      </div>

      <div className="container px-4 mx-auto">
        {/* عنوان القسم */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            خطط أسعار مناسبة لنمو أعمالك
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            اختر الخطة المناسبة لاحتياجاتك مع إمكانية الترقية أو تغيير الخطة في أي وقت
          </p>
        </motion.div>

        {/* مفتاح تبديل دورة الفوترة مع تصميم محسن */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="flex flex-col items-center mb-14"
        >
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-full flex items-center p-1.5 border border-gray-200 dark:border-gray-800 shadow-lg shadow-gray-200/20 dark:shadow-none mb-5">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={cn(
                "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
                billingPeriod === 'monthly'
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              فوترة شهرية
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={cn(
                "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 relative",
                billingPeriod === 'yearly'
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              فوترة سنوية
              {maxSavings > 0 && (
                <span className="absolute -top-3 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap font-semibold shadow-sm">
                  وفّر {maxSavings}%
                </span>
              )}
            </button>
          </div>
          <p className="text-muted-foreground text-sm max-w-lg text-center">
            {billingPeriod === 'yearly' 
              ? "استفد من خصم كبير على جميع الخطط عند الدفع السنوي مع إمكانية استرداد المبلغ خلال 14 يومًا" 
              : "يمكنك التبديل إلى الدفع السنوي لتوفير المزيد، مع الاحتفاظ بنفس المميزات"}
          </p>
        </motion.div>

        {/* بطاقات الأسعار */}
        {isLoading ? (
          // عناصر تحميل
          <div className="grid md:grid-cols-3 gap-8 md:gap-6 lg:gap-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-2xl p-8 backdrop-blur-sm">
                <Skeleton className="h-8 w-28 mb-3" />
                <Skeleton className="h-4 w-full mb-8" />
                <Skeleton className="h-12 w-36 mb-8" />
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-12 w-full mt-8" />
              </div>
            ))}
          </div>
        ) : (
          // بطاقات الأسعار المحسنة
          <div className="grid md:grid-cols-3 gap-8 md:gap-6 lg:gap-10">
            {plans.map((plan, index) => {
              // الحصول على تفاصيل التصميم حسب نوع الخطة
              const planStyle = planDetails[plan.code as keyof typeof planDetails] || planDetails.basic;
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: index * 0.15, ease: "easeOut" }}
                  viewport={{ once: true }}
                  className={cn(
                    'relative rounded-2xl overflow-hidden transition-all duration-300 group',
                    plan.is_popular
                      ? `border-2 ${planStyle.borderClass} backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 shadow-2xl ${planStyle.shadowClass}`
                      : 'border border-gray-200 dark:border-gray-800 backdrop-blur-sm bg-white/50 dark:bg-gray-900/50 hover:shadow-xl hover:shadow-gray-200/20 dark:hover:shadow-none'
                  )}
                >
                  {/* شريط علوي */}
                  <div className={cn(
                    'h-2 w-full bg-gradient-to-r',
                    planStyle.gradientFrom, 
                    planStyle.gradientTo
                  )} />
                  
                  {plan.is_popular && (
                    <div className="absolute -top-5 inset-x-0 flex justify-center">
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg transform-gpu flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-white" />
                        <span>الأكثر شعبية</span>
                      </div>
                    </div>
                  )}

                  <div className="p-8">
                    <div className="mb-10">
                      <div className="flex items-start gap-4 mb-6">
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center',
                          planStyle.bgClass
                        )}>
                          <div className={planStyle.iconClass}>{planStyle.icon}</div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{plan.name}</h3>
                          <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-baseline">
                          <span className={cn(
                            "text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r",
                            planStyle.gradientFrom,
                            planStyle.gradientTo
                          )}>
                            {formatPrice(billingPeriod === 'monthly' ? Number(plan.monthly_price) : Number(plan.yearly_price))}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400 mr-2 font-medium">د.ج</span>
                          <span className="text-muted-foreground text-sm mr-1.5">
                            {billingPeriod === 'monthly' ? '/شهر' : '/سنة'}
                          </span>
                        </div>
                        {billingPeriod === 'yearly' && Number(plan.monthly_price) > 0 && (
                          <div className="flex items-center mt-3 gap-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 py-1.5 px-3 rounded-lg text-sm">
                            <Zap className="h-4 w-4" fill="currentColor" />
                            <p>
                              وفّر {calculateSavings(Number(plan.monthly_price), Number(plan.yearly_price))}% عند الدفع السنوي
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 mb-10">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                            planStyle.bgClass
                          )}>
                            <Check className={cn("h-3 w-3", planStyle.iconClass)} />
                          </div>
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Link to="/signup" className="block w-full">
                      <Button
                        variant="ghost"
                        className={cn(
                          'w-full justify-center transition-all duration-300 gap-2 py-6 border-2 text-sm font-medium',
                          plan.is_popular
                            ? `bg-gradient-to-r ${planStyle.gradientFrom} ${planStyle.gradientTo} hover:opacity-90 text-white border-transparent`
                            : `border-gray-200 dark:border-gray-800 hover:border-transparent hover:bg-gradient-to-r ${planStyle.gradientFrom} ${planStyle.gradientTo} hover:text-white`
                        )}
                      >
                        ابدأ الآن
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-[-2px]" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ضمان استرداد الأموال */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-14 text-center"
        >
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm border border-gray-200 dark:border-gray-800 text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>نقدم ضمان استرداد الأموال خلال 14 يوماً دون أي شروط</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingCards; 