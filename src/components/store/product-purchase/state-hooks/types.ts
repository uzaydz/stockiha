// تمديد واجهة FormSettings لإضافة حقل fields
export interface ExtendedFormSettings {
  fields?: any[];
}

// واجهة إعدادات التسويق
export interface ProductMarketingSettings {
  id: string;
  product_id: string;
  offer_timer_enabled?: boolean;
  offer_timer_title?: string;
  offer_timer_type?: 'evergreen' | 'specific_date' | 'fixed_duration_per_visitor';
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
  enable_reviews?: boolean;
  [key: string]: any;
}
