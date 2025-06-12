import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  Sparkles, 
  Wand2, 
  Palette, 
  Layout, 
  Database,
  Code,
  Eye,
  Save,
  Undo2,
  Redo2,
  Settings,
  Plus,
  X,
  ChevronRight,
  Layers,
  Image,
  Type,
  Package,
  ShoppingCart,
  Star,
  Users,
  MessageSquare,
  Mail,
  TrendingUp,
  Zap,
  Brain,
  Rocket,
  Shield,
  ArrowRight,
  CheckCircle
} from 'lucide-react'
import { StoreEditor } from '@/features/store-editor/components/StoreEditor'
import { PageConfig } from '@/features/store-editor/types/editor.types'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

const StoreEditorDemo = () => {
  const { toast } = useToast()
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(true)

  // قوالب جاهزة للمتاجر
  const storeTemplates = [
    {
      id: 'modern-fashion',
      name: 'متجر أزياء عصري',
      description: 'قالب متطور للأزياء والملابس',
      image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400',
      features: ['عرض منتجات أنيق', 'معرض صور تفاعلي', 'تكامل مع Instagram'],
      category: 'fashion'
    },
    {
      id: 'tech-store',
      name: 'متجر إلكترونيات',
      description: 'مثالي للأجهزة والتقنية',
      image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400',
      features: ['مقارنات المنتجات', 'عرض المواصفات', 'فلاتر متقدمة'],
      category: 'tech'
    },
    {
      id: 'food-delivery',
      name: 'مطعم وتوصيل',
      description: 'للمطاعم وخدمات التوصيل',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
      features: ['قائمة تفاعلية', 'تتبع الطلبات', 'نظام تقييمات'],
      category: 'food'
    },
    {
      id: 'beauty-cosmetics',
      name: 'متجر تجميل',
      description: 'مستحضرات التجميل والعناية',
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400',
      features: ['عرض الألوان', 'نصائح التجميل', 'برنامج ولاء'],
      category: 'beauty'
    }
  ]

  // ميزات المحرر المتقدمة لعام 2025
  const editorFeatures = [
    {
      icon: Brain,
      title: 'مساعد AI ذكي',
      description: 'يساعدك في إنشاء محتوى احترافي وتحسين التصميم',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      icon: Zap,
      title: 'تحديثات فورية',
      description: 'شاهد التغييرات مباشرة بدون إعادة تحميل',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      icon: Shield,
      title: 'أداء فائق',
      description: 'محسّن للسرعة و SEO تلقائياً',
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      icon: Rocket,
      title: 'نشر بنقرة واحدة',
      description: 'انشر متجرك مباشرة بدون تعقيد',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    }
  ]

  // بيانات الصفحة التجريبية المحسنة
  const demoPage: PageConfig = {
    id: 'demo-page-2025',
    name: 'متجرك الاحترافي 2025',
    slug: 'demo-store-2025',
    elements: [
      {
        id: 'hero-2025',
        type: 'hero',
        name: 'قسم البطل المتطور',
        properties: {
          title: 'مرحباً بك في متجر المستقبل',
          subtitle: 'تجربة تسوق لا مثيل لها مع أحدث التقنيات',
          primaryButton: { text: 'ابدأ التسوق', link: '/products' },
          secondaryButton: { text: 'اكتشف المزيد', link: '#features' },
          backgroundType: 'gradient',
          gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          showStats: true,
          stats: [
            { label: 'عملاء سعداء', value: '+50K' },
            { label: 'منتجات متميزة', value: '5000+' },
            { label: 'تقييم العملاء', value: '4.9/5' }
          ]
        },
        styles: {
          desktop: {
            minHeight: '600px',
            padding: '5rem 2rem',
          },
          tablet: {
            minHeight: '500px',
            padding: '4rem 1.5rem',
          },
          mobile: {
            minHeight: '400px',
            padding: '3rem 1rem',
          },
        },
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'features-2025',
        type: 'features',
        name: 'المميزات الرئيسية',
        properties: {
          title: 'لماذا نحن الأفضل؟',
          features: [
            {
              icon: 'truck',
              title: 'توصيل سريع',
              description: 'خلال 24 ساعة لجميع المدن'
            },
            {
              icon: 'shield',
              title: 'دفع آمن',
              description: 'حماية كاملة لبياناتك'
            },
            {
              icon: 'star',
              title: 'جودة مضمونة',
              description: 'منتجات أصلية 100%'
            },
            {
              icon: 'support',
              title: 'دعم 24/7',
              description: 'نحن هنا لمساعدتك'
            }
          ]
        },
        styles: {
          desktop: {
            padding: '4rem 2rem',
            backgroundColor: '#f8fafc',
          },
          tablet: {},
          mobile: {},
        },
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'products-2025',
        type: 'products',
        name: 'منتجاتنا المميزة',
        properties: {
          title: 'أحدث المنتجات',
          displayType: 'grid',
          columns: 4,
          showFilters: true,
          showSort: true,
          enableQuickView: true,
          enableWishlist: true,
          productCount: 8
        },
        styles: {
          desktop: {
            padding: '4rem 2rem',
            backgroundColor: '#ffffff',
          },
          tablet: {},
          mobile: {},
        },
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ],
    seoSettings: {
      title: 'متجرك الاحترافي - أفضل تجربة تسوق 2025',
      description: 'اكتشف مجموعة واسعة من المنتجات عالية الجودة مع أفضل الأسعار وخدمة التوصيل السريع',
      keywords: ['متجر إلكتروني', 'تسوق أونلاين', 'منتجات عالية الجودة', 'توصيل سريع'],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // نافذة الترحيب
  const WelcomeModal = () => (
    <AnimatePresence>
      {showWelcome && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowWelcome(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>
              <motion.h2
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
              >
                مرحباً بك في محرر المتاجر 2025
              </motion.h2>
              <motion.p
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-gray-600 dark:text-gray-400"
              >
                أقوى محرر متاجر بتقنيات الذكاء الاصطناعي والتصميم المتقدم
              </motion.p>
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 gap-4 mb-8"
            >
              {editorFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className={cn("p-2 rounded-lg", feature.bgColor)}>
                    <feature.icon className={cn("w-5 h-5", feature.color)} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex gap-3 justify-center"
            >
              <Button
                size="lg"
                onClick={() => setShowWelcome(false)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                ابدأ التصميم
                <ArrowRight className="mr-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setShowWelcome(false)
                  setIsAIAssistantOpen(true)
                }}
              >
                <Wand2 className="ml-2 h-5 w-5" />
                استخدم مساعد AI
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // مساعد AI
  const AIAssistant = () => (
    <AnimatePresence>
      {isAIAssistantOpen && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed right-4 top-20 bottom-4 w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-40 flex flex-col"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">مساعد AI الذكي</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">مدعوم بأحدث تقنيات AI</p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsAIAssistantOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              <Card className="border-purple-200 dark:border-purple-800">
                <CardHeader className="pb-3">
                  <h4 className="text-sm font-semibold">اقتراحات ذكية</h4>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start text-left" size="sm">
                    <Sparkles className="ml-2 h-4 w-4 text-purple-600" />
                    أنشئ وصف احترافي للمتجر
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-left" size="sm">
                    <Palette className="ml-2 h-4 w-4 text-blue-600" />
                    اقترح ألوان تناسب نشاطك
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-left" size="sm">
                    <Layout className="ml-2 h-4 w-4 text-green-600" />
                    صمم تخطيط مثالي للصفحة
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <h4 className="text-sm font-semibold">تحليل الأداء</h4>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">سرعة التحميل</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">ممتاز</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">تحسين SEO</span>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">جيد</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">تجربة المستخدم</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">رائع</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <h4 className="text-sm font-semibold">نصائح احترافية</h4>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>استخدم صور عالية الجودة لجذب العملاء</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>أضف شهادات العملاء لبناء الثقة</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>اجعل أزرار الشراء واضحة وبارزة</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
              <Wand2 className="ml-2 h-4 w-4" />
              تطبيق اقتراحات AI
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // شريط أدوات متقدم
  const AdvancedToolbar = () => (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 flex items-center gap-2"
      >
        <div className="flex items-center gap-1 px-2">
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <Monitor className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <Tablet className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
        
        <div className="flex items-center gap-1 px-2">
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsAIAssistantOpen(!isAIAssistantOpen)}
          className="gap-2"
        >
          <Brain className="h-4 w-4" />
          مساعد AI
        </Button>
        
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
        
        <div className="flex items-center gap-1 px-2">
          <Button size="sm" variant="ghost" className="gap-2">
            <Eye className="h-4 w-4" />
            معاينة
          </Button>
          <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="h-4 w-4" />
            حفظ
          </Button>
          <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700 text-white">
            <Rocket className="h-4 w-4" />
            نشر
          </Button>
        </div>
      </motion.div>
    </div>
  )

  // معرض القوالب
  const TemplateGallery = () => (
    <div className="absolute bottom-4 left-4 right-4 z-30">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">قوالب جاهزة</h3>
          <Button size="sm" variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            المزيد
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {storeTemplates.map((template) => (
            <motion.div
              key={template.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer"
              onClick={() => {
                setSelectedTemplate(template.id)
                toast({
                  title: "تم تطبيق القالب",
                  description: `تم تحميل قالب ${template.name} بنجاح`,
                })
              }}
            >
              <div className="relative rounded-lg overflow-hidden group">
                <img
                  src={template.image}
                  alt={template.name}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <div className="text-white">
                    <h4 className="text-sm font-semibold">{template.name}</h4>
                    <p className="text-xs opacity-90">{template.description}</p>
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex flex-wrap gap-1">
                  {template.features.slice(0, 2).map((feature, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )

  return (
    <div className="w-full h-screen relative bg-gray-50 dark:bg-gray-950">
      {/* نافذة الترحيب */}
      <WelcomeModal />
      
      {/* شريط الأدوات المتقدم */}
      <AdvancedToolbar />
      
      {/* المحرر الرئيسي */}
      <StoreEditor initialPage={demoPage} />
      
      {/* مساعد AI */}
      <AIAssistant />
      
      {/* معرض القوالب */}
      <TemplateGallery />
      
      {/* مؤشر الحالة */}
      <div className="absolute top-4 right-4 z-30">
        <Badge variant="outline" className="bg-green-50 text-green-700 gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          محفوظ تلقائياً
        </Badge>
      </div>
    </div>
  )
}

export default StoreEditorDemo