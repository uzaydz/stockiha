import React, { memo, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft,
  Star, 
  Store, 
  ShoppingBag, 
  Globe, 
  Users,
  PlayCircle,
  CheckCircle,
  TrendingUp,
  Shield,
  Sparkles,
  BarChart3,
  Package,
  Zap,
  Clock,
  CreditCard,
  ShoppingCart,
  Smartphone,
  Award,
  Rocket,
  Heart,
  Eye,
  MousePointer
} from 'lucide-react';

// ثوابت التصميم المحسنة مع اللون الثابت
const FEATURES = [
  { 
    icon: Zap, 
    title: "إعداد في دقائق", 
    description: "لا حاجة للخبرة التقنية",
    color: "text-[#fc5d41]",
    bgColor: "bg-[#fc5d41]/10",
    borderColor: "border-[#fc5d41]/20"
  },
  { 
    icon: Shield, 
    title: "حماية متقدمة", 
    description: "أمان على مستوى البنوك",
    color: "text-[#fc5d41]",
    bgColor: "bg-[#fc5d41]/10",
    borderColor: "border-[#fc5d41]/20"
  },
  { 
    icon: Globe, 
    title: "متجر + دومين", 
    description: "موقع احترافي مجاناً",
    color: "text-[#fc5d41]",
    bgColor: "bg-[#fc5d41]/10",
    borderColor: "border-[#fc5d41]/20"
  },
  { 
    icon: BarChart3, 
    title: "تحليلات ذكية", 
    description: "ذكاء اصطناعي متقدم",
    color: "text-[#fc5d41]",
    bgColor: "bg-[#fc5d41]/10",
    borderColor: "border-[#fc5d41]/20"
  }
];

const STATS = [
  { value: 2500, suffix: "+", label: "تاجر يثق بنا", icon: Store, trend: "+12%" },
  { value: 150, suffix: "K", label: "معاملة شهرية", icon: ShoppingCart, trend: "+28%" },
  { value: 98, suffix: "%", label: "معدل الرضا", icon: Award, trend: "+5%" }
];

const TRUST_INDICATORS = [
  { icon: Shield, text: "SSL مشفر" },
  { icon: Clock, text: "دعم 24/7" },
  { icon: Heart, text: "مجرب من آلاف التجار" }
];

// مكون العداد المحسن
const useCounter = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // تأثير easing للعداد
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    const timeoutId = setTimeout(() => {
      animationFrame = requestAnimationFrame(animate);
    }, 200);
    
    return () => {
      clearTimeout(timeoutId);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [end, duration]);
  
  return count;
};

// مكون بطاقة الميزة المحسن
const FeatureCard = memo(({ feature, index }: { feature: typeof FEATURES[0], index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
      transition={{ 
        duration: 0.6, 
        delay: 0.1 * index,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{ 
        scale: 1.02, 
        y: -4,
        transition: { duration: 0.2 }
      }}
      className={`relative group p-6 bg-white dark:bg-gray-800 rounded-xl border ${feature.borderColor} hover:border-[#fc5d41]/40 hover:shadow-xl transition-all duration-300 overflow-hidden`}
    >
      {/* تأثير الخلفية عند hover */}
      <div className={`absolute inset-0 ${feature.bgColor} opacity-0 group-hover:opacity-50 transition-opacity duration-300`}></div>
      
      {/* محتوى البطاقة */}
      <div className="relative z-10">
        <div className={`h-12 w-12 rounded-xl bg-[#fc5d41]/10 flex items-center justify-center mb-4 ${feature.color} group-hover:bg-[#fc5d41] group-hover:text-white transition-all duration-300 group-hover:scale-110`}>
          <feature.icon className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold mb-2 group-hover:text-[#fc5d41] transition-colors">{feature.title}</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">{feature.description}</p>
      </div>

      {/* تأثير الإضاءة */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#fc5d41]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </motion.div>
  );
});

FeatureCard.displayName = 'FeatureCard';

// مكون الإحصائيات المحسن
const StatCard = memo(({ stat, value, index }: { stat: typeof STATS[0], value: number, index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <motion.div 
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ 
        duration: 0.5, 
        delay: 0.2 * index,
        type: "spring",
        stiffness: 120
      }}
      whileHover={{ 
        scale: 1.05,
        transition: { duration: 0.2 }
      }}
      className="text-center group cursor-pointer"
    >
      <div className="inline-flex p-4 rounded-xl bg-[#fc5d41]/10 mb-4 text-[#fc5d41] group-hover:bg-[#fc5d41] group-hover:text-white transition-all duration-300 group-hover:shadow-lg">
        <stat.icon className="h-6 w-6" />
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-[#fc5d41] transition-colors">
        {value}{stat.suffix}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">{stat.label}</div>
      <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        {stat.trend}
      </Badge>
    </motion.div>
  );
});

StatCard.displayName = 'StatCard';

// مكون مؤشرات الثقة
const TrustIndicators = memo(() => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: 0.8 }}
    className="flex flex-wrap justify-center lg:justify-start gap-6 pt-6"
  >
    {TRUST_INDICATORS.map((indicator, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.9 + index * 0.1 }}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
      >
        <indicator.icon className="h-4 w-4 text-green-600" />
        <span>{indicator.text}</span>
      </motion.div>
    ))}
  </motion.div>
));

TrustIndicators.displayName = 'TrustIndicators';

// مكون معاينة لوحة التحكم المحسن
const DashboardPreview = memo(() => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
      animate={isInView ? { opacity: 1, scale: 1, rotateY: 0 } : { opacity: 0, scale: 0.9, rotateY: 10 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative max-w-lg mx-auto"
    >
      {/* تأثيرات الإضاءة المحسنة */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#fc5d41]/10 to-purple-500/10 rounded-2xl blur-2xl"></div>
      <div className="absolute inset-0 bg-[#fc5d41]/5 rounded-2xl blur-xl"></div>
      
      {/* الكارت الرئيسي */}
      <Card className="relative overflow-hidden border-gray-200 dark:border-gray-700 shadow-2xl backdrop-blur-sm">
        
        {/* شريط المتصفح المحسن */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-50/50 to-gray-100/30 dark:from-gray-800/50 dark:to-gray-700/30 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1.5">
            <motion.div 
              whileHover={{ scale: 1.2 }}
              className="w-3 h-3 rounded-full bg-red-500 cursor-pointer"
            />
            <motion.div 
              whileHover={{ scale: 1.2 }}
              className="w-3 h-3 rounded-full bg-yellow-500 cursor-pointer"
            />
            <motion.div 
              whileHover={{ scale: 1.2 }}
              className="w-3 h-3 rounded-full bg-green-500 cursor-pointer"
            />
          </div>
          <div className="flex-1 mx-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 text-xs text-gray-600 dark:text-gray-300 text-center border border-gray-200 dark:border-gray-700 shadow-inner">
              <span className="text-[#fc5d41] font-medium">متجرك</span>.stockiha.com
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 bg-green-500 rounded-full"
            />
            <span className="text-xs text-green-600 font-medium">مباشر</span>
          </div>
        </div>
        
        {/* محتوى لوحة التحكم */}
        <CardContent className="p-6 space-y-6 bg-gradient-to-br from-white dark:from-gray-800 to-gray-50/20 dark:to-gray-700/20">
          
          {/* العنوان المحسن */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/80 text-white shadow-lg">
                <BarChart3 className="h-4 w-4" />
              </div>
              لوحة التحكم الذكية
            </h3>
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
              <Eye className="h-3 w-3 ml-1" />
              مباشر
            </Badge>
          </div>
          
          {/* الإحصائيات المحسنة */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.02 }}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-900/20 dark:to-blue-800/10 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">+15%</Badge>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">المبيعات اليوم</div>
              <div className="text-lg font-bold">86,400 <span className="text-sm text-gray-500 dark:text-gray-400">دج</span></div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-900/20 dark:to-green-800/10 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">+8</Badge>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">طلبات جديدة</div>
              <div className="text-lg font-bold">24</div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.02 }}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-900/20 dark:to-purple-800/10 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md">
                  <Package className="h-4 w-4" />
                </div>
                <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">142</Badge>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">منتجات نشطة</div>
              <div className="text-lg font-bold">نشط</div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.02 }}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-900/20 dark:to-orange-800/10 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md">
                  <Users className="h-4 w-4" />
                </div>
                <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">+12</Badge>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">عملاء جدد</div>
              <div className="text-lg font-bold">486</div>
            </motion.div>
          </div>
          
          {/* الرسم البياني المحسن */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50/30 to-gray-100/10 dark:from-gray-700/30 dark:to-gray-600/10 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md">
                  <BarChart3 className="h-4 w-4" />
                </div>
                المبيعات الأسبوعية
              </span>
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">+22%</Badge>
            </div>
            <div className="flex items-end gap-2 h-16">
              {[40, 65, 45, 70, 85, 60, 90].map((height, index) => (
                <motion.div
                  key={index}
                  initial={{ height: 0 }}
                  animate={isInView ? { height: `${height}%` } : { height: 0 }}
                  transition={{ duration: 0.8, delay: 1 + index * 0.1 }}
                  whileHover={{ scale: 1.1 }}
                  className="bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-lg flex-1 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                />
              ))}
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

DashboardPreview.displayName = 'DashboardPreview';

const HeroSection = memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, 50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.8]);
  
  // العدادات
  const salesCount = useCounter(2500);
  const transactionsCount = useCounter(150);
  const satisfactionCount = useCounter(98);

  const statsData = useMemo(() => [
    { ...STATS[0], value: salesCount },
    { ...STATS[1], value: transactionsCount },
    { ...STATS[2], value: satisfactionCount }
  ], [salesCount, transactionsCount, satisfactionCount]);

  const handleDemoClick = useCallback(() => {
    const demoSection = document.getElementById('demo-section');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <section ref={containerRef} className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white dark:from-gray-900 via-white dark:via-gray-900 to-gray-50/20 dark:to-gray-800/20">
      
      {/* خلفية محسنة مع تأثيرات */}
      <div className="absolute inset-0">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ 
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-radial from-[#fc5d41]/20 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            scale: [1.1, 1, 1.1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ 
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-radial from-purple-500/20 to-transparent rounded-full blur-3xl"
        />
        
        {/* نمط الشبكة الخفيف */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='%23334155' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="container px-6 mx-auto relative z-10">
        <div className="max-w-7xl mx-auto">
          
          {/* المحتوى الرئيسي */}
          <div className="grid lg:grid-cols-2 gap-16 items-center min-h-screen py-20">
            
            {/* العمود الأيسر - المحتوى */}
            <motion.div
              style={{ y, opacity }}
              className="text-center lg:text-right space-y-8"
            >
              
              {/* الشارة المحسنة */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Badge className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-[#fc5d41]/10 to-purple-500/10 text-[#fc5d41] border border-[#fc5d41]/20 hover:bg-gradient-to-r hover:from-[#fc5d41]/20 hover:to-purple-500/20 transition-all duration-300">
                  <motion.div
                    animate={{ rotate: [0, 3, -3, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Sparkles className="h-4 w-4" />
                  </motion.div>
                  النظام الأول في الجزائر
                  <Rocket className="h-4 w-4" />
                </Badge>
              </motion.div>

              {/* العنوان الرئيسي المحسن */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="space-y-4"
              >
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                  <motion.span 
                    className="block text-gray-900 dark:text-white mb-3"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  >
                    حوّل متجرك إلى
                  </motion.span>
                  <motion.span 
                    className="bg-gradient-to-l from-[#fc5d41] via-purple-600 to-indigo-600 bg-clip-text text-transparent"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                  >
                    إمبراطورية رقمية
                  </motion.span>
                </h1>
              </motion.div>

              {/* الوصف المحسن */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto lg:mx-0"
              >
                نظام متكامل يجمع بين{' '}
                <span className="font-semibold text-[#fc5d41]">نقطة البيع الذكية</span>،{' '}
                <span className="font-semibold text-[#fc5d41]">إدارة المخزون المتقدمة</span>، و{' '}
                <span className="font-semibold text-[#fc5d41]">المتجر الإلكتروني الاحترافي</span>{' '}
                في منصة واحدة سهلة الاستخدام.
              </motion.p>

              {/* المميزات المحسنة */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto lg:mx-0"
              >
                {FEATURES.map((feature, index) => (
                  <FeatureCard key={index} feature={feature} index={index} />
                ))}
              </motion.div>

              {/* الأزرار المحسنة */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <Link to="/tenant/signup">
                  <Button 
                    size="lg" 
                    className="group min-w-[220px] h-12 text-base font-semibold bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/90 hover:from-[#fc5d41]/90 hover:to-[#fc5d41] shadow-lg hover:shadow-xl transition-all duration-300 text-white"
                  >
                    ابدأ تجربتك المجانية
                    <motion.div
                      animate={{ x: [0, -2, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                    </motion.div>
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={handleDemoClick}
                  className="group min-w-[220px] h-12 text-base font-semibold border-2 hover:bg-[#fc5d41]/5 hover:border-[#fc5d41]/50 transition-all duration-300"
                >
                  <PlayCircle className="h-4 w-4 ml-2 group-hover:scale-110 transition-transform" />
                  شاهد النظام بالعمل
                </Button>
              </motion.div>

              {/* مؤشرات الثقة */}
              <TrustIndicators />

              {/* الإحصائيات المحسنة */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex justify-center lg:justify-start gap-12 pt-8"
              >
                {statsData.map((stat, index) => (
                  <StatCard key={index} stat={stat} value={stat.value} index={index} />
                ))}
              </motion.div>
            </motion.div>

            {/* العمود الأيمن - معاينة النظام */}
            <div className="relative">
              <DashboardPreview />
              
              {/* العناصر المُعلقة المحسنة */}
              <motion.div
                initial={{ opacity: 0, scale: 0, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 1.2, type: "spring" }}
                whileHover={{ scale: 1.05, rotate: 2 }}
                className="absolute -top-4 -right-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 cursor-pointer"
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <CheckCircle className="h-4 w-4" />
                </motion.div>
                طلب جديد وصل!
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0, rotate: 10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 1.4, type: "spring" }}
                whileHover={{ scale: 1.05, rotate: -2 }}
                className="absolute -bottom-4 -left-4 bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/80 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 cursor-pointer"
              >
                <TrendingUp className="h-4 w-4" />
                +24% هذا الأسبوع
              </motion.div>

              {/* شارة الثقة المحسنة */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.6 }}
                whileHover={{ scale: 1.05 }}
                className="absolute top-1/2 -left-8 transform -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 border border-gray-200 dark:border-gray-700 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.8 + i * 0.1 }}
                      >
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      </motion.div>
                    ))}
                  </div>
                  <div className="text-sm">
                    <div className="font-bold text-gray-900 dark:text-white">4.9/5</div>
                    <div className="text-gray-600 dark:text-gray-300">تقييم العملاء</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';

export default HeroSection;
