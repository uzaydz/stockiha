// أنواع البيانات لإعدادات مؤقت العروض
export interface OfferTimerSettings {
  offer_timer_enabled: boolean;
  offer_timer_title?: string;
  offer_timer_type: 'specific_date' | 'evergreen' | 'fixed_duration_per_visitor';
  offer_timer_end_date?: string;
  offer_timer_duration_minutes?: number;
  offer_timer_text_above?: string;
  offer_timer_text_below?: string;
  offer_timer_end_action?: 'hide' | 'show_message' | 'redirect';
  offer_timer_end_action_message?: string;
  offer_timer_end_action_url?: string;
  offer_timer_restart_for_new_session?: boolean;
  offer_timer_cookie_duration_days?: number;
  offer_timer_show_on_specific_pages_only?: boolean;
  offer_timer_specific_page_urls?: string[];
}

// واجهة مكون المؤقت
export interface OfferTimerProps {
  settings: OfferTimerSettings;
  className?: string;
  position?: 'above-price' | 'below-price' | 'banner' | 'popup';
  theme?: 'default' | 'urgent' | 'elegant' | 'modern' | 'minimal';
  showProgress?: boolean;
}

// واجهة الوقت المتبقي
export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
} 