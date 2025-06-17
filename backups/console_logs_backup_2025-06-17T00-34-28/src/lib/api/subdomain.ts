import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSupabaseClient } from '@/lib/supabase';
import { withCache, DEFAULT_CACHE_TTL } from '@/lib/cache/storeCache';

// Define Organization type here or import it if defined elsewhere
// For now, let's assume a simple type for the return
type Organization = any; // Replace with actual Organization type

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
    return { available: false, error: error as Error };
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
        
        const supabaseClient = await getSupabaseClient();
        
        // البحث عن المنظمة بواسطة النطاق الفرعي
        const { data, error } = await supabaseClient
          .from('organizations')
          .select('*')
          .eq('subdomain', subdomain)
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
        const supabaseClient = await getSupabaseClient();
        
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
        const supabaseClient = await getSupabaseClient();
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
      return parts[0];
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
        return subdomain;
      }
    }
  }
  
  // إذا لم يكن النطاق من نطاقاتنا الأساسية، فقد يكون نطاقًا مخصصًا ولا نحتاج لاستخراج نطاق فرعي منه
  return null;
};
