import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useTenant } from '@/context/TenantContext';
import { withCache, LONG_CACHE_TTL } from '@/lib/cache/storeCache';

export interface ShippingProvider {
  id: number;
  code: string;
  name: string;
  is_active: boolean | null;
  has_credentials?: boolean;
  logo_url?: string;
  base_url?: string | null;
}

interface RawShippingProvider {
  id: number;
  code: string;
  name: string;
  is_active: boolean | null;
  base_url: string | null;
}

export function useShippingProviders() {
  const { currentOrganization } = useTenant();
  const [providers, setProviders] = useState<ShippingProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentOrganization) {
      setIsLoading(false);
      return;
    }

    async function fetchProviders() {
      try {
        setIsLoading(true);
        setError(null);
        
        const allProvidersRaw = await withCache<RawShippingProvider[]>(
          'all_shipping_providers',
          async () => {
            const { data, error: providerError } = await supabase
              .from('shipping_providers')
              .select('id, code, name, is_active, base_url')
              .order('name', { ascending: true });
            if (providerError) throw providerError;
            return data || [];
          },
          LONG_CACHE_TTL
        );
          
        if (!allProvidersRaw || allProvidersRaw.length === 0) {
          setProviders([]);
          setIsLoading(false);
          return;
        }
        
        const { data: orgSettings, error: settingsError } = await supabase
          .from('shipping_provider_settings')
          .select('provider_id, is_enabled, api_token, api_key')
          .eq('organization_id', currentOrganization.id);
          
        if (settingsError) throw settingsError;
        
        const mergedProviders = allProvidersRaw.map(provider => {
          const settings = orgSettings?.find(s => s.provider_id === provider.id);
          return {
            ...provider,
            id: provider.id,
            is_active: settings ? settings.is_enabled : provider.is_active,
            has_credentials: settings ? 
              Boolean(settings.api_token && settings.api_key) : 
              false
          };
        });

        setProviders(mergedProviders as ShippingProvider[]);
      } catch (err: any) {
        console.error('Error in useShippingProviders:', err);
        setError(err);
        setProviders([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProviders();
  }, [currentOrganization]);

  return { providers, isLoading, error };
} 