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
      
      return getOrganizationById(orgId);
    }
    
    
    return null;
  }
  
  try {
    
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
      
      return null;
    }
    
    
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
  
  // إزالة المنفذ من النطاق (مثل :3000)
  cleanDomain = cleanDomain.split(':')[0];
  
  // إزالة أي مسارات بعد النطاق
  cleanDomain = cleanDomain.split('/')[0];
  
  
  
  try {
    
    const supabaseClient = await getSupabaseClient();
    
    // طباعة عدد المؤسسات التي تستخدم نطاقات مخصصة (للتشخيص)
    const { data: orgWithDomains, error: countError } = await supabaseClient
      .from('organizations')
      .select('id, name, domain')
      .not('domain', 'is', null);
      
    if (!countError && orgWithDomains) {
      
      
    }
    
    // التحقق أولاً إذا كان النطاق يحتوي على عدة أجزاء (مثل subdomain.domain.com)
    // ففي هذه الحالة قد يكون نطاقًا فرعيًا وليس نطاقًا رئيسيًا
    const domainParts = cleanDomain.split('.');
    if (domainParts.length > 2 && domainParts[0].toLowerCase() !== 'www') {
      // جرب البحث في subdomain أولاً
      const possibleSubdomain = domainParts[0];
      
      
      const { data: subdomainData, error: subdomainError } = await supabaseClient
        .from('organizations')
        .select('*')
        .eq('subdomain', possibleSubdomain)
        .maybeSingle();
        
      if (!subdomainError && subdomainData) {
        
        return subdomainData;
      }
    }
    
    // البحث عن المنظمة بواسطة النطاق الرئيسي
    const { data, error } = await supabaseClient
      .from('organizations')
      .select('*')
      .eq('domain', cleanDomain)
      .maybeSingle();
    
    // طباعة معلومات تشخيصية عن الاستعلام
    
    
    if (error) {
      console.error(`خطأ أثناء البحث عن المؤسسة بالنطاق الرئيسي ${cleanDomain}:`, error);
      
      // التحقق مما إذا كان خطأ 406 (Not Acceptable)
      if (error.code === '406') {
        
        
        // محاولة البحث عن كل المؤسسات ثم التصفية يدويًا
        const { data: allOrgs, error: allOrgsError } = await supabaseClient
          .from('organizations')
          .select('*');
          
        if (!allOrgsError && allOrgs) {
          // بحث يدوي عن مطابقة النطاق
          const matchingOrg = allOrgs.find(org => org.domain === cleanDomain);
          if (matchingOrg) {
            
            return matchingOrg;
          }
        }
      }
      
      return null;
    }
    
    if (!data) {
      
      
      // محاولة أخرى بحذف علامات التشكيل للتعامل مع النطاقات العربية
      const { data: dataAlt, error: errorAlt } = await supabaseClient
        .from('organizations')
        .select('*')
        .like('domain', `%${cleanDomain}%`)
        .maybeSingle();
        
      if (!errorAlt && dataAlt) {
        
        return dataAlt;
      }
      
      return null;
    }
    
    
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