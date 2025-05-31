import React, { useState, memo, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence, Variants } from 'framer-motion';

// تعريف أنواع TypeScript لمصفوفات الرسوم المتحركة
type AnimationArray = number[] | string[] | null[];
type AnimationValue = number | string | null | AnimationArray;
type AnimationValues = Record<string, AnimationValue | AnimationValue[]>;

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  Target,
  Infinity as InfinityIcon,
  Rocket,
  Eye,
  MousePointer
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
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 1000], [0, -50]);
  
  // Animated price counter
  const [displayPrices, setDisplayPrices] = useState<{[key: string]: number}>({});
  
  const pricingPlans: PricingPlan[] = [
    {
      id: 'free',
      name: 'الخطة المجانية',
      description: 'مثالي للمشاريع الصغيرة والاستكشاف',
      price: { monthly: 0, yearly: 0 },
      gradient: 'from-slate-600 to-slate-800',
      bgGradient: 'from-slate-600/5 to-slate-800/5',
      iconGradient: 'from-slate-600 to-slate-800',
      features: [
        { icon: Eye, name: 'لوحة تحكم أساسية', included: true },
        { icon: Zap, name: 'حتى 100 طلب شهرياً', included: true },
        { icon: Shield, name: 'دعم عبر البريد', included: true },
        { icon: Building2, name: 'متجر واحد', included: true }
      ],
      basicFeatures: [
        'واجهة مستخدم سهلة',
        'تقارير أساسية',
        'دومين فرعي مجاني',
        'SSL آمن',
        'دعم المجتمع'
      ],
      notIncluded: [
        'تكامل مع وسائل الدفع',
        'التحليلات المتقدمة',
        'الدعم الأولوية',
        'النسخ الاحتياطي التلقائي'
      ],
      cta: 'ابدأ مجاناً',
      popular: false,
      savings: 0
    },
    {
      id: 'standard',
      name: 'الخطة الاحترافية',
      description: 'الأنسب للشركات النامية والمشاريع المتوسطة',
      price: { monthly: 1990, yearly: 19900 },
      priceDetails: { yearly: '1,658 د.ج شهرياً مع الفوترة السنوية' },
      gradient: 'from-blue-600 to-cyan-600',
      bgGradient: 'from-blue-600/10 to-cyan-600/10',
      iconGradient: 'from-blue-600 to-cyan-600',
      features: [
        { icon: InfinityIcon, name: 'طلبات غير محدودة', included: true },
        { icon: TrendingUp, name: 'تحليلات متقدمة', included: true },
        { icon: Rocket, name: 'أتمتة التسويق', included: true },
        { icon: Shield, name: 'دعم مباشر 24/7', included: true }
      ],
      basicFeatures: [
        'جميع مميزات الخطة المجانية',
        'تكامل مع وسائل الدفع',
        'تحليلات مفصلة',
        'نسخ احتياطي يومي',
        'دعم أولوية',
        'تخصيص العلامة التجارية',
        'API مفتوح',
        'تقارير مخصصة'
      ],
      notIncluded: [
        'الذكاء الاصطناعي المتقدم',
        'مدير حساب مخصص',
        'تدريب شخصي'
      ],
      cta: 'ابدأ التجربة المجانية',
      popular: true,
      badge: 'الأكثر شعبية',
      savings: 17,
      testimonial: {
        text: 'انتقلت من إدارة فوضوية إلى نظام منظم تماماً. زادت مبيعاتي 150% في 3 أشهر!',
        author: 'سارة أحمد',
        business: 'متجر الأزياء العصرية'
      }
    },
    {
      id: 'enterprise',
      name: 'خطة الشركات',
      description: 'للشركات الكبيرة التي تحتاج حلول متقدمة',
      price: { monthly: 3990, yearly: 39900 },
      priceDetails: { yearly: '3,325 د.ج شهرياً مع الفوترة السنوية' },
      gradient: 'from-purple-600 to-pink-600',
      bgGradient: 'from-purple-600/10 to-pink-600/10',
      iconGradient: 'from-purple-600 to-pink-600',
      features: [
        { icon: Users, name: 'فرق غير محدودة', included: true },
        { icon: Building2, name: 'فروع متعددة', included: true },
        { icon: Crown, name: 'ذكاء اصطناعي متقدم', included: true },
        { icon: Award, name: 'مدير حساب مخصص', included: true }
      ],
      basicFeatures: [
        'جميع مميزات الخطة الاحترافية',
        'ذكاء اصطناعي للتنبؤات',
        'تكامل مخصص',
        'مدير حساب شخصي',
        'تدريب مخصص للفريق',
        'SLA مضمون 99.9%',
        'أمان متقدم',
        'نسخ احتياطي لحظي',
        'دعم هاتفي مباشر'
      ],
      notIncluded: [],
      cta: 'طلب عرض مخصص',
      popular: false,
      savings: 17,
      testimonial: {
        text: 'مع نمو شركتنا لـ 50 فرع، كان هذا النظام الوحيد القادر على مواكبة نموّنا السريع.',
        author: 'محمد الصالح',
        business: 'رئيس تنفيذي - مجموعة الأعمال الرقمية'
      }
    }
  ];

  const customPlan = {
    name: 'حلول مخصصة',
    description: 'حلول مصممة خصيصاً لاحتياجاتك الفريدة',
    features: [
      { icon: Target, name: 'تطوير مخصص حسب الطلب' },
      { icon: Users, name: 'فريق تطوير مخصص' },
      { icon: Shield, name: 'أمان على مستوى المؤسسات' },
      { icon: Rocket, name: 'نشر سحابي متقدم' },
      { icon: Phone, name: 'دعم مباشر 24/7' },
      { icon: Award, name: 'ضمانات SLA مخصصة' }
    ],
    cta: 'تحدث مع خبرائنا',
    testimonial: {
      text: 'تم تطوير نظام فريد يناسب احتياجاتنا المعقدة. النتائج فاقت كل التوقعات.',
      author: 'عبد الرحمن المهدي',
      business: 'مدير تقني - شركة التجارة الذكية'
    }
  };
  
  useEffect(() => {
    const targetPrices: {[key: string]: number} = {};
    pricingPlans.forEach(plan => {
      targetPrices[plan.id] = plan.price[billingPeriod];
    });
    
    // تحريك تغيير الأسعار
    const duration = 800;
    const steps = 30;
    const interval = duration / steps;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      
      const newPrices: {[key: string]: number} = {};
      Object.keys(targetPrices).forEach(id => {
        const start = displayPrices[id] || 0;
        const end = targetPrices[id];
        newPrices[id] = Math.round(start + (end - start) * easeProgress);
      });
      
      setDisplayPrices(newPrices);
      
      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, interval);
    
    return () => clearInterval(timer);
  }, [billingPeriod]);

  const formatPrice = (price: number) => {
    return price.toLocaleString('ar-DZ');
  };

  return (
    <section 
      ref={containerRef}
      id="pricing" 
      className="relative py-24 md:py-32 bg-gradient-to-br from-background via-background/95 to-primary/5 dark:from-background dark:via-background/98 dark:to-primary/10 overflow-hidden"
    >
      
      {/* خلفية متحركة محسّنة */}
      <div className="absolute inset-0 pointer-events-none">
        {/* كرات متدرجة متحركة */}
        <motion.div
          style={{ y: parallaxY }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 0.4 : 0 }}
          transition={{ duration: 2 }}
          className="absolute top-1/4 -right-1/3 w-[700px] h-[700px] bg-gradient-radial from-primary/20 via-primary/5 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          style={{ y: useTransform(parallaxY, y => y * -0.7) }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 0.3 : 0 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute bottom-1/4 -left-1/3 w-[900px] h-[900px] bg-gradient-radial from-purple-500/15 via-purple-500/5 to-transparent rounded-full blur-3xl"
        />
        
        {/* رموز عائمة متحركة */}
        {[Crown, Star, Zap, Gift, Rocket, Award].map((Icon, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              opacity: 0
            }}
            animate={{
              y: [null, Math.random() * -400 - 200] as any,
              opacity: [0, 0.6, 0] as any,
              rotate: [0, 360] as any,
              scale: [0.8, 1.2, 0.8] as any
            }}
            transition={{
              duration: Math.random() * 20 + 25,
              repeat: Infinity as number,
              repeatType: "loop",
              delay: Math.random() * 10,
              ease: "easeInOut"
            }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full blur-md" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm rounded-full flex items-center justify-center border border-primary/20">
                <Icon className="w-5 h-5 text-primary/70" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="container px-4 md:px-6 mx-auto relative z-10">
        {/* قسم العنوان المحسن */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center max-w-5xl mx-auto mb-16 md:mb-20"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Badge variant="landing" className="px-6 py-3 mb-6">
              <Crown className="h-4 w-4" />
              خطط مرنة لكل احتياج
            </Badge>
          </motion.div>
          
          <motion.h2 
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            اختر الخطة{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
                المثالية لنموك
              </span>
              <motion.div
                className="absolute -bottom-2 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/60 via-purple-600/60 to-primary/60 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
              />
            </span>
          </motion.h2>
          
          <motion.p 
            className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-4xl mx-auto mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            ابدأ بتجربة مجانية <span className="text-primary font-semibold">14 يوم</span> كاملة المميزات، 
            ثم اختر الخطة التي تناسب احتياجاتك وميزانيتك
          </motion.p>

          {/* مؤشرات الثقة */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="flex flex-wrap justify-center gap-6 md:gap-8"
          >
            {[
              { icon: Shield, text: 'ضمان استرداد 30 يوم', color: 'text-green-600' },
              { icon: CreditCard, text: 'بدون التزامات', color: 'text-blue-600' },
              { icon: Clock, text: 'تفعيل فوري', color: 'text-purple-600' }
            ].map((item, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm border border-border/50"
              >
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-sm font-medium text-muted-foreground">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
        
        {/* مفتاح تبديل الفترة المحسن */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex flex-col items-center gap-6 mb-16"
        >
          <div className="relative">
            <div className="flex items-center bg-muted/50 backdrop-blur-sm p-1.5 rounded-2xl border border-border/50">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={cn(
                  "px-6 md:px-8 py-3 rounded-xl text-sm md:text-base font-medium transition-all duration-300",
                  billingPeriod === 'monthly' 
                    ? "bg-background text-foreground shadow-lg" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                شهري
              </button>
              
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={cn(
                  "px-6 md:px-8 py-3 rounded-xl text-sm md:text-base font-medium transition-all duration-300 flex items-center gap-2 relative",
                  billingPeriod === 'yearly' 
                    ? "bg-background text-foreground shadow-lg" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>سنوي</span>
                <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 text-xs font-bold px-2 py-0.5">
                  وفر 17%
                </Badge>
              </button>
            </div>
          </div>
          
          <AnimatePresence>
            {billingPeriod === 'yearly' && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full text-sm font-medium shadow-lg"
              >
                <Gift className="h-4 w-4" />
                🎉 وفر شهرين مجاناً مع الدفع السنوي!
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* بطاقات الخطط المحسنة */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto mb-16 md:mb-20">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              onMouseEnter={() => setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan(null)}
              whileHover={{ y: -8 }}
              className={cn(
                "relative group h-full",
                plan.popular && "lg:scale-105 z-10"
              )}
            >
              {/* تأثير الوهج */}
              <motion.div 
                className={`absolute inset-0 bg-gradient-to-br ${plan.gradient} rounded-3xl blur-2xl transform scale-105`}
                animate={{ 
                  opacity: hoveredPlan === plan.id ? 0.25 : plan.popular ? 0.15 : 0 
                }}
                transition={{ duration: 0.4 }}
              />
              
              {/* شارة الشعبية */}
              {plan.popular && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20">
                  <motion.div
                    animate={{ 
                      rotate: [-2, 2, -2] as any,
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ duration: 4, repeat: Infinity as number, repeatType: "loop" }}
                    className="bg-gradient-to-r from-primary via-purple-600 to-primary text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-xl flex items-center gap-2"
                  >
                    <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                    {plan.badge}
                  </motion.div>
                </div>
              )}

              {/* شارة التوفير */}
              <AnimatePresence>
                {billingPeriod === 'yearly' && plan.savings > 0 && (
                  <motion.div 
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ type: "spring", bounce: 0.6 }}
                    className="absolute top-6 right-6 z-10"
                  >
                    <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 text-xs font-bold px-3 py-1.5 shadow-md">
                      -{plan.savings}%
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <Card className={cn(
                "relative h-full border-0 shadow-2xl transition-all duration-300 overflow-hidden flex flex-col",
                plan.popular 
                  ? "bg-gradient-to-b from-card via-card/98 to-primary/5 ring-2 ring-primary/30" 
                  : "bg-card/80 backdrop-blur-sm hover:bg-card/90"
              )}>
                
                {/* رأس البطاقة */}
                <CardHeader className="relative pb-6">
                  <div className={cn(
                    "absolute inset-0 opacity-5",
                    plan.bgGradient
                  )} />
                  
                  <motion.div 
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.6 }}
                    className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${plan.gradient} mb-6 shadow-xl`}
                  >
                    {plan.features[0] && React.createElement(plan.features[0].icon, { 
                      className: "h-8 w-8 text-white" 
                    })}
                  </motion.div>
                  
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-muted-foreground text-base leading-relaxed">
                    {plan.description}
                  </p>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col">
                  {/* قسم السعر */}
                  <div className="mb-8">
                    <div className="flex items-baseline gap-2 mb-3">
                      <AnimatePresence mode="wait">
                        <motion.span 
                          key={`${plan.id}-${billingPeriod}`}
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -20, opacity: 0 }}
                          transition={{ duration: 0.4 }}
                          className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
                        >
                          {formatPrice(displayPrices[plan.id] || plan.price[billingPeriod])}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-muted-foreground text-lg">د.ج</span>
                      <span className="text-muted-foreground">
                        /{billingPeriod === 'monthly' ? 'شهر' : 'سنة'}
                      </span>
                    </div>
                    
                    <AnimatePresence>
                      {plan.priceDetails && billingPeriod === 'yearly' && (
                        <motion.p 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-sm text-green-600 dark:text-green-400 font-medium"
                        >
                          {plan.priceDetails.yearly}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* زر الدعوة للعمل */}
                  <div className="mb-8">
                    <Button 
                      className={cn(
                        "w-full h-14 text-base font-semibold rounded-2xl transition-all duration-300 group",
                        plan.popular 
                          ? "bg-gradient-to-r from-primary to-primary-darker text-primary-foreground hover:shadow-2xl hover:shadow-primary/25" 
                          : "bg-muted hover:bg-muted/80 text-foreground border border-border hover:border-primary/40"
                      )}
                    >
                      <span className="relative z-10">{plan.cta}</span>
                      <ArrowRight className="h-5 w-5 mr-2 group-hover:translate-x-1 transition-transform" />
                      {plan.popular && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary-darker/20 rounded-2xl"
                          animate={{ opacity: [0, 0.5, 0] as any }}
                          transition={{ duration: 2, repeat: Infinity as number, repeatType: "loop" }}
                        />
                      )}
                    </Button>
                  </div>
                  
                  {/* المميزات الرئيسية */}
                  <div className="mb-8">
                    <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                      المميزات الرئيسية
                    </h4>
                    <div className="grid gap-3">
                      {plan.features.map((feature, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.1 }}
                          viewport={{ once: true }}
                          whileHover={{ scale: 1.02 }}
                          onHoverStart={() => setSelectedFeatureIndex(i)}
                          onHoverEnd={() => setSelectedFeatureIndex(null)}
                          className="relative flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer overflow-hidden"
                        >
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent"
                            initial={{ x: '-100%' }}
                            animate={{ x: selectedFeatureIndex === i ? '0%' : '-100%' }}
                            transition={{ duration: 0.3 }}
                          />
                          <div className={`relative p-2 rounded-lg bg-gradient-to-br ${plan.iconGradient} shadow-sm`}>
                            {React.createElement(feature.icon, { 
                              className: "h-4 w-4 text-white" 
                            })}
                          </div>
                          <span className="relative text-sm font-medium text-foreground">
                            {feature.name}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  
                  {/* قائمة المميزات الأساسية */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      المميزات المضمنة
                    </h4>
                    <ul className="space-y-2.5">
                      {plan.basicFeatures.map((feature, i) => (
                        <motion.li 
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.05 }}
                          viewport={{ once: true }}
                          className="flex items-start gap-3 text-sm group hover:translate-x-1 transition-transform"
                        >
                          <motion.div 
                            className="w-5 h-5 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                            whileHover={{ scale: 1.2 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                          </motion.div>
                          <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                            {feature}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                    
                    {/* المميزات غير المضمنة */}
                    {plan.notIncluded && plan.notIncluded.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-border/30">
                        <h4 className="font-medium text-muted-foreground mb-3 text-sm opacity-70">
                          غير متضمن
                        </h4>
                        <ul className="space-y-2">
                          {plan.notIncluded.map((feature, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm opacity-60">
                              <div className="w-4 h-4 bg-muted/50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                <X className="h-2.5 w-2.5 text-muted-foreground" />
                              </div>
                              <span className="text-muted-foreground/70 line-through">
                                {feature}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* شهادة العميل */}
                  <AnimatePresence>
                    {plan.testimonial && hoveredPlan === plan.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 overflow-hidden"
                      >
                        <div className="p-4 bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-xl border border-primary/20">
                          <p className="text-sm text-muted-foreground italic mb-3">
                            "{plan.testimonial.text}"
                          </p>
                          <div className="flex items-center gap-2">
                            <Heart className="h-4 w-4 text-red-500 animate-pulse" />
                            <span className="text-xs font-semibold text-foreground">
                              {plan.testimonial.author}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              - {plan.testimonial.business}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        
        {/* قسم الحلول المخصصة */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto"
        >
          <Card className="relative rounded-3xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-background/50 to-purple-500/5 p-8 lg:p-12 shadow-2xl overflow-hidden">
            
            {/* خلفية متحركة */}
            <div className="absolute inset-0">
              <motion.div
                className="absolute top-0 right-0 w-96 h-96 bg-gradient-radial from-primary/15 to-transparent rounded-full blur-3xl"
                animate={{
                  scale: [1, 1.2, 1] as any,
                  opacity: [0.3, 0.5, 0.3] as any
                }}
                transition={{ duration: 8, repeat: Infinity as number, repeatType: "loop" }}
              />
              <motion.div
                className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-radial from-purple-500/15 to-transparent rounded-full blur-3xl"
                animate={{
                  scale: [1, 1.3, 1] as any,
                  opacity: [0.2, 0.4, 0.2] as any
                }}
                transition={{ duration: 10, repeat: Infinity as number, repeatType: "loop", delay: 2 }}
              />
            </div>
            
            <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
              
              {/* المحتوى */}
              <div>
                <motion.div 
                  className="flex items-center gap-4 mb-6"
                  whileHover={{ scale: 1.02 }}
                >
                  <motion.div 
                    className="p-4 rounded-2xl bg-gradient-to-br from-primary via-purple-600 to-primary shadow-xl"
                    animate={{
                      rotate: [0, 5, -5, 0] as any
                    }}
                    transition={{ duration: 6, repeat: Infinity as number, repeatType: "loop" }}
                  >
                    <Crown className="h-8 w-8 text-white" aria-hidden="true" />
                  </motion.div>
                  <div>
                    <h3 className="text-3xl font-bold text-foreground">{customPlan.name}</h3>
                    <p className="text-transparent bg-gradient-to-r from-primary to-purple-600 bg-clip-text font-medium">
                      {customPlan.description}
                    </p>
                  </div>
                </motion.div>
                
                {/* شبكة المميزات */}
                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                  {customPlan.features.map((feature, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ 
                        duration: 0.5, 
                        delay: index * 0.1,
                        type: "spring"
                      }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-lg border border-border/40 hover:border-primary/40 shadow-lg hover:shadow-xl transition-all"
                    >
                      <motion.div 
                        className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        {React.createElement(feature.icon, { 
                          className: "h-5 w-5 text-primary" 
                        })}
                      </motion.div>
                      <span className="text-sm font-medium text-foreground">
                        {feature.name}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* شهادة العميل */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  viewport={{ once: true }}
                  className="p-6 rounded-2xl bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border border-yellow-500/20"
                >
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.6 + i * 0.1 }}
                      >
                        <Star className="h-5 w-5 text-yellow-500 fill-current" />
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-muted-foreground italic mb-3">
                    "{customPlan.testimonial.text}"
                  </p>
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm font-semibold text-foreground">
                      {customPlan.testimonial.author}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      - {customPlan.testimonial.business}
                    </span>
                  </div>
                </motion.div>
              </div>
              
              {/* بطاقة الدعوة للعمل */}
              <div className="relative">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-card via-card/95 to-primary/5 rounded-3xl p-8 shadow-2xl border border-primary/20 text-center relative overflow-hidden"
                >
                  <div className="relative z-10">
                    <motion.div 
                      className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary via-purple-600 to-primary mb-6 shadow-xl"
                      animate={{
                        boxShadow: [
                          '0 0 10px rgba(var(--primary), 0.2)',
                          '0 0 30px rgba(var(--primary), 0.3)',
                          '0 0 10px rgba(var(--primary), 0.2)'
                        ] as any
                      }}
                      transition={{ duration: 3, repeat: Infinity as number, repeatType: "loop" }}
                    >
                      <Phone className="h-8 w-8 text-white" aria-hidden="true" />
                    </motion.div>
                    
                    <h4 className="text-2xl font-bold text-foreground mb-2">
                      تحدث مع خبرائنا
                    </h4>
                    <p className="text-muted-foreground mb-8">
                      احصل على حل مصمم خصيصاً لاحتياجاتك
                    </p>
                    
                    <div className="space-y-4 mb-8">
                      {[
                        { icon: MousePointer, text: 'استشارة مجانية شاملة', color: 'text-green-600' },
                        { icon: Rocket, text: 'تقييم مجاني للاحتياجات', color: 'text-blue-600' },
                        { icon: Shield, text: 'عرض سعر مخصص', color: 'text-purple-600' }
                      ].map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="flex items-center justify-center gap-3"
                        >
                          <div className="p-2 rounded-lg bg-muted/50">
                            {React.createElement(item.icon, { 
                              className: `h-4 w-4 ${item.color}` 
                            })}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {item.text}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                    
                    <Button 
                      size="lg" 
                      className="w-full bg-gradient-to-r from-primary via-purple-600 to-primary text-white h-14 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-500 group"
                    >
                      <span className="relative z-10">{customPlan.cta}</span>
                      <Phone className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" aria-hidden="true" />
                    </Button>
                    
                    <motion.p 
                      className="text-sm text-muted-foreground mt-4 flex items-center justify-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                    >
                      <Target className="h-4 w-4 text-primary" aria-hidden="true" />
                      نتواصل معك خلال ساعة واحدة
                    </motion.p>
                  </div>
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* قسم الضمان */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <motion.div 
            className="inline-flex flex-col items-center gap-6 p-8 rounded-3xl bg-gradient-to-br from-green-500/5 via-emerald-500/10 to-green-500/5 border border-green-500/20 backdrop-blur-sm max-w-4xl mx-auto"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="p-4 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 shadow-xl"
              animate={{ 
                rotate: [0, 5, -5, 0] as any,
                scale: [1, 1.05, 1] as any
              }}
              transition={{ duration: 5, repeat: Infinity as number, repeatType: "loop" }}
            >
              <Shield className="h-8 w-8 text-white" aria-hidden="true" />
            </motion.div>
            
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                ضمان استرداد كامل 100%
              </h3>
              <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                جرب النظام لمدة <span className="text-green-600 dark:text-green-400 font-bold">30 يوم</span> كاملة. 
                إذا لم تكن راضياً تماماً، نعيد أموالك بالكامل دون أسئلة
              </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4">
              {[
                'ضمان فوري',
                'بدون رسوم إخفاء',
                'دعم مستمر'
              ].map((text, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
                  <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                    {text}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
});

PricingSection.displayName = 'PricingSection';

export default PricingSection;