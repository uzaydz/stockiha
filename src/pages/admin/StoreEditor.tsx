import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Save, Settings } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { Separator } from '@/components/ui/separator';
import ComponentsPanel from '@/components/store-editor/ComponentsPanel';
import PreviewMode from '@/components/store-editor/PreviewMode';
import { useStoreComponents } from '@/hooks/useStoreComponents';
import { DragEndEvent } from '@dnd-kit/core';
import StoreSettings from '@/components/settings/StoreSettings';
import { useToast } from '@/components/ui/use-toast';
import AdminLayout from '@/components/AdminLayout';

const StoreEditor = () => {
  const { currentOrganization, isOrgAdmin } = useTenant();
  const { toast } = useToast();
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

  // معالجة حدث السحب والإفلات
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }
    
    onDragEnd(active.id as string, over.id as string);
  };

  // حفظ تغييرات المتجر
  const handleSaveChanges = async () => {
    try {
      await saveChanges();
      toast({
        title: "تم الحفظ",
        description: "تم حفظ جميع التغييرات بنجاح",
      });
    } catch (error) {
      console.error("فشل في حفظ التغييرات:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="تخصيص المتجر">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="تخصيص المتجر">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">تخصيص المتجر</h1>
            <p className="text-muted-foreground mt-2">قم بإعداد وتخصيص مكونات صفحة المتجر الخاصة بك</p>
          </div>
          <div className="flex items-center gap-3">
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

        {previewMode ? (
          // وضع المعاينة
          <PreviewMode components={components} />
        ) : (
          // وضع التحرير
          <ComponentsPanel
            components={components}
            activeComponent={activeComponent}
            onActivateComponent={(component) => {
              console.log("تفعيل المكون في الصفحة الرئيسية:", component.id, component.type);
              // التأكد من تحديث activeComponent بأحدث إصدار من components
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
              console.log("تحديث إعدادات المكون:", id, settings);
              updateComponentSettings(id, settings);
            }}
            onDragEnd={handleDragEnd}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default StoreEditor; 