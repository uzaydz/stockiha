import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { OfferTimerSettings } from '@/types/offerTimer';

export const useOfferTimerSettings = (productId: string, organizationId?: string) => {
  const [settings, setSettings] = useState<OfferTimerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOfferTimerSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!productId) {
          setSettings(null);
          setLoading(false);
          return;
        }

        // إنشاء عميل Supabase
        const supabase = createClient();

        // جلب إعدادات التسويق للمنتج
        const { data: marketingSettings, error: fetchError } = await supabase
          .from('product_marketing_settings')
          .select(`
            offer_timer_enabled,
            offer_timer_title,
            offer_timer_type,
            offer_timer_end_date,
            offer_timer_duration_minutes,
            offer_timer_text_above,
            offer_timer_text_below,
            offer_timer_end_action,
            offer_timer_end_action_message,
            offer_timer_end_action_url,
            offer_timer_restart_for_new_session,
            offer_timer_cookie_duration_days,
            offer_timer_show_on_specific_pages_only,
            offer_timer_specific_page_urls
          `)
          .eq('product_id', productId)
          .maybeSingle();

        console.log('🔍 بيانات التسويق الخام من قاعدة البيانات:', {
          productId,
          marketingSettings,
          fetchError,
          offer_timer_enabled: marketingSettings?.offer_timer_enabled
        });

        if (fetchError) {
          console.error('خطأ في جلب إعدادات مؤقت العرض:', fetchError);
          setError('فشل في جلب إعدادات مؤقت العرض');
          setSettings(null);
          return;
        }

        // إذا لم توجد إعدادات، إنشاء إعدادات افتراضية
        if (!marketingSettings) {
          setSettings({
            offer_timer_enabled: false,
            offer_timer_type: 'evergreen',
            offer_timer_duration_minutes: 60,
            offer_timer_restart_for_new_session: true,
            offer_timer_cookie_duration_days: 30,
            offer_timer_show_on_specific_pages_only: false,
            offer_timer_specific_page_urls: []
          });
        } else {
          // معالجة القيم الفارغة وتعيين قيم افتراضية
          const processedSettings: OfferTimerSettings = {
            offer_timer_enabled: marketingSettings.offer_timer_enabled,
            offer_timer_title: marketingSettings.offer_timer_title || undefined,
            offer_timer_type: marketingSettings.offer_timer_type,
            offer_timer_end_date: marketingSettings.offer_timer_end_date || undefined,
            offer_timer_duration_minutes: marketingSettings.offer_timer_duration_minutes || 60,
            offer_timer_text_above: marketingSettings.offer_timer_text_above || undefined,
            offer_timer_text_below: marketingSettings.offer_timer_text_below || undefined,
            offer_timer_end_action: marketingSettings.offer_timer_end_action || 'hide',
            offer_timer_end_action_message: marketingSettings.offer_timer_end_action_message || undefined,
            offer_timer_end_action_url: marketingSettings.offer_timer_end_action_url || undefined,
            offer_timer_restart_for_new_session: marketingSettings.offer_timer_restart_for_new_session || false,
            offer_timer_cookie_duration_days: marketingSettings.offer_timer_cookie_duration_days || 30,
            offer_timer_show_on_specific_pages_only: marketingSettings.offer_timer_show_on_specific_pages_only || false,
            offer_timer_specific_page_urls: marketingSettings.offer_timer_specific_page_urls || []
          };
          
          console.log('⚙️ الإعدادات المعالجة:', {
            original_enabled: marketingSettings.offer_timer_enabled,
            processed_enabled: processedSettings.offer_timer_enabled,
            processedSettings
          });
          
          setSettings(processedSettings);
        }
      } catch (err) {
        console.error('خطأ غير متوقع:', err);
        setError('حدث خطأ غير متوقع');
        setSettings(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOfferTimerSettings();
  }, [productId, organizationId]);

  // دالة لتحديث الإعدادات
  const updateSettings = async (newSettings: Partial<OfferTimerSettings>) => {
    try {
      setLoading(true);
      setError(null);

      if (!productId || !organizationId) {
        throw new Error('معرف المنتج أو المؤسسة مطلوب');
      }

      const supabase = createClient();

      const { error: updateError } = await supabase
        .from('product_marketing_settings')
        .upsert({
          product_id: productId,
          organization_id: organizationId,
          ...newSettings,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        throw updateError;
      }

      // تحديث الحالة المحلية
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      
      return { success: true };
    } catch (err) {
      console.error('خطأ في تحديث الإعدادات:', err);
      setError('فشل في تحديث الإعدادات');
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  // دالة للتحقق من صحة المؤقت للصفحة الحالية
  const isValidForCurrentPage = (currentUrl?: string) => {
    if (!settings || !settings.offer_timer_enabled) {
      return false;
    }

    // إذا كان المؤقت معد للعمل على صفحات محددة فقط
    if (settings.offer_timer_show_on_specific_pages_only && settings.offer_timer_specific_page_urls) {
      if (!currentUrl) return false;
      
      return settings.offer_timer_specific_page_urls.some(url => 
        currentUrl.includes(url)
      );
    }

    return true;
  };

  // دالة للحصول على إعدادات مؤقت مبسطة للعرض
  const getDisplaySettings = () => {
    if (!settings || !settings.offer_timer_enabled) {
      return null;
    }

    return {
      enabled: settings.offer_timer_enabled,
      title: settings.offer_timer_title || '',
      type: settings.offer_timer_type,
      endDate: settings.offer_timer_end_date,
      durationMinutes: settings.offer_timer_duration_minutes || 60,
      textAbove: settings.offer_timer_text_above || '',
      textBelow: settings.offer_timer_text_below || '',
      endAction: settings.offer_timer_end_action || 'hide',
      endActionMessage: settings.offer_timer_end_action_message || '',
      endActionUrl: settings.offer_timer_end_action_url || '',
      restartForNewSession: settings.offer_timer_restart_for_new_session || false,
      cookieDurationDays: settings.offer_timer_cookie_duration_days || 30
    };
  };

  // تسجيل الحالة النهائية للمؤقت
  useEffect(() => {
    console.log('📊 الحالة النهائية للمؤقت:', {
      settings,
      loading,
      error,
      isEnabled: settings?.offer_timer_enabled || false,
      offer_timer_enabled: settings?.offer_timer_enabled
    });
  }, [settings, loading, error]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    isValidForCurrentPage,
    getDisplaySettings,
    isEnabled: settings?.offer_timer_enabled || false,
    refetch: () => {
      // إعادة جلب البيانات
      setLoading(true);
    }
  };
};

export default useOfferTimerSettings; 