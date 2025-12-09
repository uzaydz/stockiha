/**
 * 🏪 Business Profile Types
 *
 * نظام ذكي لتخصيص الواجهة حسب نوع التجارة
 * يتيح لكل تاجر رؤية الخيارات المناسبة لعمله فقط
 */

// =====================================================
// أنواع الأعمال التجارية
// =====================================================

/**
 * نوع العمل التجاري الأساسي
 */
export type BusinessType =
  | 'supermarket'       // سوبرماركت/بقالة - مواد غذائية ومنزلية
  | 'clothing'          // ملابس وأحذية - أزياء ومستلزمات
  | 'electronics'       // إلكترونيات - هواتف وأجهزة
  | 'pharmacy'          // صيدلية - أدوية ومستحضرات طبية
  | 'restaurant'        // مطعم/كافيه - مأكولات ومشروبات
  | 'construction'      // مواد بناء - مواد وأدوات بناء
  | 'cosmetics'         // مستحضرات تجميل - عطور ومكياج
  | 'jewelry'           // مجوهرات - ذهب وفضة وأحجار
  | 'furniture'         // أثاث - منزلي ومكتبي
  | 'auto_parts'        // قطع غيار سيارات
  | 'stationery'        // مكتبة/قرطاسية
  | 'toys'              // ألعاب أطفال
  | 'sports'            // أدوات رياضية
  | 'pets'              // مستلزمات حيوانات
  | 'general_retail'    // تجزئة عامة
  | 'wholesale_only'    // جملة فقط
  | 'custom';           // مخصص - يختار الميزات بنفسه

// =====================================================
// ميزات المنتج
// =====================================================

/**
 * ميزات المنتج القابلة للتفعيل/التعطيل
 */
export interface ProductFeatures {
  // === المتغيرات ===
  /** دعم الألوان */
  use_colors: boolean;
  /** دعم المقاسات */
  use_sizes: boolean;
  /** دعم المتغيرات العامة */
  use_variants: boolean;
  /** صور متعددة للألوان */
  use_color_images: boolean;

  // === طريقة البيع ===
  /** البيع بالقطعة */
  sell_by_unit: boolean;
  /** البيع بالوزن */
  sell_by_weight: boolean;
  /** البيع بالعلبة/الكرتون */
  sell_by_box: boolean;
  /** البيع بالمتر */
  sell_by_meter: boolean;

  // === التسعير ===
  /** أسعار الجملة */
  use_wholesale: boolean;
  /** أسعار نصف الجملة */
  use_partial_wholesale: boolean;
  /** مراحل الأسعار */
  use_price_tiers: boolean;
  /** سعر المقارنة */
  use_compare_price: boolean;

  // === المخزون والتتبع ===
  /** تتبع تاريخ الصلاحية */
  track_expiry: boolean;
  /** تتبع الدفعات */
  track_batches: boolean;
  /** تتبع الأرقام التسلسلية */
  track_serial_numbers: boolean;
  /** تتبع الضمان */
  track_warranty: boolean;
  /** تنبيه المخزون المنخفض */
  track_low_stock: boolean;

  // === معلومات إضافية ===
  /** إظهار الباركود */
  show_barcode: boolean;
  /** إظهار SKU */
  show_sku: boolean;
  /** إظهار سعر الشراء */
  show_purchase_price: boolean;
  /** إظهار هامش الربح */
  show_profit_margin: boolean;
  /** إظهار الوزن والأبعاد */
  show_dimensions: boolean;
}

// =====================================================
// ميزات نقطة البيع
// =====================================================

/**
 * ميزات نقطة البيع
 */
export interface POSFeatures {
  /** إظهار اختيار نوع البيع */
  show_sale_type_selector: boolean;
  /** السماح بتعديل السعر */
  allow_price_editing: boolean;
  /** إظهار نافذة الوزن */
  show_weight_dialog: boolean;
  /** إظهار اختيار الوحدة */
  show_unit_selector: boolean;
  /** إظهار معلومات الصلاحية */
  show_expiry_info: boolean;
  /** إظهار رقم الدفعة */
  show_batch_info: boolean;
  /** استخدام FIFO للمخزون */
  use_fifo: boolean;
  /** السماح بالبيع بالآجل */
  allow_credit_sales: boolean;
}

// =====================================================
// ميزات المشتريات
// =====================================================

/**
 * ميزات المشتريات والموردين
 */
export interface PurchaseFeatures {
  /** تتبع الدفعات */
  track_batches: boolean;
  /** تتبع تاريخ الصلاحية */
  track_expiry: boolean;
  /** تتبع الأرقام التسلسلية */
  track_serial_numbers: boolean;
  /** إدارة الضمان */
  manage_warranty: boolean;
  /** تتبع الموقع في المخزن */
  track_location: boolean;
}

// =====================================================
// ملف تعريف العمل التجاري الكامل
// =====================================================

/**
 * ملف تعريف العمل التجاري
 */
export interface BusinessProfile {
  /** نوع العمل التجاري */
  business_type: BusinessType;

  /** اسم مخصص للنوع (للعرض) */
  custom_name?: string;

  /** الأيقونة */
  icon?: string;

  /** ميزات المنتج */
  product_features: ProductFeatures;

  /** ميزات نقطة البيع */
  pos_features: POSFeatures;

  /** ميزات المشتريات */
  purchase_features: PurchaseFeatures;

  /** تاريخ آخر تعديل */
  updated_at?: string;
}

// =====================================================
// معلومات نوع التجارة للعرض
// =====================================================

/**
 * معلومات نوع التجارة للعرض في واجهة الاختيار
 */
export interface BusinessTypeInfo {
  type: BusinessType;
  label: string;
  labelEn: string;
  description: string;
  icon: string;
  emoji: string;
  color: string;
  gradient: string;
  features: string[];
  examples: string[];
  popularIn?: string[];
}

// =====================================================
// فئات الميزات للعرض
// =====================================================

/**
 * فئة من الميزات للعرض في واجهة التخصيص
 */
export interface FeatureCategory {
  id: string;
  label: string;
  description: string;
  icon: string;
  features: FeatureItem[];
}

/**
 * عنصر ميزة واحد
 */
export interface FeatureItem {
  key: string;
  label: string;
  description: string;
  icon?: string;
  recommended_for?: BusinessType[];
  not_recommended_for?: BusinessType[];
}

// =====================================================
// إعدادات المؤسسة المحدثة
// =====================================================

/**
 * إعدادات Business Profile في المؤسسة
 */
export interface OrganizationBusinessSettings {
  /** نوع العمل التجاري */
  business_type: BusinessType;

  /** الميزات المفعّلة (JSON) */
  business_features: Partial<ProductFeatures & POSFeatures & PurchaseFeatures>;

  /** هل تم اختيار النوع؟ */
  business_type_selected: boolean;

  /** تاريخ اختيار النوع */
  business_type_selected_at?: string;
}

// =====================================================
// الحالة في Context
// =====================================================

/**
 * حالة Business Profile في Context
 */
export interface BusinessProfileState {
  /** ملف التعريف الكامل */
  profile: BusinessProfile | null;

  /** جاري التحميل */
  isLoading: boolean;

  /** هل تم اختيار النوع؟ */
  isSelected: boolean;

  /** خطأ */
  error: string | null;
}

/**
 * Context Actions
 */
export interface BusinessProfileActions {
  /** تحديد نوع التجارة */
  setBusinessType: (type: BusinessType) => Promise<void>;

  /** تحديث ميزة معينة */
  updateFeature: (key: string, value: boolean) => Promise<void>;

  /** تحديث مجموعة ميزات */
  updateFeatures: (features: Partial<ProductFeatures & POSFeatures & PurchaseFeatures>) => Promise<void>;

  /** إعادة تعيين للإعدادات الافتراضية */
  resetToDefaults: (type?: BusinessType) => Promise<void>;

  /** تحديث البيانات */
  refresh: () => Promise<void>;
}

/**
 * Context الكامل
 */
export interface BusinessProfileContextType extends BusinessProfileState, BusinessProfileActions {}

// =====================================================
// دوال مساعدة للتحقق
// =====================================================

/**
 * التحقق من ميزة منتج
 */
export type ProductFeatureKey = keyof ProductFeatures;

/**
 * التحقق من ميزة POS
 */
export type POSFeatureKey = keyof POSFeatures;

/**
 * التحقق من ميزة مشتريات
 */
export type PurchaseFeatureKey = keyof PurchaseFeatures;

/**
 * أي مفتاح ميزة
 */
export type AnyFeatureKey = ProductFeatureKey | POSFeatureKey | PurchaseFeatureKey;
