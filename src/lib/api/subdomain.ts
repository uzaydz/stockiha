import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSupabaseClient } from '@/lib/supabase';
import { withCache, DEFAULT_CACHE_TTL } from '@/lib/cache/storeCache';
import { isValidUuid } from '@/utils/uuid-helpers';

// Define Organization type here or import it if defined elsewhere
// For now, let's assume a simple type for the return
type Organization = any; // Replace with actual Organization type

/**
 * التحقق من توفر النطاق الفرعي مع معالجة محسنة للأخطاء
 */
export const checkSubdomainAvailability = async (subdomain: string): Promise<{
  available: boolean;
  error?: Error;
}> => {
  try {
    // التحقق من صحة المدخل
    if (!subdomain || typeof subdomain !== 'string') {
      return { available: false, error: new Error('النطاق الفرعي غير صالح') };
    }

    // تنظيف النطاق الفرعي وإزالة الأحرف غير المسموحة والمسافات والرموز غير المرئية
    const cleanSubdomain = subdomain
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '') // إزالة جميع المسافات
      .replace(/[^a-z0-9-]/g, '') // إزالة الأحرف غير المسموحة
      .replace(/^-+|-+$/g, '') // إزالة الشرطات من البداية والنهاية
      .replace(/-+/g, '-'); // تحويل الشرطات المتعددة إلى شرطة واحدة
    
    if (cleanSubdomain.length < 3) {
      return { available: false, error: new Error('النطاق الفرعي يجب أن يكون 3 أحرف على الأقل') };
    }

    // التحقق من النمط الصحيح
    const subdomainPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!subdomainPattern.test(cleanSubdomain)) {
      return { available: false, error: new Error('النطاق الفرعي يجب أن يحتوي على أحرف صغيرة وأرقام وشرطات فقط') };
    }

    // استخدام supabaseAdmin للاتساق مع وظيفة registerTenant
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('id, subdomain, name')
      .eq('subdomain', cleanSubdomain)
      .maybeSingle();

    if (error) {
      console.error('خطأ في التحقق من النطاق الفرعي:', error);
      return { available: false, error };
    }

    if (data && data.id) {
      console.log('النطاق الفرعي مستخدم بالفعل:', cleanSubdomain, 'المؤسسة:', data.name);
      return { available: false };
    }

    console.log('النطاق الفرعي متاح:', cleanSubdomain);
    return { available: true };
  } catch (error) {
    console.error('خطأ غير متوقع في التحقق من النطاق الفرعي:', error);
    return { available: false, error: error as Error };
  }
};

/**
 * التحقق من توفر النطاق الفرعي مع إعادة المحاولة
 */
export const checkSubdomainAvailabilityWithRetry = async (
  subdomain: string, 
  maxRetries: number = 3
): Promise<{
  available: boolean;
  error?: Error;
}> => {
  // تنظيف النطاق الفرعي قبل التحقق
  const cleanSubdomain = subdomain
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '') // إزالة جميع المسافات
    .replace(/[^a-z0-9-]/g, '') // إزالة الأحرف غير المسموحة
    .replace(/^-+|-+$/g, '') // إزالة الشرطات من البداية والنهاية
    .replace(/-+/g, '-'); // تحويل الشرطات المتعددة إلى شرطة واحدة
  
  console.log('بدء التحقق من النطاق الفرعي:', cleanSubdomain);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`محاولة ${attempt} من ${maxRetries}`);
    
    const result = await checkSubdomainAvailability(cleanSubdomain);

    // إذا نجح الفحص أو كان النطاق غير متاح، أرجع النتيجة
    if (!result.error || !result.available) {
      console.log('نتيجة التحقق:', result);
      return result;
    }
    
    // إذا كان هناك خطأ، انتظر قليلاً قبل إعادة المحاولة
    if (attempt < maxRetries) {
      console.log(`انتظار ${attempt} ثانية قبل إعادة المحاولة`);
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  
  console.log(`فشل في التحقق من توفر النطاق الفرعي بعد ${maxRetries} محاولات`);
  return { 
    available: false, 
    error: new Error(`فشل في التحقق من توفر النطاق الفرعي بعد ${maxRetries} محاولات`) 
  };
};

/**
 * البحث عن النطاقات الفرعية المشابهة
 */
export const findSimilarSubdomains = async (subdomain: string): Promise<string[]> => {
  try {
    
    // تنظيف النطاق الفرعي قبل البحث
    const cleanSubdomain = subdomain
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '') // إزالة جميع المسافات
      .replace(/[^a-z0-9-]/g, '') // إزالة الأحرف غير المسموحة
      .replace(/^-+|-+$/g, '') // إزالة الشرطات من البداية والنهاية
      .replace(/-+/g, '-'); // تحويل الشرطات المتعددة إلى شرطة واحدة
    
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('subdomain')
      .ilike('subdomain', `${cleanSubdomain}%`)
      .limit(5);

    if (error) {
      return [];
    }

    // التأكد من أن data هو مصفوفة وليس null أو undefined
    if (!data || !Array.isArray(data)) {
      return [];
    }

    const similarSubdomains = data
      .map(org => org?.subdomain)
      .filter(Boolean) // إزالة القيم null أو undefined
      .filter(sub => sub !== subdomain); // إزالة النطاق الأصلي إذا كان موجوداً

    return similarSubdomains;
  } catch (error) {
    return [];
  }
};

/**
 * الحصول على معلومات المؤسسة من النطاق الفرعي
 */
export const getOrganizationBySubdomain = async (subdomain: string): Promise<Organization | null> => {
  // تنظيف النطاق الفرعي
  const cleanSubdomain = subdomain
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '') // إزالة جميع المسافات
    .replace(/[^a-z0-9-]/g, '') // إزالة الأحرف غير المسموحة
    .replace(/^-+|-+$/g, '') // إزالة الشرطات من البداية والنهاية
    .replace(/-+/g, '-'); // تحويل الشرطات المتعددة إلى شرطة واحدة
  
  // لا نعتبر www كنطاق فرعي صحيح في معظم تطبيقات متعددة المستأجرين
  if (cleanSubdomain === 'www') {
    // التحقق من وجود معرف المؤسسة في التخزين المحلي
    const orgId = localStorage.getItem('bazaar_organization_id');
    
    // إذا كان هناك معرف مؤسسة محفوظ محلياً، نستخدمه بدلاً من النطاق الفرعي
    if (isValidUuid(orgId)) {
      // Note: getOrganizationById should also be wrapped withCache or use it
      return getOrganizationById(orgId);
    }
    return null;
  }

  const cacheKey = `organization_subdomain:${cleanSubdomain}`;

  return withCache<Organization | null>(
    cacheKey,
    async () => {
      try {
        
        const supabaseClient = getSupabaseClient();
        
        // البحث عن المنظمة بواسطة النطاق الفرعي
        const { data, error } = await supabaseClient
          .from('organizations')
          .select('*')
          .eq('subdomain', cleanSubdomain)
          .single();
        
        if (error) {
          // Don't log verbose errors for not found, as single() will error
          if (error.code !== 'PGRST116') { // PGRST116: "The result contains 0 rows"
          } else {
          }
          return null;
        }
        
        if (data) {
        }
        
        return data as Organization || null;
      } catch (error) {
        return null;
      }
    },
    DEFAULT_CACHE_TTL // Use default TTL
  );
};

/**
 * الحصول على معلومات المؤسسة من النطاق الرئيسي
 */
export const getOrganizationByDomain = async (domain: string): Promise<Organization | null> => {
  if (!domain) {
    return null;
  }

  let cleanDomain = domain.toLowerCase();
  cleanDomain = cleanDomain.replace(/^https?:\/\//i, '');
  if (cleanDomain.startsWith('www.')) {
    cleanDomain = cleanDomain.substring(4);
  }
  cleanDomain = cleanDomain.split(':')[0];
  cleanDomain = cleanDomain.split('/')[0];

  if (!cleanDomain) return null;

  const cacheKey = `organization_domain:${cleanDomain}`;

  return withCache<Organization | null>(
    cacheKey,
    async () => {
      try {
        const supabaseClient = getSupabaseClient();
        
        // Attempt 1: Direct match on the cleaned domain
        const { data: directMatchData, error: directMatchError } = await supabaseClient
          .from('organizations')
          .select('*') // Consider selecting specific fields
          .eq('domain', cleanDomain)
          .maybeSingle();

        if (directMatchError && directMatchError.code !== 'PGRST116') {
          // Do not return null immediately, try other methods if applicable
        }
        if (directMatchData) {
          return directMatchData as Organization;
        }

        // Attempt 2: If domain looks like subdomain.another.com, try matching the first part as a subdomain
        const domainParts = cleanDomain.split('.');
        if (domainParts.length > 2 && domainParts[0].toLowerCase() !== 'www') {
          const possibleSubdomain = domainParts[0];
          // This reuses the getOrganizationBySubdomain which is already cached
          const subdomainData = await getOrganizationBySubdomain(possibleSubdomain);
          if (subdomainData) {
            // Verify if this subdomain's organization also matches the full domain if it has one
            // This logic might be complex depending on how custom domains and subdomains are linked
            // For now, if a direct subdomain match is found, we return it.
            // This assumes an org can be primarily identified by a part of the custom domain that acts as its usual subdomain.
            return subdomainData;
          }
        }
        
        // Removed the highly inefficient parts that fetched all organizations.
        // If specific fallbacks for 406 errors or Arabic character variations are strictly needed,
        // they should be implemented with more targeted and efficient queries.

        return null; // No organization found after trying primary methods

      } catch (error) {
        return null;
      }
    },
    DEFAULT_CACHE_TTL // Use default TTL
  );
};

/**
 * الحصول على معلومات المؤسسة من معرفها
 */
export const getOrganizationById = async (organizationId: string): Promise<Organization | null> => {
  if (!organizationId) return null;

  const cacheKey = `organization_id:${organizationId}`;

  return withCache<Organization | null>(
    cacheKey,
    async () => {
      try {
        const supabaseClient = getSupabaseClient();
        const { data, error } = await supabaseClient
          .from('organizations')
          .select('*') // Consider selecting specific fields
          .eq('id', organizationId)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') { // PGRST116: "The result contains 0 rows"
          }
          return null;
        }
        return data as Organization || null;
      } catch (error) {
        return null;
      }
    },
    DEFAULT_CACHE_TTL // Use default TTL
  );
};

/**
 * استخراج النطاق الفرعي من URL
 */
export const extractSubdomainFromUrl = (url: string) => {
  try {
    const hostname = new URL(url).hostname;
    return extractSubdomainFromHostname(hostname);
  } catch (error) {
    return null;
  }
};

/**
 * استخراج النطاق الفرعي من اسم المضيف
 */
export const extractSubdomainFromHostname = (hostname: string) => {
  // التعامل مع localhost بشكل خاص لاستخراج النطاق الفرعي منه في بيئة التطوير
  if (hostname.endsWith('.localhost')) {
    const parts = hostname.split('.');
    // إذا كان lcxvmprtetg.localhost، فإن parts ستكون ['lcxvmprtetg', 'localhost']
    // نريد 'lcxvmprtetg'
    if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== '') {
      const subdomain = parts[0]
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '') // إزالة جميع المسافات
        .replace(/[^a-z0-9-]/g, '') // إزالة الأحرف غير المسموحة
        .replace(/^-+|-+$/g, '') // إزالة الشرطات من البداية والنهاية
        .replace(/-+/g, '-'); // تحويل الشرطات المتعددة إلى شرطة واحدة
      return subdomain;
    }
    return null; // في حالة localhost فقط أو www.localhost
  }

  // تجاهل localhost إذا لم يكن بالتنسيق *.localhost
  if (hostname === 'localhost' || hostname.includes('localhost:')) {
    return null;
  }
  
  // التحقق أولاً إذا كان يستخدم النطاق الرئيسي الذي نمتلكه
  const baseDomains = ['.bazaar.com', '.bazaar.dev', '.vercel.app', '.ktobi.online', '.stockiha.com'];
  
  for (const baseDomain of baseDomains) {
    if (hostname.endsWith(baseDomain)) {
      const parts = hostname.replace(baseDomain, '').split('.');
      const subdomain = parts[parts.length - 1];
      // التأكد من أن النطاق الفرعي ليس فارغاً وليس www
      if (subdomain && subdomain !== 'www') {
        // تنظيف النطاق الفرعي
        const cleanSubdomain = subdomain
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '') // إزالة جميع المسافات
          .replace(/[^a-z0-9-]/g, '') // إزالة الأحرف غير المسموحة
          .replace(/^-+|-+$/g, '') // إزالة الشرطات من البداية والنهاية
          .replace(/-+/g, '-'); // تحويل الشرطات المتعددة إلى شرطة واحدة
        return cleanSubdomain;
      }
    }
  }
  
  // إذا لم يكن النطاق من نطاقاتنا الأساسية، فقد يكون نطاقًا مخصصًا ولا نحتاج لاستخراج نطاق فرعي منه
  return null;
};
