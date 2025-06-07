import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { ShippingProvider } from './useShippingProviders';

interface UseEnabledShippingProvidersReturn {
  enabledProviders: ShippingProvider[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEnabledShippingProviders(organizationId: string): UseEnabledShippingProvidersReturn {
  const [enabledProviders, setEnabledProviders] = useState<ShippingProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnabledProviders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // جلب شركات التوصيل المفعلة فقط
      const { data: standardProviders, error: standardError } = await supabase
        .from('shipping_data_view')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_enabled', true)
        .not('provider_id', 'is', null);
          
      if (standardError) {
        throw standardError;
      }
        
      // تجاهل طرق الشحن المخصصة - استخدام الشركات العادية فقط
      const allEnabledProviders = standardProviders || [];
      
      // ترتيب الشركات حسب الأولوية (ياليدين، زر إكسبرس، ثم باقي الشركات أبجدياً)
      const sortedProviders = allEnabledProviders.sort((a, b) => {
        if (a.provider_code === 'yalidine') return -1;
        if (b.provider_code === 'yalidine') return 1;
        if (a.provider_code === 'zrexpress') return -1;
        if (b.provider_code === 'zrexpress') return 1;
        return a.provider_name.localeCompare(b.provider_name, 'ar');
      });

      setEnabledProviders(sortedProviders);
    } catch (err) {
      console.error('Error fetching enabled shipping providers:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل شركات التوصيل المفعلة');
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = async () => {
    await fetchEnabledProviders();
  };

  useEffect(() => {
    if (organizationId) {
      fetchEnabledProviders();
    }
  }, [organizationId]);

  return {
    enabledProviders,
    isLoading,
    error,
    refetch
  };
} 