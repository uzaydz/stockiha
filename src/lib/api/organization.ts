import { withCache, DEFAULT_CACHE_TTL, LONG_CACHE_TTL } from '@/lib/cache/storeCache';
import { getOrganizationById as getOrganizationByIdDedup } from '@/lib/api/deduplicatedApi';

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
 * الحصول على معلومات المؤسسة من معرفها
 */
export const getOrganizationById = async (
  organizationId: string,
  ttl: number = LONG_CACHE_TTL
): Promise<Organization | null> => {
  if (!organizationId) return null;

  const cacheKey = `organization_id:${organizationId}`;

  // Delegate to the global deduplicated API to avoid duplicate network calls
  return withCache<Organization | null>(
    cacheKey,
    async () => {
      try {
        const data = await getOrganizationByIdDedup(organizationId);
        return (data as Organization) || null;
      } catch {
        return null;
      }
    },
    ttl
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
