import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { arrayMove } from '@dnd-kit/sortable';
import { LandingPage, LandingPageComponent, getDefaultSettingsForType } from '../types';

export const useLandingPageEditor = (
  page: LandingPage,
  onPageUpdate: (page: LandingPage) => void
) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeComponentId, setActiveComponentId] = useState<string | null>(null);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const prevActiveComponentIdRef = useRef<string | null>(null);

  // تأثير لإظهار إشعار عند تحديد مكون
  useEffect(() => {
    if (activeComponentId && activeComponentId !== prevActiveComponentIdRef.current) {
      const activeComponent = page.components.find(c => c.id === activeComponentId);
      if (activeComponent) {
        toast({
          title: t('تم تحديد المكون'),
          description: `${t(activeComponent.type)} ${t('جاهز للتحرير')}`,
          duration: 1500,
        });
        prevActiveComponentIdRef.current = activeComponentId;
      }
    } else if (activeComponentId === null) {
      // Reset the ref when a component is unselected
      prevActiveComponentIdRef.current = null;
    }
  }, [activeComponentId, page.components, t, toast]);
  
  // استماع لحدث تحديث إعدادات المكون من النافذة المنبثقة
  useEffect(() => {
    const handleUpdateFromModal = (event: CustomEvent) => {
      const { id, settings } = event.detail;
      updateComponentSettings(id, settings);
    };
    
    document.addEventListener('updateComponentSettings', handleUpdateFromModal as EventListener);
    
    return () => {
      document.removeEventListener('updateComponentSettings', handleUpdateFromModal as EventListener);
    };
  }, [page]); // تضمين page في مصفوفة التبعيات لتعكس التغييرات

  // إضافة مكون جديد
  const addComponent = (type: string) => {
    const newComponent: LandingPageComponent = {
      id: `component-${Date.now()}`,
      type,
      isActive: true,
      settings: getDefaultSettingsForType(type)
    };
    
    onPageUpdate({
      ...page,
      components: [...page.components, newComponent]
    });
    
    // تنشيط المكون الجديد تلقائيًا
    setActiveComponentId(newComponent.id);
    
    toast({
      title: t('تمت الإضافة بنجاح'),
      description: `${t('تمت إضافة مكون')} ${t(type)} ${t('جديد')}`,
    });
  };

  // نسخ مكون
  const duplicateComponent = (id: string) => {
    const componentToDuplicate = page.components.find(component => component.id === id);
    if (componentToDuplicate) {
      const duplicatedComponent: LandingPageComponent = {
        ...componentToDuplicate,
        id: `component-${Date.now()}`,
      };
      
      onPageUpdate({
        ...page,
        components: [...page.components, duplicatedComponent]
      });
      
      toast({
        title: t('تم النسخ بنجاح'),
        description: `${t('تم نسخ مكون')} ${t(componentToDuplicate.type)}`,
      });
    }
  };

  // حذف مكون
  const removeComponent = (id: string) => {
    onPageUpdate({
      ...page,
      components: page.components.filter(component => component.id !== id)
    });
    
    if (activeComponentId === id) {
      setActiveComponentId(null);
    }
    
    toast({
      title: t('تم الحذف'),
      description: t('تم حذف المكون بنجاح'),
      variant: "destructive",
    });
    
    setShowDeleteDialog(null);
  };

  // تحريك المكون لأعلى
  const moveComponentUp = (id: string) => {
    const index = page.components.findIndex(component => component.id === id);
    if (index > 0) {
      const newComponents = arrayMove(page.components, index, index - 1);
      onPageUpdate({
        ...page,
        components: newComponents
      });
    }
  };

  // تحريك المكون لأسفل
  const moveComponentDown = (id: string) => {
    const index = page.components.findIndex(component => component.id === id);
    if (index < page.components.length - 1) {
      const newComponents = arrayMove(page.components, index, index + 1);
      onPageUpdate({
        ...page,
        components: newComponents
      });
    }
  };

  // تبديل حالة نشاط المكون
  const toggleComponentActive = (id: string) => {
    onPageUpdate({
      ...page,
      components: page.components.map(component => 
        component.id === id ? { ...component, isActive: !component.isActive } : component
      )
    });
    
    const component = page.components.find(c => c.id === id);
    if (component) {
      toast({
        title: component.isActive ? t('تم إخفاء المكون') : t('تم إظهار المكون'),
        description: component.isActive ? 
          t('لن يظهر هذا المكون في الصفحة المنشورة') : 
          t('سيظهر هذا المكون في الصفحة المنشورة'),
        duration: 1500,
      });
    }
  };

  // تحديث إعدادات المكون
  const updateComponentSettings = (id: string, settings: Record<string, any>) => {
    onPageUpdate({
      ...page,
      components: page.components.map(component => 
        component.id === id ? { ...component, settings: { ...component.settings, ...settings } } : component
      )
    });
  };

  // الحصول على المكون النشط
  const getActiveComponent = () => {
    if (!activeComponentId) return null;
    return page.components.find(component => component.id === activeComponentId) || null;
  };

  return {
    activeComponentId,
    setActiveComponentId,
    hoveredComponentId,
    setHoveredComponentId,
    showDeleteDialog,
    setShowDeleteDialog,
    getActiveComponent,
    addComponent,
    duplicateComponent,
    removeComponent,
    moveComponentUp,
    moveComponentDown,
    toggleComponentActive,
    updateComponentSettings,
  };
};
