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
  hasUnsavedChanges: boolean;
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
  const [originalComponents, setOriginalComponents] = useState<StoreComponent[]>([]);
  const [activeComponent, setActiveComponent] = useState<StoreComponent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // تعيين المكون النشط بشكل صحيح
  const selectActiveComponent = (component: StoreComponent | null) => {
    
    // التأكد من أخذ أحدث نسخة من الكمبوننت من المصفوفة
    if (component) {
      const updatedComponent = components.find(c => c.id === component.id) || component;
      setActiveComponent(updatedComponent);
    } else {
      setActiveComponent(null);
    }
  };

  // التحقق مما إذا كان المستخدم مسجل دخول
  const isUserLoggedIn = async (): Promise<boolean> => {
    const { data } = await supabase.auth.getSession();
    return !!data.session?.user;
  };

  // وظيفة جلب مكونات المتجر - محسنة
  const fetchStoreComponents = async () => {
    if (!organizationId) return;

    try {
      setIsLoading(true);
      
      // التحقق مما إذا كان المستخدم مسجل دخول
      const isLoggedIn = await isUserLoggedIn();

      let data, error;
      
      // استخدام الاستعلام المباشر بدلاً من الدالة غير الموجودة
      const result = await supabase
        .from('store_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      data = result.data;
      error = result.error;

      if (error) {
        
        toast({
          title: 'خطأ في جلب مكونات المتجر',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      if (data && data.length > 0) {
        // تحويل البيانات بشكل محسن
        const mappedComponents: StoreComponent[] = data
          .filter(item => !['seo_settings', 'seo'].includes(item.component_type.toLowerCase()))
          .map(item => {
            const normalizedType = normalizeComponentType(item.component_type);
            
            return {
              id: item.id,
              type: normalizedType as ComponentType,
              settings: item.settings_summary || item.settings || {},
              isActive: item.is_active,
              orderIndex: item.order_index
            };
          });

        setComponents(mappedComponents);
        setOriginalComponents(JSON.parse(JSON.stringify(mappedComponents)));
        setHasUnsavedChanges(false);
        
        // تعيين المكون النشط الأول بشكل محسن
        if (!activeComponent && mappedComponents.length > 0) {
          setActiveComponent(mappedComponents[0]);
        } else if (activeComponent) {
          const updatedActiveComponent = mappedComponents.find(c => c.id === activeComponent.id);
          if (updatedActiveComponent) {
            setActiveComponent(updatedActiveComponent);
          }
        }
      } else {
        // إذا لم يكن هناك مكونات محفوظة، تهيئة إعدادات المتجر
        if (isLoggedIn) {
          initializeStoreComponents();
        }
      }
    } catch (error) {
      
      toast({
        title: 'خطأ في جلب مكونات المتجر',
        description: 'حدث خطأ أثناء جلب بيانات المتجر',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // دالة مساعدة لتطبيع أنواع المكونات - محسنة
  const normalizeComponentType = (componentType: string): string => {
    const type = componentType.toLowerCase();
    
    switch (type) {
      case 'categories':
        return 'product_categories';
      case 'featuredproducts':
        return 'featured_products';
      default:
        return type;
    }
  };

  // جلب مكونات المتجر من قاعدة البيانات - إصلاح useEffect اللانهائية
  useEffect(() => {
    if (organizationId) {
      fetchStoreComponents();
    }
  }, [organizationId]); // فقط organizationId في dependencies

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
          p_organization_id: organizationId,
          p_public_access: false
        });

      if (storeError) {
        throw new Error(storeError.message);
      }

      if (storeData && storeData.length > 0) {
        const mappedComponents: StoreComponent[] = storeData
          .filter(item => item.component_type.toLowerCase() !== 'seo_settings') // استبعاد مكون seo_settings وتحويل إلى أحرف صغيرة
          .map(item => {
            // تطبيع نوع المكون للتوافق مع المحررات
            let normalizedType = item.component_type.toLowerCase();
            
            // تحويل الأنواع للتوافق مع المحررات
            if (normalizedType === 'categories') {
              normalizedType = 'product_categories';
            } else if (normalizedType === 'featuredproducts') {
              normalizedType = 'featured_products';
            }
            
            return {
              id: item.id,
              type: normalizedType as ComponentType,
              settings: item.settings,
              isActive: item.is_active,
              orderIndex: item.order_index
            };
          });

        setComponents(mappedComponents);
        // حفظ نسخة أصلية للمقارنة
        setOriginalComponents(JSON.parse(JSON.stringify(mappedComponents)));
        setHasUnsavedChanges(false);
        
        if (mappedComponents.length > 0) {
          setActiveComponent(mappedComponents[0]);
        }
      }
    } catch (error: any) {
      // إضافة مكون هيرو افتراضي محلياً إذا فشلت التهيئة
      addComponent('hero');
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
      // تحويل النوع إلى أحرف صغيرة
      const typeLowerCase = type.toLowerCase();
      
      // إنشاء معرف مؤقت محلي 
      const tempId = `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // إضافة المكون محلياً فقط
      const newComponent: StoreComponent = {
        id: tempId, // معرف مؤقت - سيتم تعديله بعد الحفظ الفعلي
        type: typeLowerCase as ComponentType,
        settings: defaultComponentSettings[type],
        isActive: true,
        orderIndex: newOrderIndex
      };

      setComponents(prev => [...prev, newComponent]);
      setActiveComponent(newComponent);
      setHasUnsavedChanges(true);

      toast({
        title: 'تمت الإضافة محلياً',
        description: `تم إضافة مكون ${type} محلياً. اضغط على "حفظ التغييرات" للحفظ النهائي.`,
      });
    } catch (error: any) {
      toast({
        title: 'خطأ في إضافة المكون',
        description: error.message || 'حدث خطأ أثناء إضافة المكون محلياً',
        variant: 'destructive'
      });
    }
  };

  // حذف مكون
  const removeComponent = async (id: string) => {
    if (!organizationId) return;

    try {
      // تحديث المكونات محلياً فقط
      const updatedComponents = components.filter(component => component.id !== id);
      setComponents(updatedComponents);
      
      if (activeComponent && activeComponent.id === id) {
        setActiveComponent(updatedComponents.length > 0 ? updatedComponents[0] : null);
      }

      setHasUnsavedChanges(true);

      toast({
        title: 'تم الحذف محلياً',
        description: 'تم حذف المكون محلياً. اضغط على "حفظ التغييرات" للحفظ النهائي.'
      });
    } catch (error: any) {
      toast({
        title: 'خطأ في حذف المكون',
        description: error.message || 'حدث خطأ أثناء حذف المكون محلياً',
        variant: 'destructive'
      });
    }
  };

  // دالة محسنة لتحديث إعدادات المكون
  const updateComponentSettings = async (id: string, newSettings: any) => {
    if (!organizationId) return;

    try {
      setIsSaving(true);
      
      // تحديث المكون في الحالة أولاً للاستجابة السريعة
      setComponents(prevComponents => 
        prevComponents.map(comp => 
          comp.id === id 
            ? { ...comp, settings: { ...comp.settings, ...newSettings } }
            : comp
        )
      );
      
      // تحديث المكون النشط إذا كان هو المكون المحدث
      if (activeComponent?.id === id) {
        setActiveComponent(prev => prev ? { ...prev, settings: { ...prev.settings, ...newSettings } } : null);
      }

      // تحديث المكون في قاعدة البيانات
      const { error } = await supabase
        .from('store_settings')
        .update({
          settings: newSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        throw new Error(error.message);
      }

      setHasUnsavedChanges(true);

      toast({
        title: "تم التحديث",
        description: "تم تحديث إعدادات المكون بنجاح.",
      });

    } catch (error: any) {
      
      // إعادة تحميل البيانات في حالة الخطأ
      await fetchStoreComponents();
      
      toast({
        title: "خطأ في التحديث",
        description: error.message || "حدث خطأ أثناء تحديث إعدادات المكون.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // تغيير حالة نشاط المكون
  const toggleComponentActive = async (id: string) => {
    if (!organizationId) return;

    // الحصول على المكون المراد تحديثه
    const componentToUpdate = components.find(comp => comp.id === id);
    if (!componentToUpdate) return;

    // تحديث محلي فقط
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

    setHasUnsavedChanges(true);
  };

  // تعامل مع نهاية السحب والإفلات لترتيب المكونات
  const handleDragEnd = async (activeId: string, overId: string) => {
    if (!organizationId || activeId === overId) return;

    try {
      // الحصول على فهارس المكونات المعنية
      const activeIndex = components.findIndex(comp => comp.id === activeId);
      const overIndex = components.findIndex(comp => comp.id === overId);

      if (activeIndex === -1 || overIndex === -1) {
        return;
      }

      // تحديث الترتيب محلياً فقط
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

      setHasUnsavedChanges(true);
    } catch (error: any) {
      toast({
        title: 'خطأ في تحديث الترتيب',
        description: error.message || 'حدث خطأ أثناء تحديث ترتيب المكونات محلياً',
        variant: 'destructive'
      });
    }
  };

  // حفظ التغييرات
  const saveChanges = async () => {
    if (!organizationId) return;
    
    setIsSaving(true);
    
    try {
      // حفظ جميع التغييرات للمكونات إلى قاعدة البيانات
      
      // 1. تحديد المكونات التي تم تغييرها أو إضافتها
      const componentsToSave = components.filter(comp => {
        // تحقق مما إذا كان المكون جديدًا (يبدأ بـ temp_)
        if (comp.id.toString().startsWith('temp_')) return true;
        
        // البحث عن المكون في النسخة الأصلية
        const originalComp = originalComponents.find(o => o.id === comp.id);
        if (!originalComp) return true; // مكون جديد
        
        // التحقق من وجود تغييرات
        return (
          originalComp.isActive !== comp.isActive ||
          originalComp.orderIndex !== comp.orderIndex ||
          JSON.stringify(originalComp.settings) !== JSON.stringify(comp.settings) ||
          originalComp.type !== comp.type
        );
      });
      
      // 2. تحديد المكونات التي تم حذفها
      const componentsToDelete = originalComponents
        .filter(origComp => !components.some(comp => comp.id === origComp.id))
        .map(comp => comp.id);
      
      // 3. معالجة المكونات المحذوفة
      for (const idToDelete of componentsToDelete) {
        // تخطي المكونات المؤقتة التي لم يتم حفظها بعد
        if (idToDelete.toString().startsWith('temp_')) continue;
        
        await supabase
          .from('store_settings')
          .delete()
          .eq('id', idToDelete)
          .eq('organization_id', organizationId);
      }
      
      // 4. حفظ المكونات الجديدة أو المحدثة
      for (const comp of componentsToSave) {
        const isNewComponent = comp.id.toString().startsWith('temp_');
        
        // تطبيع نوع المكون للحفظ - تحويل للأسماء الأصلية في قاعدة البيانات
        let componentTypeForSave = comp.type.toLowerCase();
        
        // تحويل الأنواع المطبعة إلى الأسماء الأصلية في قاعدة البيانات
        if (componentTypeForSave === 'product_categories') {
          componentTypeForSave = 'categories';
        }
        
        // إضافة logging خاص لمكون المنتجات المميزة
        if (comp.type === 'featured_products') {
        }
        
        if (isNewComponent) {
          // إضافة مكون جديد
          const { data, error } = await supabase
            .from('store_settings')
            .insert({
              organization_id: organizationId,
              component_type: componentTypeForSave,
              settings: comp.settings,
              is_active: comp.isActive,
              order_index: comp.orderIndex,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();
            
          if (error) throw new Error(error.message);
          
          // تحديث المعرف المؤقت بالمعرف الفعلي من قاعدة البيانات
          setComponents(prev => 
            prev.map(c => c.id === comp.id ? { ...c, id: data.id } : c)
          );
          
          if (activeComponent && activeComponent.id === comp.id) {
            setActiveComponent({ ...activeComponent, id: data.id });
          }
        } else {
          // تحديث مكون موجود
          const { error } = await supabase
            .from('store_settings')
            .update({
              component_type: componentTypeForSave,
              settings: comp.settings,
              is_active: comp.isActive,
              order_index: comp.orderIndex,
              updated_at: new Date().toISOString()
            })
            .eq('id', comp.id)
            .eq('organization_id', organizationId);
            
          if (error) throw new Error(error.message);
          
          // إضافة logging للتأكد من نجاح الحفظ
          if (comp.type === 'featured_products') {
          }
        }
      }
      
      // 5. مسح التخزين المؤقت للمتجر بشكل كامل
      await clearStoreCache(organizationId);
      
      // 7. إعادة تحميل المكونات لتحديث الحالة بشكل كامل 
      await fetchStoreComponents();
      
      // 8. الحصول على النطاق الفرعي للمؤسسة لمسح التخزين المؤقت بشكل كامل
      const subdomain = await getOrganizationSubdomain(organizationId);
      if (subdomain) {
        // 9. مسح التخزين المؤقت للمتجر باستخدام النطاق الفرعي (لضمان تحديث واجهة المتجر)
        await clearCacheItem(`store_init_data:${subdomain}`);
        // 10. في حالة استخدام التخزين القديم
        await clearCacheItem(`store_data:${subdomain}`);
      }
      
      setHasUnsavedChanges(false);
      
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ التغييرات بنجاح في قاعدة البيانات',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ في حفظ التغييرات',
        description: error.message || 'حدث خطأ أثناء حفظ التغييرات في قاعدة البيانات',
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
        return null;
      }

      return data.subdomain;
    } catch (error) {
      return null;
    }
  };

  // وظيفة مساعدة لمسح التخزين المؤقت للمتجر
  const clearStoreCache = async (orgId: string) => {
    try {
      // استخدام الوظيفة المحسنة لمسح التخزين المؤقت باستخدام معرف المؤسسة مباشرة
      await clearStoreCacheByOrganizationId(orgId);
      
    } catch (error) {
    }
  };

  return {
    components,
    activeComponent,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    setActiveComponent: selectActiveComponent,
    addComponent,
    removeComponent,
    updateComponentSettings,
    toggleComponentActive,
    handleDragEnd,
    saveChanges
  };
};
