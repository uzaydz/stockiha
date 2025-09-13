// واجهات وأنواع البيانات لنظام الثيم
export interface UnifiedTheme {
  // الألوان الأساسية
  primaryColor: string;
  secondaryColor: string;

  // وضع المظهر
  mode: 'light' | 'dark' | 'system';

  // CSS مخصص
  customCss?: string;

  // معلومات المؤسسة
  organizationId?: string;
  subdomain?: string;

  // طابع زمني للتحديث
  lastUpdated: number;
}

export interface ThemeSettings {
  theme_primary_color?: string;
  theme_secondary_color?: string;
  theme_mode?: 'light' | 'dark' | 'auto';
  custom_css?: string;
}

export type PageType = 'global' | 'store' | 'admin';

export type ThemeType = 'global' | 'store' | 'organization';
