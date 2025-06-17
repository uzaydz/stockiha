import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-unified';
import { OfferTimerSettings } from '@/types/offerTimer';

export const useOfferTimerSettings = (organizationId: string) => {
  const [settings, setSettings] = useState<OfferTimerSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveSettings = async (settings: OfferTimerSettings) => {
        setLoading(true);
        setError(null);

    try {
      // التحقق من وجود معرف المنتج والمنظمة
      if (!settings.product_id || !organizationId) {
        throw new Error('معرف المنتج أو المنظمة مفقود');
        }

      // التحقق من إعدادات الوقت
      if (settings.timer_minutes <= 0 || settings.timer_minutes > 1440) {
        throw new Error('وقت المؤقت يجب أن يكون بين 1 و 1440 دقيقة (24 ساعة)');
      }

      // إنشاء عميل Supabase
      const { data, error } = await supabase
        .from('product_marketing_settings')
        .upsert({
          product_id: settings.product_id,
          organization_id: organizationId,
          offer_timer_enabled: settings.enabled,
          timer_duration_minutes: settings.timer_minutes,
          discount_percentage: settings.discount_percentage || 0,
          offer_text: settings.offer_text || '',
          button_text: settings.button_text || 'احصل على الخصم',
          timer_text_before: settings.timer_text_before || 'العرض ينتهي خلال:',
          timer_text_after: settings.timer_text_after || 'انتهى العرض',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'product_id,organization_id'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`خطأ في حفظ الإعدادات: ${error.message}`);
      }

      setSettings(settings);
      
      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ غير معروف';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async (productId: string) => {
    if (!organizationId || !productId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('product_marketing_settings')
        .select('*')
        .eq('product_id', productId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`خطأ في جلب الإعدادات: ${error.message}`);
      }

      if (data) {
        const loadedSettings: OfferTimerSettings = {
          product_id: productId,
          enabled: data.offer_timer_enabled || false,
          timer_minutes: data.timer_duration_minutes || 30,
          discount_percentage: data.discount_percentage || 0,
          offer_text: data.offer_text || '',
          button_text: data.button_text || 'احصل على الخصم',
          timer_text_before: data.timer_text_before || 'العرض ينتهي خلال:',
          timer_text_after: data.timer_text_after || 'انتهى العرض'
        };
        setSettings(loadedSettings);
      } else {
        // إعدادات افتراضية
        const defaultSettings: OfferTimerSettings = {
          product_id: productId,
          enabled: false,
          timer_minutes: 30,
          discount_percentage: 10,
          offer_text: 'عرض خاص لفترة محدودة!',
          button_text: 'احصل على الخصم',
          timer_text_before: 'العرض ينتهي خلال:',
          timer_text_after: 'انتهى العرض'
        };
        setSettings(defaultSettings);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ غير معروف';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      // We don't auto-load settings anymore, wait for explicit loadSettings call
    }
  }, [organizationId]);

  return {
    settings,
    loading,
    error,
    saveSettings,
    loadSettings,
    setSettings
  };
};

export default useOfferTimerSettings;
