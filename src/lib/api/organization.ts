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
      console.error('Error fetching active subscription:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception when fetching active subscription:', error);
    return null;
  }
};

/**
 * الحصول على معلومات المؤسسة من معرفها
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
        const supabaseClient = await getSupabaseClient();
        const { data, error } = await supabaseClient
          .from('organizations')
          .select('*') // Consider selecting specific fields
          .eq('id', organizationId)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') { // PGRST116: "The result contains 0 rows"
            console.error(`Error fetching organization by ID ${organizationId}:`, error);
          }
          return null;
        }
        return data as Organization || null;
      } catch (error) {
        console.error(`Error fetching organization by ID ${organizationId} (catch block):`, error);
        return null;
      }
    },
    ttl, // استخدام الـ TTL الممرر أو الافتراضي للدالة
    true
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