import React from 'react'
import { motion } from 'framer-motion'
import { Settings2, Palette, Sparkles, Zap } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// محررات المكونات المخصصة
import { HeroEditor } from '../editors/HeroEditor'
import { FeaturedProductsEditor } from '../editors/FeaturedProductsEditor'
import { ProductCategoriesEditor } from '../editors/ProductCategoriesEditor'
import { TestimonialsEditor } from '../editors/TestimonialsEditor'
import { AboutEditor } from '../editors/AboutEditor'
import { FooterEditor } from '../editors/FooterEditor'
import { PropertySection } from '../PropertySection'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Type } from 'lucide-react'

interface PropertiesPanelContentProps {
  selectedComponent: any
  activeTab: string
  updateProperty: (key: string, value: any) => void
  updateNestedProperty: (path: string[], value: any) => void
  isFullscreen?: boolean
  isMobile?: boolean
  organizationId?: string
}

export const PropertiesPanelContent: React.FC<PropertiesPanelContentProps> = ({
  selectedComponent,
  activeTab,
  updateProperty,
  updateNestedProperty,
  isFullscreen = false,
  isMobile = false,
  organizationId
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
            organizationId={organizationId}
          />
        )
      case 'featured_products':
        return (
          <FeaturedProductsEditor
            settings={selectedComponent?.settings || {}}
            onUpdate={updateProperty}
            organizationId={organizationId}
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
      case 'footer':
        return (
          <FooterEditor
            settings={selectedComponent?.settings || {}}
            onUpdate={updateProperty}
          />
        )
      default:
        return (
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
    }
  }

  const renderEmptyState = () => (
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
  )

  const renderStylesContent = () => (
    <div className="h-full flex items-center justify-center text-muted-foreground p-6">
      <motion.div 
        className="text-center space-y-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{ willChange: 'auto' }}
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
  )

  if (activeTab === 'properties') {
    return (
      <div className={cn(
        "min-h-full w-full store-editor-scroll-container",
        "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
        "hover:scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600",
        isFullscreen ? "px-6 pb-8" : "px-4 pb-6",
        isMobile && "px-3 pb-4"
      )} style={{
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="space-y-4 py-2"
          style={{ willChange: 'auto' }}
        >
          {selectedComponent ? renderComponentProperties() : renderEmptyState()}
        </motion.div>
      </div>
    )
  }

  if (activeTab === 'style') {
    return (
      <div className="min-h-full w-full">
        {renderStylesContent()}
      </div>
    )
  }

  return null
}
