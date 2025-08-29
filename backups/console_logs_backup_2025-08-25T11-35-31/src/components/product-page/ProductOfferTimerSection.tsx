import React, { memo, useMemo } from 'react';
import ProductOfferTimer from '@/components/product/ProductOfferTimer';

interface ProductOfferTimerSectionProps {
  product: any;
  className?: string;
}

/**
 * مكون قسم مؤقت العرض المحسن للأداء
 * - يستخدم useMemo لحساب إعدادات المؤقت مرة واحدة فقط
 * - يظهر فقط عندما يكون المؤقت مفعلاً
 */
export const ProductOfferTimerSection = memo<ProductOfferTimerSectionProps>(({
  product,
  className = "my-6"
}) => {
  // إعداد مؤقت العرض - محسوب مرة واحدة فقط
  const offerTimerSettings = useMemo(() => {
    if (!product?.marketing_settings) return null;
    
    const marketingSettings = product.marketing_settings as any;
    const offerTimerEnabled = marketingSettings?.offer_timer_enabled === true;
    
    if (!offerTimerEnabled) return null;
    
    let timerType = marketingSettings.offer_timer_type as 'evergreen' | 'specific_date' | 'fixed_duration_per_visitor';
    if (timerType === 'specific_date' && !marketingSettings.offer_timer_end_date) {
      timerType = 'evergreen';
    }
    
    const duration = marketingSettings.offer_timer_duration_minutes || 60;
    
    return {
      offer_timer_enabled: true,
      offer_timer_title: marketingSettings.offer_timer_title || 'عرض خاص',
      offer_timer_type: timerType,
      offer_timer_end_date: marketingSettings.offer_timer_end_date || undefined,
      offer_timer_duration_minutes: duration,
      offer_timer_text_above: marketingSettings.offer_timer_text_above || 'عرض محدود الوقت',
      offer_timer_text_below: marketingSettings.offer_timer_text_below || 'استفد من العرض قبل انتهاء الوقت',
      offer_timer_end_action: (marketingSettings.offer_timer_end_action as 'hide' | 'show_message' | 'redirect') || 'hide',
      offer_timer_end_action_message: marketingSettings.offer_timer_end_action_message || undefined,
      offer_timer_end_action_url: marketingSettings.offer_timer_end_action_url || undefined,
      offer_timer_restart_for_new_session: marketingSettings.offer_timer_restart_for_new_session || false,
      offer_timer_cookie_duration_days: marketingSettings.offer_timer_cookie_duration_days || 30,
      offer_timer_show_on_specific_pages_only: marketingSettings.offer_timer_show_on_specific_pages_only || false,
      offer_timer_specific_page_urls: marketingSettings.offer_timer_specific_page_urls || []
    };
  }, [product?.marketing_settings]);

  // لا تظهر إذا لم يكن المؤقت مفعلاً
  if (!offerTimerSettings) {
    return null;
  }

  return (
    <div className={className}>
      <ProductOfferTimer 
        settings={offerTimerSettings}
        theme="default"
        className="w-full"
      />
    </div>
  );
});

ProductOfferTimerSection.displayName = 'ProductOfferTimerSection';
