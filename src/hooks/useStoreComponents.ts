import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { StoreComponent, ComponentType, defaultComponentSettings } from '@/types/store-editor';
import { arrayMove } from '@dnd-kit/sortable';
import { clearCacheItem, clearStoreCacheByOrganizationId } from '@/lib/cache/storeCache';

interface UseStoreComponentsProps {
  organizationId?: string;
}

interface UseStoreComponentsReturn {
  components: StoreComponent[];
  activeComponent: StoreComponent | null;
  isLoading: boolean;
  isSaving: boolean;
  setActiveComponent: (component: StoreComponent | null) => void;
  addComponent: (type: ComponentType) => Promise<void>;
  removeComponent: (id: string) => Promise<void>;
  updateComponentSettings: (id: string, newSettings: any) => Promise<void>;
  toggleComponentActive: (id: string) => Promise<void>;
  handleDragEnd: (activeId: string, overId: string) => Promise<void>;
  saveChanges: () => Promise<void>;
}

export const useStoreComponents = ({ organizationId }: UseStoreComponentsProps): UseStoreComponentsReturn => {
  const [components, setComponents] = useState<StoreComponent[]>([]);
  const [activeComponent, setActiveComponent] = useState<StoreComponent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // تعيين المكون النشط بشكل صحيح
  const selectActiveComponent = (component: StoreComponent | null) => {
    console.log("تعيين المكون النشط:", component?.id, component?.type);
    // التأكد من أخذ أحدث نسخة من الكمبوننت من المصفوفة
    if (component) {
      const updatedComponent = components.find(c => c.id === component.id) || component;
      setActiveComponent(updatedComponent);
    } else {
      setActiveComponent(null);
    }
  };

  // وظيفة جلب مكونات المتجر
  const fetchStoreComponents = async () => {
    if (!organizationId) return;

    try {
      setIsLoading(true);
      
      // استخدام وظيفة get_store_settings من قاعدة البيانات
      const { data, error } = await supabase
        .rpc('get_store_settings', {
          p_organization_id: organizationId
        });

      if (error) {
        console.error('Error fetching store components:', error);
        console.log('Error details:', error.details, 'Error hint:', error.hint);
        toast({
          title: 'خطأ في جلب مكونات المتجر',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      if (data && data.length > 0) {
        // تحويل البيانات المستلمة إلى الصيغة المطلوبة واستبعاد مكون seo_settings
        const mappedComponents: StoreComponent[] = data
          .filter(item => item.component_type !== 'seo_settings') // استبعاد مكون seo_settings
          .map(item => ({
            id: item.id,
            type: item.component_type as ComponentType,
            settings: item.settings,
            isActive: item.is_active,
            orderIndex: item.order_index
          }));

        setComponents(mappedComponents);
        
        // تعيين المكون النشط الأول إذا لم يكن هناك مكون نشط
        if (!activeComponent && mappedComponents.length > 0) {
          console.log("تعيين المكون النشط الأول:", mappedComponents[0]);
          setActiveComponent(mappedComponents[0]);
        } else if (activeComponent) {
          // إذا كان هناك مكون نشط، نتأكد من تحديثه
          const updatedActiveComponent = mappedComponents.find(c => c.id === activeComponent.id);
          if (updatedActiveComponent) {
            console.log("تحديث المكون النشط:", updatedActiveComponent);
            setActiveComponent(updatedActiveComponent);
          }
        }
      } else {
        // إذا لم يكن هناك مكونات محفوظة، تهيئة إعدادات المتجر
        initializeStoreComponents();
      }
    } catch (error) {
      console.error('Error in fetching store components:', error);
      toast({
        title: 'خطأ في جلب مكونات المتجر',
        description: 'حدث خطأ أثناء جلب بيانات المتجر',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // جلب مكونات المتجر من قاعدة البيانات
  useEffect(() => {
    fetchStoreComponents();
  }, [organizationId]);

  // تهيئة إعدادات المتجر إذا لم تكن موجودة
  const initializeStoreComponents = async () => {
    if (!organizationId) return;

    try {
      // استخدام وظيفة initialize_store_settings 
      const { data, error } = await supabase
        .rpc('initialize_store_settings', {
          p_organization_id: organizationId
        });

      if (error) {
        throw new Error(error.message);
      }

      // إعادة تحميل المكونات بعد التهيئة
      const { data: storeData, error: storeError } = await supabase
        .rpc('get_store_settings', {
          p_organization_id: organizationId
        });

      if (storeError) {
        throw new Error(storeError.message);
      }

      if (storeData && storeData.length > 0) {
        const mappedComponents: StoreComponent[] = storeData
          .filter(item => item.component_type !== 'seo_settings') // استبعاد مكون seo_settings
          .map(item => ({
            id: item.id,
            type: item.component_type as ComponentType,
            settings: item.settings,
            isActive: item.is_active,
            orderIndex: item.order_index
          }));

        setComponents(mappedComponents);
        if (mappedComponents.length > 0) {
          setActiveComponent(mappedComponents[0]);
        }
      }
    } catch (error: any) {
      console.error('Error initializing store components:', error);
      // إضافة مكون هيرو افتراضي محلياً إذا فشلت التهيئة
      addComponent('Hero');
    }
  };

  // إضافة مكون جديد
  const addComponent = async (type: ComponentType) => {
    if (!organizationId) {
      toast({
        title: 'خطأ في الإضافة',
        description: 'لم يتم تحديد المؤسسة',
        variant: 'destructive'
      });
      return;
    }

    const newOrderIndex = components.length > 0 
      ? Math.max(...components.map(c => c.orderIndex)) + 1 
      : 1;

    try {
      // استخدام وظيفة upsert_store_component مع ترتيب المعلمات الصحيح
      const { data, error } = await supabase
        .rpc('upsert_store_component', {
          p_component_id: null, // مكون جديد
          p_component_type: type,
          p_is_active: true,
          p_order_index: newOrderIndex,
          p_organization_id: organizationId,
          p_settings: defaultComponentSettings[type]
        });

      if (error) {
        throw new Error(error.message);
      }

      // إضافة المكون محلياً بعد الحفظ الناجح
      const newComponent: StoreComponent = {
        id: data, // معرف من قاعدة البيانات
        type,
        settings: defaultComponentSettings[type],
        isActive: true,
        orderIndex: newOrderIndex
      };

      setComponents(prev => [...prev, newComponent]);
      setActiveComponent(newComponent);

      // مسح التخزين المؤقت للمتجر بعد إضافة مكون جديد
      await clearStoreCache(organizationId);

      toast({
        title: 'تمت الإضافة',
        description: `تم إضافة مكون ${type} بنجاح`,
      });
    } catch (error: any) {
      console.error('Error adding component:', error);
      toast({
        title: 'خطأ في إضافة المكون',
        description: error.message || 'حدث خطأ أثناء إضافة المكون',
        variant: 'destructive'
      });
    }
  };

  // حذف مكون
  const removeComponent = async (id: string) => {
    if (!organizationId) return;

    try {
      // استخدام وظيفة delete_store_component 
      const { data, error } = await supabase
        .rpc('delete_store_component', {
          p_organization_id: organizationId,
          p_component_id: id
        });

      if (error) {
        throw new Error(error.message);
      }

      // تحديث المكونات محلياً
      const updatedComponents = components.filter(component => component.id !== id);
      setComponents(updatedComponents);
      
      if (activeComponent && activeComponent.id === id) {
        setActiveComponent(updatedComponents.length > 0 ? updatedComponents[0] : null);
      }

      // مسح التخزين المؤقت للمتجر بعد حذف مكون
      await clearStoreCache(organizationId);

      toast({
        title: 'تم الحذف',
        description: 'تم حذف المكون بنجاح'
      });
    } catch (error: any) {
      console.error('Error removing component:', error);
      toast({
        title: 'خطأ في حذف المكون',
        description: error.message || 'حدث خطأ أثناء حذف المكون',
        variant: 'destructive'
      });
    }
  };

  // تحديث إعدادات مكون
  const updateComponentSettings = async (id: string, newSettings: any) => {
    if (!organizationId) return;

    try {
      // تحديث الإعدادات محلياً أولاً للاستجابة السريعة
      setComponents(prev => 
        prev.map(comp => 
          comp.id === id 
            ? { ...comp, settings: { ...newSettings } } 
            : comp
        )
      );
      
      // تحديث المكون النشط إذا كان هو المعدل
      if (activeComponent && activeComponent.id === id) {
        setActiveComponent({ ...activeComponent, settings: { ...newSettings } });
      }

      // ثم تحديث في قاعدة البيانات
      const { error } = await supabase
        .rpc('upsert_store_component', {
          p_component_id: id,
          p_component_type: components.find(c => c.id === id)?.type || '',
          p_is_active: components.find(c => c.id === id)?.isActive || true,
          p_order_index: components.find(c => c.id === id)?.orderIndex || 0,
          p_organization_id: organizationId,
          p_settings: newSettings
        });

      if (error) {
        throw new Error(error.message);
      }

      // مسح البيانات المخزنة مؤقتًا للمتجر لتحديث العرض في صفحة المتجر
      await clearStoreCache(organizationId);
      
      // عرض تأكيد النجاح
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث إعدادات المكون بنجاح',
      });

      // تأكيد التحديث بنجاح
      console.log('Component settings updated successfully:', id);
    } catch (error: any) {
      console.error('Error updating component settings:', error);
      
      // استعادة الحالة السابقة في حالة الفشل
      fetchStoreComponents();
      
      toast({
        title: 'خطأ في تحديث الإعدادات',
        description: error.message || 'حدث خطأ أثناء تحديث إعدادات المكون',
        variant: 'destructive'
      });
    }
  };

  // تغيير حالة نشاط المكون
  const toggleComponentActive = async (id: string) => {
    if (!organizationId) return;

    // الحصول على المكون المراد تحديثه
    const componentToUpdate = components.find(comp => comp.id === id);
    if (!componentToUpdate) return;

    // تحديث محلي فوري
    const updatedComponents = components.map(component => {
      if (component.id === id) {
        return { ...component, isActive: !component.isActive };
      }
      return component;
    });

    setComponents(updatedComponents);

    if (activeComponent && activeComponent.id === id) {
      setActiveComponent({ ...activeComponent, isActive: !activeComponent.isActive });
    }

    try {
      // استخدام وظيفة upsert_store_component للتحديث مع ترتيب المعلمات الصحيح
      const { error } = await supabase
        .rpc('upsert_store_component', {
          p_component_id: id,
          p_component_type: componentToUpdate.type,
          p_is_active: !componentToUpdate.isActive,
          p_order_index: componentToUpdate.orderIndex,
          p_organization_id: organizationId,
          p_settings: componentToUpdate.settings
        });

      if (error) {
        throw new Error(error.message);
      }

      // مسح التخزين المؤقت للمتجر بعد تغيير حالة نشاط المكون
      await clearStoreCache(organizationId);
      
      // عرض تأكيد النجاح
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث حالة المكون بنجاح'
      });
    } catch (error: any) {
      console.error('Error toggling component activity:', error);
      toast({
        title: 'خطأ في تحديث حالة المكون',
        description: error.message || 'حدث خطأ أثناء تحديث حالة نشاط المكون',
        variant: 'destructive'
      });
      
      // استعادة الحالة السابقة في حالة الفشل
      fetchStoreComponents();
    }
  };

  // تعامل مع نهاية السحب والإفلات لترتيب المكونات
  const handleDragEnd = async (activeId: string, overId: string) => {
    if (!organizationId || activeId === overId) return;

    try {
      // الحصول على فهارس المكونات المعنية
      const activeIndex = components.findIndex(comp => comp.id === activeId);
      const overIndex = components.findIndex(comp => comp.id === overId);

      if (activeIndex === -1 || overIndex === -1) {
        console.error('Component not found:', { activeId, overId, activeIndex, overIndex });
        return;
      }

      // تحديث الترتيب محلياً أولاً للاستجابة الفورية
      const orderedComponents = arrayMove(components, activeIndex, overIndex);
      
      // إعادة ترقيم فهارس الترتيب
      const reindexedComponents = orderedComponents.map((component, index) => {
        return { ...component, orderIndex: index + 1 };
      });

      // تطبيق التغييرات محلياً
      setComponents(reindexedComponents);

      // إذا كان المكون النشط هو المكون المسحوب، حدثه أيضًا
      if (activeComponent && activeComponent.id === activeId) {
        const updatedActive = reindexedComponents.find(comp => comp.id === activeId);
        if (updatedActive) {
          setActiveComponent(updatedActive);
        }
      }

      // جمع البيانات المطلوبة للحفظ على شكل مصفوفة
      const updates = reindexedComponents.map(component => ({
        id: component.id,
        orderIndex: component.orderIndex
      }));

      // تجهيز مصفوفة معرفات المكونات فقط
      const componentIds = reindexedComponents.map(component => component.id);
      
      // تحديث قاعدة البيانات باستخدام وظيفة مخصصة
      // إرسال المصفوفة كـ JSON متوافق مع البنية المتوقعة
      const { error } = await supabase
        .rpc('update_store_components_order', {
          p_organization_id: organizationId,
          // إرسال النص JSON مباشرة بدون تحويل إضافي
          p_components_order: `[${componentIds.map(id => `"${id}"`).join(",")}]`
        });

      if (error) {
        throw new Error(error.message);
      }

      // مسح التخزين المؤقت للمتجر بعد تغيير ترتيب المكونات
      await clearStoreCache(organizationId);
      
      // عرض تأكيد النجاح
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث ترتيب المكونات بنجاح'
      });

      console.log('Components order updated successfully');
    } catch (error: any) {
      console.error('Error updating components order:', error);
      toast({
        title: 'خطأ في تحديث الترتيب',
        description: error.message || 'حدث خطأ أثناء تحديث ترتيب المكونات',
        variant: 'destructive'
      });
      
      // استعادة الحالة السابقة في حالة الفشل
      fetchStoreComponents();
    }
  };

  // حفظ التغييرات
  const saveChanges = async () => {
    if (!organizationId) return;
    
    setIsSaving(true);
    
    try {
      // يمكن هنا إضافة أي منطق إضافي للحفظ إذا لزم الأمر
      // على سبيل المثال، تحديث جميع المكونات مرة واحدة
      
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ التغييرات بنجاح',
      });
    } catch (error: any) {
      console.error('Error saving changes:', error);
      toast({
        title: 'خطأ في حفظ التغييرات',
        description: error.message || 'حدث خطأ أثناء حفظ التغييرات',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // وظيفة مساعدة للحصول على اسم النطاق الفرعي للمنظمة
  const getOrganizationSubdomain = async (organizationId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('subdomain')
        .eq('id', organizationId)
        .single();

      if (error || !data) {
        console.error('Error fetching organization subdomain:', error);
        return null;
      }

      return data.subdomain;
    } catch (error) {
      console.error('Unexpected error getting organization subdomain:', error);
      return null;
    }
  };

  // وظيفة مساعدة لمسح التخزين المؤقت للمتجر
  const clearStoreCache = async (orgId: string) => {
    try {
      // استخدام الوظيفة المحسنة لمسح التخزين المؤقت باستخدام معرف المؤسسة مباشرة
      await clearStoreCacheByOrganizationId(orgId);
      console.log(`تم مسح التخزين المؤقت للمتجر بنجاح للمؤسسة: ${orgId}`);
    } catch (error) {
      console.error('Error clearing store cache:', error);
    }
  };

  return {
    components,
    activeComponent,
    isLoading,
    isSaving,
    setActiveComponent: selectActiveComponent,
    addComponent,
    removeComponent,
    updateComponentSettings,
    toggleComponentActive,
    handleDragEnd,
    saveChanges
  };
}; 