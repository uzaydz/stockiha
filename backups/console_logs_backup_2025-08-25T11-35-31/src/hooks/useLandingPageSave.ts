import { useState, useCallback } from 'react';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'sonner';

interface LandingPageData {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  keywords?: string;
  is_published?: boolean;
}

interface ComponentData {
  id?: string;
  type: string;
  settings: Record<string, any>;
  is_active?: boolean;
  position?: number;
}

interface SaveResult {
  success: boolean;
  landing_page_id: string;
  updated_at: string;
  components_updated: number;
  components_created: number;
  components_deleted: number;
  total_components: number;
  errors: string[];
}

export const useLandingPageSave = () => {
  const { supabase } = useSupabase();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveResult, setLastSaveResult] = useState<SaveResult | null>(null);

  const saveLandingPageComplete = useCallback(async (
    landingPageData: LandingPageData,
    componentsData: ComponentData[]
  ): Promise<SaveResult | null> => {
    if (!landingPageData.id) {
      toast.error('معرف صفحة الهبوط مطلوب');
      return null;
    }

    setIsSaving(true);
    
    try {
      // إضافة الترتيب للمكونات إذا لم يكن موجوداً
      const componentsWithPosition = componentsData.map((component, index) => ({
        ...component,
        position: component.position ?? index + 1
      }));

      // استدعاء الـ RPC الجديد
      const { data, error } = await supabase.rpc('save_landing_page_complete', {
        p_landing_page_id: landingPageData.id,
        p_landing_page_data: landingPageData,
        p_components_data: componentsWithPosition
      });

      if (error) {
        console.error('خطأ في حفظ صفحة الهبوط:', error);
        toast.error(`خطأ في الحفظ: ${error.message}`);
        return null;
      }

      const result = data as SaveResult;
      setLastSaveResult(result);

      // عرض رسالة نجاح مع التفاصيل
      if (result.errors && result.errors.length > 0) {
        toast.warning(`تم الحفظ مع بعض الأخطاء: ${result.errors.join(', ')}`);
      } else {
        toast.success(`تم الحفظ بنجاح! ${result.total_components} مكون`);
      }

      return result;

    } catch (error) {
      console.error('خطأ غير متوقع في الحفظ:', error);
      toast.error('خطأ غير متوقع في الحفظ');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [supabase]);

  const saveLandingPageOnly = useCallback(async (
    landingPageData: LandingPageData
  ): Promise<boolean> => {
    if (!landingPageData.id) {
      toast.error('معرف صفحة الهبوط مطلوب');
      return false;
    }

    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('landing_pages')
        .update({
          name: landingPageData.name,
          title: landingPageData.title,
          description: landingPageData.description,
          keywords: landingPageData.keywords,
          is_published: landingPageData.is_published,
          updated_at: new Date().toISOString()
        })
        .eq('id', landingPageData.id);

      if (error) {
        console.error('خطأ في حفظ صفحة الهبوط:', error);
        toast.error(`خطأ في الحفظ: ${error.message}`);
        return false;
      }

      toast.success('تم حفظ صفحة الهبوط بنجاح');
      return true;

    } catch (error) {
      console.error('خطأ غير متوقع في الحفظ:', error);
      toast.error('خطأ غير متوقع في الحفظ');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [supabase]);

  const saveComponentOnly = useCallback(async (
    componentData: ComponentData,
    landingPageId: string
  ): Promise<boolean> => {
    if (!componentData.id) {
      toast.error('معرف المكون مطلوب');
      return false;
    }

    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('landing_page_components')
        .update({
          type: componentData.type,
          settings: componentData.settings,
          is_active: componentData.is_active ?? true,
          position: componentData.position,
          updated_at: new Date().toISOString()
        })
        .eq('id', componentData.id)
        .eq('landing_page_id', landingPageId);

      if (error) {
        console.error('خطأ في حفظ المكون:', error);
        toast.error(`خطأ في الحفظ: ${error.message}`);
        return false;
      }

      return true;

    } catch (error) {
      console.error('خطأ غير متوقع في الحفظ:', error);
      toast.error('خطأ غير متوقع في الحفظ');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [supabase]);

  return {
    saveLandingPageComplete,
    saveLandingPageOnly,
    saveComponentOnly,
    isSaving,
    lastSaveResult
  };
};
