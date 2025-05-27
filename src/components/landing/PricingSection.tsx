import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, CheckCircle2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PricingSection = () => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
  const pricingPlans = [
    {
      name: 'مجاني',
      description: 'للمبتدئين ولتجربة النظام',
      price: { monthly: 0, yearly: 0 },
      features: [
        '5 منتجات كحد أقصى',
        'نظام نقاط البيع المبسط',
        'متجر إلكتروني أساسي',
        'تقارير أساسية',
        'دعم فني عبر البريد الإلكتروني'
      ],
      notIncluded: [
        'تتبع الخدمات',
        'إدارة المخزون المتقدمة',
        'تقارير تفصيلية',
        'دعم متعدد الموظفين'
      ],
      cta: 'ابدأ مجاناً',
      popular: false,
      color: 'bg-muted',
      textColor: 'text-foreground'
    },
    {
      name: 'قياسي',
      description: 'للتجار الصغار والمتوسطين',
      price: { monthly: 1490, yearly: 14900 },
      priceDetails: { yearly: '1,242 د.ج شهرياً عند الدفع سنوياً' },
      features: [
        'منتجات غير محدودة',
        'نظام نقاط البيع الكامل',
        'إدارة المخزون مع التنبيهات',
        'متجر إلكتروني متكامل',
        'تتبع الخدمات مع رمز QR',
        'تقارير مفصلة للمبيعات والأرباح',
        'السوق العام',
        'دعم فني على مدار الساعة',
        'تطبيق سطح المكتب'
      ],
      notIncluded: [
        'دعم متعدد الموظفين',
        'إدارة متعددة الفروع',
        'تحليلات متقدمة'
      ],
      cta: 'اشترك الآن',
      popular: true,
      color: 'bg-primary',
      textColor: 'text-primary-foreground'
    },
    {
      name: 'متقدم',
      description: 'للتجار المحترفين والشركات',
      price: { monthly: 2990, yearly: 29900 },
      priceDetails: { yearly: '2,492 د.ج شهرياً عند الدفع سنوياً' },
      features: [
        'كل مميزات الخطة القياسية',
        'دعم متعدد الموظفين مع الصلاحيات',
        'إدارة متعددة الفروع',
        'تحليلات متقدمة للمبيعات والعملاء',
        'تكامل مع أنظمة الدفع الإلكتروني',
        'نظام ولاء العملاء',
        'تخصيص إضافي للمتجر الإلكتروني',
        'دعم فني أولوية قصوى',
        'تدريب وإعداد مخصص'
      ],
      notIncluded: [],
      cta: 'اشترك الآن',
      popular: false,
      color: 'bg-muted',
      textColor: 'text-foreground'
    }
  ];
  
  const enterprisePlan = {
    name: 'شركات / جملة',
    description: 'للشركات الكبيرة وتجار الجملة',
    features: [
      'تخصيص كامل للنظام',
      'دعم فني خاص ومدير حساب',
      'سوق جملة',
      'تكامل مع أنظمة التوصيل',
      'واجهات برمجة التطبيقات (APIs)',
      'تكامل مع الأنظمة المالية',
      'أمان وخصوصية معززة',
      'تدريب فريقك الكامل'
    ],
    cta: 'تواصل معنا',
  };

  const handleBillingPeriodChange = (period: 'monthly' | 'yearly') => {
    setBillingPeriod(period);
  };

  return (
    <section id="pricing" className="py-20 bg-gradient-to-t from-primary/5 to-background">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            خطط أسعار <span className="text-primary">بسيطة وشفافة</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            اختر الخطة المناسبة لاحتياجاتك واستمتع بتجربة مجانية لمدة 5 أيام بكامل المميزات
          </p>
        </motion.div>
        
        {/* Billing period toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center bg-muted/50 p-1 rounded-lg">
            <button
              onClick={() => handleBillingPeriodChange('monthly')}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                billingPeriod === 'monthly' 
                  ? "bg-card shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              شهري
            </button>
            <button
              onClick={() => handleBillingPeriodChange('yearly')}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1.5",
                billingPeriod === 'yearly' 
                  ? "bg-card shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>سنوي</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                وفر 17%
              </Badge>
            </button>
          </div>
        </div>
        
        {/* Pricing plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true, margin: "-100px" }}
              className={cn(
                "relative rounded-xl p-6 border",
                plan.popular ? "border-primary shadow-lg" : "border-border",
                "flex flex-col h-full"
              )}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <Badge variant="outline" className="bg-primary text-primary-foreground border-primary px-3 py-1 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>الأكثر شعبية</span>
                  </Badge>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">
                    {plan.price[billingPeriod].toLocaleString()}
                  </span>
                  <span className="text-muted-foreground mr-1">د.ج</span>
                  <span className="text-muted-foreground text-sm mr-1">/شهر</span>
                </div>
                {plan.priceDetails && billingPeriod === 'yearly' && (
                  <p className="text-sm text-muted-foreground mt-1">{plan.priceDetails.yearly}</p>
                )}
              </div>
              
              <Button 
                className={cn(
                  "mb-6", 
                  plan.popular ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
                )}
              >
                {plan.cta}
              </Button>
              
              <div className="space-y-3 mt-2 flex-1">
                <p className="text-sm font-medium">المميزات:</p>
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {plan.notIncluded && plan.notIncluded.length > 0 && (
                  <>
                    <p className="text-sm font-medium text-muted-foreground mt-4">غير متضمن:</p>
                    <ul className="space-y-2">
                      {plan.notIncluded.map((feature, i) => (
                        <li key={i} className="flex gap-2 items-start">
                          <X className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Enterprise plan */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-3xl mx-auto rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-8"
        >
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">{enterprisePlan.name}</h3>
              <p className="text-muted-foreground mb-4">{enterprisePlan.description}</p>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-6">
                {enterprisePlan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-center md:text-right">
              <div className="text-2xl font-bold mb-2">اتصل بنا للحصول على عرض سعر</div>
              <p className="text-muted-foreground text-sm mb-4">حلول مخصصة لاحتياجات عملك الكبير</p>
              <Button size="lg">{enterprisePlan.cta}</Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
