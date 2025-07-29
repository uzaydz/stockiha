import { supabase } from '@/lib/supabase';
import { getSupabaseClient } from '@/lib/supabase';
import { withCache, DEFAULT_CACHE_TTL, LONG_CACHE_TTL } from '@/lib/cache/storeCache';

// Define Organization type here or import it if defined elsewhere
// For now, let's assume a simple type for the return
type Organization = any; // Replace with actual Organization type

/**
 * Get active subscription for an organization
 */
export const getActiveSubscriptionByOrgId = async (organizationId: string) => {
  try {
    const { data, error } = await supabase
      .from('organization_subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error) {
      return null;
    }
    
    return data;
  } catch (error) {
    return null;
  }
};

/**
 * الحصول على معلومات المؤسسة من معرفها مع إعدادات المؤسسة
 */
export const getOrganizationById = async (
  organizationId: string,
  ttl: number = LONG_CACHE_TTL // استخدام LONG_CACHE_TTL كقيمة افتراضية، أو قيمة أخرى مناسبة
): Promise<Organization | null> => {
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
    ttl // استخدام الـ TTL الممرر أو الافتراضي للدالة
  );
};

/**
 * الحصول على جميع المؤسسات (مثال - قد لا تكون موجودة وتحتاج لإضافتها)
 * هذا مجرد مثال لكيفية تغليف استدعاء لقائمة بمنظمات
 */
// export const getAllOrganizations = async (ttl: number = LONG_CACHE_TTL): Promise<Organization[]> => {
//   const cacheKey = `all_organizations`;
//   return withCache<Organization[]>(
//     cacheKey,
//     async () => {
//       try {
//         const supabaseClient = await getSupabaseClient();
//         const { data, error } = await supabaseClient
//           .from('organizations')
//           .select('*'); // اختر الحقول الضرورية
// 
//         if (error) {
//           console.error('Error fetching all organizations:', error);
//           return [];
//         }
//         return data as Organization[] || [];
//       } catch (error) {
//         console.error('Error fetching all organizations (catch block):', error);
//         return [];
//       }
//     },
//     ttl,
//     true
//   );
// };
