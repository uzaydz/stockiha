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
  const { userProfile, session } = useAuth();
  const [settings, setSettings] = useState<POSSettings>({ ...defaultPOSSettings, organization_id: organizationId || '' });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const hasPermission = useCallback(() => {
    if(!userProfile) {
      console.warn('🔍 [usePOSSettings] لا يوجد ملف مستخدم');
      return false;
    }
    
    // تسجيل معلومات المستخدم للتشخيص (مرة واحدة فقط)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [usePOSSettings] فحص صلاحيات المستخدم:', {
        id: userProfile.id,
        role: userProfile.role,
        is_super_admin: userProfile.is_super_admin,
        is_org_admin: userProfile.is_org_admin,
        hasPermissions: !!userProfile.permissions
      });
    }
    
    // التحقق من المدير الأعلى
    if (userProfile.is_super_admin === true) {
      return true;
    }
    
    // التحقق من مدير المؤسسة
    if (userProfile.is_org_admin === true) {
      return true;
    }
    
    // التحقق من الدور - admin أو owner
    if (userProfile.role === 'admin' || userProfile.role === 'owner') {
      return true;
    }
    
    // التحقق من الصلاحية المحددة managePOSSettings
    if (userProfile.permissions && typeof userProfile.permissions === 'object') {
      const permissions = userProfile.permissions as any;
      if (permissions.managePOSSettings === true) {
        return true;
      }
    }
    
    // إذا كان المستخدم لديه صلاحية الوصول لنقطة البيع، فلنسمح له بالوصول للإعدادات
    if (userProfile.permissions && typeof userProfile.permissions === 'object') {
      const permissions = userProfile.permissions as any;
      if (permissions.accessPOS === true || permissions.manageOrders === true) {
        return true;
      }
    }
    
    // إذا فشل التحقق من جميع الصلاحيات، اطبع رسالة تحذير
    if (process.env.NODE_ENV === 'development') {
      console.warn('❌ [usePOSSettings] صلاحية مرفوضة - المستخدم لا يملك الصلاحيات المطلوبة');
    }
    return false;
  }, [userProfile]);

  const fetchSettings = useCallback(async () => {

    if (!organizationId) {
        setIsLoading(false);
        setError('معرف المؤسسة مفقود');
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
        
        const { data, error: rpcError } = await supabase
            .rpc('get_pos_settings', { p_org_id: organizationId } as any);

        if (rpcError) {
            
            // إذا فشل RPC، جرب الوصول المباشر للجدول
            const { data: directData, error: directError } = await supabase
                .from('pos_settings')
                .select('*')
                .eq('organization_id', organizationId)
                .limit(1);

            if (directError) {
                throw directError;
            }
            
            if (directData && directData.length > 0) {
                setSettings(directData[0] as POSSettings);
                return;
            } else {
                await initializeSettings();
                return;
            }
        }
        
        if (data && data.length > 0) {
            const fetchedSettings = data[0] as unknown as POSSettingsRow;
            setSettings(fetchedSettings as POSSettings);
        } else {
            await initializeSettings();
        }
    } catch (err: any) {
        
        // كخطة احتياطية أخيرة، استخدام الإعدادات الافتراضية مع organization_id صحيح
        const fallbackSettings = {
            ...defaultPOSSettings,
            organization_id: organizationId
        };
        
        setSettings(fallbackSettings);
        
        // عرض رسالة تحذير بدلاً من خطأ
        toast({
            title: 'تحذير',
            description: 'تم استخدام الإعدادات الافتراضية. تحقق من الاتصال وحاول مرة أخرى.',
            variant: 'default',
        });
    } finally {
        setIsLoading(false);
    }
}, [organizationId, toast, userProfile]);

  const initializeSettings = useCallback(async () => {
    if (!organizationId) {
        return;
    }
    
    try {
        
        // جرب RPC أولاً
        const { data: initData, error: initError } = await supabase
            .rpc('initialize_pos_settings', { p_organization_id: organizationId });

        if (initError) {
            
            // إذا فشل RPC، جرب الإدراج المباشر
            const newSettings = {
                ...defaultPOSSettings,
                organization_id: organizationId
            };
            
            const { data: insertData, error: insertError } = await supabase
                .from('pos_settings')
                .insert([newSettings])
                .select()
                .single();

            if (insertError) {
                // استخدام الإعدادات الافتراضية محلياً
                setSettings(newSettings);
                return;
            }
            
            if (insertData) {
                setSettings(insertData as POSSettings);
                return;
            }
        }
        
        if (initData) {
            // بعد الإنشاء، جلب الإعدادات المحدثة
            await fetchSettings();
        }
    } catch (err: any) {
        
        // استخدام الإعدادات الافتراضية كخطة احتياطية
        const fallbackSettings = {
            ...defaultPOSSettings,
            organization_id: organizationId
        };
        setSettings(fallbackSettings);
        
        toast({
            title: 'تحذير',
            description: 'تم استخدام الإعدادات الافتراضية. يمكنك تخصيصها من إعدادات نقطة البيع.',
            variant: 'default',
        });
    }
  }, [organizationId, toast, fetchSettings]);

  // تحسين useEffect لضمان تحديث الإعدادات عند تغيير organizationId أو userProfile
  useEffect(() => {
    
    if (organizationId) {
        fetchSettings();
    } else {
        setSettings({ ...defaultPOSSettings, organization_id: '' });
        setIsLoading(false);
    }
  }, [organizationId, userProfile]); // إضافة userProfile للاعتماديات

  const updateSettings = useCallback(async (newSettings: Partial<POSSettings>): Promise<boolean> => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    return true;
  }, []);

  const saveSettings = useCallback(async () => {
    if (!organizationId) {
        toast({
            title: 'خطأ',
            description: 'معرف المؤسسة مفقود.',
            variant: 'destructive',
        });
        return;
    }
    
    if (!hasPermission()) {
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
                p_settings: settings as any,
            });

        if (error) {
            throw error;
        }

        setSaveSuccess(true);
        
        toast({
            title: 'تم الحفظ بنجاح',
            description: 'تم تحديث إعدادات نقطة البيع بنجاح.',
            variant: 'default',
        });
        
        // إعادة جلب الإعدادات للتأكد من التحديث
        await fetchSettings();

    } catch (err: any) {
        toast({
            title: 'فشل الحفظ',
            description: err.message || 'حدث خطأ أثناء حفظ الإعدادات',
            variant: 'destructive',
        });
    } finally {
        setIsSaving(false);
    }
}, [organizationId, settings, hasPermission, toast, fetchSettings]);

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
