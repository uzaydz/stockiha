import React, { memo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ChevronRight,
  Rocket,
  Heart,
  Award,
  Activity
} from 'lucide-react';

const HeroSection = memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, 50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.3]);
  
  // Mouse tracking for interactive effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        mouseX.set((e.clientX - rect.left - rect.width / 2) * 0.1);
        mouseY.set((e.clientY - rect.top - rect.height / 2) * 0.1);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Animated counter hook
  const useCounter = (end: number, duration: number = 2000) => {
    const [count, setCount] = useState(0);
    
    useEffect(() => {
      let startTime: number | null = null;
      let animationFrame: number;
      
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        
        setCount(Math.floor(progress * end));
        
        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        }
      };
      
      animationFrame = requestAnimationFrame(animate);
      
      return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);
    
    return count;
  };

  const salesCount = useCounter(5000, 2000);
  const transactionsCount = useCounter(200, 2000);
  const satisfactionCount = useCounter(97, 1500);

  return (
    <section ref={containerRef} className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background/95 to-primary/5 dark:from-background dark:via-background/98 dark:to-primary/10">
      
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0">
        {/* Interactive Gradient Orbs */}
        <motion.div
          style={{
            x: springX,
            y: springY,
          }}
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            scale: {
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-radial from-primary/30 via-primary/10 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          style={{
            x: useTransform(springX, x => -x * 0.5),
            y: useTransform(springY, y => -y * 0.5),
          }}
          animate={{
            scale: [1.2, 1, 1.2],
          }}
          transition={{
            scale: {
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-gradient-radial from-primary-darker/20 via-primary/10 to-transparent rounded-full blur-3xl"
        />
        
        {/* Animated Particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, Math.random() * -200 - 100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeOut"
            }}
          />
        ))}
        
        {/* Enhanced Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='currentColor' stroke-width='1' /%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="container px-6 mx-auto relative z-10">
        <div className="max-w-7xl mx-auto">
          
          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[90vh] py-20">
            
            {/* Left Column - Content */}
            <motion.div
              style={{ y, opacity }}
              className="text-center lg:text-right space-y-8"
            >
              
              {/* Premium Animated Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <Badge className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 dark:from-primary/20 dark:via-primary/15 dark:to-primary/20 text-primary dark:text-primary-foreground border border-primary/20 dark:border-primary/30 rounded-full backdrop-blur-sm hover:border-primary/30 dark:hover:border-primary/40 transition-all duration-300">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="group-hover:scale-110 transition-transform"
                  >
                    <Sparkles className="h-4 w-4" />
                  </motion.div>
                  <span className="font-semibold text-sm tracking-wide dark:text-primary-foreground">النظام الأول في الجزائر</span>
                  <Award className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
                </Badge>
              </motion.div>

              {/* Premium Main Heading */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="space-y-6"
              >
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                  <span className="block text-foreground dark:text-primary-foreground mb-2">حوّل متجرك إلى</span>
                  <span className="relative inline-block">
                    <span className="bg-gradient-to-l from-primary via-primary-darker to-primary-lighter bg-clip-text text-transparent dark:text-primary-foreground">
                      إمبراطورية رقمية
                    </span>
                    <motion.div
                      className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-darker to-primary-lighter rounded-full dark:opacity-80"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.8, delay: 0.5 }}
                    />
                  </span>
                </h1>
              </motion.div>

              {/* Enhanced Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-xl lg:text-2xl text-muted-foreground dark:text-primary-foreground/90 leading-relaxed max-w-2xl mx-auto lg:mx-0"
              >
                نظام متكامل يجمع بين <span className="font-semibold text-foreground dark:text-primary-foreground">نقطة البيع الذكية</span>،
                <span className="font-semibold text-foreground dark:text-primary-foreground"> إدارة المخزون المتقدمة</span>،
                و<span className="font-semibold text-foreground dark:text-primary-foreground">المتجر الإلكتروني الاحترافي</span> في منصة واحدة سهلة الاستخدام.
              </motion.p>

              {/* Premium Key Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="grid grid-cols-2 gap-4 max-w-2xl mx-auto lg:mx-0"
              >
                {[
                  { icon: Zap, text: "إعداد فوري في 3 دقائق", gradient: "from-yellow-400 to-orange-500" },
                  { icon: Shield, text: "حماية بنكية المستوى", gradient: "from-green-400 to-emerald-500" },
                  { icon: Globe, text: "متجر إلكتروني + دومين مجاني", gradient: "from-blue-400 to-indigo-500" },
                  { icon: BarChart3, text: "تحليلات ذكية بالذكاء الاصطناعي", gradient: "from-purple-400 to-pink-500" }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                    className="group flex items-center gap-3 p-4 rounded-2xl bg-card/50 dark:bg-card/30 backdrop-blur-sm border border-border/50 hover:border-primary/30 dark:hover:border-primary/50 transition-all duration-300 cursor-pointer"
                  >
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${feature.gradient} group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-foreground/90 group-hover:text-foreground transition-colors">{feature.text}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* Premium CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <Link to="/tenant/signup">
                  <Button 
                    size="lg" 
                    className="group relative min-w-[200px] h-14 text-lg font-semibold bg-primary hover:bg-primary-darker shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center justify-center text-primary-foreground">
                      ابدأ تجربتك المجانية
                      <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ArrowLeft className="h-5 w-5 mr-2" />
                      </motion.div>
                    </span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary-darker to-primary-lighter opacity-0 group-hover:opacity-100"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: 0 }}
                      transition={{ duration: 0.5 }}
                    />
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="group min-w-[200px] h-14 text-lg font-semibold border-2 border-border hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-300"
                >
                  <PlayCircle className="h-5 w-5 ml-2 text-muted-foreground group-hover:text-primary transition-colors" />
                  شاهد النظام بالعمل
                </Button>
              </motion.div>

              {/* Premium Animated Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
                className="flex flex-wrap justify-center lg:justify-start gap-6 pt-8"
              >
                {[
                  { value: salesCount, suffix: "+", label: "تاجر يثق بنا", icon: Store, gradient: "from-blue-500 to-indigo-500" },
                  { value: transactionsCount, suffix: "K+", label: "معاملة شهرية", icon: Activity, gradient: "from-green-500 to-emerald-500" },
                  { value: satisfactionCount, suffix: "%", label: "معدل الرضا", icon: Heart, gradient: "from-red-500 to-pink-500" }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="group relative text-center p-6 rounded-2xl bg-card/40 dark:bg-card/20 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                  >
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${stat.gradient} mb-3 group-hover:scale-110 transition-transform duration-300`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                      {stat.value}{stat.suffix}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right Column - Enhanced Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="relative perspective-1000"
            >
              
              {/* 3D Dashboard Preview */}
              <motion.div
                animate={{ 
                  rotateY: [0, 5, 0],
                  rotateX: [0, -5, 0]
                }}
                transition={{ 
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative transform-gpu"
              >
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-3xl blur-2xl transform scale-110"></div>
                
                {/* Premium Dashboard Card */}
                <div className="relative bg-card dark:bg-card/95 rounded-3xl shadow-2xl border border-border overflow-hidden backdrop-blur-xl">
                  
                  {/* Premium Browser Header */}
                  <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-muted/50 to-muted dark:from-muted/30 dark:to-muted/50 border-b border-border">
                    <div className="flex gap-2">
                      <motion.div 
                        whileHover={{ scale: 1.2 }}
                        className="w-3 h-3 rounded-full bg-red-500 cursor-pointer shadow-sm"
                      />
                      <motion.div 
                        whileHover={{ scale: 1.2 }}
                        className="w-3 h-3 rounded-full bg-yellow-500 cursor-pointer shadow-sm"
                      />
                      <motion.div 
                        whileHover={{ scale: 1.2 }}
                        className="w-3 h-3 rounded-full bg-green-500 cursor-pointer shadow-sm"
                      />
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="bg-background/70 dark:bg-background/50 rounded-lg px-4 py-2 text-sm text-muted-foreground text-center font-mono backdrop-blur-sm">
                        متجرك.stockiha.com
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-2 h-2 bg-green-500 rounded-full"
                      />
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">نشط</span>
                    </div>
                  </div>
                  
                  {/* Premium Dashboard Content */}
                  <div className="p-6 space-y-6 bg-gradient-to-b from-background/50 to-background dark:from-background/30 dark:to-background">
                    
                    {/* Header with live indicator */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        لوحة التحكم الذكية
                      </h3>
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="bg-gradient-to-r from-primary to-primary-darker text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium shadow-lg"
                      >
                        نشط الآن
                      </motion.div>
                    </div>
                    
                    {/* Premium Stats Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { 
                          label: "مبيعات اليوم", 
                          value: "124,560", 
                          suffix: "دج",
                          trend: "+18%",
                          color: "from-blue-500 to-blue-600",
                          icon: TrendingUp,
                          bgGradient: "from-blue-500/10 to-blue-600/5"
                        },
                        { 
                          label: "طلبات جديدة", 
                          value: "48", 
                          trend: "+12",
                          color: "from-green-500 to-green-600",
                          icon: ShoppingCart,
                          bgGradient: "from-green-500/10 to-green-600/5"
                        },
                        { 
                          label: "منتجات نشطة", 
                          value: "256", 
                          trend: "+8",
                          color: "from-purple-500 to-purple-600",
                          icon: Package,
                          bgGradient: "from-purple-500/10 to-purple-600/5"
                        },
                        { 
                          label: "عملاء جدد", 
                          value: "92", 
                          trend: "+24%",
                          color: "from-orange-500 to-orange-600",
                          icon: Users,
                          bgGradient: "from-orange-500/10 to-orange-600/5"
                        }
                      ].map((card, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          className={`relative bg-gradient-to-br ${card.bgGradient} dark:from-card dark:to-card/80 rounded-2xl p-4 shadow-sm border border-border/50 overflow-hidden group cursor-pointer`}
                        >
                          <div className="relative">
                            <div className="flex items-center justify-between mb-2">
                              <div className={`p-2 rounded-lg bg-gradient-to-r ${card.color} group-hover:scale-110 transition-transform`}>
                                <card.icon className="h-4 w-4 text-white" />
                              </div>
                              <span className="text-xs text-green-600 dark:text-green-400 font-semibold">{card.trend}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mb-1">{card.label}</div>
                            <div className="text-2xl font-bold text-foreground">
                              {card.value}
                              {card.suffix && <span className="text-sm font-normal text-muted-foreground mr-1">{card.suffix}</span>}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* Premium Live Chart */}
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 1.4 }}
                      className="bg-gradient-to-br from-muted/30 to-muted/10 dark:from-muted/20 dark:to-muted/5 rounded-2xl p-5 shadow-inner border border-border/50"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          تحليل المبيعات المباشر
                        </span>
                        <div className="flex items-center gap-2">
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-2 h-2 bg-green-500 rounded-full"
                          />
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">محدث الآن</span>
                        </div>
                      </div>
                      <div className="flex items-end gap-1.5 h-20">
                        {[40, 65, 45, 70, 85, 60, 90, 75, 95, 88, 92, 78].map((height, index) => (
                          <motion.div 
                            key={index}
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ duration: 0.5, delay: 1.5 + index * 0.05 }}
                            className="bg-gradient-to-t from-primary to-primary-lighter rounded-t-sm flex-1 relative group cursor-pointer hover:from-primary-darker hover:to-primary transition-all duration-300"
                          >
                            <motion.div
                              initial={{ opacity: 0 }}
                              whileHover={{ opacity: 1 }}
                              className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg"
                            >
                              {height * 13} دج
                            </motion.div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              {/* Premium Floating Elements */}
              <motion.div
                initial={{ opacity: 0, scale: 0, rotate: -180 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 1.8 }}
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="absolute -top-6 -right-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2 cursor-pointer"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <CheckCircle className="h-5 w-5" />
                </motion.div>
                طلب جديد وصل!
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 2 }}
                whileHover={{ scale: 1.05 }}
                className="absolute -bottom-6 -left-6 bg-gradient-to-r from-primary to-primary-darker text-primary-foreground px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2 cursor-pointer"
              >
                <TrendingUp className="h-5 w-5" />
                <span>+32% هذا الأسبوع</span>
              </motion.div>

              {/* Mobile App Preview */}
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 2.2 }}
                className="absolute -right-20 top-1/2 transform -translate-y-1/2"
              >
                <div className="relative">
                  <div className="bg-slate-900 rounded-[2rem] p-2 shadow-2xl">
                    <div className="bg-white rounded-[1.5rem] overflow-hidden w-32 h-64">
                      <div className="bg-blue-600 text-white p-3 text-center">
                        <Smartphone className="h-5 w-5 mx-auto mb-1" />
                        <div className="text-xs font-semibold">تطبيق الجوال</div>
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="bg-slate-100 rounded-lg p-2">
                          <div className="h-2 bg-slate-300 rounded w-3/4 mb-1"></div>
                          <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                          <div className="text-xs text-green-700 font-medium">طلب جديد</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge className="absolute -bottom-2 -left-2 bg-purple-600 text-white border-0">
                    قريباً
                  </Badge>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Premium Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mt-32 mb-20"
          >
            {/* Section Header */}
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Badge className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/15 text-primary dark:text-primary-foreground border border-primary/20 dark:border-primary/30 rounded-full mb-6">
                  <Rocket className="h-4 w-4" />
                  مميزات قوية
                </Badge>
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-4xl lg:text-5xl font-bold text-foreground dark:text-primary-foreground mb-4"
              >
                كل ما تحتاجه لنجاح تجارتك
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-xl text-muted-foreground dark:text-primary-foreground/90 max-w-3xl mx-auto"
              >
                نظام متكامل للتجار الجزائريين
              </motion.p>
            </div>

            {/* Premium Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Store,
                  title: "نقطة بيع متطورة",
                  description: "نظام كاشير سريع وسهل يدعم جميع طرق الدفع مع إمكانية العمل بدون انترنت",
                  gradient: "from-blue-500 to-blue-600",
                  bgGradient: "from-blue-500/5 to-blue-600/5",
                  features: ["دفع متعدد", "فواتير احترافية", "عمل أوفلاين"]
                },
                {
                  icon: Package,
                  title: "إدارة مخزون ذكية",
                  description: "تتبع دقيق للمخزون مع تنبيهات النفاد وتقارير حركة المنتجات",
                  gradient: "from-purple-500 to-purple-600",
                  bgGradient: "from-purple-500/5 to-purple-600/5",
                  features: ["تنبيهات تلقائية", "باركود", "جرد دوري"]
                },
                {
                  icon: Globe,
                  title: "متجر إلكتروني متكامل",
                  description: "متجر احترافي جاهز مع نظام دفع آمن وإدارة طلبات متقدمة",
                  gradient: "from-green-500 to-green-600",
                  bgGradient: "from-green-500/5 to-green-600/5",
                  features: ["تصميم متجاوب", "SEO محسّن", "دفع إلكتروني"]
                },
                {
                  icon: BarChart3,
                  title: "تحليلات وتقارير",
                  description: "رؤى عميقة لأداء متجرك مع تقارير مفصلة وتوقعات ذكية",
                  gradient: "from-orange-500 to-orange-600",
                  bgGradient: "from-orange-500/5 to-orange-600/5",
                  features: ["لوحات تفاعلية", "تقارير مخصصة", "تنبؤات AI"]
                },
                {
                  icon: Users,
                  title: "إدارة العملاء CRM",
                  description: "بناء علاقات قوية مع عملائك وبرامج ولاء مخصصة",
                  gradient: "from-pink-500 to-pink-600",
                  bgGradient: "from-pink-500/5 to-pink-600/5",
                  features: ["ملفات العملاء", "نقاط الولاء", "حملات تسويقية"]
                },
                {
                  icon: Shield,
                  title: "أمان وموثوقية",
                  description: "حماية بيانات بمعايير بنكية ونسخ احتياطي تلقائي يومي",
                  gradient: "from-indigo-500 to-indigo-600",
                  bgGradient: "from-indigo-500/5 to-indigo-600/5",
                  features: ["تشفير SSL", "نسخ احتياطي", "صلاحيات متقدمة"]
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className={`group relative bg-gradient-to-br ${feature.bgGradient} dark:from-card dark:to-card/90 rounded-3xl p-8 shadow-lg border border-border hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 overflow-hidden cursor-pointer`}
                >
                  {/* Premium Background Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* Premium Icon */}
                  <motion.div 
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300`}
                  >
                    <feature.icon className="h-8 w-8 text-white" />
                  </motion.div>
                  
                  {/* Content */}
                  <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  {/* Premium Feature List */}
                  <ul className="space-y-3">
                    {feature.features.map((item, idx) => (
                      <motion.li 
                        key={idx} 
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.5 + idx * 0.1 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-3 text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors"
                      >
                        <div className="p-1 rounded-full bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                          <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        <span>{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                  
                  {/* Hover Indicator */}
                  <motion.div
                    className="absolute bottom-6 left-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    initial={{ x: -10 }}
                    whileHover={{ x: 0 }}
                  >
                    <div className={`inline-flex items-center gap-2 text-sm font-medium bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                      تعرف أكثر
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';

export default HeroSection;