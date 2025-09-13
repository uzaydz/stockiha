/*
 * محرر المتجر المحسن - ImprovedStoreEditor
 * 
 * التحسينات المنجزة:
 * 1. فتح تلقائي للخصائص عند اختيار مكون في الهاتف
 * 2. إشعارات ذكية للمكونات المحددة
 * 3. تنقل محسن بين اللوحات مع مؤشرات بصرية
 * 4. شريط حالة متقدم يظهر معلومات مفصلة
 * 5. مؤشرات متحركة للحالات المختلفة
 * 6. تجربة مستخدم محسنة للأجهزة المحمولة
 * 7. إشعارات للمساعدة في التنقل
 * 8. مؤشر المكون المحدد في الشريط العلوي
 */

import React, { useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { 
  Save, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Settings,
  Check,
  Menu,
  X,
  Monitor,
  Tablet,
  Smartphone,
  Layers
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

import { useImprovedStoreEditor, getComponentDisplayName, ComponentType as ImprovedComponentType } from './hooks/useImprovedStoreEditor'
import { ComponentsSidebar } from './components/ComponentsSidebar'
import { StorePreview } from './components/StorePreview'
import PropertiesPanel from './components/PropertiesPanel'
import { useStoreComponents } from '@/hooks/useStoreComponents'
import { useStoreEditorData } from '@/context/StoreEditorDataContext'
import { supabase } from '@/lib/supabase'
import { clearStoreCacheByOrganizationId, clearCacheItem } from '@/lib/cache/storeCache'
import '@/styles/properties-panel-responsive.css'
import '@/styles/store-editor-responsive.css'

interface ImprovedStoreEditorProps {
  organizationId: string
  className?: string
}

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

export const ImprovedStoreEditor: React.FC<ImprovedStoreEditorProps> = ({
  organizationId,
  className
}) => {
  const { toast } = useToast()
  const { isMobile, isTablet, isDesktop, isSmallScreen, isXs } = useResponsive()
  // Preloaded data from RPC provider
  const storeInitCtx = (() => { try { return useStoreEditorData(); } catch { return null as any } })();
  const preloadedComponents = React.useMemo(() => {
    const pre = storeInitCtx?.data?.store_layout_components || []
    if (!pre || pre.length === 0) return undefined
    return pre
      .filter((c: any) => typeof c?.type === 'string')
      .filter((c: any) => (String(c.type || '').toLowerCase()) !== 'seo_settings')
      .map((item: any) => {
        let normalizedType = String(item.type || '').toLowerCase()
        if (normalizedType === 'categories') normalizedType = 'product_categories'
        if (normalizedType === 'featuredproducts') normalizedType = 'featured_products'
        return {
          id: item.id,
          type: normalizedType as any,
          settings: item.settings || {},
          isActive: item.is_active ?? true,
          orderIndex: item.order_index ?? 0,
        }
      })
  }, [storeInitCtx?.data?.store_layout_components])
  
  // حالة التنقل للأجهزة المحمولة
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<'components' | 'preview' | 'properties'>('preview')
  const [showPropertiesNotification, setShowPropertiesNotification] = useState(false)
  
  // حالة المحرر
  const {
    components,
    selectedComponentId,
    hoveredComponentId,
    isLoading,
    isSaving,
    isDirty,
    previewMode,
    setComponents,
    addComponent,
    updateComponent,
    deleteComponent,
    selectComponent,
    hoverComponent,
    reorderComponents,
    duplicateComponent,
    toggleComponentVisibility,
    saveToStorage,
    loadFromStorage,
    setLoading,
    setSaving,
    setDirty,
    setPreviewMode,
    getSelectedComponent
  } = useImprovedStoreEditor()
  
  // Hook للتعامل مع قاعدة البيانات
  const {
    components: dbComponents,
    isLoading: dbLoading,
    activeComponent,
    hasUnsavedChanges,
    addComponent: dbAddComponent,
    removeComponent: dbDeleteComponent,
    updateComponentSettings,
    saveChanges
  } = useStoreComponents({ organizationId, initialComponents: preloadedComponents as any })
  
  // تحميل المكونات من قاعدة البيانات مرة واحدة فقط (إذا لم تُوفر من الـ Provider)
  useEffect(() => {
    if (dbComponents && dbComponents.length > 0 && components.length === 0) {
      // تحويل المكونات من صيغة قاعدة البيانات إلى صيغة المحرر المحسن
      const formattedComponents = dbComponents.map(comp => {
        // تطبيع نوع المكون
        let type = comp.type.toLowerCase();
        
        // تطبيق نفس قواعد التطبيع المستخدمة في المحرر الكلاسيكي
        if (type === 'categories') {
          type = 'product_categories';
        } else if (type === 'featuredproducts') {
          type = 'featured_products';
        }
        
        // سجل التصحيح لتأكيد التحويل
        
        // نوع المكون المحسن المطابق
        const improvedType = type as ImprovedComponentType;
        
        return {
          id: comp.id,
          type: improvedType,
          name: getComponentDisplayName(improvedType),
          settings: comp.settings || {},
          isActive: comp.isActive ?? true, // التأكد من أن المكون نشط
          isVisible: comp.settings?._isVisible ?? true, // استخراج حالة الرؤية من الإعدادات
          orderIndex: comp.orderIndex || 0
        }
      });
      
      setComponents(formattedComponents);
    }
  }, [dbComponents, setComponents, components.length]);
  
  // تحديث حالة التحميل
  useEffect(() => {
    setLoading(dbLoading);
  }, [dbLoading, setLoading]);
  
  // حفظ التغييرات مع debounce
  const handleSave = useCallback(async () => {
    if (!isDirty || isSaving || components.length === 0) return;
    
    setSaving(true);
    
    try {
      // تحويل المكونات من صيغة المحرر المحسن إلى صيغة قاعدة البيانات
      const convertedComponents = components.map(comp => {
        // تحويل نوع المكون إلى النوع المتوافق مع قاعدة البيانات
        let componentTypeForDB = comp.type.toLowerCase();
        
        // تطبيق تحويلات الأنواع للتوافق مع قاعدة البيانات
        if (componentTypeForDB === 'product_categories') {
          componentTypeForDB = 'categories';
        } else if (componentTypeForDB === 'featured_products') {
          componentTypeForDB = 'featuredproducts';
        }
        
        // السجل للتأكد من تحويل الأنواع بشكل صحيح
        
        return {
          ...comp,
          type: componentTypeForDB,
        };
      });

      // حفظ المكونات مباشرة في قاعدة البيانات
      for (const comp of convertedComponents) {
        try {
          // تحقق ما إذا كان المكون موجوداً
          const { data: existingComponent, error: checkError } = await supabase
            .from('store_settings')
            .select('id')
            .eq('id', comp.id)
            .eq('organization_id', organizationId)
            .maybeSingle();
            
          if (checkError) {
            continue;
          }
          
          // ضمان توافق إعدادات المكونات مع النماذج المتوقعة في قاعدة البيانات
          let processedSettings = { ...comp.settings };
          
          // معالجة خاصة لمكون الهيرو
          if (comp.type === 'hero') {
            // تأكد من أن الأزرار والشارات مخزنة بشكل صحيح
            if (processedSettings.primaryButton && typeof processedSettings.primaryButton === 'object') {
              // ضمان تخزين التنسيقين (القديم والجديد) للتوافق مع المكونات
              processedSettings.primaryButtonText = processedSettings.primaryButton.text;
              processedSettings.primaryButtonLink = processedSettings.primaryButton.link;
            }
            
            if (processedSettings.secondaryButton && typeof processedSettings.secondaryButton === 'object') {
              processedSettings.secondaryButtonText = processedSettings.secondaryButton.text;
              processedSettings.secondaryButtonLink = processedSettings.secondaryButton.link;
            }
            
            // تأكد من أن شارات الثقة بالتنسيق الصحيح
            if (processedSettings.trustBadges && Array.isArray(processedSettings.trustBadges)) {
              // تنظيف أي شارات غير مكتملة وضمان أن الأيقونة بالتنسيق الصحيح
              processedSettings.trustBadges = processedSettings.trustBadges
                .filter((badge: any) => badge && badge.text && badge.icon)
                .map((badge: any) => {
                  // التأكد من أن قيمة الأيقونة متوافقة مع ما يتوقعه مكون StoreBanner
                  return {
                    ...badge,
                    // ضمان أن كل قيم الأيقونات مدعومة
                    icon: ['Truck', 'ShieldCheck', 'Gem', 'CheckCircle', 'Clock', 'Award', 'HeartHandshake'].includes(badge.icon) 
                      ? badge.icon 
                      : 'Gem' // استخدام قيمة افتراضية إذا كانت الأيقونة غير مدعومة
                  };
                });
            }
          }
          
          if (existingComponent) {
            try {
              // تحديث المكون الموجود
              const { error: updateError } = await supabase
                .from('store_settings')
                .update({
                  settings: {
                    ...processedSettings,
                    _isVisible: comp.isVisible ?? true // حفظ حالة الرؤية
                  },
                  is_active: comp.isActive,
                  order_index: comp.orderIndex,
                  updated_at: new Date().toISOString()
                })
                .eq('id', comp.id)
                .eq('organization_id', organizationId);
                
              if (updateError) {
              }
            } catch (error) {
            }
          } else {
            // التحقق من وجود مكون من نفس النوع قبل الإضافة
            const { data: typeExists, error: typeCheckError } = await supabase
              .from('store_settings')
              .select('id')
              .eq('organization_id', organizationId)
              .eq('component_type', comp.type)
              .maybeSingle();
              
            if (typeCheckError) {
            }
            
            // إذا كان المكون من هذا النوع موجوداً بالفعل، نقوم بتحديثه بدلاً من إضافة مكون جديد
            if (typeExists) {
              const { error: typeUpdateError } = await supabase
                .from('store_settings')
                .update({
                  settings: {
                    ...processedSettings,
                    _isVisible: comp.isVisible ?? true // حفظ حالة الرؤية
                  },
                  is_active: comp.isActive,
                  order_index: comp.orderIndex,
                  updated_at: new Date().toISOString()
                })
                .eq('id', typeExists.id)
                .eq('organization_id', organizationId);
                
              if (typeUpdateError) {
              }
            } else {
              // إضافة مكون جديد (للمكونات التي تم إنشاؤها حديثاً)
              const { error: insertError } = await supabase
                .from('store_settings')
                .insert({
                  id: comp.id,
                  organization_id: organizationId,
                  component_type: comp.type,
                  settings: {
                    ...processedSettings,
                    _isVisible: comp.isVisible ?? true // حفظ حالة الرؤية
                  },
                  is_active: comp.isActive,
                  order_index: comp.orderIndex,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
                
              if (insertError) {
              }
            }
          }
        } catch (error) {
        }
      }
      
      // مسح التخزين المؤقت للمتجر
      await clearStoreCacheByOrganizationId(organizationId);
      
      // الحصول على النطاق الفرعي للمنظمة لمسح التخزين المؤقت بشكل كامل
      const { data: orgData } = await supabase
        .from('organizations')
        .select('subdomain')
        .eq('id', organizationId)
        .single();
        
      if (orgData?.subdomain) {
        // مسح التخزين المؤقت للمتجر باستخدام النطاق الفرعي
        await clearCacheItem(`store_init_data:${orgData.subdomain}`);
        await clearCacheItem(`store_data:${orgData.subdomain}`);
      }
      
      setDirty(false);
      
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ جميع تغييرات المتجر",
        variant: "default"
      });
      
    } catch (error) {
      
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }, [isDirty, isSaving, components, organizationId, setSaving, setDirty, toast]);
  
  // تم إزالة الحفظ التلقائي - الآن يتم الحفظ يدوياً فقط
  
  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };
  
  // المكون المحدد
  const selectedComponent = getSelectedComponent()
  
  // معالج لوحة المفاتيح المحسن
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S للحفظ
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      
      // Ctrl+P لتبديل المعاينة
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        togglePreviewMode();
      }
      
      // Escape للخروج من وضع تحرير الخصائص
      if (e.key === 'Escape' && selectedComponent) {
        selectComponent(null);
      }
      
      // Delete لحذف المكون المحدد
      if (e.key === 'Delete' && selectedComponent && !previewMode) {
        e.preventDefault();
        deleteComponent(selectedComponent.id);
        selectComponent(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, previewMode, togglePreviewMode, selectedComponent, selectComponent, deleteComponent]);
  
  // فتح الخصائص تلقائياً عند اختيار مكون في الهاتف
  useEffect(() => {
    if (selectedComponent && (isMobile || isXs)) {
      // إظهار إشعار سريع
      setShowPropertiesNotification(true)
      
      // تأخير قصير ثم فتح الخصائص
      const timer = setTimeout(() => {
        setActivePanel('properties')
        setShowPropertiesNotification(false)
      }, 800)
      
      return () => clearTimeout(timer)
    }
  }, [selectedComponentId, isMobile, isXs])

  // إخفاء الإشعار عند تغيير اللوحة يدوياً
  useEffect(() => {
    if (activePanel !== 'properties') {
      setShowPropertiesNotification(false)
    }
  }, [activePanel])

  // إشعار عند عدم وجود مكون محدد في لوحة الخصائص
  useEffect(() => {
    if (activePanel === 'properties' && !selectedComponent && isMobile) {
      const timer = setTimeout(() => {
        if (!selectedComponent) {
          toast({
            title: "لم يتم تحديد مكون",
            description: "اختر مكوناً من قائمة المكونات لتعديل خصائصه",
            variant: "default"
          })
        }
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [activePanel, selectedComponent, isMobile, toast])
  
  return (
    <div className={cn("h-screen flex flex-col overflow-hidden bg-background store-editor-container", className)}>
      {/* شريط العنوان المتجاوب */}
      <div className={cn(
        "border-b flex items-center justify-between bg-card shadow-sm store-editor-header",
        "h-12 px-3 lg:h-14 lg:px-4", // ارتفاع وpadding متجاوب
        "backdrop-blur-sm bg-card/95"
      )}>
        <div className="flex items-center gap-2 lg:gap-3 min-w-0">
          {/* زر القائمة للأجهزة المحمولة */}
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="h-8 w-8 p-0 lg:hidden"
            >
              {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          )}
          
          <div className={cn(
            "font-medium truncate",
            "text-base lg:text-lg" // حجم خط متجاوب
          )}>
            محرر المتجر
            {selectedComponent && (
              <span className="text-sm text-muted-foreground mr-2">
                - تحرير خصائص
              </span>
            )}
          </div>
          
          {!isMobile && selectedComponent && (
            <Badge variant="secondary" className="text-xs font-normal bg-primary/10 text-primary border-primary/20">
              <Settings className="w-3 h-3 ml-1" />
              {selectedComponent.name}
            </Badge>
          )}
          
          {!isMobile && !selectedComponent && (
            <Badge variant="outline" className="text-xs font-normal">
              <Layers className="w-3 h-3 ml-1" />
              أدوات التصميم
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1 lg:gap-2">
          {/* أزرار التحكم المتجاوبة */}
          {!isMobile && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={togglePreviewMode}
                className="flex items-center gap-1 h-8 lg:h-9"
              >
                {previewMode ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span className="hidden sm:inline">تعديل</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">معاينة</span>
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // تنفيذ منطق عرض لوحة الإعدادات
                }}
                className="h-8 w-8 p-0 lg:h-9 lg:w-auto lg:px-3"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden lg:inline ml-1">إعدادات</span>
              </Button>
            </>
          )}
          
          <Button
            onClick={handleSave}
            size="sm"
            disabled={isSaving || !isDirty}
            variant={isDirty ? "default" : "outline"}
            className={cn(
              "flex items-center gap-1 transition-all duration-300 ease-out",
              "h-8 lg:h-9",
              isMobile ? "min-w-[80px]" : "min-w-[90px] lg:min-w-[120px]",
              isDirty && "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transform hover:scale-105"
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className={cn(isMobile ? "text-xs" : "text-sm")}>
                  {isMobile ? "حفظ..." : "جار الحفظ..."}
                </span>
              </>
            ) : isDirty ? (
              <>
                <Save className="w-4 h-4" />
                <span className={cn(isMobile ? "text-xs" : "text-sm")}>
                  {isMobile ? "حفظ" : "حفظ التغييرات"}
                </span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span className={cn(isMobile ? "text-xs" : "text-sm")}>محفوظ</span>
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* المحتوى الرئيسي المتجاوب */}
      <div className="flex-1 flex overflow-hidden relative" style={{ direction: 'rtl' }}>
        {isMobile ? (
          // تخطيط الأجهزة المحمولة - عرض لوحة واحدة في المرة
          <div className="w-full h-full relative">
            {/* التنقل السفلي للأجهزة المحمولة المحسن */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-card/95 backdrop-blur-sm border-t border-border/50 shadow-lg">
              <div className="flex items-center justify-around py-2 px-4">
                <Button
                  variant={activePanel === 'components' && !selectedComponent ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setActivePanel('components')
                    selectComponent(null) // إلغاء تحديد المكون عند الانتقال للأدوات
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 h-12 px-3 relative transition-all duration-200",
                    activePanel === 'components' && !selectedComponent && "shadow-sm"
                  )}
                >
                  <div className="relative">
                    <Layers className="w-4 h-4" />
                    {components.length > 0 && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </div>
                  <span className="text-xs">الأدوات</span>
                  {activePanel === 'components' && !selectedComponent && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                  )}
                </Button>
                
                <Button
                  variant={activePanel === 'preview' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('preview')}
                  className={cn(
                    "flex flex-col items-center gap-1 h-12 px-3 relative transition-all duration-200",
                    activePanel === 'preview' && "shadow-sm"
                  )}
                >
                  <Monitor className="w-4 h-4" />
                  <span className="text-xs">المعاينة</span>
                  {activePanel === 'preview' && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                  )}
                </Button>
                
                <Button
                  variant={selectedComponent ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (selectedComponent) {
                      setActivePanel('properties')
                    } else {
                      toast({
                        title: "لا يوجد مكون محدد",
                        description: "اختر مكوناً من المعاينة لتعديل خصائصه",
                        variant: "default"
                      })
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 h-12 px-3 relative transition-all duration-200",
                    selectedComponent && "shadow-sm"
                  )}
                  disabled={!selectedComponent}
                >
                  <div className="relative">
                    <Settings className="w-4 h-4" />
                    {selectedComponent && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    )}
                  </div>
                  <span className="text-xs">الخصائص</span>
                  {selectedComponent && activePanel === 'properties' && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                  )}
                </Button>
              </div>
            </div>
            
            {/* محتوى اللوحات */}
            <div className="h-full pb-16"> {/* pb-16 لإفساح المجال للتنقل السفلي */}
              <AnimatePresence mode="wait">
                {activePanel === 'components' && !selectedComponent && (
                  <motion.div
                    key="components"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <ComponentsSidebar organizationId={organizationId} />
                  </motion.div>
                )}
                
                {activePanel === 'preview' && (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <StorePreview organizationId={organizationId} />
                  </motion.div>
                )}
                
                {activePanel === 'properties' && selectedComponent && (
                  <motion.div
                    key="properties"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <div className="h-full flex flex-col">
                      {/* رأس لوحة الخصائص */}
                      <div className="p-4 border-b border-border bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4 text-primary" />
                            <span className="font-medium">خصائص المكون</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              selectComponent(null)
                              setActivePanel('preview')
                            }}
                            className="h-8 w-8 p-0 hover:bg-background"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {selectedComponent.name}
                          </Badge>
                        </div>
                      </div>

                      {/* محتوى لوحة الخصائص مع تمرير organizationId */}
                      <div className="flex-1 overflow-hidden">
                        <PropertiesPanel organizationId={organizationId} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          // تخطيط الشاشات الكبيرة الجديد - شريط واحد مع معاينة موسعة
          <div className="w-full h-full flex">
            {/* الشريط الجانبي الديناميكي */}
            <div className={cn(
              "flex-shrink-0 transition-all duration-300 ease-in-out store-editor-sidebar",
              "border-l border-border bg-card",
              "relative overflow-hidden",
              selectedComponent ? "w-80" : "w-72" // عرض أكبر عند عرض الخصائص
            )}>
              {/* خط مؤشر للوضع الحالي */}
              <div className={cn(
                "absolute top-0 right-0 w-1 h-full transition-all duration-300",
                selectedComponent ? "bg-yellow-500/60" : "bg-primary/60"
              )} />
              
              <AnimatePresence mode="wait">
                {selectedComponent ? (
                  // عرض لوحة الخصائص عند تحديد مكون
                  <motion.div
                    key="properties"
                    initial={{ opacity: 0, x: 20, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.98 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="h-full"
                  >
                    <div className="h-full flex flex-col">
                      {/* رأس لوحة الخصائص مع تدرج */}
                      <div className="p-4 border-b border-border bg-gradient-to-r from-yellow-50/50 to-amber-50/30 dark:from-yellow-950/20 dark:to-amber-950/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                              <Settings className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                              <span className="font-medium text-sm">خصائص المكون</span>
                              <p className="text-xs text-muted-foreground">تخصيص الإعدادات والمظهر</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => selectComponent(null)}
                            className="h-8 w-8 p-0 hover:bg-background/80 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="mt-3">
                          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
                            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1" />
                            {selectedComponent.name}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* محتوى لوحة الخصائص */}
                      <div className="flex-1 overflow-hidden">
                        <PropertiesPanel />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  // عرض شريط الأدوات عند عدم تحديد مكون
                  <motion.div
                    key="components"
                    initial={{ opacity: 0, x: -20, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.98 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="h-full"
                  >
                    <div className="h-full flex flex-col">
                      {/* رأس شريط الأدوات مع تدرج */}
                      <div className="p-4 border-b border-border bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Layers className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <span className="font-medium text-sm">أدوات التصميم</span>
                            <p className="text-xs text-muted-foreground">اسحب أو انقر لإضافة المكونات</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                            {components.length} مكون
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                            {components.filter(c => c.isVisible).length} مرئي
                          </Badge>
                        </div>
                      </div>
                      
                      {/* محتوى شريط الأدوات */}
                      <div className="flex-1 overflow-hidden">
                        <ComponentsSidebar organizationId={organizationId} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* معاينة المتجر الموسعة مع تأثيرات */}
            <div className="flex-1 overflow-hidden relative store-editor-main-content">
              {/* خلفية متدرجة خفيفة */}
              <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20 pointer-events-none" />
              
              {/* المحتوى */}
              <div className="relative h-full">
                <StorePreview organizationId={organizationId} />
              </div>
              
              {/* مؤشر الوضع الحالي */}
              {selectedComponent && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute top-4 left-4 z-10"
                >
                  <div className="bg-yellow-500/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg shadow-lg border border-yellow-400/20">
                    <div className="flex items-center gap-2 text-sm">
                      <Settings className="w-4 h-4" />
                    </div>

                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
        
        {/* قائمة التنقل الجانبية للأجهزة المحمولة */}
        {isMobile && (
          <AnimatePresence>
            {mobileNavOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/50 z-40"
                  onClick={() => setMobileNavOpen(false)}
                />
                
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-card border-l border-border shadow-2xl z-50"
                >
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">إعدادات المحرر</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMobileNavOpen(false)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <Button
                      variant="outline"
                      onClick={togglePreviewMode}
                      className="w-full justify-start gap-2"
                    >
                      {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {previewMode ? 'وضع التعديل' : 'وضع المعاينة'}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        // تنفيذ منطق عرض لوحة الإعدادات
                      }}
                      className="w-full justify-start gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      إعدادات المتجر
                    </Button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        )}
      </div>
      
      {/* شريط الحالة السفلي المتجاوب المحسن */}
      {!isMobile && (
        <footer className={cn(
          "border-t flex items-center justify-between text-xs text-muted-foreground",
          "h-6 px-3 lg:h-8 lg:px-4", // ارتفاع وpadding متجاوب
          "backdrop-blur-sm transition-colors duration-200",
          selectedComponent 
            ? "bg-yellow-50/80 border-yellow-200/50 dark:bg-yellow-950/20 dark:border-yellow-800/30" 
            : "bg-muted/30"
        )}>
          <div className="flex items-center gap-2 lg:gap-4 min-w-0">
            {/* مؤشر الوضع الحالي */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                selectedComponent 
                  ? "bg-yellow-500 animate-pulse shadow-sm shadow-yellow-500/50" 
                  : "bg-primary shadow-sm shadow-primary/50"
              )} />
              <span className={cn(
                "text-xs font-medium transition-colors duration-200",
                selectedComponent 
                  ? "text-yellow-700 dark:text-yellow-400" 
                  : "text-primary"
              )}>
                {selectedComponent ? "وضع تحرير الخصائص" : "وضع أدوات التصميم"}
              </span>
            </div>
            
            <Separator orientation="vertical" className="h-4" />
            
            <span className="whitespace-nowrap">
              المكونات: <span className="font-medium text-foreground">{components.length}</span>
            </span>
            <span className="whitespace-nowrap">
              النشطة: <span className="font-medium text-green-600">{components.filter(c => c.isActive).length}</span>
            </span>
            <span className="whitespace-nowrap">
              المرئية: <span className="font-medium text-blue-600">{components.filter(c => c.isVisible).length}</span>
            </span>
            
            {selectedComponent && !isTablet && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-2 truncate">
                  <Settings className="w-3 h-3 text-yellow-600" />
                  <span className="truncate">
                    المحدد: <span className="font-medium text-yellow-700 dark:text-yellow-400">{selectedComponent.name}</span>
                  </span>
                  {selectedComponent.isVisible === false && (
                    <span className="text-xs bg-red-500/10 text-red-600 px-1 rounded">مخفي</span>
                  )}
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4">
            {!isTablet && (
              <>
                <span className="whitespace-nowrap text-muted-foreground/70">Ctrl+S للحفظ</span>
                <span className="whitespace-nowrap text-muted-foreground/70">
                  {selectedComponent ? "Esc للخروج" : "انقر على مكون للتحرير"}
                </span>
              </>
            )}
            
            {/* مؤشر حالة الاتصال المحسن */}
            <div className="flex items-center gap-1">
              <div className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                isDirty 
                  ? "bg-orange-500 animate-pulse shadow-sm shadow-orange-500/50" 
                  : "bg-green-500 shadow-sm shadow-green-500/50"
              )} />
              <span className={cn(
                "text-xs font-medium transition-colors duration-200",
                isDirty ? "text-orange-700 dark:text-orange-400" : "text-green-700 dark:text-green-400"
              )}>
                {isDirty ? "غير محفوظ" : "محفوظ"}
              </span>
            </div>
            
            {/* مؤشر وضع المعاينة */}
            <div className="flex items-center gap-1">
              <div className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                previewMode ? "bg-blue-500" : "bg-gray-400"
              )} />
              <span className="text-xs">
                {previewMode ? "معاينة" : "تحرير"}
              </span>
            </div>
          </div>
        </footer>
      )}
      
      {/* إشعار الخصائص للأجهزة المحمولة */}
      {isMobile && showPropertiesNotification && selectedComponent && (
        <div className="absolute top-16 left-4 right-4 z-30">
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="bg-primary/90 backdrop-blur-sm text-white rounded-lg p-3 shadow-lg border border-white/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Settings className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">تم تحديد مكون</p>
                <p className="text-xs opacity-90 truncate">{selectedComponent.name}</p>
              </div>
              <div className="text-xs opacity-75 flex-shrink-0">جار فتح الخصائص...</div>
            </div>
          </motion.div>
        </div>
      )}

      {/* معلومات الحالة للأجهزة المحمولة */}
      {isMobile && isDirty && !showPropertiesNotification && (
        <div className="absolute top-16 left-4 right-4 z-30">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span>لديك تغييرات غير محفوظة</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* مؤشر المكون المحدد في الشريط العلوي للأجهزة المحمولة */}
      {isMobile && selectedComponent && activePanel !== 'properties' && !showPropertiesNotification && (
        <div className="absolute top-16 left-4 right-4 z-20">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-muted/90 backdrop-blur-sm rounded-lg p-2 border border-border/50"
          >
            <button
              onClick={() => setActivePanel('properties')}
              className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span>محدد: {selectedComponent.name}</span>
              <span className="mr-auto text-primary">اضغط لتحرير الخصائص</span>
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default ImprovedStoreEditor
