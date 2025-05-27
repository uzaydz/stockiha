/**
 * أنواع البيانات المستخدمة في الإعدادات
 */

/**
 * إعدادات المستخدم
 */
export interface UserSettings {
  id?: string;
  user_id: string;
  theme_mode: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
  date_format?: string;
  time_format?: string;
  notification_email?: boolean;
  notification_push?: boolean;
  notification_browser?: boolean;
  notification_preferences?: Record<string, boolean>;
  created_at?: string;
  updated_at?: string;
}

/**
 * إعدادات المؤسسة
 */
export interface OrganizationSettings {
  id?: string;
  organization_id: string;
  theme_primary_color: string;
  theme_secondary_color: string;
  theme_mode: 'light' | 'dark' | 'auto';
  site_name?: string;
  custom_css?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  default_language?: string;
  custom_js?: string | null;
  custom_header?: string | null;
  custom_footer?: string | null;
  enable_registration?: boolean;
  enable_public_site?: boolean;
  display_text_with_logo?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * أنواع قوالب الإعدادات
 */
export type TemplateType = 'invoice' | 'receipt' | 'email';

/**
 * قوالب الإعدادات
 */
export interface SettingsTemplate {
  id: string;
  organization_id: string;
  template_type: TemplateType;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * سجل تغييرات الإعدادات
 */
export interface SettingsAuditLog {
  id: string;
  user_id: string;
  organization_id: string | null;
  setting_type: 'user' | 'organization';
  setting_key: string;
  old_value: string;
  new_value: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  }
}

export interface SettingsResponse {
  success: boolean;
  data: UserSettings | OrganizationSettings;
  message?: string;
}

// Tipo de tema para usuarios
export type UserThemeMode = 'light' | 'dark' | 'system';

// Tipo de tema para organizaciones
export type OrganizationThemeMode = 'light' | 'dark' | 'auto';

export interface UpdateSettingsPayload {
  theme_mode?: UserThemeMode;
  language?: string;
  timezone?: string;
  date_format?: string;
  time_format?: string;
  notification_email?: boolean;
  notification_push?: boolean;
  notification_browser?: boolean;
  notification_preferences?: Record<string, boolean>;
  theme_primary_color?: string;
  theme_secondary_color?: string;
  theme_mode_org?: UserThemeMode; // Acepta 'system' que será convertido a 'auto'
  site_name?: string;
  custom_css?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  default_language?: string;
  custom_js?: string | null;
  custom_header?: string | null;
  custom_footer?: string | null;
  enable_registration?: boolean;
  enable_public_site?: boolean;
  display_text_with_logo?: boolean;
}

export interface UserSettingsContextType {
  settings: UserSettings | null;
  loading: boolean;
  error: Error | null;
  updateSettings: (settings: UpdateSettingsPayload) => Promise<void>;
  reload: () => Promise<void>;
}
