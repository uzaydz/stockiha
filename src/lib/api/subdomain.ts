import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * التحقق من توفر النطاق الفرعي
 */
export const checkSubdomainAvailability = async (subdomain: string): Promise<{
  available: boolean;
  error?: Error;
}> => {
  try {
    // استخدام supabaseAdmin للاتساق مع وظيفة registerTenant
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (error) {
      return { available: false, error };
    }

    return { available: !data };
  } catch (error) {
    console.error('Error checking subdomain availability:', error);
    return { available: false, error: error as Error };
  }
};

/**
 * الحصول على معلومات المؤسسة من النطاق الفرعي
 */
export const getOrganizationBySubdomain = async (subdomain: string) => {
  // لا نعتبر www كنطاق فرعي صحيح في معظم تطبيقات متعددة المستأجرين
  if (subdomain === 'www') {
    // التحقق من وجود معرف المؤسسة في التخزين المحلي
    const orgId = localStorage.getItem('bazaar_organization_id');
    
    // إذا كان هناك معرف مؤسسة محفوظ محلياً، نستخدمه بدلاً من النطاق الفرعي
    if (orgId) {
      console.log('استخدام معرف المؤسسة من التخزين المحلي للنطاق الفرعي www:', orgId);
      return getOrganizationById(orgId);
    }
    
    console.log('النطاق الفرعي www غير صالح وليس هناك معرف مؤسسة محفوظ');
    return null;
  }
  
  try {
    console.log(`محاولة جلب المؤسسة باستخدام النطاق الفرعي: ${subdomain}`);
    const supabaseClient = await getSupabaseClient();
    const { data, error } = await supabaseClient
      .from('organizations')
      .select('*')
      .eq('subdomain', subdomain)
      .single();

    if (error) {
      console.error('Error fetching organization by subdomain:', error);
      return null;
    }

    if (data) {
      console.log(`تم العثور على المؤسسة: ${data.name}, المعرف: ${data.id}`);
      // حفظ معرف المؤسسة في التخزين المحلي للاستخدام المستقبلي
      localStorage.setItem('bazaar_organization_id', data.id);
    }

    return data;
  } catch (error) {
    console.error('Error fetching organization by subdomain:', error);
    return null;
  }
};

/**
 * الحصول على معلومات المؤسسة من معرفها
 */
export const getOrganizationById = async (organizationId: string) => {
  try {
    console.log(`محاولة جلب المؤسسة باستخدام المعرف: ${organizationId}`);
    const supabaseClient = await getSupabaseClient();
    const { data, error } = await supabaseClient
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) {
      console.error('Error fetching organization by ID:', error);
      return null;
    }

    if (data) {
      console.log(`تم العثور على المؤسسة: ${data.name}, المعرف: ${data.id}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching organization by ID:', error);
    return null;
  }
}; 