import { supabase } from '@/lib/supabase';

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