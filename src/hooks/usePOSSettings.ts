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
    if(!userProfile) return false;
    // التحقق من الصلاحيات: مدير عام، مدير المؤسسة، أو صلاحية محددة
    return userProfile.is_super_admin || 
           userProfile.is_org_admin || 
           (userProfile.permissions && (userProfile.permissions as any)?.managePOSSettings === true);
  }, [userProfile]);

  const fetchSettings = useCallback(async () => {
    console.log('🔧 POSSettings: جاري جلب الإعدادات...', {
      organizationId,
      userProfile: userProfile ? {
        id: userProfile.id,
        email: userProfile.email,
        is_org_admin: userProfile.is_org_admin,
        is_super_admin: userProfile.is_super_admin,
        organization_id: userProfile.organization_id
      } : null
    });

    if (!organizationId) {
        console.log('❌ POSSettings: معرف المؤسسة مفقود');
        setIsLoading(false);
        setError('معرف المؤسسة مفقود');
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
        console.log('🔧 POSSettings: محاولة جلب الإعدادات من RPC مع المعامل:', { p_org_id: organizationId });
        
        const { data, error: rpcError } = await supabase
            .rpc('get_pos_settings', { p_org_id: organizationId } as any);

        console.log('🔧 POSSettings: نتيجة RPC:', { data, error: rpcError });

        if (rpcError) {
            console.log('❌ POSSettings: خطأ في RPC:', rpcError);
            
            // إذا فشل RPC، جرب الوصول المباشر للجدول
            console.log('🔧 POSSettings: جاري المحاولة بالوصول المباشر للجدول...');
            const { data: directData, error: directError } = await supabase
                .from('pos_settings')
                .select('*')
                .eq('organization_id', organizationId)
                .limit(1);
                
            console.log('🔧 POSSettings: نتيجة الوصول المباشر:', { data: directData, error: directError });
            
            if (directError) {
                console.log('❌ POSSettings: خطأ في الوصول المباشر:', directError);
                throw directError;
            }
            
            if (directData && directData.length > 0) {
                console.log('✅ POSSettings: تم جلب الإعدادات بالوصول المباشر:', directData[0]);
                setSettings(directData[0] as POSSettings);
                return;
            } else {
                console.log('🔧 POSSettings: لا توجد إعدادات، سيتم إنشاؤها...');
                await initializeSettings();
                return;
            }
        }
        
        if (data && data.length > 0) {
            console.log('✅ POSSettings: تم جلب الإعدادات بنجاح من RPC:', data[0]);
            const fetchedSettings = data[0] as unknown as POSSettingsRow;
            setSettings(fetchedSettings as POSSettings);
        } else {
            console.log('🔧 POSSettings: البيانات فارغة من RPC، سيتم إنشاء إعدادات افتراضية...');
            await initializeSettings();
        }
    } catch (err: any) {
        console.error('❌ POSSettings: خطأ عام في جلب الإعدادات:', err);
        
        // كخطة احتياطية أخيرة، استخدام الإعدادات الافتراضية مع organization_id صحيح
        const fallbackSettings = {
            ...defaultPOSSettings,
            organization_id: organizationId
        };
        
        console.log('🔧 POSSettings: استخدام الإعدادات الافتراضية:', fallbackSettings);
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
        console.log('❌ initializeSettings: معرف المؤسسة مفقود');
        return;
    }
    
    try {
        console.log('🔧 POSSettings: محاولة إنشاء إعدادات جديدة للمؤسسة:', organizationId);
        
        // جرب RPC أولاً
        const { data: initData, error: initError } = await supabase
            .rpc('initialize_pos_settings', { p_organization_id: organizationId });
        
        console.log('🔧 POSSettings: نتيجة initialize_pos_settings:', { data: initData, error: initError });
        
        if (initError) {
            console.log('❌ POSSettings: فشل RPC، جاري المحاولة بالإدراج المباشر...');
            
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
                
            console.log('🔧 POSSettings: نتيجة الإدراج المباشر:', { data: insertData, error: insertError });
            
            if (insertError) {
                console.log('❌ POSSettings: فشل الإدراج المباشر:', insertError);
                // استخدام الإعدادات الافتراضية محلياً
                setSettings(newSettings);
                return;
            }
            
            if (insertData) {
                console.log('✅ POSSettings: تم إنشاء الإعدادات بالإدراج المباشر:', insertData);
                setSettings(insertData as POSSettings);
                return;
            }
        }
        
        if (initData) {
            console.log('✅ POSSettings: تم إنشاء الإعدادات بـ RPC، جاري جلبها...');
            // بعد الإنشاء، جلب الإعدادات المحدثة
            await fetchSettings();
        }
    } catch (err: any) {
        console.error('❌ POSSettings: خطأ في إنشاء الإعدادات:', err);
        
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
    console.log('🔧 POSSettings useEffect triggered:', { organizationId, userProfile: !!userProfile });
    
    if (organizationId) {
        fetchSettings();
    } else {
        console.log('❌ POSSettings: لا يوجد organizationId، استخدام الإعدادات الافتراضية');
        setSettings({ ...defaultPOSSettings, organization_id: '' });
        setIsLoading(false);
    }
  }, [organizationId, userProfile]); // إضافة userProfile للاعتماديات

  const updateSettings = useCallback(async (newSettings: Partial<POSSettings>): Promise<boolean> => {
    console.log('🔧 POSSettings: تحديث الإعدادات محلياً:', newSettings);
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
        console.log('🔧 POSSettings: حفظ الإعدادات:', { organizationId, settings });
        
        const { error } = await supabase
            .rpc('upsert_pos_settings', {
                p_organization_id: organizationId,
                p_settings: settings as any,
            });

        if (error) {
            console.log('❌ POSSettings: خطأ في حفظ الإعدادات:', error);
            throw error;
        }

        setSaveSuccess(true);
        console.log('✅ POSSettings: تم حفظ الإعدادات بنجاح');
        
        toast({
            title: 'تم الحفظ بنجاح',
            description: 'تم تحديث إعدادات نقطة البيع بنجاح.',
            variant: 'default',
        });
        
        // إعادة جلب الإعدادات للتأكد من التحديث
        await fetchSettings();

    } catch (err: any) {
        console.error('❌ POSSettings: فشل في حفظ الإعدادات:', err);
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
