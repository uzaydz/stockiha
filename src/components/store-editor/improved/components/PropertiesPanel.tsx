import React, { useState, useEffect } from 'react'
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
  Minimize2
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

export const PropertiesPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('properties')
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // استرجاع حالة التوسيع من localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('propertiesPanel.collapsed')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['content', 'appearance', 'layout'])
  )

  // حفظ حالة التوسيع في localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('propertiesPanel.collapsed', JSON.stringify(isCollapsed))
    }
  }, [isCollapsed])
  
  const {
    selectedComponentId,
    updateComponent,
    toggleComponentVisibility,
    getSelectedComponent
  } = useImprovedStoreEditor()
  
  const selectedComponent = getSelectedComponent()
  
  // التبديل بين الأقسام
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }
  
  // تحديث خاصية في المكون
  const updateProperty = (key: string, value: any) => {
    if (!selectedComponent) return
    
    console.log(`🔧 تحديث خاصية ${key} في مكون ${selectedComponent.type}:`, value)
    
    updateComponent(selectedComponent.id, {
      settings: {
        ...selectedComponent.settings,
        [key]: value
      }
    })
  }
  
  // تحديث خاصية متداخلة
  const updateNestedProperty = (path: string[], value: any) => {
    if (!selectedComponent) return
    
    const settings = { ...selectedComponent.settings }
    let current = settings
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {}
      current = current[path[i]]
    }
    
    current[path[path.length - 1]] = value
    
    updateComponent(selectedComponent.id, { settings })
  }
  
  // عرض خصائص المكون حسب النوع
  const renderComponentProperties = () => {
    if (!selectedComponent) return null
    
    switch (selectedComponent.type) {
      case 'hero':
        return renderHeroProperties()
      case 'featured_products':
        return renderFeaturedProductsProperties()
      case 'product_categories':
        return renderCategoriesProperties()
      case 'testimonials':
        return renderTestimonialsProperties()
      case 'about':
        return renderAboutProperties()
      case 'services':
        return renderServicesProperties()
      case 'contact':
        return renderContactProperties()
      case 'footer':
        return renderFooterProperties()
      case 'countdownoffers':
        return renderCountdownProperties()
      default:
        return renderDefaultProperties()
    }
  }
  
  // خصائص البانر الرئيسي
  const renderHeroProperties = () => (
    <HeroEditor
      settings={selectedComponent?.settings || {}}
      onUpdate={updateProperty}
      onUpdateNested={updateNestedProperty}
    />
  )
  
  // خصائص المنتجات المميزة
  const renderFeaturedProductsProperties = () => (
    <FeaturedProductsEditor
      settings={selectedComponent?.settings || {}}
      onUpdate={updateProperty}
    />
  )
  
  // خصائص أساسية للمكونات الأخرى
  const renderDefaultProperties = () => (
    <div className="space-y-6">
      <PropertySection title="المحتوى الأساسي" icon={<Type className="w-4 h-4" />}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">العنوان</Label>
            <Input
              id="title"
              value={selectedComponent?.settings.title || ''}
              onChange={(e) => updateProperty('title', e.target.value)}
              placeholder="أدخل العنوان"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              value={selectedComponent?.settings.description || ''}
              onChange={(e) => updateProperty('description', e.target.value)}
              placeholder="أدخل الوصف"
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
      </PropertySection>
    </div>
  )
  
  // خصائص فئات المنتجات
  const renderCategoriesProperties = () => (
    <ProductCategoriesEditor
      settings={selectedComponent?.settings || {}}
      onUpdate={updateProperty}
    />
  )
  
  // خصائص مبسطة للمكونات الأخرى
  const renderTestimonialsProperties = () => (
    <TestimonialsEditor
      settings={selectedComponent?.settings || {}}
      onUpdate={updateProperty}
    />
  )
  const renderAboutProperties = () => (
    <AboutEditor
      settings={selectedComponent?.settings || {}}
      onUpdate={updateProperty}
    />
  )
  const renderServicesProperties = () => renderDefaultProperties()
  const renderContactProperties = () => renderDefaultProperties()
  const renderFooterProperties = () => (
    <FooterEditor
      settings={selectedComponent?.settings || {}}
      onUpdate={updateProperty}
    />
  )
  const renderCountdownProperties = () => renderDefaultProperties()
  
  // تعريف animation variants بسيط ومباشر
  const panelVariants = {
    expanded: {
      width: 320,
      transition: { 
        duration: 0.3, 
        ease: [0.4, 0, 0.2, 1] // smooth ease
      }
    },
    collapsed: {
      width: 60,
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
      transition: { duration: 0.2, delay: 0.1 }
    },
    collapsed: {
      opacity: 0,
      x: 20, // يتحرك قليلاً لليمين عند الاختفاء
      transition: { duration: 0.15 }
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
      // تأخير لانتظار انتهاء انيميشن التوسيع
      if (action) {
        setTimeout(action, 300)
      }
    } else if (action) {
      action()
    }
  }

  // رندر النسخة المضغوطة (الأيقونات فقط)
  const renderCollapsedView = () => (
    <div className="h-full flex flex-col bg-gradient-to-b from-card to-muted/20">
      {/* شريط التحكم العلوي */}
      <div className="p-3 border-b border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className="w-full h-10 p-0 hover:bg-primary/10 transition-all duration-200"
          title="توسيع اللوحة"
        >
          <PanelRightOpen className="w-5 h-5 text-primary" />
        </Button>
      </div>

      {/* الأيقونات الرئيسية */}
      <div className="flex-1 p-2 space-y-2">
        {/* أيقونة المكون المحدد */}
        {selectedComponent && (
          <div className="mb-4">
            <Button
              variant={(selectedComponent.isVisible ?? true) ? "default" : "outline"}
              size="sm"
              onClick={() => expandOnAction()}
              className="w-full h-12 p-0 transition-all duration-200"
              title={selectedComponent.name}
            >
              <span className="text-lg">{getComponentIcon(selectedComponent.type)}</span>
            </Button>
          </div>
        )}

        {/* أيقونات التبويبات */}
        <div className="space-y-1">
          <Button
            variant={activeTab === 'properties' ? "default" : "ghost"}
            size="sm"
            onClick={() => expandOnAction(() => setActiveTab('properties'))}
            className="w-full h-10 p-0 transition-all duration-200"
            title="الخصائص"
          >
            <Settings2 className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTab === 'style' ? "default" : "ghost"}
            size="sm"
            onClick={() => expandOnAction(() => setActiveTab('style'))}
            className="w-full h-10 p-0 transition-all duration-200"
            title="التصميم"
          >
            <Palette className="w-4 h-4" />
          </Button>
        </div>

        {/* أيقونات إضافية */}
        {selectedComponent && (
          <div className="mt-4 pt-4 border-t border-border/30 space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => expandOnAction(() => toggleComponentVisibility(selectedComponent.id))}
              className="w-full h-10 p-0 transition-all duration-200"
              title={(selectedComponent.isVisible ?? true) ? "إخفاء المكون" : "إظهار المكون"}
            >
              {(selectedComponent.isVisible ?? true) ? (
                <Eye className="w-4 h-4 text-green-600" />
              ) : (
                <EyeOff className="w-4 h-4 text-red-500" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  // رندر واحد موحد للوحة
  return (
    <motion.div 
      className="h-full flex flex-col bg-gradient-to-b from-card via-card/95 to-muted/30 properties-panel-rtl properties-panel-slide-rtl"
      variants={panelVariants}
      animate={isCollapsed ? "collapsed" : "expanded"}
      initial={false}
      style={{ 
        direction: 'rtl'
      }}
    >
      {/* رندر المحتوى حسب الحالة */}
      {isCollapsed ? (
        renderCollapsedView()
      ) : !selectedComponent ? (
        // الحالة الفارغة (موسعة)
        <>
          {/* رأس اللوحة */}
          <div className="p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <motion.h2 
                variants={contentVariants}
                initial="collapsed"
                animate="expanded"
                className="text-sm font-semibold text-foreground"
              >
                الخصائص
              </motion.h2>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapse}
                className="h-8 w-8 p-0 hover:bg-primary/10 transition-all duration-200"
                title="تضييق اللوحة"
              >
                <PanelRightClose className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
          
          {/* المحتوى الفارغ */}
          <motion.div 
            variants={contentVariants}
            initial="collapsed"
            animate="expanded"
            className="flex-1 flex items-center justify-center text-muted-foreground p-6"
          >
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
                <Settings2 className="w-8 h-8 text-primary/60" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">لم يتم تحديد مكون</p>
                <p className="text-xs text-muted-foreground mt-1">اختر مكوناً من القائمة لتعديل خصائصه</p>
              </div>
            </div>
          </motion.div>
        </>
      ) : (
        // الحالة مع مكون محدد (موسعة)
        <>
          {/* رأس اللوحة المحسن */}
          <div className="p-4 border-b border-border/50 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <motion.h2 
                variants={contentVariants}
                initial="collapsed"
                animate="expanded"
                className="text-sm font-semibold text-foreground"
              >
                الخصائص
              </motion.h2>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleComponentVisibility(selectedComponent.id)}
                  className="h-8 w-8 p-0 hover:bg-primary/10 transition-all duration-200"
                  title={(selectedComponent.isVisible ?? true) ? "إخفاء المكون" : "إظهار المكون"}
                >
                  {(selectedComponent.isVisible ?? true) ? (
                    <Eye className="w-4 h-4 text-green-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-red-500" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapse}
                  className="h-8 w-8 p-0 hover:bg-primary/10 transition-all duration-200"
                  title="تضييق اللوحة"
                >
                  <PanelRightClose className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
            
            {/* معلومات المكون المحدد - محسنة */}
            <motion.div 
              variants={contentVariants}
              initial="collapsed"
              animate="expanded"
              className="flex items-center gap-3 p-3 bg-gradient-to-r from-muted/40 to-muted/20 border border-border/40 rounded-xl shadow-sm"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-lg">{getComponentIcon(selectedComponent.type)}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm text-foreground">
                  {selectedComponent.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {getComponentDisplayName(selectedComponent.type)}
                </p>
              </div>
              <Badge 
                variant={(selectedComponent.isVisible ?? true) ? 'default' : 'secondary'}
                className="text-xs font-medium"
              >
                {(selectedComponent.isVisible ?? true) ? 'مرئي' : 'مخفي'}
              </Badge>
            </motion.div>
          </div>
          
          {/* التبويبات المحسنة */}
          <motion.div
            variants={contentVariants}
            initial="collapsed"
            animate="expanded"
            className="flex-1"
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="px-4 pt-4 pb-2">
                <TabsList className="w-full grid grid-cols-2 h-10 bg-muted/30 border border-border/30 rounded-lg p-1">
                  <TabsTrigger 
                    value="properties" 
                    className="text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    <Settings2 className="w-4 h-4 mr-1.5" />
                    الخصائص
                  </TabsTrigger>
                  <TabsTrigger 
                    value="style" 
                    className="text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    <Palette className="w-4 h-4 mr-1.5" />
                    التصميم
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {/* تبويب الخصائص */}
              <TabsContent value="properties" className="flex-1">
                <div 
                  className="overflow-y-auto overflow-x-hidden"
                  style={{
                    maxHeight: 'calc(100vh - 300px)',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgb(148 163 184) transparent'
                  }}
                >
                  <div className="space-y-3 p-4 pb-8">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      className="space-y-3"
                      >
                        {renderComponentProperties()}
                      </motion.div>
                    </div>
                </div>
              </TabsContent>
              
              {/* تبويب التصميم */}
              <TabsContent value="style" className="flex-1 mt-0 overflow-hidden">
                <div className="h-full flex items-center justify-center text-muted-foreground p-6">
                  <motion.div 
                    className="text-center space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Palette className="w-8 h-8 text-primary/60" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">إعدادات التصميم</p>
                      <p className="text-xs text-muted-foreground mt-1">قريباً سيتم إضافة المزيد من خيارات التصميم</p>
                    </div>
                  </motion.div>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}