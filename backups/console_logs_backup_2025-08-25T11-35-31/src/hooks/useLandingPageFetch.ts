import { useState, useCallback, useEffect } from 'react';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'sonner';

interface LandingPageData {
  id: string;
  name: string;
  slug: string;
  title?: string;
  description?: string;
  keywords?: string;
  is_published: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface ComponentData {
  id: string;
  type: string;
  position: number;
  is_active: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface LandingPageComplete {
  success: boolean;
  landing_page: LandingPageData;
  components: ComponentData[];
  total_components: number;
  fetched_at: string;
}

interface UseLandingPageFetchReturn {
  landingPage: LandingPageData | null;
  components: ComponentData[];
  isLoading: boolean;
  error: string | null;
  fetchBySlug: (slug: string) => Promise<LandingPageComplete | null>;
  fetchById: (id: string) => Promise<LandingPageComplete | null>;
  refetch: () => Promise<void>;
}

export const useLandingPageFetch = (
  initialSlug?: string,
  initialId?: string
): UseLandingPageFetchReturn => {
  const { supabase } = useSupabase();
  const [landingPage, setLandingPage] = useState<LandingPageData | null>(null);
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // جلب صفحة الهبوط بالـ slug
  const fetchBySlug = useCallback(async (slug: string): Promise<LandingPageComplete | null> => {
    if (!slug) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc('get_landing_page_complete', {
        p_slug: slug,
        p_id: null
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const result = data as LandingPageComplete;
      
      if (!result.success) {
        throw new Error(result.error || 'فشل في جلب صفحة الهبوط');
      }

      // تحديث الحالة
      setLandingPage(result.landing_page);
      setComponents(result.components);
      
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير متوقع';
      setError(errorMessage);
      toast.error(`خطأ في جلب صفحة الهبوط: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // جلب صفحة الهبوط بالـ ID
  const fetchById = useCallback(async (id: string): Promise<LandingPageComplete | null> => {
    if (!id) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc('get_landing_page_complete', {
        p_slug: null,
        p_id: id
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const result = data as LandingPageComplete;
      
      if (!result.success) {
        throw new Error(result.error || 'فشل في جلب صفحة الهبوط');
      }

      // تحديث الحالة
      setLandingPage(result.landing_page);
      setComponents(result.components);
      
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير متوقع';
      setError(errorMessage);
      toast.error(`خطأ في جلب صفحة الهبوط: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // إعادة جلب البيانات
  const refetch = useCallback(async () => {
    if (landingPage?.slug) {
      await fetchBySlug(landingPage.slug);
    } else if (landingPage?.id) {
      await fetchById(landingPage.id);
    }
  }, [landingPage, fetchBySlug, fetchById]);

  // جلب البيانات الأولية
  useEffect(() => {
    if (initialSlug) {
      fetchBySlug(initialSlug);
    } else if (initialId) {
      fetchById(initialId);
    }
  }, [initialSlug, initialId, fetchBySlug, fetchById]);

  return {
    landingPage,
    components,
    isLoading,
    error,
    fetchBySlug,
    fetchById,
    refetch
  };
};

// Hook مبسط لجلب صفحة واحدة
export const useSingleLandingPageFetch = (identifier: string | null) => {
  const [landingPage, setLandingPage] = useState<LandingPageData | null>(null);
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { supabase } = useSupabase();

  const fetchPage = useCallback(async () => {
    if (!identifier) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // تحديد ما إذا كان identifier هو slug أم id
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      
      const { data, error: rpcError } = await supabase.rpc('get_landing_page_complete', {
        p_slug: isUUID ? null : identifier,
        p_id: isUUID ? identifier : null
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const result = data as LandingPageComplete;
      
      if (!result.success) {
        throw new Error(result.error || 'فشل في جلب صفحة الهبوط');
      }

      setLandingPage(result.landing_page);
      setComponents(result.components);
      
      console.log(`تم جلب صفحة الهبوط "${result.landing_page.name}" مع ${result.total_components} مكون في استدعاء واحد`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير متوقع';
      setError(errorMessage);
      toast.error(`خطأ في جلب صفحة الهبوط: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [identifier, supabase]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  return {
    landingPage,
    components,
    isLoading,
    error,
    refetch: fetchPage
  };
};
