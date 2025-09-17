import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';

interface UseStoreDomainCheckReturn {
  checkCustomDomainAndLoadData: (signal?: AbortSignal) => Promise<string | false>;
}

export const useStoreDomainCheck = (): UseStoreDomainCheckReturn => {
  const { currentSubdomain } = useAuth();

  const checkCustomDomainAndLoadData = useCallback(async (signal?: AbortSignal) => {
    try {
      const hostname = window.location.hostname;
      if (hostname.includes('localhost') || !currentSubdomain) {
        return false;
      }

      const supabase = getSupabaseClient();
      const { data: orgData, error } = await supabase
        .from('organizations')
        .select('id, name, domain, subdomain')
        .eq('domain', hostname)
        .neq('subdomain', currentSubdomain)
        .abortSignal(signal)
        .maybeSingle();

      if (error || signal?.aborted) return false;

      if (orgData?.subdomain) {
        localStorage.setItem('bazaar_organization_id', orgData.id);
        localStorage.setItem('bazaar_current_subdomain', orgData.subdomain);
        return orgData.subdomain;
      }
    } catch (error: any) {
      if (!signal?.aborted) {
        console.warn('Domain check error:', error);
      }
    }
    return false;
  }, [currentSubdomain]);

  return {
    checkCustomDomainAndLoadData
  };
};
