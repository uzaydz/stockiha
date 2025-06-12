import { memo, useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Store, 
  Globe, 
  Users, 
  BarChart3,
  Shield,
  Smartphone,
  Zap,
  Package,
  CreditCard,
  TrendingUp,
  ShoppingCart,
  Truck,
  Gift,
  Target,
  Lock,
  QrCode,
  Printer,
  FileText,
  Wrench,
  UserCheck,
  WifiOff,
  MousePointerClick,
  BarChart,
  ShieldCheck,
  Palette,
  Link2,
  Headphones,
  ChevronRight,
  CheckCircle,
  Star,
  Sparkles,
  Activity,
  Rocket,
  ArrowUpRight,
  Monitor,
  Search,
  Settings2,
  ClipboardList,
  MessageSquare,
  Building2,
  LayoutDashboard,
  CandlestickChart,
  DollarSign
} from 'lucide-react';

const FeaturesSection = memo(() => {
  const [activeCategory, setActiveCategory] = useState('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.1 });
  
  // Categories based on Stockiha's actual features
  const categories = [
    { id: 'all', label: 'جميع المميزات', icon: LayoutDashboard },
    { id: 'ecommerce', label: 'التجارة الإلكترونية', icon: Globe },
    { id: 'pos', label: 'نقطة البيع', icon: ShoppingCart },
    { id: 'services', label: 'الخدمات', icon: Wrench },
    { id: 'management', label: 'الإدارة', icon: Building2 },
    { id: 'delivery', label: 'التوصيل', icon: Truck },
    { id: 'analytics', label: 'التحليلات', icon: BarChart3 }
  ];
  
  // Stockiha's actual features
  const features = [
    // 🛍️ E-commerce Features
    {
      icon: Globe,
      title: "متجر إلكتروني احترافي",
      description: "متجر جاهز بدومين فرعي خاص (yourstore.stockiha.com) مع مزامنة فورية مع المخزون",
      category: 'ecommerce',
      gradient: "from-blue-500 to-indigo-600",
      bgGradient: "from-blue-500/10 to-indigo-600/10",
      stats: "تحويل +45%",
      highlights: [
        "دومين فرعي مجاني",
        "واجهة قابلة للتخصيص",
        "دعم الدفع عند الاستلام",
        "عرض المنتجات والخدمات"
      ]
    },
    {
      icon: MousePointerClick,
      title: "صفحات هبوط ديناميكية",
      description: "إنشاء صفحة هبوط احترافية لكل منتج أو عرض مع تصميم قابل للتعديل",
      category: 'ecommerce',
      gradient: "from-purple-500 to-pink-600",
      bgGradient: "from-purple-500/10 to-pink-600/10",
      stats: "تحويل +65%",
      highlights: [
        "تصميم احترافي",
        "مناسب للإعلانات الممولة",
        "أعلى معدل تحويل",
        "قوالب جاهزة"
      ]
    },
    {
      icon: CandlestickChart,
      title: "نظام تتبع إعلاني قوي",
      description: "Pixel خاص لكل منتج مع دعم عدد لا نهائي من بيكسلات Meta و TikTok",
      category: 'ecommerce',
      gradient: "from-green-500 to-emerald-600",
      bgGradient: "from-green-500/10 to-emerald-600/10",
      stats: "دقة 99.9%",
      highlights: [
        "بيكسل لكل منتج",
        "دعم Meta و TikTok",
        "تحليل دقيق للحملات",
        "تتبع التحويلات"
      ]
    },
    {
      icon: ShieldCheck,
      title: "حماية من الطلبات الوهمية",
      description: "نظام حماية تلقائي من الطلبات الوهمية مع تحقق ذكي من الأرقام والعناوين",
      category: 'ecommerce',
      gradient: "from-red-500 to-orange-600",
      bgGradient: "from-red-500/10 to-orange-600/10",
      stats: "حماية 100%",
      highlights: [
        "تحقق ذكي",
        "رصد محاولات السبام",
        "حماية تلقائية",
        "قائمة سوداء ذكية"
      ]
    },
    
    // ⚡ POS Features
    {
      icon: Zap,
      title: "واجهة بيع سريعة POS",
      description: "واجهة سهلة للعمال والمديرين مع دعم البحث بالاسم والباركود و QR",
      category: 'pos',
      gradient: "from-amber-500 to-orange-600",
      bgGradient: "from-amber-500/10 to-orange-600/10",
      stats: "50+ طلب/دقيقة",
      highlights: [
        "بحث سريع متعدد",
        "دفع جزئي ومؤجل",
        "اختيار العميل",
        "واجهة بديهية"
      ]
    },
    {
      icon: Printer,
      title: "فواتير مخصصة احترافية",
      description: "طباعة حرارية أو A4 PDF مع تخصيص كامل للشعار والبيانات",
      category: 'pos',
      gradient: "from-teal-500 to-cyan-600",
      bgGradient: "from-teal-500/10 to-cyan-600/10",
      stats: "100% مخصصة",
      highlights: [
        "طباعة حرارية",
        "تصدير PDF",
        "شعار وتوقيع",
        "سجل كامل"
      ]
    },
    {
      icon: Package,
      title: "إدارة مخزون دقيقة",
      description: "كميات مباشرة حية مع تنبيهات انخفاض المخزون ودعم المنتجات المتغيرة",
      category: 'pos',
      gradient: "from-indigo-500 to-blue-600",
      bgGradient: "from-indigo-500/10 to-blue-600/10",
      stats: "دقة 100%",
      highlights: [
        "تحديث مباشر",
        "تنبيهات ذكية",
        "منتجات متغيرة",
        "باركودات متعددة"
      ]
    },
    
    // 🛠️ Services Features
    {
      icon: Wrench,
      title: "نظام طلبات التصليح",
      description: "فتح تذكرة خدمة منظمة مع طباعة كود تتبع أو QR Code",
      category: 'services',
      gradient: "from-slate-600 to-gray-700",
      bgGradient: "from-slate-600/10 to-gray-700/10",
      stats: "تتبع 24/7",
      highlights: [
        "تذاكر منظمة",
        "كود تتبع QR",
        "تحديث الحالة",
        "إعلام تلقائي"
      ]
    },
    {
      icon: Headphones,
      title: "خدمة ما بعد البيع",
      description: "إدارة الشكاوى والاستبدال والاسترجاع بشكل منظم مع تتبع محاسبي",
      category: 'services',
      gradient: "from-violet-500 to-purple-600",
      bgGradient: "from-violet-500/10 to-purple-600/10",
      stats: "رضا 95%",
      highlights: [
        "إدارة الشكاوى",
        "استبدال واسترجاع",
        "تقييم المنتج",
        "أرشيف كامل"
      ]
    },
    
    // 👨‍💼 Management Features
    {
      icon: Users,
      title: "إدارة الموظفين والصلاحيات",
      description: "عدد غير محدود من الحسابات مع صلاحيات حسب الدور وتتبع النشاط",
      category: 'management',
      gradient: "from-pink-500 to-rose-600",
      bgGradient: "from-pink-500/10 to-rose-600/10",
      stats: "لا محدود",
      highlights: [
        "حسابات لا محدودة",
        "صلاحيات مخصصة",
        "تتبع النشاط",
        "سجلات مفصلة"
      ]
    },
    {
      icon: Building2,
      title: "إدارة العملاء والموردين",
      description: "معلومات كاملة حول المعاملات مع تتبع المديونية والدفعات",
      category: 'management',
      gradient: "from-emerald-500 to-green-600",
      bgGradient: "from-emerald-500/10 to-green-600/10",
      stats: "CRM متكامل",
      highlights: [
        "سجل المعاملات",
        "تتبع المديونية",
        "إدارة الدفعات",
        "تقارير مفصلة"
      ]
    },
    
    // 📦 Delivery Features
    {
      icon: Truck,
      title: "ربط مع 20+ شركة توصيل",
      description: "تكامل مع أكثر من 20 شركة توصيل جزائرية مع إرسال أوتوماتيكي",
      category: 'delivery',
      gradient: "from-blue-500 to-cyan-600",
      bgGradient: "from-blue-500/10 to-cyan-600/10",
      stats: "20+ شركة",
      highlights: [
        "إرسال أوتوماتيكي",
        "متابعة الشحنات",
        "تصدير سهل",
        "شركة افتراضية"
      ]
    },
    
    // 📊 Analytics Features
    {
      icon: BarChart3,
      title: "تحليلات ذكية شاملة",
      description: "أداء كل منتج وحملة وزبون مع مصادر الترافيك وتحليل الطلبات المتروكة",
      category: 'analytics',
      gradient: "from-purple-500 to-indigo-600",
      bgGradient: "from-purple-500/10 to-indigo-600/10",
      stats: "بيانات حية",
      highlights: [
        "تحليل كل منتج",
        "مصادر الترافيك",
        "طلبات متروكة",
        "إحصائيات تفاعلية"
      ]
    },
    
    // Additional Key Features
    {
      icon: WifiOff,
      title: "العمل بدون انترنت",
      description: "مواصلة البيع بدون إنترنت مع مزامنة تلقائية عند توفر الاتصال",
      category: 'pos',
      gradient: "from-gray-600 to-slate-700",
      bgGradient: "from-gray-600/10 to-slate-700/10",
      stats: "أوفلاين 100%",
      highlights: [
        "بيع بدون انترنت",
        "مزامنة تلقائية",
        "حفظ البيانات",
        "للمحلات الضعيفة"
      ]
    },
    {
      icon: Smartphone,
      title: "تطبيق جوال خفيف",
      description: "تطبيق أندرويد (iOS قريباً) لإدارة الطلبيات والفواتير من الجوال",
      category: 'management',
      gradient: "from-indigo-500 to-purple-600",
      bgGradient: "from-indigo-500/10 to-purple-600/10",
      stats: "4.8★ تقييم",
      highlights: [
        "تطبيق خفيف",
        "إشعارات فورية",
        "وضع داكن/نهاري",
        "إدارة كاملة"
      ]
    },
    {
      icon: Palette,
      title: "تخصيص شامل للنظام",
      description: "تخصيص لوحة التحكم والفواتير والمتجر ليتماشى مع هويتك البصرية",
      category: 'ecommerce',
      gradient: "from-pink-500 to-purple-600",
      bgGradient: "from-pink-500/10 to-purple-600/10",
      stats: "100% مرن",
      highlights: [
        "تخصيص الواجهة",
        "هوية بصرية",
        "لغات متعددة",
        "قوالب مخصصة"
      ]
    }
  ];

  // Filter features based on category
  const filteredFeatures = activeCategory === 'all' 
    ? features 
    : features.filter(f => f.category === activeCategory);

  return (
    <section ref={containerRef} className="relative py-32 bg-gradient-to-br from-background via-background/98 to-primary/5 dark:from-background dark:via-background/99 dark:to-primary/10 overflow-hidden">
      
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Animated Gradient Orbs */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isInView ? 0.4 : 0, scale: 1 }}
          transition={{ duration: 2 }}
          className="absolute top-1/4 -left-1/4 w-[700px] h-[700px] bg-gradient-radial from-primary/15 via-primary/5 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isInView ? 0.3 : 0, scale: 1 }}
          transition={{ duration: 2, delay: 0.3 }}
          className="absolute bottom-1/4 -right-1/4 w-[900px] h-[900px] bg-gradient-radial from-purple-500/10 via-primary/5 to-transparent rounded-full blur-3xl"
        />
        
        {/* Subtle Animated Dots */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/10 rounded-full"
            initial={{ 
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              opacity: 0
            }}
            animate={{
              y: [null, Math.random() * -200 - 100],
              opacity: [0, 0.6, 0],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              duration: Math.random() * 15 + 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut"
            }}
          />
        ))}
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.008]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='currentColor' stroke-width='1' /%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="container px-6 mx-auto relative z-10">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-20"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/5 dark:from-primary/20 dark:via-primary/15 dark:to-primary/10 text-primary dark:text-primary-foreground border border-primary/20 dark:border-primary/30 rounded-full mb-6 backdrop-blur-sm shadow-lg">
              <Rocket className="h-4 w-4 animate-pulse" />
              نظام متكامل للتجار الجزائريين
            </Badge>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            كل ما تحتاجه لنجاح{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-primary via-primary-darker to-primary bg-clip-text text-transparent">
                تجارتك الرقمية
              </span>
              <motion.div
                className="absolute -bottom-2 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/60 via-primary-darker/60 to-primary/60 rounded-full"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
                viewport={{ once: true }}
              />
            </span>
          </h2>
          
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            منصة شاملة تجمع بين البيع، الإدارة، التوصيل، والأتمتة في نظام واحد سهل الاستخدام مُصمم خصيصاً للتجار الجزائريين
          </p>
        </motion.div>
        
        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-4 mb-16"
        >
          {categories.map((category) => (
            <motion.button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              whileHover={{ y: -1 }}
              whileTap={{ y: 0 }}
              className={`
                group inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-medium transition-all duration-200
                ${activeCategory === category.id 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                  : 'bg-card hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border hover:border-primary/30'
                }
              `}
            >
              <category.icon className={`h-5 w-5 ${activeCategory === category.id ? 'animate-pulse' : ''}`} />
              <span>{category.label}</span>
              {category.id === 'all' && (
                <Badge className="ml-2 bg-primary-foreground/20 text-primary-foreground border-0">
                  {features.length}
                </Badge>
              )}
            </motion.button>
          ))}
        </motion.div>
        
        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto"
             role="region" 
             aria-label="مميزات النظام">
          <AnimatePresence mode="popLayout">
            {filteredFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ 
                  duration: 0.4, 
                  delay: index * 0.05,
                  layout: { duration: 0.3 }
                }}
                viewport={{ once: true }}
                className="relative group"
              >
                <div 
                  className={`
                    relative h-full bg-gradient-to-br ${feature.bgGradient} dark:from-card dark:to-card/90 
                    rounded-3xl p-6 shadow-lg border border-border hover:border-primary/40 
                    hover:shadow-xl transition-all duration-200 overflow-hidden cursor-pointer
                    group-hover:translate-y-[-2px] backdrop-blur-sm
                  `}
                  role="article"
                  aria-labelledby={`feature-title-${index}`}
                  tabIndex={0}
                >
                  {/* Hover Gradient Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r ${feature.gradient} rounded-2xl mb-4 shadow-lg group-hover:shadow-xl transition-all duration-200 relative z-10`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  
                  {/* Stats Badge */}
                  <Badge className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm text-xs font-medium border border-border/20 text-primary relative z-10">
                    {feature.stats}
                  </Badge>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <h3 
                      id={`feature-title-${index}`}
                      className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors"
                    >
                      {feature.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {feature.description}
                    </p>
                    
                    {/* Highlights - Always show 3 items for consistency */}
                    <div className="space-y-2">
                      {feature.highlights.slice(0, 3).map((highlight, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                          <span className="leading-relaxed">{highlight}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Action Indicator */}
                    <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary/80 group-hover:text-primary transition-colors">
                      <span>استكشف المميزات</span>
                      <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-primary/5 via-background/50 to-primary/5 rounded-3xl p-8 md:p-12 border border-primary/20 backdrop-blur-sm">
            <div className="text-center mb-8">
              <motion.h3 
                className="text-2xl md:text-3xl font-bold text-foreground mb-4"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                viewport={{ once: true }}
              >
                جاهز لتحويل متجرك إلى إمبراطورية رقمية؟
              </motion.h3>
              <motion.p 
                className="text-lg text-muted-foreground mb-8"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                viewport={{ once: true }}
              >
                ابدأ تجربتك المجانية اليوم واكتشف كيف يمكن لنظامنا المتكامل أن يحول تجارتك
              </motion.p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
              <Button 
                size="lg"
                className="group min-w-[250px] h-14 text-lg font-semibold bg-primary hover:bg-primary-darker shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 rounded-2xl"
              >
                ابدأ تجربتك المجانية 14 يوم
                <Rocket className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" />
              </Button>
              
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary-darker/20 border-2 border-background flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                  ))}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">5000+</span> تاجر يثق بنا
                  </p>
                </div>
              </div>
            </div>
            
            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="flex flex-wrap justify-center gap-6 pt-6 border-t border-border/20"
            >
              {[
                { icon: Shield, text: "آمن 100%" },
                { icon: Headphones, text: "دعم 24/7" },
                { icon: Zap, text: "إعداد فوري" },
                { icon: DollarSign, text: "بدون عمولات خفية" }
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <item.icon className="h-4 w-4 text-primary" />
                  <span>{item.text}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

FeaturesSection.displayName = 'FeaturesSection';

export default FeaturesSection;
