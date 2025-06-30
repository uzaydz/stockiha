import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface AlgerianProvince {
  id: number;
  name: string;
  name_ar: string;
  zone: number;
  is_deliverable: boolean;
}

export interface UseAlgerianProvincesReturn {
  provinces: AlgerianProvince[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useAlgerianProvinces = (): UseAlgerianProvincesReturn => {
  const [provinces, setProvinces] = useState<AlgerianProvince[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProvinces = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('yalidine_provinces_global')
        .select('id, name, name_ar, zone, is_deliverable')
        .eq('is_deliverable', true)
        .order('name_ar', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setProvinces(data || []);
    } catch (err: any) {
      const errorMessage = `خطأ في جلب الولايات: ${err.message}`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await fetchProvinces();
  };

  useEffect(() => {
    fetchProvinces();
  }, []);

  return {
    provinces,
    loading,
    error,
    refresh
  };
};
