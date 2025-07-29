import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import ProductOfferTimer from '@/components/product/ProductOfferTimer';

interface OfferTimerSectionProps {
  product: any;
}

const OfferTimerSection: React.FC<OfferTimerSectionProps> = React.memo(({ product }) => {
  // إعداد مؤقت العرض - مع معالجة أفضل للأنواع المختلفة
  const marketingSettings = product?.marketing_settings as any; // النوع الآمن
  const offerTimerEnabled = marketingSettings?.offer_timer_enabled === true;
  
  const offerTimerSettings = useMemo(() => {
    if (!marketingSettings || !offerTimerEnabled) return null;
    
    // تحديد نوع المؤقت - إذا كان specific_date لكن لا توجد end_date، استخدم evergreen
    let timerType = marketingSettings.offer_timer_type as 'evergreen' | 'specific_date' | 'fixed_duration_per_visitor';
    if (timerType === 'specific_date' && !marketingSettings.offer_timer_end_date) {
      timerType = 'evergreen';
    }
    
    // إذا لم يكن هناك duration للـ evergreen، استخدم 60 دقيقة افتراضياً
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
  }, [marketingSettings, offerTimerEnabled]);

  // تسجيل حالة مؤقت العرض في وضع التطوير
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('⏰ مؤقت العرض - تفاصيل شاملة:', {
        productId: product?.id,
        hasMarketingSettings: !!marketingSettings,
        marketingSettings,
        offerTimerEnabled,
        offerTimerSettings,
        timerTitle: marketingSettings?.offer_timer_title,
        timerType: marketingSettings?.offer_timer_type,
        timerDuration: marketingSettings?.offer_timer_duration_minutes
      });
    }
  }, [product?.id, marketingSettings, offerTimerEnabled, offerTimerSettings]);

  // عدم العرض إذا لم يكن مفعلاً
  if (!offerTimerEnabled || !offerTimerSettings) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="my-6"
    >
      <ProductOfferTimer 
        settings={offerTimerSettings}
        theme="default"
        className="w-full"
      />
    </motion.div>
  );
});

OfferTimerSection.displayName = 'OfferTimerSection';

export default OfferTimerSection; 