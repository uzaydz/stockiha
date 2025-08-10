import { supabase } from '@/lib/supabase-client';
import { toast } from 'sonner';

export interface ActiveShippingProvider {
  id: number | null; // للطرق المخصصة provider_id = null
  name: string;
  code: string;
  type: 'standard' | 'custom';
  settings?: any;
}

export async function getActiveShippingProvidersForOrg(
  organizationId: string
): Promise<ActiveShippingProvider[]> {
  try {
    // استخدام الـ view المحدث الذي يدعم الطرق المخصصة والعادية
    const { data, error } = await supabase
      .from('shipping_data_view')
      .select('provider_id, provider_code, provider_name, settings')
      .eq('organization_id', organizationId)
      .eq('is_enabled', true)
      .order('provider_name');

    if (error) {
      toast.error('حدث خطأ أثناء تحميل شركات التوصيل المفعلة للمؤسسة.');
      return [];
    }

    // تحويل البيانات إلى التنسيق المطلوب
    return data?.map(item => ({
      id: item.provider_id,
      name: item.provider_name,
      code: item.provider_code,
      type: item.provider_code === 'custom' ? 'custom' : 'standard',
      settings: item.settings
    })) as ActiveShippingProvider[] || [];

  } catch (error) {
    toast.error('حدث خطأ غير متوقع أثناء تحميل شركات التوصيل.');
    return [];
  }
} 

// New function to fetch active shipping provider clones for an organization
export async function getActiveShippingClonesForOrg(
  organizationId: string
): Promise<{ id: number; name: string }[]> { // Basic structure, adjust as needed
  try {
    const { data, error } = await supabase
      .from('shipping_provider_clones')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      // Consider how to handle errors in the UI, perhaps a toast notification
      return [];
    }
    return data || [];
  } catch (err) {
    return [];
  }
}
