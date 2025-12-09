/**
 * 📦 Products Module
 *
 * تصدير موحد لخدمات وأنواع المنتجات
 */

// الخدمة الرئيسية
export { default as ProductServiceV2 } from './productServiceV2';
export {
  // الدوال الرئيسية
  upsertProductV2,
  getProductV2,
  calculateProductPrice,

  // اختصارات
  createProduct,
  updateProduct,
  getProductById,
  getProductByBarcode,
  getProductBySku,
  getProductBySlug,

  // الدفعات
  addProductBatch,
  getProductBatches,

  // الأرقام التسلسلية
  addSerialNumbers,
  getAvailableSerials,
  sellSerialNumber,
  returnSerialNumber,

  // مستويات الأسعار
  getProductPriceTiers,
  updateProductPriceTiers,
} from './productServiceV2';

// الأنواع
export type {
  // البيانات الأساسية
  ProductBasicData,
  ProductPricingData,
  ProductInventoryData,

  // أنواع البيع
  WeightSellingConfig,
  BoxSellingConfig,
  MeterSellingConfig,

  // التتبع المتقدم
  ExpiryTrackingConfig,
  SerialTrackingConfig,
  WarrantyConfig,
  BatchTrackingConfig,

  // المتغيرات
  ProductSize,
  ProductVariant,

  // الدفعات والأرقام التسلسلية
  ProductBatch,
  ProductSerialNumber,

  // مستويات الأسعار
  PriceTierName,
  PriceTierType,
  ProductPriceTier,

  // معلومات خاصة بالنشاط
  PharmacySpecific,
  RestaurantSpecific,
  AutoPartsSpecific,
  ConstructionSpecific,
  BusinessSpecificData,

  // الصور
  ProductImage,

  // الإعدادات
  ProductAdvancedSettings,
  ProductMarketingSettings,

  // النشر
  PublicationStatus,
  ProductPublication,

  // معاملات الدوال
  UpsertProductV2Params,
  GetProductV2Params,
  ProductScope,

  // نتائج الدوال
  UpsertProductV2Result,
  ProductV2Data,
  GetProductV2Result,

  // حساب السعر
  CalculatePriceParams,
  CalculatePriceResult,
} from './types';
