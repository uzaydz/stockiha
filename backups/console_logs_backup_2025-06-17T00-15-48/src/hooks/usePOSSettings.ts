import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { POSSettings, defaultPOSSettings } from '@/types/posSettings';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Database } from '@/types/database.types';
import { User } from '@supabase/supabase-js';

// Extend the Supabase User type to include our custom fields
export type AppUser = User & {
  is_org_admin?: boolean;
  permissions?: { [key: string]: any };
};

type POSSettingsRpcResponse = Database['public']['Functions']['get_pos_settings']['Returns']
type POSSettingsRow = Database['public']['Tables']['pos_settings']['Row']

interface UsePOSSettingsProps {
  organizationId?: string;
}

interface UsePOSSettingsReturn {
  settings: POSSettings;
  isLoading: boolean;
  error: string | null;
  updateSettings: (newSettings: Partial<POSSettings>) => Promise<boolean>;
  saveSettings: () => Promise<void>;
  isSaving: boolean;
  saveSuccess: boolean;
  hasPermission: () => boolean;
}

export function usePOSSettings({ organizationId }: UsePOSSettingsProps): UsePOSSettingsReturn {
  const { user: authUser, session } = useAuth();
  const user = authUser as AppUser; // Cast the user to our extended type
  const [settings, setSettings] = useState<POSSettings>({ ...defaultPOSSettings, organization_id: organizationId || '' });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const hasPermission = useCallback(() => {
    if(!user) return false;
    // Now we can safely access the custom properties
    return user.is_org_admin || (user.permissions && user.permissions.managePOSSettings);
  }, [user]);

  const fetchSettings = useCallback(async () => {
    if (!organizationId || !hasPermission()) {
        setIsLoading(false);
        if(!hasPermission()) setError('ليس لديك صلاحية للوصول إلى إعدادات نقطة البيع');
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
        const { data, error: rpcError } = await supabase
            .rpc('get_pos_settings', { p_org_id: organizationId } as any); // Use 'as any' to bypass strict type check for now

        if (rpcError) {
            if (rpcError.code === 'PGRST116' || (rpcError.details && rpcError.details.includes('returned 0 rows'))) {
                // This will be handled by initializeSettings, which calls fetchSettings again
                await initializeSettings();
                return; 
            }
            throw rpcError;
        }
        
        if (data && data.length > 0) {
            // Manually cast to ensure type safety
            const fetchedSettings = data[0] as unknown as POSSettingsRow;
            setSettings(fetchedSettings as POSSettings);
        } else {
            // If data is an empty array, it means no settings exist.
            // Let initializeSettings handle it.
        }
    } catch (err: any) {
        toast({
            title: 'خطأ في جلب إعدادات نقطة البيع',
            description: err.message,
            variant: 'destructive',
        });
        setSettings({ ...defaultPOSSettings, organization_id: organizationId });
    } finally {
        setIsLoading(false);
    }
}, [organizationId, hasPermission, toast]);

  const initializeSettings = useCallback(async () => {
    if (!organizationId) return;
    try {
      const { data: initData, error: initError } = await supabase
        .rpc('initialize_pos_settings', { p_organization_id: organizationId });
  
      if (initError) throw initError;
      
      if (initData) {
        // After initializing, refetch to get the newly created settings.
        await fetchSettings();
      }
    } catch (err: any) {
      toast({
        title: 'خطأ في إنشاء إعدادات نقطة البيع',
        description: err.message,
        variant: 'destructive',
      });
      setSettings({ ...defaultPOSSettings, organization_id: organizationId });
    }
  }, [organizationId, toast, fetchSettings]);

  useEffect(() => {
    if(organizationId) {
        fetchSettings();
    } else {
        setIsLoading(false);
    }
  }, [organizationId]);

  const updateSettings = useCallback(async (newSettings: Partial<POSSettings>): Promise<boolean> => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    return true;
  }, []);

  const saveSettings = useCallback(async () => {
    if (!organizationId || !hasPermission()) {
        toast({
            title: 'خطأ في الصلاحية',
            description: 'ليس لديك الصلاحية لحفظ الإعدادات.',
            variant: 'destructive',
        });
        return;
    }
    setIsSaving(true);
    setSaveSuccess(false);

    try {
        const { error } = await supabase
            .rpc('upsert_pos_settings', {
                p_organization_id: organizationId,
                p_settings: settings as any, // The RPC expects a JSONB object, cast to any
            });

        if (error) throw error;

        setSaveSuccess(true);
        toast({
            title: 'تم الحفظ بنجاح',
            description: 'تم تحديث إعدادات نقطة البيع بنجاح.',
            variant: 'default',
        });

    } catch (err: any) {
        toast({
            title: 'فشل الحفظ',
            description: err.message,
            variant: 'destructive',
        });
    } finally {
        setIsSaving(false);
    }
}, [organizationId, settings, hasPermission, toast]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    saveSettings,
    isSaving,
    saveSuccess,
    hasPermission,
  };
}
