import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useCallback, useState } from 'react';
import { POSSettings, defaultPOSSettings } from '@/types/posSettings';

// =====================================================
// 🚀 Hook مخصص لإعدادات POS فقط - يمنع التكرار
// =====================================================

interface POSSettingsResponse {
  success: boolean;
  data?: POSSettings;
  error?: string;
}

interface UsePOSSettingsProps {
  organizationId?: string;
}

interface UsePOSSettingsReturn {
  settings: POSSettings;
  isLoading: boolean;
  error: string | null;
  updateSettings: (newSettings: Partial<POSSettings>) => void;
  saveSettings: () => Promise<void>;
  isSaving: boolean;
  saveSuccess: boolean;
  hasPermission: () => boolean;
}

export const usePOSSettings = ({ organizationId }: UsePOSSettingsProps): UsePOSSettingsReturn => {
  const { currentOrganization } = useTenant();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<POSSettings>({ 
    ...defaultPOSSettings, 
    organization_id: organizationId || currentOrganization?.id || '' 
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // دالة التحقق من الصلاحيات
  const hasPermission = useCallback(() => {
    if (!userProfile) {
      return false;
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
    
    return false;
  }, [userProfile]);

  const {
    data: response,
    isLoading,
    error
  } = useQuery({
    queryKey: ['pos-settings', currentOrganization?.id],
    queryFn: async (): Promise<POSSettingsResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('معرف المؤسسة مطلوب');
      }

      // التحقق من الصلاحيات أولاً
      if (!hasPermission()) {
        throw new Error('ليس لديك صلاحية للوصول إلى إعدادات نقطة البيع');
      }

      try {
        
        // استخدام الدالة الأساسية فقط
        const { data, error } = await supabase.rpc('get_pos_settings' as any, {
          p_org_id: currentOrganization.id
        });

        if (error) {
          throw new Error(`خطأ في جلب إعدادات POS: ${error.message}`);
        }

        if (!data) {
          throw new Error('لم يتم إرجاع أي إعدادات من الخادم');
        }

        const responseData = Array.isArray(data) ? data[0] : data;

        if (responseData && typeof responseData === 'object' && 'success' in responseData) {
          if (!responseData.success) {
            throw new Error(responseData.error || 'فشل في جلب الإعدادات');
          }
          return responseData as POSSettingsResponse;
        }

        const result = {
          success: true,
          data: responseData as POSSettings
        };
        return result;

      } catch (error) {
        // إذا فشل كل شيء، استخدم الإعدادات الافتراضية
        return {
          success: true,
          data: { ...defaultPOSSettings, organization_id: currentOrganization.id }
        };
      }
    },
    enabled: !!currentOrganization?.id && hasPermission(),
    staleTime: 60 * 60 * 1000, // ساعة واحدة - الإعدادات لا تتغير كثيراً
    gcTime: 2 * 60 * 60 * 1000, // ساعتان
    retry: 1,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => {
      return previousData;
    },
    networkMode: 'online',
    meta: {
      persist: false
    }
  });

  const typedResponse = response as POSSettingsResponse | undefined;
  const settings = typedResponse?.success ? typedResponse.data : null;
  const hasError = !typedResponse?.success || !!error;
  const errorMessage = typedResponse?.error || error?.message;

  // إضافة سجل للتأكد من البيانات

  // إعدادات افتراضية
  const defaultSettings: POSSettings = {
    ...defaultPOSSettings,
    organization_id: currentOrganization?.id || ''
  };

  // تأكد من أن البيانات من قاعدة البيانات لها الأولوية
  const finalSettings = settings || localSettings || defaultSettings;

  // إضافة سجل للتأكد من البيانات المُرجعة

  // دالة تحديث الإعدادات محلياً
  const updateSettings = useCallback((newSettings: Partial<POSSettings>) => {
    setLocalSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // دالة حفظ الإعدادات
  const saveSettings = useCallback(async () => {
    if (!currentOrganization?.id || !hasPermission()) {
      toast({
        title: "خطأ",
        description: "ليس لديك صلاحية لحفظ إعدادات نقطة البيع",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // التحقق من وجود إعدادات موجودة أولاً
      const { data: existingSettings, error: checkError } = await supabase
        .from('pos_settings')
        .select('id')
        .eq('organization_id', currentOrganization.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // إذا كان الخطأ ليس "لا توجد نتائج"، فهناك خطأ حقيقي
        throw new Error(`خطأ في التحقق من الإعدادات الموجودة: ${checkError.message}`);
      }

      let result;
      if (existingSettings) {
        // تحديث الإعدادات الموجودة
        result = await supabase
          .from('pos_settings')
          .update({
            ...finalSettings,
            updated_at: new Date().toISOString()
          })
          .eq('organization_id', currentOrganization.id)
          .select()
          .single();
      } else {
        // إدراج إعدادات جديدة
        result = await supabase
          .from('pos_settings')
          .insert({
            organization_id: currentOrganization.id,
            ...finalSettings,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
      }

      if (result.error) {
        throw new Error(`خطأ في حفظ الإعدادات: ${result.error.message}`);
      }

      // تحديث cache
      queryClient.setQueryData(['pos-settings', currentOrganization.id], {
        success: true,
        data: finalSettings
      });

      setSaveSuccess(true);
      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات نقطة البيع بنجاح",
      });

      // إعادة تعيين حالة النجاح بعد 3 ثوان
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل في حفظ الإعدادات",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [currentOrganization?.id, finalSettings, hasPermission, queryClient, toast]);

  return {
    settings: finalSettings,
    isLoading,
    error: errorMessage,
    updateSettings,
    saveSettings,
    isSaving,
    saveSuccess,
    hasPermission
  };
};

export default usePOSSettings;
