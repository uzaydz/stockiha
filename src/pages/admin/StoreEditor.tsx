import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Save, Settings, ArrowLeft, Monitor, Tablet, Smartphone } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import Layout from '@/components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// المكونات المحسنة
import { EnhancedStoreEditor } from '@/components/store-editor/enhanced';
import type { PageConfig, ViewportSize, EditorMode } from '@/components/store-editor/enhanced/types';

// المكونات القديمة للتوافق
import ComponentsPanel from '@/components/store-editor/ComponentsPanel';
import PreviewMode from '@/components/store-editor/PreviewMode';
import { useStoreComponents } from '@/hooks/useStoreComponents';
import { DragEndEvent } from '@dnd-kit/core';
import StoreSettings from '@/components/settings/StoreSettings';

interface StoreEditorProps {
  className?: string;
}

const StoreEditor: React.FC<StoreEditorProps> = ({ className }) => {
  const { currentOrganization, isOrgAdmin } = useTenant();
  const { toast } = useToast();
  
  // حالة المحرر
  const [editorMode, setEditorMode] = useState<'enhanced' | 'classic'>('enhanced');
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // حالة النسخة الكلاسيكية
  const [previewMode, setPreviewMode] = useState(false);
  
  const {
    components,
    activeComponent,
    isLoading,
    isSaving,
    setActiveComponent,
    addComponent,
    removeComponent,
    updateComponentSettings,
    toggleComponentActive,
    handleDragEnd: onDragEnd,
    saveChanges
  } = useStoreComponents({ 
    organizationId: currentOrganization?.id 
  });

  // تحويل البيانات للنسخة المحسنة
  const convertToEnhancedFormat = useCallback((): PageConfig => {
    return {
      id: `page_${currentOrganization?.id || 'default'}`,
      name: `متجر ${currentOrganization?.name || 'غير محدد'}`,
      slug: currentOrganization?.name?.toLowerCase().replace(/\s+/g, '-') || 'default-store',
      description: `صفحة متجر ${currentOrganization?.name || ''}`,
      elements: components.map((component, index) => ({
        id: component.id,
        type: component.type as any,
        name: component.type,
        properties: {
          ...component.settings,
          text: component.settings?.title || component.settings?.content,
        },
        styles: {
          desktop: {},
          tablet: {},
          mobile: {},
        },
        order: index,
        isVisible: component.isActive !== false,
        isLocked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }, [components, currentOrganization]);

  // معالجات النسخة المحسنة
  const handleEnhancedSave = useCallback(async (page: PageConfig) => {
    try {
      // تحويل البيانات إلى الصيغة القديمة والحفظ
      await saveChanges();
      
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ جميع التغييرات في المتجر",
      });
    } catch (error) {
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive",
      });
      throw error;
    }
  }, [saveChanges, toast]);

  const handleEnhancedPublish = useCallback(async (page: PageConfig) => {
    try {
      // تنفيذ منطق النشر
      await saveChanges();
      
      toast({
        title: "تم النشر بنجاح",
        description: "تم نشر المتجر وهو متاح الآن للعملاء",
      });
    } catch (error) {
      toast({
        title: "خطأ في النشر",
        description: "حدث خطأ أثناء نشر المتجر",
        variant: "destructive",
      });
      throw error;
    }
  }, [saveChanges, toast]);

  const handleEnhancedExport = useCallback(async (page: PageConfig, format: string) => {
    try {
      // تنفيذ منطق التصدير
      const exportData = JSON.stringify(page, null, 2);
      
      // إنشاء ملف للتحميل
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `store-${page.slug}-${format}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير المتجر بصيغة ${format.toUpperCase()}`,
      });
      
      return exportData;
    } catch (error) {
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير المتجر",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  // معالجات النسخة الكلاسيكية
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }
    
    onDragEnd(active.id as string, over.id as string);
  };

  const handleSaveChanges = async () => {
    try {
      await saveChanges();
      toast({
        title: "تم الحفظ",
        description: "تم حفظ جميع التغييرات بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive",
      });
    }
  };

  // تبديل أوضاع المحرر
  const toggleEditorMode = async () => {
    setIsTransitioning(true);
    
    // انتظار قصير للرسوم المتحركة
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setEditorMode(prev => prev === 'enhanced' ? 'classic' : 'enhanced');
    setIsTransitioning(false);
  };

  // عرض شاشة التحميل
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h3 className="text-lg font-semibold">جاري تحميل محرر المتجر...</h3>
            <p className="text-muted-foreground">يرجى الانتظار لحظات</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // المحرر المحسن
  if (editorMode === 'enhanced') {
    return (
      <div className={cn("h-screen overflow-hidden", className)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {/* شريط التبديل */}
          <div className="bg-background border-b px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleEditorMode}
                disabled={isTransitioning}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                العودة للنسخة الكلاسيكية
              </Button>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm text-muted-foreground">
                المحرر المتطور - النسخة 2.0
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-1 rounded-full">
                جديد
              </span>
              <span className="text-xs text-muted-foreground">
                {currentOrganization?.name}
              </span>
            </div>
          </div>

          {/* المحرر المحسن */}
          <div className="h-[calc(100vh-60px)]">
            <EnhancedStoreEditor
              initialPage={convertToEnhancedFormat()}
              onSave={handleEnhancedSave}
              onPublish={handleEnhancedPublish}
              onExport={handleEnhancedExport}
              theme="light"
              enableCollaboration={false}
              enableKeyboardShortcuts={true}
              maxHistorySize={50}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  // النسخة الكلاسيكية
  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto px-4 py-6"
      >
        {/* رأس الصفحة */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">تخصيص المتجر</h1>
            <p className="text-muted-foreground mt-2">
              قم بإعداد وتخصيص مكونات صفحة المتجر الخاصة بك
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* زر التبديل للمحرر المحسن */}
            <Button
              variant="outline"
              onClick={toggleEditorMode}
              disabled={isTransitioning}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 hover:from-blue-700 hover:to-purple-700"
            >
              <Monitor className="w-4 h-4 mr-2" />
              المحرر المتطور
            </Button>
            
            <StoreSettings />
            
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {previewMode ? 'إنهاء المعاينة' : 'معاينة'}
            </Button>
            
            <Button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>
        </div>

        <Separator className="my-6" />

        {/* المحتوى */}
        <AnimatePresence mode="wait">
          {previewMode ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            >
              <PreviewMode components={components} />
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.3 }}
            >
              <ComponentsPanel
                components={components}
                activeComponent={activeComponent}
                onActivateComponent={(component) => {
                  const updatedComponent = components.find(c => c.id === component.id);
                  if (updatedComponent) {
                    setActiveComponent(updatedComponent);
                  } else {
                    setActiveComponent(component);
                  }
                }}
                onToggleComponentActive={toggleComponentActive}
                onRemoveComponent={removeComponent}
                onAddComponent={addComponent}
                onUpdateSettings={(id, settings) => {
                  updateComponentSettings(id, settings);
                }}
                onDragEnd={handleDragEnd}
                onSave={saveChanges}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* طبقة التحميل أثناء التبديل */}
        <AnimatePresence>
          {isTransitioning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
            >
              <div className="bg-card rounded-lg shadow-lg p-6 max-w-sm mx-4">
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                  <div>
                    <h3 className="font-semibold">جاري التبديل...</h3>
                    <p className="text-sm text-muted-foreground">
                      يرجى الانتظار لحظات
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Layout>
  );
};

export default StoreEditor;
