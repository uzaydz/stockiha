import React from 'react';
import OfferTimer from './OfferTimer';
import { OfferTimerSettings } from '@/types/offerTimer';

// مثال على إعدادات مؤقت العرض لاختبار النظام
const OfferTimerExample: React.FC = () => {
  // مثال 1: مؤقت دائم الخضرة (60 دقيقة)
  const evergreenSettings: OfferTimerSettings = {
    offer_timer_enabled: true,
    offer_timer_title: "🔥 عرض محدود جداً",
    offer_timer_type: 'evergreen',
    offer_timer_duration_minutes: 60,
    offer_timer_text_above: "احصل على خصم 30% قبل انتهاء الوقت:",
    offer_timer_text_below: "لا تفوت هذا العرض المحدود!",
    offer_timer_end_action: 'show_message',
    offer_timer_end_action_message: 'للأسف، لقد انتهى هذا العرض المحدود',
    offer_timer_restart_for_new_session: true,
    offer_timer_cookie_duration_days: 1,
    offer_timer_show_on_specific_pages_only: false,
    offer_timer_specific_page_urls: []
  };

  // مثال 2: مؤقت لتاريخ محدد
  const specificDateSettings: OfferTimerSettings = {
    offer_timer_enabled: true,
    offer_timer_title: "عرض نهاية الأسبوع",
    offer_timer_type: 'specific_date',
    offer_timer_end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // بعد يومين
    offer_timer_text_above: "عرض نهاية الأسبوع ينتهي في:",
    offer_timer_text_below: "وفر حتى 50% على جميع المنتجات",
    offer_timer_end_action: 'hide',
    offer_timer_restart_for_new_session: false,
    offer_timer_cookie_duration_days: 7,
    offer_timer_show_on_specific_pages_only: false,
    offer_timer_specific_page_urls: []
  };

  // مثال 3: مؤقت مدة ثابتة لكل زائر
  const fixedDurationSettings: OfferTimerSettings = {
    offer_timer_enabled: true,
    offer_timer_title: "عرض خاص للزوار الجدد",
    offer_timer_type: 'fixed_duration_per_visitor',
    offer_timer_duration_minutes: 30,
    offer_timer_text_above: "كزائر جديد، لديك فرصة خاصة:",
    offer_timer_text_below: "خصم 20% ينتهي بعد:",
    offer_timer_end_action: 'show_message',
    offer_timer_end_action_message: 'انتهت فترة العرض الخاص، لكن يمكنك التسوق بالأسعار العادية',
    offer_timer_restart_for_new_session: false,
    offer_timer_cookie_duration_days: 30,
    offer_timer_show_on_specific_pages_only: false,
    offer_timer_specific_page_urls: []
  };

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8">أمثلة على مؤقتات العروض</h1>
      
      {/* مثال 1: مؤقت دائم الخضرة */}
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-4 text-center">مؤقت دائم الخضرة (60 دقيقة)</h2>
        <OfferTimer 
          settings={evergreenSettings}
          position="below-price"
          theme="urgent"
          showProgress={true}
        />
      </div>

      {/* مثال 2: مؤقت لتاريخ محدد */}
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-4 text-center">مؤقت لتاريخ محدد (يومين)</h2>
        <OfferTimer 
          settings={specificDateSettings}
          position="below-price"
          theme="elegant"
          showProgress={true}
        />
      </div>

      {/* مثال 3: مؤقت مدة ثابتة */}
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-4 text-center">مؤقت مدة ثابتة لكل زائر (30 دقيقة)</h2>
        <OfferTimer 
          settings={fixedDurationSettings}
          position="below-price"
          theme="modern"
          showProgress={true}
        />
      </div>

      {/* أمثلة إضافية بثيمات مختلفة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div>
          <h3 className="text-lg font-semibold mb-3 text-center">ثيم افتراضي</h3>
          <OfferTimer 
            settings={evergreenSettings}
            theme="default"
            showProgress={false}
          />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-3 text-center">ثيم مبسط</h3>
          <OfferTimer 
            settings={evergreenSettings}
            theme="minimal"
            showProgress={true}
          />
        </div>
      </div>
    </div>
  );
};

export default OfferTimerExample; 