import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useTenant } from '@/context/TenantContext';

export interface ShippingProvider {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  has_credentials: boolean;
  logo_url?: string;
  base_url?: string;
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
        
        // First get all available providers
        const { data: allProviders, error: providerError } = await supabase
          .from('shipping_providers')
          .select('id, code, name, is_active, base_url')
          .order('name', { ascending: true });
          
        if (providerError) throw providerError;
        
        if (!allProviders || allProviders.length === 0) {
          console.log('لم يتم العثور على مزودي خدمات شحن');
          setProviders([]);
          setIsLoading(false);
          return;
        }

        console.log('تم العثور على مزودي خدمات الشحن:', allProviders);
        
        // Then get the organization's shipping provider settings
        const { data: orgSettings, error: settingsError } = await supabase
          .from('shipping_provider_settings')
          .select('provider_id, is_enabled, api_token, api_key')
          .eq('organization_id', currentOrganization.id);
          
        if (settingsError) throw settingsError;
        
        // Merge the data to get active status for the organization
        const mergedProviders = allProviders.map(provider => {
          const settings = orgSettings?.find(s => s.provider_id === provider.id);
          return {
            ...provider,
            // Convert provider ID to string for consistency
            id: provider.id.toString(),
            // If settings exist, use its is_enabled value, otherwise default to provider's is_active
            is_active: settings ? settings.is_enabled : provider.is_active,
            // Check if valid credentials exist
            has_credentials: settings ? 
              Boolean(settings.api_token && settings.api_key) : 
              false
          };
        });
        
        console.log('مزودي خدمات الشحن مع الإعدادات:', mergedProviders);
        setProviders(mergedProviders);
      } catch (err) {
        console.error('Error fetching shipping providers:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProviders();
  }, [currentOrganization]);

  return { providers, isLoading, error };
} 