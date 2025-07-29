import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSupabaseClient } from '@/lib/supabase';
import { withCache, DEFAULT_CACHE_TTL } from '@/lib/cache/storeCache';

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

    // تنظيف النطاق الفرعي
    const cleanSubdomain = subdomain.toLowerCase().trim();
    
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
      return { available: false, error };
    }

    if (data && data.id) {
      return { available: false };
    }

    return { available: true };
  } catch (error) {
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
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    
    const result = await checkSubdomainAvailability(subdomain);

    // إذا نجح الفحص أو كان النطاق غير متاح، أرجع النتيجة
    if (!result.error || !result.available) {
      return result;
    }
    
    // إذا كان هناك خطأ، انتظر قليلاً قبل إعادة المحاولة
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  
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
    
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('subdomain')
      .ilike('subdomain', `${subdomain}%`)
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
  // لا نعتبر www كنطاق فرعي صحيح في معظم تطبيقات متعددة المستأجرين
  if (subdomain === 'www') {
    // التحقق من وجود معرف المؤسسة في التخزين المحلي
    const orgId = localStorage.getItem('bazaar_organization_id');
    
    // إذا كان هناك معرف مؤسسة محفوظ محلياً، نستخدمه بدلاً من النطاق الفرعي
    if (orgId) {
      // Note: getOrganizationById should also be wrapped withCache or use it
      return getOrganizationById(orgId);
    }
    return null;
  }

  const cacheKey = `organization_subdomain:${subdomain}`;

  return withCache<Organization | null>(
    cacheKey,
    async () => {
      try {
        
        const supabaseClient = getSupabaseClient();
        
        // البحث عن المنظمة بواسطة النطاق الفرعي
        const orgResult = await supabaseClient
          .from('organizations')
          .select('*')
          .eq('subdomain', subdomain)
          .single();
        
        if (orgResult.error) {
          // Don't log verbose errors for not found, as single() will error
          if (orgResult.error.code !== 'PGRST116') { // PGRST116: "The result contains 0 rows"
          } else {
          }
          return null;
        }
        
        const organization = orgResult.data as Organization;
        
        if (organization) {
          // الآن نجلب الإعدادات باستخدام معرف المؤسسة
          const { data: settings, error: settingsError } = await supabaseClient
            .from('organization_settings')
            .select('*')
            .eq('organization_id', organization.id)
            .maybeSingle();
            
          // دمج إعدادات المؤسسة في كائن المؤسسة
          if (settings && !settingsError) {
            organization.settings = {
              ...organization.settings,
              ...settings,
              // تأكد من وضع إعدادات الثيم في المكان الصحيح
              theme_primary_color: settings.theme_primary_color,
              theme_secondary_color: settings.theme_secondary_color,
              theme_mode: settings.theme_mode,
              custom_css: settings.custom_css
            };
          }
        }
        
        return organization;
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
 * الحصول على معلومات المؤسسة من معرفها مع إعدادات المؤسسة
 */
export const getOrganizationById = async (organizationId: string): Promise<Organization | null> => {
  if (!organizationId) return null;

  const cacheKey = `organization_id:${organizationId}`;

  return withCache<Organization | null>(
    cacheKey,
    async () => {
      try {
        const supabaseClient = getSupabaseClient();
        
        // جلب بيانات المؤسسة وإعداداتها في نفس الوقت
        const [orgResult, settingsResult] = await Promise.all([
          supabaseClient
            .from('organizations')
            .select('*')
            .eq('id', organizationId)
            .single(),
          supabaseClient
            .from('organization_settings')
            .select('*')
            .eq('organization_id', organizationId)
            .maybeSingle()
        ]);

        if (orgResult.error) {
          if (orgResult.error.code !== 'PGRST116') { // PGRST116: "The result contains 0 rows"
          }
          return null;
        }

        const organization = orgResult.data as Organization;
        
        // دمج إعدادات المؤسسة في كائن المؤسسة
        if (settingsResult.data && !settingsResult.error) {
          organization.settings = {
            ...organization.settings,
            ...settingsResult.data,
            // تأكد من وضع إعدادات الثيم في المكان الصحيح
            theme_primary_color: settingsResult.data.theme_primary_color,
            theme_secondary_color: settingsResult.data.theme_secondary_color,
            theme_mode: settingsResult.data.theme_mode,
            custom_css: settingsResult.data.custom_css
          };
        }
        
        return organization;
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
  // إزالة المنفذ إذا كان موجوداً (مثل localhost:8080)
  const cleanHostname = hostname.split(':')[0];
  
  // التعامل مع localhost بشكل خاص لاستخراج النطاق الفرعي منه في بيئة التطوير
  if (cleanHostname.endsWith('.localhost') || cleanHostname.includes('localhost')) {
    // حالة: testfinalfinalvhio.localhost أو testfinalfinalvhio.localhost:8080
    if (cleanHostname.endsWith('.localhost')) {
      const parts = cleanHostname.split('.');
      // إذا كان testfinalfinalvhio.localhost، فإن parts ستكون ['testfinalfinalvhio', 'localhost']
      // نريد 'testfinalfinalvhio'
      if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== '') {
        return parts[0];
      }
      return null; // في حالة localhost فقط أو www.localhost
    }
    
    // حالة خاصة: إذا كان مباشرة subdomain في localhost (مثل testfinalfinalvhio.localhost)
    // لكن بدون .localhost في النهاية، قد يكون في تنسيق مختلف
    if (cleanHostname !== 'localhost' && cleanHostname !== '127.0.0.1') {
      // إذا كان يحتوي على localhost لكن ليس بالتنسيق المتوقع
      const parts = cleanHostname.split('.');
      if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
        // testfinalfinalvhio.localhost
        if (parts[0] !== 'www' && parts[0] !== '') {
          return parts[0];
        }
      }
    }
    
    return null; // localhost عادي أو www.localhost
  }

  // تجاهل localhost العادي إذا لم يكن بالتنسيق *.localhost
  if (cleanHostname === 'localhost' || cleanHostname === '127.0.0.1') {
    return null;
  }
  
  // التحقق أولاً إذا كان يستخدم النطاق الرئيسي الذي نمتلكه
  const baseDomains = ['.bazaar.com', '.bazaar.dev', '.vercel.app', '.ktobi.online', '.stockiha.com'];
  
  for (const baseDomain of baseDomains) {
    if (cleanHostname.endsWith(baseDomain)) {
      const parts = cleanHostname.replace(baseDomain, '').split('.');
      const subdomain = parts[parts.length - 1];
      // التأكد من أن النطاق الفرعي ليس فارغاً وليس www
      if (subdomain && subdomain !== 'www') {
        return subdomain;
      }
    }
  }
  
  // إذا لم يكن النطاق من نطاقاتنا الأساسية، فقد يكون نطاقًا مخصصًا ولا نحتاج لاستخراج نطاق فرعي منه
  return null;
};
