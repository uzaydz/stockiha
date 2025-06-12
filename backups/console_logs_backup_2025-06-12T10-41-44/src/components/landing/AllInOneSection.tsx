import { useState, memo, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  // E-commerce Icons
  Globe, 
  MousePointerClick,
  ShieldCheck,
  CandlestickChart,
  Store,
  // POS Icons
  Zap,
  Printer,
  Package,
  WifiOff,
  ShoppingCart,
  CreditCard,
  // Service Icons
  Wrench, 
  QrCode, 
  Bell, 
  Headphones,
  // Management Icons
  Users,
  Building2,
  BarChart3,
  Smartphone,
  // Delivery Icons
  Truck,
  // System Icons
  Palette,
  Database,
  MessageSquare,
  // UI Icons
  CheckCircle,
  ArrowRight,
  Sparkles,
  Rocket,
  Star,
  Shield,
  Clock,
  Activity,
  Layers,
  Play,
  PauseCircle
} from 'lucide-react';

interface SystemFeature {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  features: {
    icon: React.ElementType;
    title: string;
    description: string;
  }[];
  stats: {
    value: string;
    label: string;
  }[];
  benefits: string[];
  demoVideo?: string;
}

const AllInOneSection = memo(() => {
  const [activeSystem, setActiveSystem] = useState('ecommerce');
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 1000], [0, -50]);
  
  // Auto-rotate through systems will be defined after systemFeatures
  
  // Stockiha's Complete System Features
  const systemFeatures: SystemFeature[] = [
    {
      id: 'ecommerce',
      title: 'التجارة الإلكترونية',
      subtitle: 'متجر إلكتروني متكامل',
      description: 'أطلق متجرك الإلكتروني في دقائق مع دومين مجاني وصفحات هبوط احترافية',
      icon: Globe,
      gradient: 'from-blue-500 to-indigo-600',
      features: [
        {
          icon: Store,
          title: 'متجر جاهز فوراً',
          description: 'دومين فرعي مجاني (yourstore.stockiha.com) مع تصميم قابل للتخصيص'
        },
        {
          icon: MousePointerClick,
          title: 'صفحات هبوط ديناميكية',
          description: 'صفحة مخصصة لكل منتج لزيادة معدل التحويل'
        },
        {
          icon: CandlestickChart,
          title: 'تتبع إعلاني متقدم',
          description: 'Pixel خاص لكل منتج مع دعم Meta و TikTok'
        },
        {
          icon: ShieldCheck,
          title: 'حماية من الطلبات الوهمية',
          description: 'نظام ذكي للتحقق من صحة الطلبات والعناوين'
        }
      ],
      stats: [
        { value: '+65%', label: 'معدل التحويل' },
        { value: '99.9%', label: 'دقة التتبع' },
        { value: '100%', label: 'حماية' }
      ],
      benefits: [
        'مزامنة فورية مع المخزون',
        'دعم الدفع عند الاستلام',
        'SEO محسّن لمحركات البحث',
        'تصميم متجاوب مع جميع الأجهزة'
      ]
    },
    {
      id: 'pos',
      title: 'نقطة البيع POS',
      subtitle: 'نظام كاشير سحابي متطور',
      description: 'نقطة بيع سريعة وذكية تعمل أونلاين وأوفلاين مع فواتير احترافية',
      icon: ShoppingCart,
      gradient: 'from-emerald-500 to-teal-600',
      features: [
        {
          icon: Zap,
          title: 'واجهة بيع سريعة',
          description: 'بحث سريع بالاسم، الباركود، أو QR مع دعم الدفع المتعدد'
        },
        {
          icon: Printer,
          title: 'فواتير مخصصة',
          description: 'طباعة حرارية أو PDF مع شعارك وبياناتك'
        },
        {
          icon: Package,
          title: 'إدارة مخزون مباشرة',
          description: 'تحديث فوري للكميات مع تنبيهات النفاد'
        },
        {
          icon: WifiOff,
          title: 'العمل بدون انترنت',
          description: 'مواصلة البيع أوفلاين مع مزامنة تلقائية'
        }
      ],
      stats: [
        { value: '50+', label: 'طلب/دقيقة' },
        { value: '100%', label: 'دقة المخزون' },
        { value: '24/7', label: 'عمل مستمر' }
      ],
      benefits: [
        'دعم الدفع الجزئي والمؤجل',
        'إدارة عدة نقاط بيع',
        'سجل كامل للفواتير',
        'تقارير مبيعات فورية'
      ]
    },
    {
      id: 'services',
      title: 'الخدمات والتصليح',
      subtitle: 'إدارة احترافية للخدمات',
      description: 'نظام متكامل لإدارة طلبات التصليح وخدمة ما بعد البيع',
      icon: Wrench,
      gradient: 'from-purple-500 to-pink-600',
      features: [
        {
          icon: QrCode,
          title: 'تذاكر خدمة بـ QR',
          description: 'كود تتبع فريد لكل طلب خدمة'
        },
        {
          icon: Bell,
          title: 'إشعارات تلقائية',
          description: 'تحديثات فورية للعملاء عن حالة الطلب'
        },
        {
          icon: Headphones,
          title: 'خدمة ما بعد البيع',
          description: 'إدارة الشكاوى والاستبدال والاسترجاع'
        },
        {
          icon: Activity,
          title: 'تتبع الحالة',
          description: 'متابعة مراحل الخدمة من الاستلام للتسليم'
        }
      ],
      stats: [
        { value: '24/7', label: 'تتبع مستمر' },
        { value: '95%', label: 'رضا العملاء' },
        { value: '100%', label: 'احترافية' }
      ],
      benefits: [
        'أرشيف كامل للطلبات',
        'تقييم حالة المنتجات',
        'تتبع محاسبي دقيق',
        'تقارير أداء الفنيين'
      ]
    },
    {
      id: 'management',
      title: 'الإدارة والتحليلات',
      subtitle: 'لوحة تحكم ذكية',
      description: 'أدوات قوية لإدارة الموظفين والعملاء مع تحليلات عميقة',
      icon: Building2,
      gradient: 'from-orange-500 to-red-600',
      features: [
        {
          icon: Users,
          title: 'إدارة شاملة',
          description: 'موظفين وعملاء وموردين في مكان واحد'
        },
        {
          icon: BarChart3,
          title: 'تحليلات ذكية',
          description: 'رؤى عميقة لأداء متجرك'
        },
        {
          icon: Smartphone,
          title: 'تطبيق جوال',
          description: 'إدارة أعمالك من أي مكان'
        },
        {
          icon: Shield,
          title: 'صلاحيات متقدمة',
          description: 'تحكم دقيق في صلاحيات الموظفين'
        }
      ],
      stats: [
        { value: 'لا محدود', label: 'مستخدمين' },
        { value: '360°', label: 'رؤية شاملة' },
        { value: '4.8★', label: 'تقييم التطبيق' }
      ],
      benefits: [
        'تتبع المديونية والدفعات',
        'برامج ولاء مخصصة',
        'تقارير مخصصة',
        'إشعارات push فورية'
      ]
    },
    {
      id: 'integration',
      title: 'التكامل والتوصيل',
      subtitle: 'ربط مع كل شيء',
      description: 'تكامل سلس مع +20 شركة توصيل وخدمات أخرى',
      icon: Truck,
      gradient: 'from-cyan-500 to-blue-600',
      features: [
        {
          icon: Truck,
          title: '20+ شركة توصيل',
          description: 'إرسال أوتوماتيكي ومتابعة الشحنات'
        },
        {
          icon: MessageSquare,
          title: 'واتساب API',
          description: 'رسائل تلقائية بالتحديثات والعروض'
        },
        {
          icon: Palette,
          title: 'تخصيص كامل',
          description: 'واجهات وفواتير بهويتك البصرية'
        },
        {
          icon: Database,
          title: 'نسخ احتياطي',
          description: 'حماية بياناتك كل 6 ساعات'
        }
      ],
      stats: [
        { value: '100%', label: 'أتمتة' },
        { value: '98%', label: 'معدل فتح' },
        { value: '24/7', label: 'حماية' }
      ],
      benefits: [
        'API مفتوح للمطورين',
        'تصدير واستيراد سهل',
        'دعم متعدد اللغات',
        'تحديثات تلقائية'
      ]
    }
  ];
  
  const activeFeature = systemFeatures.find(f => f.id === activeSystem) || systemFeatures[0];
  
  // Auto-rotate through systems
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setActiveSystem(prev => {
        const currentIndex = systemFeatures.findIndex(f => f.id === prev);
        const nextIndex = (currentIndex + 1) % systemFeatures.length;
        return systemFeatures[nextIndex].id;
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isPlaying]);
  
  return (
    <section 
      ref={containerRef} 
      className="relative py-20 md:py-32 bg-gradient-to-br from-background via-background/98 to-primary/5 dark:from-background dark:via-background/99 dark:to-primary/10 overflow-hidden"
    >
      
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Animated Gradient Orbs */}
        <motion.div
          style={{ y: parallaxY }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 0.4 : 0 }}
          transition={{ duration: 1.5 }}
          className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-radial from-primary/15 via-primary/5 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          style={{ y: useTransform(parallaxY, y => y * -0.5) }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 0.3 : 0 }}
          transition={{ duration: 1.5, delay: 0.2 }}
          className="absolute bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-gradient-radial from-primary-darker/10 via-primary/5 to-transparent rounded-full blur-3xl"
        />
        
        {/* Subtle Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 35px,
                hsl(var(--primary) / 0.03) 35px,
                hsl(var(--primary) / 0.03) 70px
              )
            `,
          }}
        />
        
        {/* Floating Particles - More subtle */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-primary/10 rounded-full blur-sm"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
            }}
            animate={{
              y: [null, Math.random() * -150 - 50],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut"
            }}
          />
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
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Badge 
              variant="outline" 
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-colors rounded-full mb-6"
            >
              <Layers className="h-4 w-4" />
              <span className="font-medium">نظام شامل متكامل</span>
            </Badge>
          </motion.div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-6 leading-tight">
            كل ما تحتاجه لإدارة{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-primary via-primary-darker to-primary bg-clip-text text-transparent">متجرك بنجاح</span>
              <motion.span
                className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-primary-darker/50 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              />
            </span>
          </h2>
          
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            منصة واحدة تجمع بين التجارة الإلكترونية، نقطة البيع، الخدمات، والإدارة الذكية في نظام متكامل وسهل الاستخدام
          </p>
        </motion.div>
        
        {/* Interactive System Tabs */}
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-3 mb-12 md:mb-16"
          >
            {systemFeatures.map((system, index) => (
              <motion.button
                key={system.id}
                onClick={() => {
                  setActiveSystem(system.id);
                  setIsPlaying(false);
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "group relative inline-flex items-center gap-2.5 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-medium text-sm md:text-base",
                  "transition-all duration-300 overflow-hidden backdrop-blur-sm",
                  activeSystem === system.id 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                    : "bg-card/80 hover:bg-card text-muted-foreground hover:text-foreground border border-border/50 hover:border-primary/30"
                )}
              >
                {/* Background Gradient Effect */}
                <motion.div 
                  className={`absolute inset-0 bg-gradient-to-br ${system.gradient}`}
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: activeSystem === system.id ? 0.15 : 0.1 }}
                  transition={{ duration: 0.3 }}
                />
                
                <system.icon className={cn(
                  "h-4 w-4 md:h-5 md:w-5 transition-transform duration-300",
                  activeSystem === system.id && "scale-110"
                )} />
                <span className="relative z-10">{system.title}</span>
                
                {activeSystem === system.id && (
                  <motion.div
                    layoutId="activeSystemTab"
                    className="absolute inset-0 bg-primary/5 rounded-xl md:rounded-2xl -z-10"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
              </motion.button>
            ))}
          </motion.div>
          
          {/* Premium Content Display */}
          <AnimatePresence mode="wait">
            <motion.div
              id="demo-section"
              key={activeFeature.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center"
            >
              {/* Left Column - Feature Content */}
              <div className="space-y-8">
                {/* Icon and Title */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-start gap-4 md:gap-6"
                >
                  <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl bg-gradient-to-br ${activeFeature.gradient} shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300`}>
                    <activeFeature.icon className="h-6 w-6 md:h-8 md:w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{activeFeature.title}</h3>
                    <p className="text-lg md:text-xl text-primary font-medium">{activeFeature.subtitle}</p>
                  </div>
                </motion.div>
                
                {/* Description */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-lg text-muted-foreground leading-relaxed"
                >
                  {activeFeature.description}
                </motion.p>
                
                {/* Features Grid */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="grid md:grid-cols-2 gap-4"
                >
                  {activeFeature.features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 + index * 0.08 }}
                      whileHover={{ scale: 1.02 }}
                      onHoverStart={() => setHoveredFeature(index)}
                      onHoverEnd={() => setHoveredFeature(null)}
                      className="group relative p-4 md:p-5 rounded-xl md:rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer"
                    >
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: hoveredFeature === index ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                      />
                      
                      <div className="relative flex items-start gap-3 md:gap-4">
                        <motion.div 
                          className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors"
                          animate={{ rotate: hoveredFeature === index ? 360 : 0 }}
                          transition={{ duration: 0.5 }}
                        >
                          <feature.icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                        </motion.div>
                        <div>
                          <h4 className="font-semibold text-sm md:text-base text-foreground mb-1 group-hover:text-primary transition-colors">
                            {feature.title}
                          </h4>
                          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
                
                {/* Stats and Benefits */}
                <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                  {/* Stats */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="space-y-4"
                  >
                    <h4 className="font-semibold text-sm md:text-base text-foreground flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      إحصائيات مبهرة
                    </h4>
                    <div className="space-y-3">
                      {activeFeature.stats.map((stat, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                          className="flex items-center justify-between p-2.5 md:p-3 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/30 transition-colors"
                        >
                          <span className="text-xs md:text-sm text-muted-foreground">{stat.label}</span>
                          <motion.span 
                            className={`text-base md:text-lg font-bold bg-gradient-to-r ${activeFeature.gradient} bg-clip-text text-transparent`}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            {stat.value}
                          </motion.span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                  
                  {/* Benefits */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    className="space-y-4"
                  >
                    <h4 className="font-semibold text-sm md:text-base text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary animate-pulse" />
                      المزايا الرئيسية
                    </h4>
                    <ul className="space-y-2">
                      {activeFeature.benefits.map((benefit, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.9 + index * 0.1 }}
                          className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.9 + index * 0.1 }}
                          >
                            <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-500 flex-shrink-0" />
                          </motion.div>
                          <span>{benefit}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                </div>
                
                {/* CTA Button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-8"
                >
                  <Button 
                    size="lg"
                    className="group w-full sm:w-auto min-w-[200px] h-12 text-sm md:text-base font-semibold bg-primary hover:bg-primary-darker shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
                  >
                    استكشف {activeFeature.title}
                    <ArrowRight className="h-4 w-4 md:h-5 md:w-5 mr-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="group w-full sm:w-auto h-12 px-6 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                  >
                    {isPlaying ? (
                      <>
                        <PauseCircle className="h-4 w-4 md:h-5 md:w-5 ml-2" />
                        إيقاف العرض التلقائي
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 md:h-5 md:w-5 ml-2 group-hover:scale-110 transition-transform" />
                        عرض تلقائي للمزايا
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
              
              {/* Right Column - Interactive Visual */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative perspective-1000 mt-8 lg:mt-0"
              >
                {/* 3D Card Effect */}
                <motion.div
                  animate={isInView ? { 
                    rotateY: [-3, 3, -3],
                    rotateX: [2, -2, 2]
                  } : {}}
                  transition={{ 
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative transform-gpu mx-auto max-w-md lg:max-w-none"
                >
                  {/* Glow Effect */}
                  <motion.div 
                    className={`absolute inset-0 bg-gradient-to-br ${activeFeature.gradient} rounded-3xl blur-2xl transform scale-110`}
                    animate={{ opacity: [0.2, 0.3, 0.2] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                  
                  {/* Main Visual Card */}
                  <Card className="relative rounded-2xl md:rounded-3xl shadow-2xl border-border/50 overflow-hidden bg-card/95 backdrop-blur-sm">
                    {/* Feature Visual Header */}
                    <div className={`relative h-40 md:h-48 bg-gradient-to-br ${activeFeature.gradient} p-6 md:p-8`}>
                      <div className="absolute inset-0 bg-black/5" />
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="relative z-10"
                      >
                        <activeFeature.icon className="h-12 w-12 md:h-16 md:w-16 text-white mx-auto mb-3 md:mb-4 drop-shadow-lg" />
                      </motion.div>
                      <h4 className="text-white text-center text-lg md:text-xl font-bold relative z-10 drop-shadow">
                        {activeFeature.subtitle}
                      </h4>
                    </div>
                    
                    {/* Feature Preview Content */}
                    <CardContent className="p-4 md:p-6 space-y-4">
                      {/* Mini Dashboard */}
                      <div className="grid grid-cols-2 gap-3">
                        {activeFeature.stats.slice(0, 4).map((stat, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                            whileHover={{ scale: 1.05 }}
                            className="p-2.5 md:p-3 rounded-lg md:rounded-xl bg-muted/20 border border-border/40 text-center cursor-pointer hover:bg-muted/30 hover:border-primary/30 transition-all"
                          >
                            <motion.div 
                              className={`text-base md:text-lg font-bold bg-gradient-to-r ${activeFeature.gradient} bg-clip-text text-transparent`}
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, delay: index * 0.2, repeat: Infinity }}
                            >
                              {stat.value}
                            </motion.div>
                            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                          </motion.div>
                        ))}
                      </div>
                      
                      {/* Action Preview */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                        className="space-y-2"
                      >
                        <motion.div 
                          className="flex items-center justify-between p-2.5 md:p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                          animate={{ scale: [1, 1.02, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <span className="text-xs md:text-sm font-medium text-green-600 dark:text-green-400">عملية ناجحة</span>
                          <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-500" />
                        </motion.div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: "0%" }}
                              animate={{ width: "75%" }}
                              transition={{ duration: 1.5, delay: 1 }}
                              className={`h-full bg-gradient-to-r ${activeFeature.gradient}`}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">75%</span>
                        </div>
                      </motion.div>
                      
                      {/* Play Demo Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`w-full p-3 md:p-4 rounded-lg md:rounded-xl bg-gradient-to-r ${activeFeature.gradient} text-white font-medium text-sm md:text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 group`}
                      >
                        <Play className="h-4 w-4 md:h-5 md:w-5 group-hover:scale-110 transition-transform" />
                        مشاهدة عرض توضيحي
                      </motion.button>
                    </CardContent>
                  </Card>
                </motion.div>
                
                {/* Floating Feature Badges */}
                <motion.div
                  initial={{ opacity: 0, scale: 0, rotate: -12 }}
                  animate={{ opacity: 1, scale: 1, rotate: -6 }}
                  transition={{ duration: 0.4, delay: 1.2, type: "spring" }}
                  className="absolute -top-3 -right-3 md:-top-4 md:-right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full shadow-lg text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2"
                >
                  <Star className="h-3 w-3 md:h-4 md:w-4" />
                  الأكثر شعبية
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0, rotate: 12 }}
                  animate={{ opacity: 1, scale: 1, rotate: 6 }}
                  transition={{ duration: 0.4, delay: 1.4, type: "spring" }}
                  className="absolute -bottom-3 -left-3 md:-bottom-4 md:-left-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full shadow-lg text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2"
                >
                  <Shield className="h-3 w-3 md:h-4 md:w-4" />
                  آمن 100%
                </motion.div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Bottom CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 md:mt-24 text-center px-4"
        >
          <motion.div 
            className="inline-flex flex-col items-center gap-4 md:gap-6 p-6 md:p-8 rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20 backdrop-blur-sm max-w-4xl mx-auto w-full"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.3 }}
          >
            <motion.h3 
              className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              جاهز لتحويل متجرك إلى إمبراطورية رقمية؟
            </motion.h3>
            <motion.p 
              className="text-base md:text-lg text-muted-foreground max-w-2xl"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              انضم إلى آلاف التجار الناجحين واستفد من جميع هذه المميزات في نظام واحد متكامل
            </motion.p>
            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button 
                size="lg"
                className="group w-full sm:w-auto min-w-[200px] h-12 md:h-14 text-base md:text-lg font-semibold bg-primary hover:bg-primary-darker shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
              >
                ابدأ تجربتك المجانية
                <Rocket className="h-4 w-4 md:h-5 md:w-5 mr-2 group-hover:rotate-12 transition-transform" />
              </Button>
              
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 text-xs md:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span>لا حاجة لبطاقة ائتمان</span>
                </div>
                <span className="mx-1">•</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span>إعداد في 3 دقائق</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
});

AllInOneSection.displayName = 'AllInOneSection';

export default AllInOneSection;
