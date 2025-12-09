/**
 * 🏪 Business Profile Components
 *
 * مكونات نظام ملف تعريف العمل التجاري
 */

export { BusinessTypeSelector } from './BusinessTypeSelector';
export { BusinessFeatureCustomizer } from './BusinessFeatureCustomizer';

// إعادة تصدير من Context
export {
  useBusinessProfile,
  useBusinessFeature,
  useBusinessFeatures,
  useBusinessType,
  useNeedsBusinessTypeSelection,
} from '@/context/BusinessProfileContext';

// إعادة تصدير الأنواع
export type {
  BusinessType,
  BusinessProfile,
  ProductFeatures,
  POSFeatures,
  PurchaseFeatures,
  AnyFeatureKey,
} from '@/lib/business/types';
