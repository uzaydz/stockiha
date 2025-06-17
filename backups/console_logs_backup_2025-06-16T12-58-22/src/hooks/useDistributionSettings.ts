import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { 
  OrderDistributionSettings, 
  UseDistributionSettingsReturn 
} from '@/types/call-center.types';

export const useDistributionSettings = (): UseDistributionSettingsReturn => {
  const [settings, setSettings] = useState<OrderDistributionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organization } = useAuth();

  // جلب الإعدادات من قاعدة البيانات
  const fetchSettings = useCallback(async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('order_distribution_settings')
        .select('*')
        .eq('organization_id', organization.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setSettings(data);
      } else {
        // إنشاء إعدادات افتراضية إذا لم تكن موجودة
        const defaultSettings: Omit<OrderDistributionSettings, 'id' | 'created_at' | 'updated_at'> = {
          organization_id: organization.id,
          active_plan_id: 'auto-assignment',
          active_plan_type: 'automatic',
          settings: {
            auto_assignment_enabled: true,
            max_orders_per_agent_per_day: 50,
            reassignment_after_hours: 2,
            priority_order_threshold: 1000,
            working_hours: {
              start: '09:00',
              end: '17:00'
            },
            weekend_assignment: false,
            performance_weight: 0.4,
            workload_weight: 0.4,
            region_weight: 0.2
          }
        };

        const { data: newSettings, error: createError } = await supabase
          .from('order_distribution_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        setSettings(newSettings);
      }
    } catch (err) {
      console.error('خطأ في جلب إعدادات التوزيع:', err);
      setError('فشل في جلب إعدادات التوزيع');
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  // تحديث الإعدادات
  const updateSettings = useCallback(async (newSettings: Partial<OrderDistributionSettings['settings']>): Promise<boolean> => {
    if (!organization?.id || !settings) {
      toast.error('الإعدادات غير متوفرة');
      return false;
    }

    try {
      const updatedSettings = {
        ...settings.settings,
        ...newSettings
      };

      const { error: updateError } = await supabase
        .from('order_distribution_settings')
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', organization.id);

      if (updateError) {
        throw updateError;
      }

      // تحديث الحالة المحلية
      setSettings(prev => prev ? {
        ...prev,
        settings: updatedSettings,
        updated_at: new Date().toISOString()
      } : null);

      toast.success('تم حفظ الإعدادات بنجاح');
      return true;
    } catch (err) {
      console.error('خطأ في تحديث الإعدادات:', err);
      toast.error('فشل في حفظ الإعدادات');
      return false;
    }
  }, [organization?.id, settings]);

  // إعادة تحميل الإعدادات
  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  // جلب الإعدادات عند التحميل الأول
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings
  };
}; 