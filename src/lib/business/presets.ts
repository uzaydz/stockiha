/**
 * 🎯 Business Profile Presets
 *
 * الإعدادات الافتراضية الذكية لكل نوع تجارة
 * مبنية على دراسة احتياجات كل قطاع
 */

import type {
  BusinessType,
  BusinessTypeInfo,
  ProductFeatures,
  POSFeatures,
  PurchaseFeatures,
  BusinessProfile,
  FeatureCategory,
} from './types';

// =====================================================
// الإعدادات الافتراضية للميزات
// =====================================================

/**
 * القيم الافتراضية لميزات المنتج (كل شيء معطل)
 */
export const DEFAULT_PRODUCT_FEATURES: ProductFeatures = {
  // المتغيرات
  use_colors: false,
  use_sizes: false,
  use_variants: false,
  use_color_images: false,

  // طريقة البيع
  sell_by_unit: true, // الوحيد المفعل افتراضياً
  sell_by_weight: false,
  sell_by_box: false,
  sell_by_meter: false,

  // التسعير
  use_wholesale: false,
  use_partial_wholesale: false,
  use_price_tiers: false,
  use_compare_price: false,

  // المخزون والتتبع
  track_expiry: false,
  track_batches: false,
  track_serial_numbers: false,
  track_warranty: false,
  track_low_stock: true, // مهم للجميع

  // معلومات إضافية
  show_barcode: true,
  show_sku: true,
  show_purchase_price: true,
  show_profit_margin: true,
  show_dimensions: false,
};

/**
 * القيم الافتراضية لميزات نقطة البيع
 */
export const DEFAULT_POS_FEATURES: POSFeatures = {
  show_sale_type_selector: false,
  allow_price_editing: true,
  show_weight_dialog: false,
  show_unit_selector: false,
  show_expiry_info: false,
  show_batch_info: false,
  use_fifo: false,
  allow_credit_sales: true,
};

/**
 * القيم الافتراضية لميزات المشتريات
 */
export const DEFAULT_PURCHASE_FEATURES: PurchaseFeatures = {
  track_batches: false,
  track_expiry: false,
  track_serial_numbers: false,
  manage_warranty: false,
  track_location: false,
};

// =====================================================
// Presets لكل نوع تجارة
// =====================================================

/**
 * الإعدادات الافتراضية لكل نوع تجارة
 */
export const BUSINESS_PRESETS: Record<BusinessType, {
  product: Partial<ProductFeatures>;
  pos: Partial<POSFeatures>;
  purchase: Partial<PurchaseFeatures>;
}> = {

  // =====================================================
  // 🛒 سوبرماركت / بقالة
  // =====================================================
  supermarket: {
    product: {
      use_colors: false,
      use_sizes: false,
      use_variants: false,
      sell_by_unit: true,
      sell_by_weight: true,      // ✅ خضار وفواكه
      sell_by_box: true,         // ✅ كراتين
      use_wholesale: true,       // ✅ بيع جملة
      use_partial_wholesale: true,
      use_price_tiers: true,     // ✅ مراحل للكميات
      track_expiry: true,        // ✅ مهم جداً!
      track_batches: true,       // ✅ دفعات
      track_low_stock: true,
      show_barcode: true,
    },
    pos: {
      show_sale_type_selector: true,
      allow_price_editing: true,
      show_weight_dialog: true,  // ✅ للوزن
      show_unit_selector: true,  // ✅ قطعة/كيلو/علبة
      show_expiry_info: true,    // ✅ إظهار الصلاحية
      use_fifo: true,            // ✅ الأقدم أولاً
    },
    purchase: {
      track_batches: true,
      track_expiry: true,
      track_location: true,
    },
  },

  // =====================================================
  // 👗 ملابس وأحذية
  // =====================================================
  clothing: {
    product: {
      use_colors: true,          // ✅ الألوان مهمة
      use_sizes: true,           // ✅ المقاسات مهمة
      use_variants: true,        // ✅
      use_color_images: true,    // ✅ صور لكل لون
      sell_by_unit: true,
      sell_by_weight: false,
      sell_by_box: false,
      use_wholesale: true,
      use_partial_wholesale: true,
      track_expiry: false,       // ❌ لا صلاحية
      track_batches: false,
      show_barcode: true,
    },
    pos: {
      show_sale_type_selector: true,
      allow_price_editing: true,
      show_weight_dialog: false,
      show_unit_selector: false,
    },
    purchase: {
      track_batches: false,
      track_expiry: false,
    },
  },

  // =====================================================
  // 📱 إلكترونيات
  // =====================================================
  electronics: {
    product: {
      use_colors: true,          // ✅ ألوان الهواتف
      use_sizes: false,          // ❌
      use_variants: true,        // ✅ (ذاكرة، سعة)
      sell_by_unit: true,
      sell_by_box: true,         // ✅ كراتين
      use_wholesale: true,
      use_price_tiers: true,
      track_expiry: false,
      track_serial_numbers: true, // ✅ مهم جداً!
      track_warranty: true,       // ✅ مهم جداً!
      show_barcode: true,
      show_dimensions: true,
    },
    pos: {
      show_sale_type_selector: true,
      allow_price_editing: true,
      show_unit_selector: false,
    },
    purchase: {
      track_serial_numbers: true,
      manage_warranty: true,
      track_location: true,
    },
  },

  // =====================================================
  // 💊 صيدلية
  // =====================================================
  pharmacy: {
    product: {
      use_colors: false,
      use_sizes: false,
      use_variants: false,
      sell_by_unit: true,
      sell_by_box: true,
      use_wholesale: true,
      use_partial_wholesale: true,
      use_price_tiers: true,
      track_expiry: true,        // ✅ حرج جداً!
      track_batches: true,       // ✅ رقم الدفعة مهم
      track_low_stock: true,
      show_barcode: true,
    },
    pos: {
      show_sale_type_selector: true,
      show_expiry_info: true,    // ✅ إظهار الصلاحية
      show_batch_info: true,     // ✅ إظهار الدفعة
      use_fifo: true,            // ✅ الأقدم أولاً
      allow_credit_sales: true,
    },
    purchase: {
      track_batches: true,
      track_expiry: true,
      track_location: true,
    },
  },

  // =====================================================
  // 🍔 مطعم / كافيه
  // =====================================================
  restaurant: {
    product: {
      use_colors: false,
      use_sizes: true,           // ✅ S, M, L
      use_variants: true,        // ✅ إضافات
      sell_by_unit: true,
      sell_by_weight: false,
      use_wholesale: false,      // ❌
      track_expiry: true,        // ✅ المكونات
      show_barcode: false,       // ❌
      show_sku: false,
      show_purchase_price: true,
    },
    pos: {
      allow_price_editing: false, // ❌ أسعار ثابتة
      show_unit_selector: false,
    },
    purchase: {
      track_expiry: true,
    },
  },

  // =====================================================
  // 🏗️ مواد البناء
  // =====================================================
  construction: {
    product: {
      use_colors: true,          // ✅ ألوان الطلاء
      use_sizes: true,           // ✅ مقاسات المواسير
      use_variants: true,
      sell_by_unit: true,
      sell_by_weight: true,      // ✅ الحديد بالطن
      sell_by_box: true,
      sell_by_meter: true,       // ✅ بالمتر
      use_wholesale: true,       // ✅
      use_partial_wholesale: true,
      use_price_tiers: true,     // ✅ مراحل للكميات الكبيرة
      track_expiry: true,        // ✅ الإسمنت له صلاحية
      show_dimensions: true,
    },
    pos: {
      show_sale_type_selector: true,
      show_weight_dialog: true,
      show_unit_selector: true,
      allow_credit_sales: true,
    },
    purchase: {
      track_batches: true,
      track_expiry: true,
      track_location: true,
    },
  },

  // =====================================================
  // 💄 مستحضرات التجميل
  // =====================================================
  cosmetics: {
    product: {
      use_colors: true,          // ✅ ألوان المكياج
      use_sizes: true,           // ✅ حجم العبوة
      use_variants: true,
      use_color_images: true,
      sell_by_unit: true,
      use_wholesale: true,
      use_partial_wholesale: true,
      track_expiry: true,        // ✅ الصلاحية مهمة
      track_batches: true,
      show_barcode: true,
    },
    pos: {
      show_sale_type_selector: true,
      show_expiry_info: true,
    },
    purchase: {
      track_batches: true,
      track_expiry: true,
    },
  },

  // =====================================================
  // 💎 مجوهرات
  // =====================================================
  jewelry: {
    product: {
      use_colors: true,          // ✅ ذهب/فضة
      use_sizes: true,           // ✅ مقاسات الخواتم
      use_variants: true,
      sell_by_unit: true,
      sell_by_weight: true,      // ✅ بالغرام
      use_wholesale: true,
      track_serial_numbers: true, // ✅ لكل قطعة
      show_dimensions: true,
    },
    pos: {
      show_weight_dialog: true,
      allow_price_editing: true, // ✅ حسب سعر الذهب
    },
    purchase: {
      track_serial_numbers: true,
    },
  },

  // =====================================================
  // 🛋️ أثاث
  // =====================================================
  furniture: {
    product: {
      use_colors: true,          // ✅ ألوان الأقمشة
      use_sizes: true,           // ✅ أبعاد
      use_variants: true,
      use_color_images: true,
      sell_by_unit: true,
      use_wholesale: true,
      use_price_tiers: true,
      track_warranty: true,      // ✅ ضمان
      show_dimensions: true,
    },
    pos: {
      show_sale_type_selector: true,
      allow_credit_sales: true,
    },
    purchase: {
      manage_warranty: true,
      track_location: true,
    },
  },

  // =====================================================
  // 🚗 قطع غيار سيارات
  // =====================================================
  auto_parts: {
    product: {
      use_colors: false,
      use_sizes: true,           // ✅ نوع السيارة
      use_variants: true,
      sell_by_unit: true,
      sell_by_box: true,
      use_wholesale: true,
      use_partial_wholesale: true,
      use_price_tiers: true,
      track_serial_numbers: true,
      track_warranty: true,
      show_barcode: true,
    },
    pos: {
      show_sale_type_selector: true,
      allow_credit_sales: true,
    },
    purchase: {
      track_serial_numbers: true,
      manage_warranty: true,
    },
  },

  // =====================================================
  // 📚 مكتبة / قرطاسية
  // =====================================================
  stationery: {
    product: {
      use_colors: true,          // ✅ ألوان الأقلام
      use_sizes: true,           // ✅ مقاسات الدفاتر
      use_variants: true,
      sell_by_unit: true,
      sell_by_box: true,         // ✅ علب
      use_wholesale: true,
      use_partial_wholesale: true,
      show_barcode: true,
    },
    pos: {
      show_sale_type_selector: true,
      show_unit_selector: true,
    },
    purchase: {},
  },

  // =====================================================
  // 🧸 ألعاب أطفال
  // =====================================================
  toys: {
    product: {
      use_colors: true,
      use_sizes: true,           // ✅ الفئة العمرية
      use_variants: true,
      sell_by_unit: true,
      use_wholesale: true,
      use_partial_wholesale: true,
      show_barcode: true,
      show_dimensions: true,
    },
    pos: {
      show_sale_type_selector: true,
    },
    purchase: {},
  },

  // =====================================================
  // ⚽ أدوات رياضية
  // =====================================================
  sports: {
    product: {
      use_colors: true,
      use_sizes: true,           // ✅ S, M, L, XL
      use_variants: true,
      use_color_images: true,
      sell_by_unit: true,
      use_wholesale: true,
      show_barcode: true,
      show_dimensions: true,
    },
    pos: {
      show_sale_type_selector: true,
    },
    purchase: {},
  },

  // =====================================================
  // 🐕 مستلزمات حيوانات
  // =====================================================
  pets: {
    product: {
      use_colors: false,
      use_sizes: true,           // ✅ حجم الحيوان
      use_variants: true,
      sell_by_unit: true,
      sell_by_weight: true,      // ✅ الأعلاف
      sell_by_box: true,
      use_wholesale: true,
      track_expiry: true,        // ✅ الأطعمة
      show_barcode: true,
    },
    pos: {
      show_sale_type_selector: true,
      show_weight_dialog: true,
      show_expiry_info: true,
    },
    purchase: {
      track_expiry: true,
    },
  },

  // =====================================================
  // 🏪 تجزئة عامة
  // =====================================================
  general_retail: {
    product: {
      use_colors: true,
      use_sizes: true,
      use_variants: true,
      sell_by_unit: true,
      sell_by_weight: true,
      sell_by_box: true,
      use_wholesale: true,
      use_partial_wholesale: true,
      track_expiry: true,
      track_low_stock: true,
      show_barcode: true,
    },
    pos: {
      show_sale_type_selector: true,
      allow_price_editing: true,
      show_weight_dialog: true,
      show_unit_selector: true,
    },
    purchase: {
      track_batches: true,
      track_expiry: true,
    },
  },

  // =====================================================
  // 📦 جملة فقط
  // =====================================================
  wholesale_only: {
    product: {
      use_colors: true,
      use_sizes: true,
      use_variants: true,
      sell_by_unit: true,
      sell_by_weight: true,
      sell_by_box: true,
      use_wholesale: true,       // ✅
      use_partial_wholesale: true, // ✅
      use_price_tiers: true,     // ✅
      track_expiry: true,
      track_batches: true,
      show_barcode: true,
    },
    pos: {
      show_sale_type_selector: true,
      show_unit_selector: true,
      allow_credit_sales: true,
    },
    purchase: {
      track_batches: true,
      track_expiry: true,
      track_location: true,
    },
  },

  // =====================================================
  // ⚙️ مخصص
  // =====================================================
  custom: {
    product: {},
    pos: {},
    purchase: {},
  },
};

// =====================================================
// معلومات أنواع التجارة للعرض
// =====================================================

/**
 * معلومات كاملة عن كل نوع تجارة
 */
export const BUSINESS_TYPES_INFO: BusinessTypeInfo[] = [
  {
    type: 'supermarket',
    label: 'سوبرماركت / بقالة',
    labelEn: 'Supermarket / Grocery',
    description: 'مواد غذائية، منظفات، خضار وفواكه',
    icon: 'ShoppingCart',
    emoji: '🛒',
    color: 'emerald',
    gradient: 'from-emerald-500 to-green-600',
    features: [
      'البيع بالوزن والعلبة',
      'تتبع الصلاحية',
      'أسعار الجملة',
      'إدارة الدفعات',
    ],
    examples: ['سوبر ماركت', 'بقالة', 'محل خضار', 'محل مواد غذائية'],
    popularIn: ['الجزائر', 'المغرب', 'تونس'],
  },
  {
    type: 'clothing',
    label: 'ملابس وأحذية',
    labelEn: 'Clothing & Footwear',
    description: 'أزياء رجالية ونسائية وأطفال',
    icon: 'Shirt',
    emoji: '👗',
    color: 'purple',
    gradient: 'from-purple-500 to-pink-600',
    features: [
      'الألوان والمقاسات',
      'صور لكل لون',
      'أسعار الجملة',
      'إدارة المتغيرات',
    ],
    examples: ['محل ملابس', 'محل أحذية', 'متجر أزياء', 'محل حجاب'],
  },
  {
    type: 'electronics',
    label: 'إلكترونيات',
    labelEn: 'Electronics',
    description: 'هواتف، أجهزة، إكسسوارات',
    icon: 'Smartphone',
    emoji: '📱',
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-600',
    features: [
      'الأرقام التسلسلية',
      'إدارة الضمان',
      'تتبع IMEI',
      'الألوان والسعات',
    ],
    examples: ['محل هواتف', 'محل إلكترونيات', 'محل كمبيوتر', 'محل إكسسوارات'],
  },
  {
    type: 'pharmacy',
    label: 'صيدلية',
    labelEn: 'Pharmacy',
    description: 'أدوية ومستحضرات طبية',
    icon: 'Pill',
    emoji: '💊',
    color: 'red',
    gradient: 'from-red-500 to-rose-600',
    features: [
      'تاريخ الصلاحية الإلزامي',
      'أرقام الدفعات',
      'نظام FIFO',
      'تنبيهات انتهاء الصلاحية',
    ],
    examples: ['صيدلية', 'محل مستلزمات طبية'],
  },
  {
    type: 'restaurant',
    label: 'مطعم / كافيه',
    labelEn: 'Restaurant / Café',
    description: 'مأكولات ومشروبات',
    icon: 'UtensilsCrossed',
    emoji: '🍔',
    color: 'orange',
    gradient: 'from-orange-500 to-amber-600',
    features: [
      'أحجام (S, M, L)',
      'الإضافات والتخصيص',
      'صلاحية المكونات',
      'أسعار ثابتة',
    ],
    examples: ['مطعم', 'كافيه', 'مقهى', 'محل ساندويتش', 'بيتزيريا'],
  },
  {
    type: 'construction',
    label: 'مواد البناء',
    labelEn: 'Construction Materials',
    description: 'مواد وأدوات البناء',
    icon: 'Building2',
    emoji: '🏗️',
    color: 'amber',
    gradient: 'from-amber-500 to-yellow-600',
    features: [
      'البيع بالمتر والطن',
      'أسعار الجملة المتدرجة',
      'صلاحية الإسمنت',
      'الألوان (الطلاء)',
    ],
    examples: ['محل مواد بناء', 'محل حديد', 'محل طلاء', 'محل سباكة'],
  },
  {
    type: 'cosmetics',
    label: 'مستحضرات تجميل',
    labelEn: 'Cosmetics',
    description: 'عطور ومكياج وعناية',
    icon: 'Sparkles',
    emoji: '💄',
    color: 'pink',
    gradient: 'from-pink-500 to-rose-600',
    features: [
      'الألوان (درجات المكياج)',
      'أحجام العبوات',
      'تاريخ الصلاحية',
      'أسعار الجملة',
    ],
    examples: ['محل عطور', 'محل مكياج', 'محل مستحضرات تجميل'],
  },
  {
    type: 'jewelry',
    label: 'مجوهرات',
    labelEn: 'Jewelry',
    description: 'ذهب وفضة وأحجار كريمة',
    icon: 'Gem',
    emoji: '💎',
    color: 'yellow',
    gradient: 'from-yellow-400 to-amber-500',
    features: [
      'البيع بالغرام',
      'أرقام تسلسلية',
      'مقاسات الخواتم',
      'أنواع المعدن',
    ],
    examples: ['محل ذهب', 'محل مجوهرات', 'محل فضة'],
  },
  {
    type: 'furniture',
    label: 'أثاث',
    labelEn: 'Furniture',
    description: 'أثاث منزلي ومكتبي',
    icon: 'Sofa',
    emoji: '🛋️',
    color: 'stone',
    gradient: 'from-stone-500 to-stone-700',
    features: [
      'الألوان والأقمشة',
      'الأبعاد',
      'الضمان',
      'التوصيل والتركيب',
    ],
    examples: ['محل أثاث', 'محل مفروشات', 'معرض أثاث'],
  },
  {
    type: 'auto_parts',
    label: 'قطع غيار سيارات',
    labelEn: 'Auto Parts',
    description: 'قطع غيار وإكسسوارات سيارات',
    icon: 'Car',
    emoji: '🚗',
    color: 'slate',
    gradient: 'from-slate-500 to-slate-700',
    features: [
      'أرقام القطع',
      'الضمان',
      'التوافق مع الموديلات',
      'أسعار الجملة',
    ],
    examples: ['محل قطع غيار', 'محل زيوت', 'محل إطارات'],
  },
  {
    type: 'stationery',
    label: 'مكتبة / قرطاسية',
    labelEn: 'Stationery / Bookstore',
    description: 'أدوات مكتبية وكتب',
    icon: 'BookOpen',
    emoji: '📚',
    color: 'indigo',
    gradient: 'from-indigo-500 to-violet-600',
    features: [
      'الألوان',
      'البيع بالعلبة',
      'أسعار الجملة',
      'موسم الدخول المدرسي',
    ],
    examples: ['مكتبة', 'محل قرطاسية', 'محل أدوات مكتبية'],
  },
  {
    type: 'toys',
    label: 'ألعاب أطفال',
    labelEn: 'Toys',
    description: 'ألعاب ومستلزمات أطفال',
    icon: 'Blocks',
    emoji: '🧸',
    color: 'cyan',
    gradient: 'from-cyan-500 to-teal-600',
    features: [
      'الفئات العمرية',
      'الألوان',
      'أسعار الجملة',
      'الأبعاد',
    ],
    examples: ['محل ألعاب', 'محل مستلزمات أطفال'],
  },
  {
    type: 'sports',
    label: 'أدوات رياضية',
    labelEn: 'Sports Equipment',
    description: 'ملابس ومعدات رياضية',
    icon: 'Dumbbell',
    emoji: '⚽',
    color: 'lime',
    gradient: 'from-lime-500 to-green-600',
    features: [
      'الألوان والمقاسات',
      'صور لكل لون',
      'أسعار الجملة',
    ],
    examples: ['محل أدوات رياضية', 'محل ملابس رياضية'],
  },
  {
    type: 'pets',
    label: 'مستلزمات حيوانات',
    labelEn: 'Pet Supplies',
    description: 'أطعمة ومستلزمات حيوانات أليفة',
    icon: 'PawPrint',
    emoji: '🐕',
    color: 'teal',
    gradient: 'from-teal-500 to-emerald-600',
    features: [
      'صلاحية الأطعمة',
      'أحجام الحيوانات',
      'البيع بالوزن',
    ],
    examples: ['محل حيوانات', 'محل أطعمة حيوانات'],
  },
  {
    type: 'general_retail',
    label: 'تجزئة عامة',
    labelEn: 'General Retail',
    description: 'متجر متعدد الأصناف',
    icon: 'Store',
    emoji: '🏪',
    color: 'violet',
    gradient: 'from-violet-500 to-purple-600',
    features: [
      'جميع أنواع البيع',
      'الألوان والمقاسات',
      'الصلاحية',
      'أسعار الجملة',
    ],
    examples: ['محل عام', 'متجر متعدد الأصناف'],
  },
  {
    type: 'wholesale_only',
    label: 'تجارة الجملة',
    labelEn: 'Wholesale Only',
    description: 'بيع بالجملة فقط',
    icon: 'Warehouse',
    emoji: '📦',
    color: 'sky',
    gradient: 'from-sky-500 to-blue-600',
    features: [
      'مراحل الأسعار',
      'حد أدنى للطلب',
      'البيع بالكرتون',
      'البيع بالآجل',
    ],
    examples: ['تاجر جملة', 'موزع', 'مستودع'],
  },
  {
    type: 'custom',
    label: 'مخصص',
    labelEn: 'Custom',
    description: 'اختر الميزات التي تناسبك',
    icon: 'Settings2',
    emoji: '⚙️',
    color: 'gray',
    gradient: 'from-gray-500 to-gray-700',
    features: [
      'تحكم كامل',
      'اختر ما تريد',
      'مرونة تامة',
    ],
    examples: ['أي نوع تجارة آخر'],
  },
];

// =====================================================
// فئات الميزات للتخصيص
// =====================================================

/**
 * فئات الميزات لعرضها في صفحة التخصيص
 */
export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    id: 'variants',
    label: 'المتغيرات',
    description: 'الألوان والمقاسات والمتغيرات',
    icon: 'Palette',
    features: [
      {
        key: 'use_colors',
        label: 'الألوان',
        description: 'دعم ألوان متعددة للمنتج الواحد',
        recommended_for: ['clothing', 'electronics', 'cosmetics', 'jewelry', 'furniture'],
      },
      {
        key: 'use_sizes',
        label: 'المقاسات',
        description: 'دعم مقاسات مختلفة (S, M, L أو أرقام)',
        recommended_for: ['clothing', 'restaurant', 'jewelry', 'sports'],
      },
      {
        key: 'use_color_images',
        label: 'صور الألوان',
        description: 'صورة مختلفة لكل لون',
        recommended_for: ['clothing', 'cosmetics', 'furniture', 'sports'],
      },
    ],
  },
  {
    id: 'selling',
    label: 'طريقة البيع',
    description: 'كيف يتم بيع المنتجات',
    icon: 'ShoppingBag',
    features: [
      {
        key: 'sell_by_weight',
        label: 'البيع بالوزن',
        description: 'كيلو، غرام، طن',
        recommended_for: ['supermarket', 'construction', 'jewelry', 'pets'],
      },
      {
        key: 'sell_by_box',
        label: 'البيع بالعلبة/الكرتون',
        description: 'علبة، كرتون، باقة',
        recommended_for: ['supermarket', 'pharmacy', 'wholesale_only', 'stationery'],
      },
      {
        key: 'sell_by_meter',
        label: 'البيع بالمتر',
        description: 'متر، متر مربع، متر مكعب',
        recommended_for: ['construction'],
      },
    ],
  },
  {
    id: 'pricing',
    label: 'التسعير',
    description: 'أسعار الجملة والتخفيضات',
    icon: 'DollarSign',
    features: [
      {
        key: 'use_wholesale',
        label: 'أسعار الجملة',
        description: 'سعر مخفض للكميات الكبيرة',
        not_recommended_for: ['restaurant'],
      },
      {
        key: 'use_partial_wholesale',
        label: 'نصف الجملة',
        description: 'سعر متوسط للكميات المتوسطة',
        recommended_for: ['supermarket', 'pharmacy', 'cosmetics', 'wholesale_only'],
      },
      {
        key: 'use_price_tiers',
        label: 'مراحل الأسعار',
        description: 'أسعار مختلفة حسب الكمية',
        recommended_for: ['supermarket', 'construction', 'wholesale_only'],
      },
    ],
  },
  {
    id: 'tracking',
    label: 'التتبع والمخزون',
    description: 'تتبع الصلاحية والأرقام',
    icon: 'PackageSearch',
    features: [
      {
        key: 'track_expiry',
        label: 'تاريخ الصلاحية',
        description: 'تتبع وتنبيه قبل انتهاء الصلاحية',
        recommended_for: ['supermarket', 'pharmacy', 'cosmetics', 'pets'],
      },
      {
        key: 'track_batches',
        label: 'الدفعات',
        description: 'تتبع أرقام الدفعات',
        recommended_for: ['supermarket', 'pharmacy'],
      },
      {
        key: 'track_serial_numbers',
        label: 'الأرقام التسلسلية',
        description: 'رقم فريد لكل قطعة',
        recommended_for: ['electronics', 'jewelry', 'auto_parts'],
      },
      {
        key: 'track_warranty',
        label: 'الضمان',
        description: 'فترة الضمان وتتبعه',
        recommended_for: ['electronics', 'furniture', 'auto_parts'],
      },
    ],
  },
];

// =====================================================
// دوال مساعدة
// =====================================================

/**
 * الحصول على ملف تعريف كامل لنوع تجارة
 */
export function getBusinessProfile(type: BusinessType): BusinessProfile {
  const preset = BUSINESS_PRESETS[type];

  return {
    business_type: type,
    product_features: {
      ...DEFAULT_PRODUCT_FEATURES,
      ...preset.product,
    },
    pos_features: {
      ...DEFAULT_POS_FEATURES,
      ...preset.pos,
    },
    purchase_features: {
      ...DEFAULT_PURCHASE_FEATURES,
      ...preset.purchase,
    },
  };
}

/**
 * الحصول على معلومات نوع التجارة
 */
export function getBusinessTypeInfo(type: BusinessType): BusinessTypeInfo | undefined {
  return BUSINESS_TYPES_INFO.find((info) => info.type === type);
}

/**
 * دمج ميزات مخصصة مع الافتراضية
 */
export function mergeFeatures(
  type: BusinessType,
  customFeatures: Partial<ProductFeatures & POSFeatures & PurchaseFeatures>
): BusinessProfile {
  const defaultProfile = getBusinessProfile(type);

  return {
    ...defaultProfile,
    product_features: {
      ...defaultProfile.product_features,
      ...(customFeatures as Partial<ProductFeatures>),
    },
    pos_features: {
      ...defaultProfile.pos_features,
      ...(customFeatures as Partial<POSFeatures>),
    },
    purchase_features: {
      ...defaultProfile.purchase_features,
      ...(customFeatures as Partial<PurchaseFeatures>),
    },
  };
}

/**
 * الحصول على الميزات الموصى بها لنوع تجارة
 */
export function getRecommendedFeatures(type: BusinessType): string[] {
  const recommended: string[] = [];

  FEATURE_CATEGORIES.forEach((category) => {
    category.features.forEach((feature) => {
      if (feature.recommended_for?.includes(type)) {
        recommended.push(feature.key);
      }
    });
  });

  return recommended;
}
