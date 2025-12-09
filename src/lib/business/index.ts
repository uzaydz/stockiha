/**
 * 🏪 Business Profile System
 *
 * نظام ذكي لتخصيص الواجهة حسب نوع التجارة
 */

// الأنواع
export type {
  BusinessType,
  ProductFeatures,
  POSFeatures,
  PurchaseFeatures,
  BusinessProfile,
  BusinessTypeInfo,
  FeatureCategory,
  FeatureItem,
  OrganizationBusinessSettings,
  BusinessProfileState,
  BusinessProfileActions,
  BusinessProfileContextType,
  ProductFeatureKey,
  POSFeatureKey,
  PurchaseFeatureKey,
  AnyFeatureKey,
} from './types';

// الإعدادات الافتراضية والـ Presets
export {
  DEFAULT_PRODUCT_FEATURES,
  DEFAULT_POS_FEATURES,
  DEFAULT_PURCHASE_FEATURES,
  BUSINESS_PRESETS,
  BUSINESS_TYPES_INFO,
  FEATURE_CATEGORIES,
  getBusinessProfile,
  getBusinessTypeInfo,
  mergeFeatures,
  getRecommendedFeatures,
} from './presets';
