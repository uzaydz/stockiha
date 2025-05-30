import { useState, memo, useRef } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 1000], [0, -50]);
  
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
  
  return (
    <section ref={containerRef} className="relative py-32 bg-gradient-to-br from-background via-background/98 to-primary/5 dark:from-background dark:via-background/99 dark:to-primary/10 overflow-hidden landing-section">
      
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        {/* Animated Gradient Orbs */}
        <motion.div
          style={{ y: parallaxY }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 0.6 : 0 }}
          transition={{ duration: 1 }}
          className="absolute top-1/3 -left-1/4 w-[800px] h-[800px] bg-gradient-radial from-primary/20 via-primary/5 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          style={{ y: useTransform(parallaxY, y => y * 0.5) }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 0.5 : 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute bottom-1/3 -right-1/4 w-[1000px] h-[1000px] bg-gradient-radial from-primary-darker/15 via-primary/5 to-transparent rounded-full blur-3xl"
        />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.01]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='currentColor' stroke-width='1' /%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Floating Particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
            }}
            animate={{
              y: [null, Math.random() * -200 - 100],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: Math.random() * 8 + 8,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeOut"
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
          <Badge className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 rounded-full mb-6">
            <Layers className="h-4 w-4" />
            نظام شامل متكامل
          </Badge>
          
          <h2 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
            كل ما تحتاجه لإدارة <span className="bg-gradient-to-l from-primary via-primary-darker to-primary-lighter bg-clip-text text-transparent">متجرك بنجاح</span>
          </h2>
          
          <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto">
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
            className="flex flex-wrap justify-center gap-4 mb-16"
          >
            {systemFeatures.map((system) => (
              <motion.button
                key={system.id}
                onClick={() => setActiveSystem(system.id)}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  group relative inline-flex items-center gap-3 px-6 py-4 rounded-2xl font-medium 
                  transition-all duration-300 overflow-hidden
                  ${activeSystem === system.id 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                    : 'bg-card hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border hover:border-primary/30'
                  }
                `}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${system.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                <system.icon className={`h-5 w-5 ${activeSystem === system.id ? 'animate-pulse' : ''}`} />
                <span>{system.title}</span>
                
                {activeSystem === system.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 rounded-2xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </motion.button>
            ))}
          </motion.div>
          
          {/* Premium Content Display */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="grid lg:grid-cols-2 gap-16 items-center"
            >
              {/* Left Column - Feature Content */}
              <div className="space-y-8">
                {/* Icon and Title */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-start gap-6"
                >
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${activeFeature.gradient} shadow-lg`}>
                    <activeFeature.icon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-foreground mb-2">{activeFeature.title}</h3>
                    <p className="text-xl text-primary font-medium">{activeFeature.subtitle}</p>
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
                      transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      className="group relative p-5 rounded-2xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/30 transition-all duration-300 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="relative flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <feature.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                            {feature.title}
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
                
                {/* Stats and Benefits */}
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Stats */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="space-y-4"
                  >
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      إحصائيات مبهرة
                    </h4>
                    <div className="space-y-3">
                      {activeFeature.stats.map((stat, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                        >
                          <span className="text-sm text-muted-foreground">{stat.label}</span>
                          <span className={`text-lg font-bold bg-gradient-to-r ${activeFeature.gradient} bg-clip-text text-transparent`}>
                            {stat.value}
                          </span>
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
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      المزايا الرئيسية
                    </h4>
                    <ul className="space-y-2">
                      {activeFeature.benefits.map((benefit, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.9 + index * 0.1 }}
                          className="flex items-center gap-3 text-sm text-muted-foreground"
                        >
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
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
                  className="flex items-center gap-4"
                >
                  <Button 
                    size="lg"
                    className="group min-w-[200px] h-12 text-base font-semibold bg-primary hover:bg-primary-darker shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
                  >
                    استكشف {activeFeature.title}
                    <ArrowRight className="h-5 w-5 mr-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  
                  {isPlaying && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="h-12 px-6"
                    >
                      <PauseCircle className="h-5 w-5 ml-2" />
                      إيقاف العرض
                    </Button>
                  )}
                </motion.div>
              </div>
              
              {/* Right Column - Interactive Visual */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative perspective-1000"
              >
                {/* 3D Card Effect */}
                <motion.div
                  animate={{ 
                    rotateY: [-5, 5, -5],
                    rotateX: [5, -5, 5]
                  }}
                  transition={{ 
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative transform-gpu"
                >
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${activeFeature.gradient} opacity-30 rounded-3xl blur-2xl transform scale-110`} />
                  
                  {/* Main Visual Card */}
                  <div className="relative bg-card rounded-3xl shadow-2xl border border-border overflow-hidden">
                    {/* Feature Visual Header */}
                    <div className={`relative h-48 bg-gradient-to-br ${activeFeature.gradient} p-8`}>
                      <div className="absolute inset-0 bg-black/10" />
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="relative z-10"
                      >
                        <activeFeature.icon className="h-16 w-16 text-white mx-auto mb-4" />
                      </motion.div>
                      <h4 className="text-white text-center text-xl font-bold relative z-10">
                        {activeFeature.subtitle}
                      </h4>
                    </div>
                    
                    {/* Feature Preview Content */}
                    <div className="p-6 space-y-4">
                      {/* Mini Dashboard */}
                      <div className="grid grid-cols-2 gap-3">
                        {activeFeature.stats.slice(0, 4).map((stat, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                            whileHover={{ scale: 1.05 }}
                            className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center cursor-pointer"
                          >
                            <div className={`text-lg font-bold bg-gradient-to-r ${activeFeature.gradient} bg-clip-text text-transparent`}>
                              {stat.value}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
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
                        <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">عملية ناجحة</span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: "0%" }}
                              animate={{ width: "75%" }}
                              transition={{ duration: 1.5, delay: 1 }}
                              className={`h-full bg-gradient-to-r ${activeFeature.gradient}`}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">75%</span>
                        </div>
                      </motion.div>
                      
                      {/* Play Demo Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`w-full p-4 rounded-xl bg-gradient-to-r ${activeFeature.gradient} text-white font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300`}
                      >
                        <Play className="h-5 w-5" />
                        مشاهدة عرض توضيحي
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
                
                {/* Floating Feature Badges */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 1.2 }}
                  className="absolute -top-4 -right-4 bg-yellow-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2"
                >
                  <Star className="h-4 w-4" />
                  الأكثر شعبية
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 1.4 }}
                  className="absolute -bottom-4 -left-4 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
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
          className="mt-24 text-center"
        >
          <div className="inline-flex flex-col items-center gap-6 p-8 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
            <h3 className="text-2xl font-bold text-foreground">
              جاهز لتحويل متجرك إلى إمبراطورية رقمية؟
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl">
              انضم إلى آلاف التجار الناجحين واستفد من جميع هذه المميزات في نظام واحد متكامل
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button 
                size="lg"
                className="group min-w-[200px] h-14 text-lg font-semibold bg-primary hover:bg-primary-darker shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
              >
                ابدأ تجربتك المجانية
                <Rocket className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" />
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>لا حاجة لبطاقة ائتمان</span>
                <span className="mx-2">•</span>
                <Clock className="h-4 w-4" />
                <span>إعداد في 3 دقائق</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

AllInOneSection.displayName = 'AllInOneSection';

export default AllInOneSection;