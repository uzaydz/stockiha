import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings2,
  Palette,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  Info,
  ChevronDown,
  ChevronRight,
  Type,
  Image,
  Link,
  Layers,
  Star,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Minimize2,
  ExternalLink,
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
  Zap,
  Heart
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { 
  useImprovedStoreEditor,
  getComponentDisplayName,
  getComponentIcon
} from '../hooks/useImprovedStoreEditor'

// محررات المكونات المخصصة
import { HeroEditor } from './editors/HeroEditor'
import { FeaturedProductsEditor } from './editors/FeaturedProductsEditor'
import { ProductCategoriesEditor } from './editors/ProductCategoriesEditor'
import { TestimonialsEditor } from './editors/TestimonialsEditor'
import { AboutEditor } from './editors/AboutEditor'
import { FooterEditor } from './editors/FooterEditor'
import { PropertySection } from './PropertySection'

// Hook للتحقق من حجم الشاشة المحسن
const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  })

  const [breakpoint, setBreakpoint] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg')

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setWindowSize({ width, height })
      
      // تحديد نقطة التوقف الحالية
      if (width < 480) setBreakpoint('xs')
      else if (width < 640) setBreakpoint('sm')
      else if (width < 768) setBreakpoint('md')
      else if (width < 1024) setBreakpoint('lg')
      else if (width < 1280) setBreakpoint('xl')
      else setBreakpoint('2xl')
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    windowSize,
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
    isSmallScreen: windowSize.width < 1024,
    isXs: breakpoint === 'xs'
  }
}

interface PropertiesPanelContentProps {
  selectedComponent: any
  activeTab: string
  setActiveTab: (tab: string) => void
  updateProperty: (key: string, value: any) => void
  updateNestedProperty: (path: string[], value: any) => void
  toggleComponentVisibility: (id: string) => void
  isFullscreen?: boolean
  onClose?: () => void
  isMobile?: boolean
}

// محتوى لوحة الخصائص المحسن
const PropertiesPanelContent: React.FC<PropertiesPanelContentProps> = ({
  selectedComponent,
  activeTab,
  setActiveTab,
  updateProperty,
  updateNestedProperty,
  toggleComponentVisibility,
  isFullscreen = false,
  onClose,
  isMobile = false
}) => {
  // عرض خصائص المكون حسب النوع
  const renderComponentProperties = () => {
    if (!selectedComponent) return null
    
    switch (selectedComponent.type) {
      case 'hero':
        return (
          <HeroEditor
            settings={selectedComponent?.settings || {}}
            onUpdate={updateProperty}
            onUpdateNested={updateNestedProperty}
          />
        )
      case 'featured_products':
        return (
          <FeaturedProductsEditor
            settings={selectedComponent?.settings || {}}
            onUpdate={updateProperty}
          />
        )
      case 'product_categories':
        return (
          <ProductCategoriesEditor
            settings={selectedComponent?.settings || {}}
            onUpdate={updateProperty}
          />
        )
      case 'testimonials':
        return (
          <TestimonialsEditor
            settings={selectedComponent?.settings || {}}
            onUpdate={updateProperty}
          />
        )
      case 'about':
        return (
          <AboutEditor
            settings={selectedComponent?.settings || {}}
            onUpdate={updateProperty}
          />
        )
      case 'services':
        return renderDefaultProperties()
      case 'contact':
        return renderDefaultProperties()
      case 'footer':
        return (
          <FooterEditor
            settings={selectedComponent?.settings || {}}
            onUpdate={updateProperty}
          />
        )
      case 'countdownoffers':
        return renderDefaultProperties()
      default:
        return renderDefaultProperties()
    }
  }
  
  // خصائص أساسية للمكونات الأخرى
  const renderDefaultProperties = () => (
    <div className="space-y-4 lg:space-y-6">
      <PropertySection 
        title="المحتوى الأساسي" 
        icon={<Type className="w-4 h-4" />}
        className="properties-section-enhanced"
      >
        <div className="space-y-4">
          <div className="property-field">
            <Label htmlFor="title" className="property-label">العنوان</Label>
            <Input
              id="title"
              value={selectedComponent?.settings.title || ''}
              onChange={(e) => updateProperty('title', e.target.value)}
              placeholder="أدخل العنوان"
              className="property-input"
            />
          </div>
          
          <div className="property-field">
            <Label htmlFor="description" className="property-label">الوصف</Label>
            <Textarea
              id="description"
              value={selectedComponent?.settings.description || ''}
              onChange={(e) => updateProperty('description', e.target.value)}
              placeholder="أدخل الوصف"
              rows={3}
              className="property-textarea"
            />
          </div>
        </div>
      </PropertySection>
    </div>
  )

  return (
    <div className={cn(
      "flex flex-col h-full bg-gradient-to-br from-background via-background/95 to-muted/10",
      "properties-panel-container",
      isFullscreen && "properties-panel-fullscreen",
      isMobile && "properties-panel-mobile"
    )}>
      {/* رأس اللوحة المحسن والمتناسق */}
      <div className={cn(
        "flex-shrink-0 border-b border-border/30",
        "bg-gradient-to-l from-card/80 via-card/90 to-card/95",
        "backdrop-blur-sm",
        isFullscreen ? "p-4 lg:p-6" : "p-4",
        isMobile && "p-3"
      )}>
        <div className="flex items-center justify-between mb-4">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
              <Settings2 className="w-4 h-4 text-primary" />
            </div>
            <h2 className={cn(
              "font-semibold text-foreground",
              isMobile ? "text-sm" : "text-base"
            )}>
              لوحة الخصائص
            </h2>
          </motion.div>
          
          <div className="flex items-center gap-2">
            {selectedComponent && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleComponentVisibility(selectedComponent.id)}
                      className={cn(
                        "h-8 w-8 p-0 rounded-lg transition-all duration-200",
                        "hover:bg-primary/10 border border-transparent hover:border-primary/20"
                      )}
                    >
                      {(selectedComponent.isVisible ?? true) ? (
                        <Eye className="w-4 h-4 text-green-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-red-500" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{(selectedComponent.isVisible ?? true) ? "إخفاء المكون" : "إظهار المكون"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {isFullscreen && onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 rounded-lg hover:bg-muted/80 transition-all duration-200"
              >
                <Minimize2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
        
        {/* معلومات المكون المحدد - محسنة */}
        {selectedComponent && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "relative overflow-hidden rounded-xl border border-border/40",
              "bg-gradient-to-l from-muted/30 via-muted/20 to-muted/10",
              "backdrop-blur-sm shadow-sm",
              "p-3 lg:p-4"
            )}
          >
            {/* خلفية متحركة */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center border border-primary/20 flex-shrink-0">
                <span className="text-lg">{getComponentIcon(selectedComponent.type)}</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-medium text-foreground truncate",
                  isMobile ? "text-sm" : "text-base"
                )}>
                  {selectedComponent.name}
                </h3>
                <p className={cn(
                  "text-muted-foreground truncate",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  {getComponentDisplayName(selectedComponent.type)}
                </p>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge 
                  variant={(selectedComponent.isVisible ?? true) ? 'default' : 'secondary'}
                  className={cn(
                    "font-medium border transition-all duration-200",
                    isMobile ? "text-xs px-2 py-1" : "text-xs px-3 py-1",
                    (selectedComponent.isVisible ?? true) 
                      ? "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400" 
                      : "bg-gray-500/10 text-gray-700 border-gray-500/20 dark:text-gray-400"
                  )}
                >
                  {(selectedComponent.isVisible ?? true) ? 'مرئي' : 'مخفي'}
                </Badge>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* محتوى التبويبات المحسن */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col" dir="rtl">
          <div className={cn(
            "flex-shrink-0 px-4 pt-4 pb-2",
            isMobile && "px-3 pt-3"
          )}>
            <TabsList className={cn(
              "w-full grid grid-cols-2 bg-muted/30 border border-border/30 rounded-xl p-1",
              "backdrop-blur-sm shadow-sm",
              isMobile ? "h-9" : "h-10"
            )}>
              <TabsTrigger 
                value="properties" 
                className={cn(
                  "font-medium transition-all duration-200 rounded-lg",
                  "data-[state=active]:bg-card data-[state=active]:shadow-sm",
                  "data-[state=active]:border data-[state=active]:border-border/20",
                  isMobile ? "text-xs py-1.5" : "text-sm py-2"
                )}
              >
                <Settings2 className={cn(
                  isMobile ? "w-3 h-3 ml-1" : "w-4 h-4 ml-1.5"
                )} />
                الخصائص
              </TabsTrigger>
              <TabsTrigger 
                value="style" 
                className={cn(
                  "font-medium transition-all duration-200 rounded-lg",
                  "data-[state=active]:bg-card data-[state=active]:shadow-sm",
                  "data-[state=active]:border data-[state=active]:border-border/20",
                  isMobile ? "text-xs py-1.5" : "text-sm py-2"
                )}
              >
                <Palette className={cn(
                  isMobile ? "w-3 h-3 ml-1" : "w-4 h-4 ml-1.5"
                )} />
                التصميم
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* تبويب الخصائص */}
          <TabsContent value="properties" className="flex-1 mt-0 overflow-hidden" dir="rtl">
            <ScrollArea className={cn(
              "h-full properties-scroll-enhanced",
              isFullscreen ? "px-6 pb-8" : "px-4 pb-6",
              isMobile && "px-3 pb-4"
            )}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-4 py-2"
              >
                {selectedComponent ? renderComponentProperties() : (
                  <div className="flex items-center justify-center py-20 text-muted-foreground">
                    <motion.div 
                      className="text-center space-y-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl flex items-center justify-center border border-primary/20">
                        <Settings2 className="w-10 h-10 text-primary/60" />
                      </div>
                      <div>
                        <p className="text-base font-medium text-foreground">لم يتم تحديد مكون</p>
                        <p className="text-sm text-muted-foreground mt-2">اختر مكوناً من القائمة الجانبية لتعديل خصائصه</p>
                      </div>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            </ScrollArea>
          </TabsContent>
          
          {/* تبويب التصميم */}
          <TabsContent value="style" className="flex-1 mt-0 overflow-hidden" dir="rtl">
            <div className="h-full flex items-center justify-center text-muted-foreground p-6">
              <motion.div 
                className="text-center space-y-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-3xl flex items-center justify-center border border-purple-500/20">
                  <Palette className="w-10 h-10 text-purple-500/60" />
                </div>
                <div>
                  <p className="text-base font-medium text-foreground">إعدادات التصميم</p>
                  <p className="text-sm text-muted-foreground mt-2">قريباً سيتم إضافة المزيد من خيارات التصميم المتقدمة</p>
                </div>
                
                {/* معاينة الميزات القادمة */}
                <div className="grid grid-cols-2 gap-3 mt-6 max-w-xs mx-auto">
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/30">
                    <Sparkles className="w-4 h-4 text-purple-500 mb-1" />
                    <p className="text-xs text-muted-foreground">الألوان</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/30">
                    <Zap className="w-4 h-4 text-blue-500 mb-1" />
                    <p className="text-xs text-muted-foreground">الخطوط</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* فوتر تحفيزي محسن لسطوكيها */}
      {!isFullscreen && selectedComponent && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "flex-shrink-0 border-t border-border/30",
            "bg-gradient-to-l from-card/80 via-card/90 to-card/95",
            "backdrop-blur-sm",
            isMobile ? "p-3 pb-6" : "p-4 pb-8"
          )}
        >
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="relative">
                <div className="w-7 h-7 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-full flex items-center justify-center shadow-lg">
                  <Star className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse opacity-70" />
              </div>
              <span className={cn(
                "font-bold bg-gradient-to-l from-primary to-primary/80 bg-clip-text text-transparent",
                isMobile ? "text-sm" : "text-base"
              )}>
                سطوكيها
              </span>
            </div>
            
            <p className={cn(
              "text-muted-foreground leading-relaxed font-medium",
              isMobile ? "text-xs px-2" : "text-sm"
            )}>
              "أطلق العنان لإبداعك واصنع متجراً يحكي قصة نجاحك"
            </p>
            
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/60 rounded-full animate-pulse" />
              <div className="w-1.5 h-1.5 bg-gradient-to-r from-primary/70 to-primary/40 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
              <div className="w-1 h-1 bg-gradient-to-r from-primary/50 to-primary/20 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export const PropertiesPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('properties')
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('propertiesPanel.collapsed')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [showFloatingButton, setShowFloatingButton] = useState(true)
  const [showTooltipHint, setShowTooltipHint] = useState(true)

  const { windowSize, breakpoint, isMobile, isTablet, isDesktop, isSmallScreen, isXs } = useResponsive()
  
  const {
    selectedComponentId,
    updateComponent,
    toggleComponentVisibility,
    getSelectedComponent
  } = useImprovedStoreEditor()
  
  const selectedComponent = getSelectedComponent()
  
  // فتح الخصائص تلقائياً عند اختيار مكون في الهاتف
  useEffect(() => {
    if (selectedComponent && (isMobile || isXs)) {
      setShowFloatingButton(true)
      setShowTooltipHint(true)
      // تأخير قصير للسماح للانيميشن بالانتهاء
      const timer = setTimeout(() => {
        setShowFullscreen(true)
        setActiveTab('properties')
      }, 300)
      
      return () => clearTimeout(timer)
      } else {
      setShowFloatingButton(false)
      setShowTooltipHint(false)
    }
  }, [selectedComponentId, isMobile, isXs])

  // إخفاء التلميح النصي أولاً
  useEffect(() => {
    if (selectedComponent && (isMobile || isXs) && !showFullscreen && showTooltipHint) {
      const hideTooltipTimer = setTimeout(() => {
        setShowTooltipHint(false)
      }, 4000) // 4 ثوان
      
      return () => clearTimeout(hideTooltipTimer)
    }
  }, [selectedComponentId, showFullscreen, isMobile, isXs, showTooltipHint])

  // إخفاء الزر العائم تدريجياً بعد عرضه
  useEffect(() => {
    if (selectedComponent && (isMobile || isXs) && !showFullscreen && showFloatingButton) {
      const hideTimer = setTimeout(() => {
        setShowFloatingButton(false)
      }, 8000) // 8 ثوان
      
      return () => clearTimeout(hideTimer)
    }
  }, [selectedComponentId, showFullscreen, isMobile, isXs, showFloatingButton])

  // إظهار الزر العائم مرة أخرى عند إغلاق الشاشة الكاملة
  useEffect(() => {
    if (!showFullscreen && selectedComponent && (isMobile || isXs)) {
      setShowFloatingButton(true)
      setShowTooltipHint(true)
    }
  }, [showFullscreen, selectedComponent, isMobile, isXs])

  // إظهار الزر العائم عند لمس الشاشة إذا كان هناك مكون محدد
  useEffect(() => {
    if (!(isMobile || isXs) || !selectedComponent || showFullscreen) return

    const handleTouch = () => {
      if (!showFloatingButton) {
        setShowFloatingButton(true)
        setShowTooltipHint(true)
      }
    }

    const handleScroll = () => {
      if (!showFloatingButton) {
        setShowFloatingButton(true)
        setShowTooltipHint(false) // لا نظهر التلميح عند التمرير لتجنب الإزعاج
      }
    }

    document.addEventListener('touchstart', handleTouch, { passive: true })
    document.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      document.removeEventListener('touchstart', handleTouch)
      document.removeEventListener('scroll', handleScroll)
    }
  }, [isMobile, isXs, selectedComponent, showFullscreen, showFloatingButton])

  // حفظ حالة التوسيع في localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('propertiesPanel.collapsed', JSON.stringify(isCollapsed))
    }
  }, [isCollapsed])
  
  // تحديث خاصية في المكون
  const updateProperty = useCallback((key: string, value: any) => {
    if (!selectedComponent) return

    updateComponent(selectedComponent.id, {
      settings: {
        ...selectedComponent.settings,
        [key]: value
      }
    })
  }, [selectedComponent, updateComponent])
  
  // تحديث خاصية متداخلة
  const updateNestedProperty = useCallback((path: string[], value: any) => {
    if (!selectedComponent) return
    
    const settings = { ...selectedComponent.settings }
    let current = settings
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {}
      current = current[path[i]]
    }
    
    current[path[path.length - 1]] = value
    
    updateComponent(selectedComponent.id, { settings })
  }, [selectedComponent, updateComponent])
  
  // تعريف animation variants محسن مع حدود آمنة
  const panelVariants = {
    expanded: {
      width: Math.min(
        isXs ? Math.min(300, windowSize.width - 40) : // 20px من كل جانب للهواتف الصغيرة
        isMobile ? Math.min(340, windowSize.width - 60) : // 30px من كل جانب للهواتف
        isTablet ? Math.min(380, windowSize.width * 0.4) :
        isSmallScreen ? Math.min(400, windowSize.width * 0.35) : 420,
        windowSize.width - 80 // حد أقصى مع ترك 40px من كل جانب
      ),
      transition: { 
        duration: 0.4, 
        ease: [0.4, 0, 0.2, 1]
      }
    },
    collapsed: {
      width: isMobile ? 50 : 60,
      transition: { 
        duration: 0.3, 
        ease: [0.4, 0, 0.2, 1]
      }
    }
  }

  const contentVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, delay: 0.1 }
    },
    collapsed: {
      opacity: 0,
      x: 20,
      transition: { duration: 0.2 }
    }
  }

  // دالة تبديل حالة التوسيع
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  // دالة التوسيع التلقائي عند الضغط على أيقونة
  const expandOnAction = (action?: () => void) => {
    if (isCollapsed) {
      setIsCollapsed(false)
      if (action) {
        setTimeout(action, 300)
      }
    } else if (action) {
      action()
    }
  }

  // رندر النسخة المضغوطة المحسنة
  const renderCollapsedView = () => (
    <div className="h-full flex flex-col bg-gradient-to-b from-card/90 via-card/95 to-muted/20 backdrop-blur-sm border-r border-border/30">
      {/* شريط التحكم العلوي */}
      <div className="p-3 border-b border-border/30">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
                className="w-full h-10 p-0 hover:bg-primary/10 transition-all duration-200 rounded-lg border border-transparent hover:border-primary/20"
        >
          <PanelRightOpen className="w-5 h-5 text-primary" />
        </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>توسيع لوحة الخصائص</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* الأيقونات الرئيسية */}
      <div className="flex-1 p-2 space-y-2">
        {/* أيقونة المكون المحدد */}
        {selectedComponent && (
          <div className="mb-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
            <Button
              variant={(selectedComponent.isVisible ?? true) ? "default" : "outline"}
              size="sm"
                    onClick={() => {
                      if (isMobile || isXs) {
                        setShowFullscreen(true)
                      } else {
                        expandOnAction()
                      }
                    }}
                    className="w-full h-12 p-0 transition-all duration-200 rounded-lg"
            >
              <span className="text-lg">{getComponentIcon(selectedComponent.type)}</span>
            </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{selectedComponent.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* أيقونات التبويبات */}
        <div className="space-y-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
          <Button
            variant={activeTab === 'properties' ? "default" : "ghost"}
            size="sm"
                  onClick={() => {
                    if (isMobile || isXs) {
                      setActiveTab('properties')
                      setShowFullscreen(true)
                    } else {
                      expandOnAction(() => setActiveTab('properties'))
                    }
                  }}
                  className="w-full h-10 p-0 transition-all duration-200 rounded-lg"
          >
            <Settings2 className="w-4 h-4" />
          </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>الخصائص</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
          <Button
            variant={activeTab === 'style' ? "default" : "ghost"}
            size="sm"
                  onClick={() => {
                    if (isMobile || isXs) {
                      setActiveTab('style')
                      setShowFullscreen(true)
                    } else {
                      expandOnAction(() => setActiveTab('style'))
                    }
                  }}
                  className="w-full h-10 p-0 transition-all duration-200 rounded-lg"
          >
            <Palette className="w-4 h-4" />
          </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>التصميم</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* أيقونات إضافية */}
        {selectedComponent && (
          <div className="mt-4 pt-4 border-t border-border/30 space-y-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullscreen(true)}
                    className="w-full h-10 p-0 transition-all duration-200 rounded-lg hover:bg-primary/10"
                  >
                    <Maximize2 className="w-4 h-4 text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>فتح في الشاشة الكاملة</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
                    onClick={() => toggleComponentVisibility(selectedComponent.id)}
                    className="w-full h-10 p-0 transition-all duration-200 rounded-lg"
            >
              {(selectedComponent.isVisible ?? true) ? (
                <Eye className="w-4 h-4 text-green-600" />
              ) : (
                <EyeOff className="w-4 h-4 text-red-500" />
              )}
            </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{(selectedComponent.isVisible ?? true) ? "إخفاء المكون" : "إظهار المكون"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  )

  // رندر اللوحة للشاشات الكبيرة
  const renderDesktopPanel = () => (
    <motion.div 
      className={cn(
        "h-full flex flex-col properties-panel-enhanced properties-panel-rtl",
        "bg-gradient-to-bl from-card/95 via-card/90 to-background/95",
        "backdrop-blur-md shadow-xl",
        "border-l border-border/30", // تغيير من border-r إلى border-l
        "relative overflow-hidden",
        isMobile && "properties-panel-mobile",
        isTablet && "properties-panel-tablet"
      )}
      variants={panelVariants}
      animate={isCollapsed ? "collapsed" : "expanded"}
      initial={false}
      style={{ 
        direction: 'rtl',
        position: 'relative',
        maxWidth: '100%'
      }}
    >
      {isCollapsed ? (
        renderCollapsedView()
      ) : (
          <motion.div 
            variants={contentVariants}
            initial="collapsed"
            animate="expanded"
          className="h-full"
        >
          <PropertiesPanelContent
            selectedComponent={selectedComponent}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            updateProperty={updateProperty}
            updateNestedProperty={updateNestedProperty}
            toggleComponentVisibility={toggleComponentVisibility}
            isMobile={isMobile}
          />
          </motion.div>
      )}
    </motion.div>
  )

  // رندر الشاشة الكاملة/المودال للشاشات الصغيرة
  const FullscreenPropertiesDialog = () => {
    const DialogComponent = isMobile ? Drawer : Dialog
    const ContentComponent = isMobile ? DrawerContent : DialogContent
    const HeaderComponent = isMobile ? DrawerHeader : DialogHeader
    const TitleComponent = isMobile ? DrawerTitle : DialogTitle
    const DescriptionComponent = isMobile ? DrawerDescription : DialogDescription

    return (
      <DialogComponent open={showFullscreen} onOpenChange={setShowFullscreen}>
        <ContentComponent className={cn(
          isMobile ? "h-[92vh] rounded-t-2xl" : "max-w-3xl max-h-[90vh]",
          "overflow-hidden p-0 bg-gradient-to-br from-background via-background/95 to-muted/10",
          "border-border/30"
        )}>
          {selectedComponent && (
            <HeaderComponent className="p-4 pb-2 border-b border-border/30 bg-card/50 backdrop-blur-sm">
              <TitleComponent className="text-right flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center border border-primary/20">
                <span className="text-lg">{getComponentIcon(selectedComponent.type)}</span>
              </div>
                <span>خصائص {selectedComponent.name}</span>
              </TitleComponent>
              <DescriptionComponent className="text-right text-muted-foreground">
                  {getComponentDisplayName(selectedComponent.type)}
              </DescriptionComponent>
            </HeaderComponent>
          )}
          
          <div className="flex-1 overflow-hidden">
            <PropertiesPanelContent
              selectedComponent={selectedComponent}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              updateProperty={updateProperty}
              updateNestedProperty={updateNestedProperty}
              toggleComponentVisibility={toggleComponentVisibility}
              isFullscreen={true}
              onClose={() => setShowFullscreen(false)}
              isMobile={isMobile}
            />
              </div>
        </ContentComponent>
      </DialogComponent>
    )
  }

  return (
    <>
      {/* اللوحة الأساسية */}
      {renderDesktopPanel()}
      
      {/* المودال/الدرج للشاشات الصغيرة */}
      <FullscreenPropertiesDialog />
      
      {/* مؤشر في الشريط العلوي للهاتف */}
      {(isMobile || isXs) && selectedComponent && !showFullscreen && (
          <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40"
        >
          <button
            onClick={() => {
              setShowFullscreen(true)
              setActiveTab('properties')
            }}
            className="bg-primary/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm shadow-lg border border-white/20 hover:bg-primary transition-all duration-200 hover:scale-105"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <span>تحرير {selectedComponent.name}</span>
              <ChevronDown className="w-4 h-4 animate-bounce" />
              </div>
          </button>
        </motion.div>
      )}

      {/* زر عائم للهواتف المحمولة */}
      {(isMobile || isXs) && selectedComponent && !showFullscreen && showFloatingButton && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className="fixed bottom-6 left-6 z-50"
          style={{ direction: 'ltr' }}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    setShowFullscreen(true)
                    setActiveTab('properties')
                  }}
                  className={cn(
                    "w-14 h-14 rounded-full shadow-2xl",
                    "bg-gradient-to-br from-primary via-primary/90 to-primary/80",
                    "border-2 border-background/20",
                    "hover:shadow-xl hover:scale-105",
                    "transition-all duration-300",
                    "backdrop-blur-sm"
                  )}
                >
                  <div className="relative">
                    <Settings2 className="w-6 h-6 text-white" />
                    {/* نقطة تنبيه متحركة */}
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                    </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="mb-2">
                <p>تحرير خصائص {selectedComponent.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* مؤشر نص صغير */}
          {showTooltipHint && (
                  <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ delay: 0.5 }}
              className="absolute -top-12 right-0 bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap"
            >
              اضغط لتحرير الخصائص
              <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-black/80" />
                  </motion.div>
          )}
          </motion.div>
      )}
    </>
  )
}

// تصدير افتراضي لحل مشكلة الاستيراد
export default PropertiesPanel
