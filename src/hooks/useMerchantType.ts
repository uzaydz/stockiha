import React from 'react';
import { supabase } from '@/lib/supabase';
import { getOrganizationSettings } from '@/lib/api/deduplicatedApi';
import { globalCache, CacheKeys } from '@/lib/globalCache';
import { MerchantType } from '@/components/sidebar/types';

interface UseMerchantTypeReturn {
  merchantType: MerchantType;
  isLoading: boolean;
  error: string | null;
  refreshMerchantType: () => Promise<void>;
  updateMerchantType: (type: MerchantType) => void;
}

export const useMerchantType = (
  currentOrganizationId?: string
): UseMerchantTypeReturn => {
  const [merchantType, setMerchantType] = React.useState<MerchantType>('both');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadingRef = React.useRef(false);
  const lastCallRef = React.useRef<number>(0);

  const isSupabaseReady = React.useMemo(() => {
    return supabase && typeof supabase.from === 'function' && typeof supabase.channel === 'function';
  }, []);

  const fetchMerchantType = React.useCallback(async () => {
    if (!currentOrganizationId || !isSupabaseReady) {
      setMerchantType('both');
      return;
    }

    // منع الاستدعاءات المتكررة
    const now = Date.now();
    if (loadingRef.current || (now - lastCallRef.current) < 5000) {
      return;
    }

    loadingRef.current = true;
    lastCallRef.current = now;
    setIsLoading(true);
    setError(null);

    try {
      // التحقق من الكاش أولاً
      const cacheKey = CacheKeys.MERCHANT_TYPE(currentOrganizationId);
      const cached = globalCache.get<MerchantType>(cacheKey);
      if (cached) {
        setMerchantType(cached);
        return;
      }

      // جلب البيانات من API الموحّد مع dedup
      const settings = await getOrganizationSettings(currentOrganizationId);
      const finalType = ((settings as any)?.merchant_type as MerchantType) || 'both';
      setMerchantType(finalType);

      // حفظ في الكاش
      globalCache.set(cacheKey, finalType);
    } catch (err) {
      console.error('Error fetching merchant type:', err);
      setError(err instanceof Error ? err.message : 'خطأ في جلب نوع التاجر');
      setMerchantType('both');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [currentOrganizationId, isSupabaseReady]);

  const refreshMerchantType = React.useCallback(async () => {
    // مسح الكاش
    if (currentOrganizationId) {
      const cacheKey = CacheKeys.MERCHANT_TYPE(currentOrganizationId);
      globalCache.delete(cacheKey);
    }
    await fetchMerchantType();
  }, [fetchMerchantType, currentOrganizationId]);

  const updateMerchantType = React.useCallback((type: MerchantType) => {
    setMerchantType(type);

    // تحديث الكاش
    if (currentOrganizationId) {
      const cacheKey = CacheKeys.MERCHANT_TYPE(currentOrganizationId);
      globalCache.set(cacheKey, type);
    }
  }, [currentOrganizationId]);

  // استدعاء فوري عند تغيير المؤسسة
  React.useEffect(() => {
    if (currentOrganizationId) {
      fetchMerchantType();
    }
  }, [currentOrganizationId]);

  // مراقبة التغييرات في قاعدة البيانات
  React.useEffect(() => {
    if (!currentOrganizationId || !isSupabaseReady) {
      return;
    }

    const channel = supabase
      .channel('organization_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organization_settings',
          filter: `organization_id=eq.${currentOrganizationId}`
        },
        (payload) => {
          if (payload.new && payload.new.merchant_type) {
            updateMerchantType(payload.new.merchant_type as MerchantType);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentOrganizationId, isSupabaseReady, updateMerchantType]);

  return {
    merchantType,
    isLoading,
    error,
    refreshMerchantType,
    updateMerchantType
  };
};
