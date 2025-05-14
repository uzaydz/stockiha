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
    
    // البحث عن المنظمة بواسطة النطاق الفرعي
    const { data, error } = await supabaseClient
      .from('organizations')
      .select('*')
      .eq('subdomain', subdomain)
      .single();
    
    if (error) {
      console.error(`خطأ أثناء البحث عن المؤسسة بالنطاق الفرعي ${subdomain}:`, error);
      return null;
    }
    
    if (!data) {
      console.log(`لم يتم العثور على مؤسسة بالنطاق الفرعي: ${subdomain}`);
      return null;
    }
    
    console.log(`تم العثور على المؤسسة بنجاح بالنطاق الفرعي: ${subdomain}`, data.name);
    return data;
  } catch (error) {
    console.error(`خطأ أثناء جلب المؤسسة بالنطاق الفرعي ${subdomain}:`, error);
    return null;
  }
};

/**
 * الحصول على معلومات المؤسسة من النطاق الرئيسي
 */
export const getOrganizationByDomain = async (domain: string) => {
  if (!domain) {
    console.log('النطاق فارغ، لا يمكن البحث عن المؤسسة');
    return null;
  }
  
  // تنظيف النطاق من البروتوكول وwww. للتأكد من التطابق الصحيح
  let cleanDomain = domain.toLowerCase();
  
  // إزالة البروتوكول إذا كان موجوداً
  cleanDomain = cleanDomain.replace(/^https?:\/\//i, '');
  
  // إزالة www. إذا كانت موجودة
  if (cleanDomain.startsWith('www.')) {
    cleanDomain = cleanDomain.substring(4);
  }
  
  // إزالة أي مسارات بعد النطاق
  cleanDomain = cleanDomain.split('/')[0];
  
  try {
    console.log(`محاولة جلب المؤسسة باستخدام النطاق الرئيسي: ${cleanDomain}`);
    const supabaseClient = await getSupabaseClient();
    
    // البحث عن المنظمة بواسطة النطاق الرئيسي
    const { data, error } = await supabaseClient
      .from('organizations')
      .select('*')
      .eq('domain', cleanDomain)
      .single();
    
    if (error) {
      console.error(`خطأ أثناء البحث عن المؤسسة بالنطاق الرئيسي ${cleanDomain}:`, error);
      return null;
    }
    
    if (!data) {
      console.log(`لم يتم العثور على مؤسسة بالنطاق الرئيسي: ${cleanDomain}`);
      return null;
    }
    
    console.log(`تم العثور على المؤسسة بنجاح بالنطاق الرئيسي: ${cleanDomain}`, data.name);
    return data;
  } catch (error) {
    console.error(`خطأ أثناء جلب المؤسسة بالنطاق الرئيسي ${cleanDomain}:`, error);
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

/**
 * استخراج النطاق الفرعي من URL
 */
export const extractSubdomainFromUrl = (url: string) => {
  try {
    const hostname = new URL(url).hostname;
    return extractSubdomainFromHostname(hostname);
  } catch (error) {
    console.error('خطأ في استخراج النطاق الفرعي من URL:', error);
    return null;
  }
};

/**
 * استخراج النطاق الفرعي من اسم المضيف
 */
export const extractSubdomainFromHostname = (hostname: string) => {
  // تجاهل localhost
  if (hostname === 'localhost' || hostname.includes('localhost:')) {
    return null;
  }
  
  // التحقق أولاً إذا كان يستخدم النطاق الرئيسي الذي نمتلكه
  const baseDomains = ['.bazaar.com', '.bazaar.dev', '.vercel.app'];
  
  for (const baseDomain of baseDomains) {
    if (hostname.endsWith(baseDomain)) {
      const parts = hostname.replace(baseDomain, '').split('.');
      return parts[parts.length - 1];
    }
  }
  
  // إذا لم يكن النطاق من نطاقاتنا الأساسية، فقد يكون نطاقًا مخصصًا ولا نحتاج لاستخراج نطاق فرعي منه
  return null;
}; 