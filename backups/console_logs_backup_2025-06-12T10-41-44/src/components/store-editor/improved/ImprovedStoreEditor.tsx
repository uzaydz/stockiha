import React, { useEffect, useCallback } from 'react'
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
  Check
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

import { useImprovedStoreEditor, getComponentDisplayName, ComponentType as ImprovedComponentType } from './hooks/useImprovedStoreEditor'
import { ComponentsSidebar } from './components/ComponentsSidebar'
import { StorePreview } from './components/StorePreview'
import { PropertiesPanel } from './components/PropertiesPanel'
import { StoreEditorThemeProvider } from './components/StoreEditorThemeProvider'
import { useStoreComponents } from '@/hooks/useStoreComponents'
import { supabase } from '@/lib/supabase'
import { clearStoreCacheByOrganizationId, clearCacheItem } from '@/lib/cache/storeCache'

interface ImprovedStoreEditorProps {
  organizationId: string
  className?: string
}

export const ImprovedStoreEditor: React.FC<ImprovedStoreEditorProps> = ({
  organizationId,
  className
}) => {
  const { toast } = useToast()
  
  // حالة المحرر
  const {
    components,
    selectedComponentId,
    isLoading,
    isSaving,
    isDirty,
    previewMode,
    sidebarWidth,
    propertiesWidth,
    setComponents,
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
    addComponent,
    removeComponent: dbDeleteComponent,
    updateComponentSettings,
    saveChanges
  } = useStoreComponents({ organizationId })
  
  // تحميل المكونات من قاعدة البيانات مرة واحدة فقط
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
  
  // اختصارات لوحة المفاتيح
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'p':
            e.preventDefault();
            setPreviewMode(!previewMode);
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, previewMode, setPreviewMode]);
  
  const selectedComponent = getSelectedComponent();
  
  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };
  
  return (
    <div className={cn("h-screen flex flex-col overflow-hidden", className)}>
      {/* شريط العنوان */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="text-lg font-medium">محرر المتجر</div>
          <Badge variant="outline" className="text-xs font-normal">
            {organizationId || 'متجرك'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {/* أزرار التحكم */}
          <Button
            variant="outline"
            size="sm"
            onClick={togglePreviewMode}
            className="flex items-center gap-1"
          >
            {previewMode ? (
              <>
                <EyeOff className="w-4 h-4" />
                <span>تعديل</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span>معاينة</span>
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // تنفيذ منطق عرض لوحة الإعدادات
            }}
          >
            <Settings className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={handleSave}
            size="sm"
            disabled={isSaving || !isDirty}
            variant={isDirty ? "default" : "outline"}
            className="flex items-center gap-1 min-w-[90px] transition-all duration-200"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جار الحفظ...</span>
              </>
            ) : isDirty ? (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ التغييرات</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>محفوظ</span>
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex overflow-hidden" style={{ direction: 'rtl' }}>
        <PanelGroup direction="horizontal">
          {/* شريط المكونات */}
          <Panel defaultSize={20} minSize={15} maxSize={30}>
            <ComponentsSidebar organizationId={organizationId} />
          </Panel>
          
          <PanelResizeHandle 
            className="w-1 hover:w-2 bg-muted hover:bg-primary transition-all duration-200"
          />
          
          {/* معاينة المتجر */}
          <Panel defaultSize={60} minSize={30}>
            <StorePreview organizationId={organizationId} />
          </Panel>
          
          {/* لوحة الخصائص */}
          <PanelResizeHandle 
            className="w-1 hover:w-2 bg-muted hover:bg-primary transition-all duration-200"
          />
          
          <Panel defaultSize={20} minSize={15} maxSize={30}>
            <PropertiesPanel />
          </Panel>
        </PanelGroup>
      </div>
      
      {/* شريط الحالة السفلي */}
      <footer className="h-8 border-t bg-muted/30 px-4 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>المكونات: {components.length}</span>
          <span>المكونات النشطة: {components.filter(c => c.isActive).length}</span>
          {selectedComponent && (
            <span>المحدد: {selectedComponent.name}</span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <span>Ctrl+S للحفظ</span>
          <span>Ctrl+P للمعاينة</span>
        </div>
      </footer>
    </div>
  )
}

export default ImprovedStoreEditor
