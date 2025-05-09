import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { ShippingProvider } from '@/api/shippingService';
import { shippingSettingsService, ShippingProviderSettings } from '@/api/shippingSettingsService';

export function useShippingSettings(providerCode: ShippingProvider) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organization } = useOrganization();
  const organizationId = organization?.id || '';
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Query to fetch provider settings
  const { 
    data: settings,
    isLoading: isLoadingSettings,
    error: settingsError,
    refetch
  } = useQuery({
    queryKey: ['shipping-settings', organizationId, providerCode],
    queryFn: async () => {
      if (!organizationId) return null;
      return shippingSettingsService.getProviderSettings(organizationId, providerCode);
    },
    enabled: !!organizationId,
  });
  
  // Default settings if none exist yet
  const defaultSettings: ShippingProviderSettings = {
    provider_id: 0, // Will be set by the service
    organization_id: organizationId,
    is_enabled: false,
    api_token: '',
    api_key: '',
    auto_shipping: false,
    track_updates: false,
    settings: {}
  };
  
  // Mutation to save settings
  const { mutate: saveSettings } = useMutation({
    mutationFn: async (newSettings: Partial<ShippingProviderSettings>) => {
      if (!organizationId) throw new Error('No organization ID available');
      return shippingSettingsService.saveProviderSettings(
        organizationId,
        providerCode,
        newSettings
      );
    },
    onMutate: () => {
      setIsLoading(true);
    },
    onSuccess: () => {
      toast({
        title: 'تم حفظ الإعدادات',
        description: 'تم حفظ إعدادات خدمة التوصيل بنجاح',
        variant: 'default'
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['shipping-settings', organizationId, providerCode] });
    },
    onError: (error) => {
      console.error('Error saving shipping settings:', error);
      toast({
        title: 'خطأ في حفظ الإعدادات',
        description: 'حدث خطأ أثناء حفظ إعدادات خدمة التوصيل',
        variant: 'destructive'
      });
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });
  
  // Effect to handle errors
  useEffect(() => {
    if (settingsError) {
      console.error('Error fetching shipping settings:', settingsError);
      toast({
        title: 'خطأ في جلب الإعدادات',
        description: 'حدث خطأ أثناء جلب إعدادات خدمة التوصيل',
        variant: 'destructive'
      });
    }
  }, [settingsError, toast]);
  
  return {
    settings: settings || defaultSettings,
    isLoading: isLoadingSettings || isLoading,
    error: settingsError,
    saveSettings,
    refetch
  };
} 