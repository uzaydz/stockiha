import React, { useState, memo, useRef } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  CheckCircle2, 
  X, 
  Star, 
  Crown, 
  Zap, 
  Shield, 
  Users, 
  Building2, 
  ArrowRight,
  Sparkles,
  Gift,
  Clock,
  CreditCard,
  Phone,
  Heart,
  TrendingUp,
  Award,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingFeature {
  icon: React.ElementType;
  name: string;
  included?: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: { monthly: number; yearly: number };
  priceDetails?: { yearly: string };
  features: PricingFeature[];
  basicFeatures: string[];
  notIncluded?: string[];
  cta: string;
  popular: boolean;
  gradient: string;
  bgGradient: string;
  iconGradient: string;
  savings?: number;
  badge?: string;
  testimonial?: {
    text: string;
    author: string;
    business: string;
  };
}

const PricingSection = memo(() => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 1000], [0, -50]);
  
  const pricingPlans: PricingPlan[] = [
    {
      id: 'free',
      name: 'البداية المجانية',
      description: 'مثالي للمبتدئين وتجربة النظام',
      price: { monthly: 0, yearly: 0 },
      gradient: 'from-slate-500 to-gray-600',
      bgGradient: 'from-slate-500/5 to-gray-600/5',
      iconGradient: 'from-slate-500 to-gray-600',
      features: [
        { icon: Zap, name: 'نظام POS مبسط', included: true },
        { icon: Building2, name: 'متجر إلكتروني أساسي', included: true },
        { icon: Target, name: '5 منتجات كحد أقصى', included: true },
        { icon: Shield, name: 'دعم عبر البريد', included: true }
      ],
      basicFeatures: [
        'واجهة سهلة الاستخدام',
        'تقارير أساسية',
        'دومين فرعي مجاني',
        'SSL آمن مجاني'
      ],
      notIncluded: [
        'تتبع الخدمات والتصليح',
        'إدارة المخزون المتقدمة',
        'دعم متعدد الموظفين',
        'تحليلات متقدمة'
      ],
      cta: 'ابدأ مجاناً',
      popular: false,
      savings: 0
    },
    {
      id: 'standard',
      name: 'الخطة القياسية',
      description: 'للتجار الصغار والمتوسطين',
      price: { monthly: 1490, yearly: 14900 },
      priceDetails: { yearly: '1,242 د.ج شهرياً عند الدفع سنوياً' },
      gradient: 'from-blue-500 to-indigo-600',
      bgGradient: 'from-blue-500/10 to-indigo-600/10',
      iconGradient: 'from-blue-500 to-indigo-600',
      features: [
        { icon: Building2, name: 'منتجات غير محدودة', included: true },
        { icon: Zap, name: 'نظام POS متكامل', included: true },
        { icon: Shield, name: 'إدارة مخزون ذكية', included: true },
        { icon: Target, name: 'تتبع الخدمات QR', included: true }
      ],
      basicFeatures: [
        'متجر إلكتروني متكامل',
        'تقارير مفصلة للمبيعات',
        'السوق العام لعرض منتجاتك',
        'دعم 24/7',
        'تطبيق سطح المكتب',
        'نسخ احتياطي تلقائي',
        'تنبيهات المخزون الذكية'
      ],
      notIncluded: [
        'دعم متعدد الموظفين',
        'إدارة متعددة الفروع',
        'تحليلات متقدمة بالذكاء الاصطناعي'
      ],
      cta: 'اشترك الآن',
      popular: true,
      badge: 'الأكثر شعبية',
      savings: 17,
      testimonial: {
        text: 'النظام غيّر طريقة إدارتي للمتجر بالكامل. المبيعات زادت 40% في شهرين!',
        author: 'أحمد الجزائري',
        business: 'متجر الإلكترونيات'
      }
    },
    {
      id: 'advanced',
      name: 'الخطة المتقدمة',
      description: 'للتجار المحترفين والشركات',
      price: { monthly: 2990, yearly: 29900 },
      priceDetails: { yearly: '2,492 د.ج شهرياً عند الدفع سنوياً' },
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-500/10 to-pink-600/10',
      iconGradient: 'from-purple-500 to-pink-600',
      features: [
        { icon: Users, name: 'موظفين غير محدود', included: true },
        { icon: Building2, name: 'فروع متعددة', included: true },
        { icon: TrendingUp, name: 'تحليلات بالذكاء الاصطناعي', included: true },
        { icon: Crown, name: 'تخصيص متقدم', included: true }
      ],
      basicFeatures: [
        'كل مميزات الخطة القياسية',
        'صلاحيات متقدمة للموظفين',
        'نظام ولاء العملاء',
        'تكامل مع الدفع الإلكتروني',
        'تقارير مخصصة',
        'دعم فني بأولوية عالية',
        'تدريب شخصي للفريق',
        'واجهات API متقدمة'
      ],
      notIncluded: [],
      cta: 'ترقية للمتقدم',
      popular: false,
      savings: 17,
      testimonial: {
        text: 'إدارة 4 فروع أصبحت سهلة جداً. التقارير تساعدني أتخذ قرارات صحيحة.',
        author: 'فاطمة بن علي',
        business: 'سلسلة محلات الأزياء'
      }
    }
  ];

  const enterprisePlan = {
    name: 'حلول الشركات',
    description: 'للشركات الكبيرة وتجار الجملة',
    features: [
      { icon: Crown, name: 'تخصيص كامل للنظام' },
      { icon: Users, name: 'دعم فني خاص ومدير حساب' },
      { icon: Building2, name: 'سوق جملة حصري' },
      { icon: Zap, name: 'تكامل مع أنظمة التوصيل' },
      { icon: Shield, name: 'واجهات API كاملة' },
      { icon: TrendingUp, name: 'تكامل مع الأنظمة المالية' },
      { icon: Award, name: 'أمان وخصوصية معززة' },
      { icon: Target, name: 'تدريب شامل للفريق' }
    ],
    cta: 'تواصل معنا',
    testimonial: {
      text: 'حلول مخصصة ساعدتنا نوسع أعمالنا على مستوى الوطن. فريق الدعم ممتاز.',
      author: 'يوسف العربي',
      business: 'مجموعة المتاجر الكبرى'
    }
  };

  const handleBillingPeriodChange = (period: 'monthly' | 'yearly') => {
    setBillingPeriod(period);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('ar-DZ');
  };

  return (
    <section 
      ref={containerRef}
      id="pricing" 
      className="relative py-32 bg-gradient-to-br from-background via-background/98 to-primary/5 dark:from-background dark:via-background/99 dark:to-primary/10 overflow-hidden landing-section"
    >
      
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        {/* Animated Gradient Orbs */}
        <motion.div
          style={{ y: parallaxY }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 0.4 : 0 }}
          transition={{ duration: 1 }}
          className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] bg-gradient-radial from-primary/20 via-primary/5 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          style={{ y: useTransform(parallaxY, y => y * 0.5) }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 0.3 : 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute bottom-1/4 -left-1/4 w-[800px] h-[800px] bg-gradient-radial from-purple-500/15 via-purple-500/5 to-transparent rounded-full blur-3xl"
        />
        
        {/* Floating Money Icons */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              opacity: 0
            }}
            animate={{
              y: [null, Math.random() * -300 - 100],
              opacity: [0, 0.3, 0],
              rotate: [0, 360]
            }}
            transition={{
              duration: Math.random() * 15 + 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeOut"
            }}
          >
            <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
              <CreditCard className="w-3 h-3 text-primary/60" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="container px-6 mx-auto relative z-10">
        {/* Premium Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-20"
        >
          <Badge className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 rounded-full mb-6">
            <Crown className="h-4 w-4" />
            أسعار شفافة ومرنة
          </Badge>
          
          <h2 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
            خطط تناسب <span className="bg-gradient-to-l from-primary via-primary-darker to-primary-lighter bg-clip-text text-transparent">كل حجم أعمال</span>
          </h2>
          
          <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            ابدأ مجاناً واختر الخطة المناسبة لك. جميع الخطط تشمل تجربة مجانية 14 يوم كاملة المميزات
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>ضمان استرداد 30 يوم</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-500" />
              <span>بدون التزام سنوي</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <span>إعداد في 3 دقائق</span>
            </div>
          </div>
        </motion.div>
        
        {/* Enhanced Billing Period Toggle */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="flex justify-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-card/50 backdrop-blur-sm p-1.5 rounded-2xl shadow-lg border border-border">
            <button
              onClick={() => handleBillingPeriodChange('monthly')}
              className={cn(
                "px-8 py-3 rounded-xl text-base font-medium transition-all duration-300",
                billingPeriod === 'monthly' 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "hover:bg-muted"
              )}
            >
              شهري
            </button>
            
            <button
              onClick={() => handleBillingPeriodChange('yearly')}
              className={cn(
                "px-8 py-3 rounded-xl text-base font-medium transition-all duration-300 flex items-center gap-2",
                billingPeriod === 'yearly' 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "hover:bg-muted"
              )}
            >
              <span>سنوي</span>
              <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-0 text-xs font-medium">
                وفر 17%
              </Badge>
            </button>
          </div>
          
          {billingPeriod === 'yearly' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute mt-16 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg"
            >
              🎉 احصل على شهرين مجاناً!
            </motion.div>
          )}
        </motion.div>
        
        {/* Premium Pricing Plans */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-20">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              onMouseEnter={() => setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan(null)}
              whileHover={{ scale: 1.02, y: -8 }}
              className={cn(
                "relative group pt-8",
                plan.popular && "lg:-mt-4"
              )}
            >
              {/* Glow Effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${plan.gradient} opacity-0 group-hover:opacity-20 rounded-3xl blur-xl transform scale-110 transition-opacity duration-500`} />
              
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 -translate-y-full z-20">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="bg-gradient-to-r from-primary to-primary-darker text-primary-foreground px-6 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2"
                  >
                    <Star className="h-4 w-4" />
                    {plan.badge}
                  </motion.div>
                </div>
              )}

              {/* Savings Badge */}
              {billingPeriod === 'yearly' && plan.savings > 0 && (
                <div className="absolute top-4 left-4 z-10">
                  <Badge className="bg-green-500 text-white border-0 text-xs font-medium px-3 py-1">
                    وفر {plan.savings}%
                  </Badge>
                </div>
              )}
              
              {/* Background Gradient */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl",
                plan.bgGradient,
                plan.popular && "opacity-5"
              )} />
              
              <div className={cn(
                "relative h-full rounded-3xl border bg-card/50 backdrop-blur-sm shadow-lg transition-all duration-300 overflow-hidden",
                plan.popular 
                  ? "border-primary ring-2 ring-primary/20 shadow-2xl shadow-primary/10" 
                  : "border-border hover:border-primary/30 shadow-xl",
                "flex flex-col"
              )}>
                
                {/* Header */}
                <div className="mb-8">
                  <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${plan.gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {plan.features[0] && React.createElement(plan.features[0].icon, { className: "h-8 w-8 text-white" })}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>
                
                {/* Pricing */}
                <div className="mb-8">
                  <div className="flex items-baseline mb-2">
                    <motion.span 
                      key={`${plan.id}-${billingPeriod}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-5xl font-bold text-foreground"
                    >
                      {formatPrice(plan.price[billingPeriod])}
                    </motion.span>
                    <span className="text-muted-foreground mr-2 text-lg">د.ج</span>
                    <span className="text-muted-foreground text-lg">/شهر</span>
                  </div>
                  {plan.priceDetails && billingPeriod === 'yearly' && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-green-600 dark:text-green-400 font-medium"
                    >
                      {plan.priceDetails.yearly}
                    </motion.p>
                  )}
                </div>
                
                {/* CTA Button */}
                <Button 
                  className={cn(
                    "w-full mb-8 py-4 text-base font-medium rounded-2xl transition-all duration-300 group-hover:shadow-xl",
                    plan.popular 
                      ? "bg-primary text-primary-foreground hover:bg-primary-darker shadow-lg hover:shadow-primary/20" 
                      : "bg-muted hover:bg-primary hover:text-primary-foreground border border-border hover:border-primary"
                  )}
                >
                  {plan.cta}
                  <ArrowRight className="h-5 w-5 mr-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                
                {/* Main Features */}
                <div className="mb-6">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    المميزات الرئيسية
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {plan.features.map((feature, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.1 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${plan.iconGradient}`}>
                          {React.createElement(feature.icon, { className: "h-4 w-4 text-white" })}
                        </div>
                        <span className="text-sm font-medium text-foreground">{feature.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                {/* Basic Features List */}
                <div className="space-y-4 flex-1">
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      يشمل أيضاً
                    </h4>
                    <ul className="space-y-2">
                      {plan.basicFeatures.map((feature, i) => (
                        <motion.li 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.05 }}
                          viewport={{ once: true }}
                          className="flex items-center gap-3 text-sm"
                        >
                          <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-muted-foreground">{feature}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Not Included */}
                  {plan.notIncluded && plan.notIncluded.length > 0 && (
                    <div className="pt-4 border-t border-border/50">
                      <h4 className="font-semibold text-muted-foreground mb-3 text-sm">غير متضمن</h4>
                      <ul className="space-y-2">
                        {plan.notIncluded.map((feature, i) => (
                          <li key={i} className="flex items-center gap-3 text-sm">
                            <div className="w-5 h-5 bg-red-500/20 rounded-full flex items-center justify-center shrink-0">
                              <X className="h-3 w-3 text-red-500" />
                            </div>
                            <span className="text-muted-foreground/70">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Testimonial */}
                {plan.testimonial && hoveredPlan === plan.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20"
                  >
                    <p className="text-sm text-muted-foreground italic mb-2">"{plan.testimonial.text}"</p>
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-xs font-medium text-foreground">{plan.testimonial.author}</span>
                      <span className="text-xs text-muted-foreground">- {plan.testimonial.business}</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Premium Enterprise Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto"
        >
          <div className="relative rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background/50 to-purple-500/10 p-8 lg:p-12 shadow-2xl overflow-hidden">
            
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-primary/20 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-radial from-purple-500/20 to-transparent rounded-full blur-2xl" />
            
            <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
              
              {/* Content */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-purple-600">
                    <Crown className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-foreground">{enterprisePlan.name}</h3>
                    <p className="text-primary font-medium">حلول مخصصة لأعمالك</p>
                  </div>
                </div>
                
                <p className="text-lg text-muted-foreground mb-8">{enterprisePlan.description}</p>
                
                {/* Features Grid */}
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  {enterprisePlan.features.map((feature, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50"
                    >
                      <div className="p-2 rounded-lg bg-primary/20">
                        {React.createElement(feature.icon, { className: "h-4 w-4 text-primary" })}
                      </div>
                      <span className="text-sm font-medium text-foreground">{feature.name}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Testimonial */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="p-6 rounded-2xl bg-card/30 backdrop-blur-sm border border-border/50 mb-8"
                >
                  <p className="text-muted-foreground italic mb-3">"{enterprisePlan.testimonial.text}"</p>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-foreground">{enterprisePlan.testimonial.author}</span>
                    <span className="text-sm text-muted-foreground">- {enterprisePlan.testimonial.business}</span>
                  </div>
                </motion.div>
              </div>
              
              {/* CTA Card */}
              <div className="relative">
                <motion.div
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="bg-card rounded-3xl p-8 shadow-2xl border border-border/50 text-center relative overflow-hidden"
                >
                  {/* Card Background Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5" />
                  
                  <div className="relative z-10">
                    <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary to-purple-600 mb-6">
                      <Phone className="h-8 w-8 text-white" />
                    </div>
                    
                    <h4 className="text-2xl font-bold text-foreground mb-2">تواصل مع فريق المبيعات</h4>
                    <p className="text-muted-foreground mb-6">احصل على عرض مخصص لاحتياجات شركتك</p>
                    
                    <div className="space-y-4 mb-8">
                      <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 text-green-500" />
                        <span>استشارة مجانية 30 دقيقة</span>
                      </div>
                      <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                        <Gift className="h-4 w-4 text-blue-500" />
                        <span>إعداد مجاني للنظام</span>
                      </div>
                      <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4 text-purple-500" />
                        <span>ضمان سرية المعلومات</span>
                      </div>
                    </div>
                    
                    <Button 
                      size="lg" 
                      className="w-full bg-gradient-to-r from-primary to-purple-600 text-white hover:from-primary-darker hover:to-purple-700 px-8 py-4 rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {enterprisePlan.cta}
                      <Phone className="h-5 w-5 mr-2" />
                    </Button>
                    
                    <p className="text-xs text-muted-foreground mt-4">
                      سنتواصل معك خلال 24 ساعة
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Guarantee Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <div className="inline-flex flex-col items-center gap-6 p-8 rounded-3xl bg-gradient-to-br from-green-500/5 to-emerald-500/10 border border-green-500/20">
            <div className="p-4 rounded-2xl bg-green-500">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                ضمان استرداد الأموال 100%
              </h3>
              <p className="text-lg text-muted-foreground max-w-2xl">
                غير راضي عن الخدمة؟ احصل على أموالك كاملة خلال 30 يوم بدون أسئلة
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>بدون رسوم إضافية</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>إلغاء فوري</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>دعم على مدار الساعة</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

PricingSection.displayName = 'PricingSection';

export default PricingSection;