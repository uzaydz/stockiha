// ثوابت وألوان افتراضية لنظام الثيم
import { THEME_CONFIG } from '@/config/theme-config';
import type { UnifiedTheme } from './types';

// الألوان الافتراضية للموقع العام
export const DEFAULT_GLOBAL_THEME: UnifiedTheme = {
  primaryColor: THEME_CONFIG.DEFAULT_GLOBAL_COLORS.primary,
  secondaryColor: THEME_CONFIG.DEFAULT_GLOBAL_COLORS.secondary,
  mode: 'light',
  lastUpdated: Date.now()
};

// الألوان الافتراضية للمتاجر
export const DEFAULT_STORE_THEME: UnifiedTheme = {
  primaryColor: THEME_CONFIG.DEFAULT_STORE_COLORS.primary,
  secondaryColor: THEME_CONFIG.DEFAULT_STORE_COLORS.secondary,
  mode: 'light',
  lastUpdated: Date.now()
};

// استخدام مفاتيح التخزين من التكوين
export const STORAGE_KEYS = THEME_CONFIG.STORAGE_KEYS;

// متغيرات للأداء
export const THEME_THROTTLE_MS = 500; // تقليل المدة إلى 500ms

// أسماء الفئات
export const NO_MOTION_CLASS = 'no-motion';
