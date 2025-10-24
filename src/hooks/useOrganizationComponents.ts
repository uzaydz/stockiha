import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { ComponentMeta, ComponentType } from '@/components/organization-editor/types';
import { COMPONENTS } from '@/components/organization-editor/components-list';

// دالة لتطبيع أسماء المكونات للحفظ في قاعدة البيانات
const normalizeComponentTypeForDB = (type: string): string => {
  const dbTypeMap: Record<string, string> = {
    'product_categories': 'categories',
    'featured_products': 'featuredproducts',
    'hero': 'hero',
    'about': 'about',
    'testimonials': 'testimonials',
    'footer': 'footer'
  };
  return dbTypeMap[type] || type;
};

// دالة لتطبيع أسماء المكونات من قاعدة البيانات للكود
const normalizeComponentTypeFromDB = (dbType: string): ComponentType => {
  const typeMap: Record<string, ComponentType> = {
    'categories': 'product_categories',
    'featuredproducts': 'featured_products',
    'hero': 'hero',
    'about': 'about',
    'testimonials': 'testimonials',
    'footer': 'footer'
  };
  return (typeMap[dbType?.toLowerCase()] || dbType) as ComponentType;
};

const COMPONENT_TYPE_LIST = ['hero', 'product_categories', 'featured_products', 'about', 'footer', 'testimonials'] as const;

export const useOrganizationComponents = (organizationId: string) => {
  const { toast } = useToast();
  
  const [componentsState, setComponentsState] = useState<ComponentMeta[]>(() =>
    COMPONENTS.map((component, index) => ({
      ...component,
      orderIndex: component.orderIndex ?? index
    }))
  );
  
  const [hasLayoutChanges, setHasLayoutChanges] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);

  const getDefaultOrderIndex = useCallback(
    (type: ComponentType) => {
      const component = COMPONENTS.find((item) => item.type === type);
      return component?.orderIndex ?? 0;
    },
    []
  );

  const updateComponentMeta = useCallback(
    (type: ComponentType, changes: Partial<ComponentMeta>, options?: { markDirty?: boolean }) => {
      setComponentsState((prev) => {
        const updated = prev.map((component) =>
          component.type === type ? { ...component, ...changes } : component
        );
        const sorted = [...updated].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        return sorted.map((component, index) => ({ ...component, orderIndex: index }));
      });

      if (options?.markDirty) {
        setHasLayoutChanges(true);
      }
    },
    []
  );

  const getComponentMetaByType = useCallback(
    (type: ComponentType) => componentsState.find((component) => component.type === type),
    [componentsState]
  );

  const handleToggleVisibility = useCallback(
    (componentId: string, value: boolean) => {
      const target = componentsState.find((component) => component.id === componentId);
      if (!target) return;

      updateComponentMeta(target.type as ComponentType, { isActive: value }, { markDirty: true });
    },
    [componentsState, updateComponentMeta]
  );

  const handleMoveComponent = useCallback(
    (componentId: string, direction: 'up' | 'down') => {
      setComponentsState((prev) => {
        const sorted = [...prev].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        const index = sorted.findIndex((component) => component.id === componentId);
        if (index === -1) return prev;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= sorted.length) {
          return prev;
        }

        const [moved] = sorted.splice(index, 1);
        sorted.splice(targetIndex, 0, moved);

        return sorted.map((component, idx) => ({ ...component, orderIndex: idx }));
      });

      setHasLayoutChanges(true);
    },
    []
  );

  const loadComponentsLayout = useCallback(async () => {
    if (!organizationId) return;

    try {
      const dbComponentTypes = COMPONENT_TYPE_LIST.map(type => normalizeComponentTypeForDB(type));
      
      const { data, error } = await supabase
        .from('store_settings')
        .select('component_type, is_active, order_index')
        .eq('organization_id', organizationId)
        .in('component_type', dbComponentTypes);

      if (error) {
        throw error;
      }

      const mapped = COMPONENTS.map((component, index) => {
        const dbComponentType = normalizeComponentTypeForDB(component.type);
        const match = data?.find(
          (item) => {
            const itemType = (item.component_type || '').toLowerCase();
            return itemType === component.type.toLowerCase() || 
                   itemType === dbComponentType.toLowerCase();
          }
        );

        const orderIndex =
          typeof match?.order_index === 'number'
            ? match.order_index
            : component.orderIndex ?? index;

        return {
          ...component,
          isActive: match?.is_active ?? component.isActive,
          orderIndex
        };
      });

      const sorted = mapped
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
        .map((component, index) => ({ ...component, orderIndex: index }));

      setComponentsState(sorted);
      setHasLayoutChanges(false);
    } catch (error) {
      console.error('خطأ في تحميل ترتيب المكوّنات:', error);
      toast({
        title: "خطأ في التحميل",
        description: "تعذر تحميل ترتيب وظهور المكوّنات",
        variant: "destructive"
      });
    }
  }, [organizationId, toast]);

  const saveLayoutChanges = useCallback(async () => {
    if (!organizationId) return;

    const sorted = [...componentsState].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

    setIsSavingLayout(true);
    try {
      // حذف السجلات القديمة المكررة أولاً
      const oldComponentTypes = ['product_categories', 'featured_products'];
      for (const oldType of oldComponentTypes) {
        await supabase
          .from('store_settings')
          .delete()
          .eq('organization_id', organizationId)
          .eq('component_type', oldType);
      }
      
      const dbComponentTypes = COMPONENT_TYPE_LIST.map(type => normalizeComponentTypeForDB(type));
      
      const { data: existing, error: existingError } = await supabase
        .from('store_settings')
        .select('component_type, settings, created_at')
        .eq('organization_id', organizationId)
        .in('component_type', dbComponentTypes);

      if (existingError) {
        throw existingError;
      }

      const existingSet = new Set(
        (existing || []).map((item) => String(item.component_type).toLowerCase())
      );
      const existingSettings = new Map(
        (existing || []).map((item) => [
          String(item.component_type).toLowerCase(),
          item.settings as Record<string, any> | null
        ])
      );

      const now = new Date().toISOString();
      const payload = sorted.map((component, index) => {
        const dbComponentType = normalizeComponentTypeForDB(component.type);
        
        const base = {
          organization_id: organizationId,
          component_type: dbComponentType,
          is_active: component.isActive,
          order_index: index,
          updated_at: now
        } as {
          organization_id: string;
          component_type: string;
          is_active: boolean;
          order_index: number;
          updated_at: string;
          settings: any;
          created_at?: string;
        };

        const existingSettingsForComponent = existingSettings.get(dbComponentType) || existingSettings.get(component.type);

        const shouldIncludeSettings = !existingSet.has(dbComponentType) && !existingSet.has(component.type) || !existingSettingsForComponent;

        base.settings = shouldIncludeSettings || !existingSettingsForComponent
          ? {} // سيتم ملؤها من الخارج
          : existingSettingsForComponent;

        if (!existingSet.has(dbComponentType) && !existingSet.has(component.type)) {
          base.created_at = now;
        }

        return base;
      });

      const { error: upsertError } = await supabase
        .from('store_settings')
        .upsert(payload, { onConflict: 'organization_id,component_type' });

      if (upsertError) {
        throw upsertError;
      }

      setHasLayoutChanges(false);
      
      toast({
        title: "✅ تم حفظ ترتيب المكوّنات",
        description: "سيتم تحديث المتجر تلقائياً خلال ثوانٍ...",
        variant: "default"
      });
      await loadComponentsLayout();
    } catch (error) {
      console.error('خطأ في حفظ ترتيب المكوّنات:', error);
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ ترتيب المكوّنات",
        variant: "destructive"
      });
    } finally {
      setIsSavingLayout(false);
    }
  }, [componentsState, organizationId, loadComponentsLayout, toast]);

  return {
    componentsState,
    hasLayoutChanges,
    isSavingLayout,
    getDefaultOrderIndex,
    updateComponentMeta,
    getComponentMetaByType,
    handleToggleVisibility,
    handleMoveComponent,
    loadComponentsLayout,
    saveLayoutChanges
  };
};
