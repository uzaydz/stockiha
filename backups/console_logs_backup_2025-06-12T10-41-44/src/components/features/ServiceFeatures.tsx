import { useState, useRef, useEffect } from 'react';
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
  // Service Icons
  Wrench, 
  FileText, 
  QrCode, 
  Bell, 
  Headphones,
  ClipboardCheck,
  // Management Icons
  Users,
  Building2,
  UserCheck,
  BarChart3,
  // Delivery Icons
  Truck,
  MapPin,
  PackageCheck,
  // Analytics Icons
  TrendingUp,
  Activity,
  PieChart,
  // System Icons
  Smartphone,
  Palette,
  Lock,
  Database,
  // UI Icons
  CheckCircle,
  ArrowRight,
  Sparkles,
  Rocket,
  Star,
  Heart,
  Shield,
  Clock,
  DollarSign,
  ChevronRight,
  Play,
  Layers,
  Cpu,
  CloudUpload,
  MessageSquare,
  Gift,
  Target,
  Settings
} from 'lucide-react';

const ServiceFeatures = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.1 });
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 1000], [0, -100]);

  // تعريف المميزات الرئيسية
  const features = [
    {
      icon: Wrench,
      title: "تذاكر منظمة",
      description: "نظام تذاكر احترافي",
      color: "from-orange-500 to-red-600"
    },
    {
      icon: QrCode,
      title: "تتبع بـ QR",
      description: "كود تتبع لكل طلب",
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: Bell,
      title: "إشعارات فورية",
      description: "تحديثات للعملاء",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: Headphones,
      title: "خدمة ما بعد البيع",
      description: "استبدال واسترجاع",
      color: "from-purple-500 to-violet-600"
    }
  ];

  // تعريف حالات سير العمل
  const states = [
    { status: "استلام", color: "bg-blue-500" },
    { status: "فحص", color: "bg-yellow-500" },
    { status: "جاهز", color: "bg-green-500" },
    { status: "تسليم", color: "bg-purple-500" }
  ];

  // نظام Stockiha المتكامل
  const systemTabs = [
    { id: 'overview', label: 'نظرة عامة', icon: Layers },
    { id: 'ecommerce', label: 'التجارة الإلكترونية', icon: Globe },
    { id: 'pos', label: 'نقطة البيع', icon: ShoppingCart },
    { id: 'services', label: 'الخدمات', icon: Wrench },
    { id: 'management', label: 'الإدارة', icon: Building2 },
    { id: 'integration', label: 'التكامل', icon: Settings }
  ];

  // محتوى كل قسم
  const systemContent = {
    overview: {
      title: "منصة شاملة لنجاح تجارتك",
      description: "نظام متكامل يجمع كل ما تحتاجه لإدارة وتنمية أعمالك في مكان واحد",
      features: [
        {
          icon: Rocket,
          title: "إطلاق سريع",
          description: "ابدأ في 3 دقائق فقط",
          stat: "3 دقائق"
        },
        {
          icon: Users,
          title: "تجار نشطون",
          description: "ينضمون إلينا يومياً",
          stat: "5000+"
        },
        {
          icon: TrendingUp,
          title: "نمو المبيعات",
          description: "متوسط زيادة المبيعات",
          stat: "+45%"
        },
        {
          icon: Shield,
          title: "أمان مطلق",
          description: "حماية على مدار الساعة",
          stat: "99.9%"
        }
      ],
      highlights: [
        "نظام متكامل للبيع والإدارة والتوصيل",
        "يعمل أونلاين وأوفلاين بسلاسة",
        "دعم فني على مدار الساعة",
        "تحديثات مستمرة بدون توقف"
      ]
    },
    ecommerce: {
      title: "متجر إلكتروني احترافي",
      description: "حول زوارك إلى عملاء مع متجر إلكتروني متكامل وصفحات هبوط عالية التحويل",
      features: [
        {
          icon: Globe,
          title: "متجر جاهز فوراً",
          description: "دومين فرعي مجاني yourstore.stockiha.com",
          stat: "مجاني 100%"
        },
        {
          icon: MousePointerClick,
          title: "صفحات هبوط ديناميكية",
          description: "صفحة مخصصة لكل منتج",
          stat: "تحويل +65%"
        },
        {
          icon: CandlestickChart,
          title: "تتبع إعلاني متقدم",
          description: "Pixel لكل منتج - Meta & TikTok",
          stat: "دقة 99.9%"
        },
        {
          icon: ShieldCheck,
          title: "حماية ذكية",
          description: "من الطلبات الوهمية والسبام",
          stat: "حماية 100%"
        }
      ],
      highlights: [
        "تصميم متجاوب مع جميع الأجهزة",
        "SEO محسّن لمحركات البحث",
        "دعم الدفع عند الاستلام",
        "تكامل مع وسائل التواصل"
      ]
    },
    pos: {
      title: "نقطة بيع سحابية متطورة",
      description: "نظام كاشير سريع وذكي يعمل في جميع الظروف مع أو بدون انترنت",
      features: [
        {
          icon: Zap,
          title: "بيع سريع",
          description: "واجهة سهلة وبديهية",
          stat: "50+ طلب/دقيقة"
        },
        {
          icon: Printer,
          title: "فواتير احترافية",
          description: "طباعة حرارية و PDF",
          stat: "100% مخصصة"
        },
        {
          icon: Package,
          title: "مخزون مباشر",
          description: "تحديث فوري للكميات",
          stat: "دقة 100%"
        },
        {
          icon: WifiOff,
          title: "عمل أوفلاين",
          description: "البيع بدون انترنت",
          stat: "مزامنة تلقائية"
        }
      ],
      highlights: [
        "بحث سريع بالاسم والباركود",
        "دعم الدفع الجزئي والمؤجل",
        "إدارة عدة نقاط بيع",
        "تقارير مبيعات فورية"
      ]
    },
    services: {
      title: "إدارة الخدمات والتصليح",
      description: "نظام متكامل لإدارة طلبات التصليح وخدمة ما بعد البيع بكفاءة عالية",
      features: [
        {
          icon: Wrench,
          title: "تذاكر منظمة",
          description: "نظام تذاكر احترافي",
          stat: "تتبع 24/7"
        },
        {
          icon: QrCode,
          title: "تتبع بـ QR",
          description: "كود تتبع لكل طلب",
          stat: "سهولة 100%"
        },
        {
          icon: Bell,
          title: "إشعارات فورية",
          description: "تحديثات للعملاء",
          stat: "رضا 95%"
        },
        {
          icon: Headphones,
          title: "خدمة ما بعد البيع",
          description: "استبدال واسترجاع",
          stat: "احترافية 100%"
        }
      ],
      highlights: [
        "تحديث حالة الطلب مباشرة",
        "أرشيف كامل للطلبات",
        "تقييم حالة المنتجات",
        "تتبع محاسبي دقيق"
      ]
    },
    management: {
      title: "إدارة شاملة للأعمال",
      description: "أدوات قوية لإدارة الموظفين والعملاء والموردين بكفاءة عالية",
      features: [
        {
          icon: Users,
          title: "إدارة الموظفين",
          description: "صلاحيات مخصصة",
          stat: "لا محدود"
        },
        {
          icon: Building2,
          title: "CRM متكامل",
          description: "إدارة العملاء والموردين",
          stat: "360° رؤية"
        },
        {
          icon: BarChart3,
          title: "تحليلات ذكية",
          description: "رؤى عميقة للأداء",
          stat: "بيانات حية"
        },
        {
          icon: Smartphone,
          title: "تطبيق جوال",
          description: "إدارة من أي مكان",
          stat: "4.8★ تقييم"
        }
      ],
      highlights: [
        "تتبع المديونية والدفعات",
        "سجلات مفصلة للنشاط",
        "تقارير مخصصة",
        "إشعارات push فورية"
      ]
    },
    integration: {
      title: "تكامل سلس مع كل شيء",
      description: "ربط مع أكثر من 20 شركة توصيل وعشرات الخدمات الأخرى",
      features: [
        {
          icon: Truck,
          title: "20+ شركة توصيل",
          description: "تكامل مع جميع الشركات المحلية",
          stat: "أوتوماتيكي 100%"
        },
        {
          icon: MessageSquare,
          title: "واتساب API",
          description: "رسائل تلقائية للعملاء",
          stat: "معدل فتح 98%"
        },
        {
          icon: Palette,
          title: "تخصيص كامل",
          description: "هوية بصرية متكاملة",
          stat: "مرونة 100%"
        },
        {
          icon: Database,
          title: "نسخ احتياطي",
          description: "حماية البيانات",
          stat: "كل 6 ساعات"
        }
      ],
      highlights: [
        "API مفتوح للمطورين",
        "تصدير واستيراد سهل",
        "دعم متعدد اللغات",
        "تحديثات تلقائية"
      ]
    }
  };

  return (
    <div className="container mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-4 py-2 rounded-full mb-4">
          <Wrench className="w-5 h-5" />
          <span className="font-semibold">الخدمات وطلب التصليح</span>
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          إدارة احترافية للخدمات
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          نظام متكامل لإدارة طلبات التصليح والخدمات بكفاءة عالية
        </p>
      </motion.div>

      {/* المميزات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all group"
          >
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} p-2.5 mb-4 group-hover:scale-110 transition-transform`}>
              <feature.icon className="w-full h-full text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>

      {/* سير العمل */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 rounded-3xl p-8 lg:p-12"
      >
        <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-12">
          سير عمل بسيط وفعال
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {states.map((state, index) => (
            <div key={index} className="text-center">
              <div className="relative">
                <div className={`w-16 h-16 ${state.color} rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl`}>
                  {index + 1}
                </div>
                {index < states.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gray-300 dark:bg-gray-600 -translate-y-1/2"></div>
                )}
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{state.status}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {index === 0 && "استلام الجهاز وتسجيل البيانات"}
                {index === 1 && "فحص وإصلاح الجهاز"}
                {index === 2 && "الجهاز جاهز للتسليم"}
                {index === 3 && "تسليم الجهاز للعميل"}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Section Content */}
      <div className="text-center max-w-4xl mx-auto mb-20">
        <h2 className="text-4xl lg:text-6xl font-bold mb-6">
          <span className="text-foreground">
            {systemContent[activeTab].title}
          </span>
        </h2>
        <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto">
          {systemContent[activeTab].description}
        </p>
      </div>
    </div>
  );
};

export default ServiceFeatures;
