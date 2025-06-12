import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';

export interface ShippingProvider {
  provider_id: number | null;
  provider_code: string;
  provider_name: string;
  organization_id: string;
  organization_name?: string;
  api_token?: string;
  api_key?: string;
  is_enabled: boolean;
  auto_shipping: boolean;
  track_updates: boolean;
  settings?: any;
  created_at?: string;
  updated_at?: string;
  base_url?: string;
}

interface UseShippingProvidersReturn {
  providers: ShippingProvider[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useShippingProviders(organizationId: string): UseShippingProvidersReturn {
  const [providers, setProviders] = useState<ShippingProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
      // جلب شركات التوصيل العادية
      const { data: standardProviders, error: standardError } = await supabase
        .from('shipping_data_view')
        .select('*')
        .eq('organization_id', organizationId)
        .not('provider_id', 'is', null);
          
      if (standardError) {
        throw standardError;
        }
        
      // جلب طرق الشحن المخصصة
      const { data: customProviders, error: customError } = await supabase
          .from('shipping_provider_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .is('provider_id', null);
          
      if (customError) {
        throw customError;
      }
        
      // تحويل طرق الشحن المخصصة لنفس التنسيق
      const formattedCustomProviders = customProviders?.map(provider => {
        const settings = provider.settings as any;
          return {
          provider_id: null,
          provider_code: 'custom',
          provider_name: settings?.service_name || 'طريقة شحن مخصصة',
          organization_id: provider.organization_id,
          api_token: provider.api_token,
          api_key: provider.api_key,
          is_enabled: provider.is_enabled,
          auto_shipping: provider.auto_shipping,
          track_updates: provider.track_updates,
          settings: provider.settings,
          created_at: provider.created_at,
          updated_at: provider.updated_at
          };
      }) || [];

      // دمج النتائج
      const allProviders = [...(standardProviders || []), ...formattedCustomProviders];
      setProviders(allProviders);
    } catch (err) {
      console.error('Error fetching shipping providers:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل شركات التوصيل');
      } finally {
        setIsLoading(false);
      }
  };

  const refetch = async () => {
    await fetchProviders();
  };

  useEffect(() => {
    if (organizationId) {
      fetchProviders();
    }
  }, [organizationId]);

  return {
    providers,
    isLoading,
    error,
    refetch
  };
}
