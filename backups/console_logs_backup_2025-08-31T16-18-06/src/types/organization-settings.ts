// أنواع إعدادات المؤسسة المحدثة لتتضمن merchant_type
export interface OrganizationSettingsDB {
  id: string;
  organization_id: string;
  theme_primary_color: string | null;
  theme_secondary_color: string | null;
  theme_mode: string | null;
  site_name: string | null;
  custom_css: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  default_language: string | null;
  custom_js: string | null;
  custom_header: string | null;
  custom_footer: string | null;
  enable_registration: boolean | null;
  enable_public_site: boolean | null;
  display_text_with_logo: boolean | null;
  merchant_type: 'traditional' | 'ecommerce' | 'both' | null;
  created_at: string | null;
  updated_at: string | null;
}

// نوع للتحديث (Update)
export interface OrganizationSettingsUpdate {
  theme_primary_color?: string | null;
  theme_secondary_color?: string | null;
  theme_mode?: string | null;
  site_name?: string | null;
  custom_css?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  default_language?: string | null;
  custom_js?: string | null;
  custom_header?: string | null;
  custom_footer?: string | null;
  enable_registration?: boolean | null;
  enable_public_site?: boolean | null;
  display_text_with_logo?: boolean | null;
  merchant_type?: 'traditional' | 'ecommerce' | 'both' | null;
  updated_at?: string | null;
}

// نوع للإدراج (Insert)
export interface OrganizationSettingsInsert {
  id?: string;
  organization_id: string;
  theme_primary_color?: string | null;
  theme_secondary_color?: string | null;
  theme_mode?: string | null;
  site_name?: string | null;
  custom_css?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  default_language?: string | null;
  custom_js?: string | null;
  custom_header?: string | null;
  custom_footer?: string | null;
  enable_registration?: boolean | null;
  enable_public_site?: boolean | null;
  display_text_with_logo?: boolean | null;
  merchant_type?: 'traditional' | 'ecommerce' | 'both' | null;
  created_at?: string | null;
  updated_at?: string | null;
}
