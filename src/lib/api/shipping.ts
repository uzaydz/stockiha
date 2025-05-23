import { supabase } from '@/lib/supabase-client';
import { toast } from 'sonner';

export interface ActiveShippingProvider {
  id: number;
  name: string;
}

export async function getActiveShippingProvidersForOrg(
  organizationId: string
): Promise<ActiveShippingProvider[]> {
  try {
    const { data, error } = await supabase
      .from('shipping_provider_settings')
      .select('provider_id, shipping_providers(id, name)')
      .eq('organization_id', organizationId)
      .eq('is_enabled', true);
      // قد تحتاج لإضافة .eq('shipping_providers.is_active', true) إذا كان ذلك ضرورياً
      // ويتطلب ذلك التأكد من أن Supabase يدعم الفلترة على الحقول المرتبطة بهذا الشكل
      // أو استخدام دالة RPC مخصصة.

    if (error) {
      console.error('Error fetching active shipping providers:', error.message);
      toast.error('حدث خطأ أثناء تحميل شركات التوصيل المفعلة للمؤسسة.');
      return [];
    }

    // البيانات المتوقعة: [{ provider_id: 1, shipping_providers: { id: 1, name: 'Provider A' } }, ...]
    // أو [{ provider_id: 1, shipping_providers: null }, ...] إذا لم يتم العثور على المزود المرتبط (نادر)
    return data
      ?.filter(item => item.shipping_providers) // التأكد من وجود الكائن المرتبط
      .map(item => ({
        id: item.shipping_providers!.id,
        name: item.shipping_providers!.name,
      })) as ActiveShippingProvider[] || [];

  } catch (error) {
    console.error('Unexpected error fetching active shipping providers:', error);
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
      console.error('Error fetching shipping clones:', error);
      // Consider how to handle errors in the UI, perhaps a toast notification
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching shipping clones:', err);
    return [];
  }
} 