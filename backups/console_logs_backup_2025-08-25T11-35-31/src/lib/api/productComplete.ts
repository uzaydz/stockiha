import { supabase } from '@/lib/supabase';

// أنواع البيانات للاستجابة
export type DataScope = 'basic' | 'medium' | 'full' | 'ultra';

export interface ProductCompleteResponse {
  success: boolean;
  data_scope: DataScope;
  product: CompleteProduct;
  stats: ProductStats;
  meta: ResponseMeta;
  error?: ErrorInfo;
}

export interface CompleteProduct {
  // البيانات الأساسية
  id: string;
  name: string;
  name_for_shipping?: string;
  description: string;
  slug?: string;
  sku: string;
  barcode?: string;
  brand?: string;

  // الأسعار
  pricing: {
    price: number;
    purchase_price?: number;
    compare_at_price?: number;
    wholesale_price?: number;
    partial_wholesale_price?: number;
    min_wholesale_quantity?: number;
    min_partial_wholesale_quantity?: number;
  };

  // خيارات البيع
  selling_options: {
    allow_retail: boolean;
    allow_wholesale: boolean;
    allow_partial_wholesale: boolean;
    is_sold_by_unit: boolean;
    unit_type?: string;
    unit_purchase_price?: number;
    unit_sale_price?: number;
  };

  // المخزون
  inventory: {
    stock_quantity: number;
    min_stock_level: number;
    reorder_level: number;
    reorder_quantity: number;
    last_inventory_update?: string;
  };

  // التصنيفات
  categories: {
    category_id?: string;
    category_name?: string;
    category_slug?: string;
    category_icon?: string;
    category_image?: string;
    subcategory_id?: string;
    subcategory_name?: string;
    subcategory_slug?: string;
  };

  // الصور
  images: {
    thumbnail_image?: string;
    additional_images: ProductImage[];
  };

  // المتغيرات
  variants: {
    has_variants: boolean;
    use_sizes: boolean;
    use_variant_prices: boolean;
    colors: ProductColor[];
  };

  // الميزات والمواصفات
  features_and_specs: {
    features: string[];
    specifications: Record<string, any>;
    has_fast_shipping: boolean;
    has_money_back: boolean;
    has_quality_guarantee: boolean;
    fast_shipping_text?: string;
    money_back_text?: string;
    quality_guarantee_text?: string;
  };

  // حالة المنتج
  status: {
    is_active: boolean;
    is_digital: boolean;
    is_featured: boolean;
    is_new: boolean;
    show_price_on_landing: boolean;
  };

  // معلومات التنظيم
  organization: {
    organization_id: string;
    created_by_user_id?: string;
    updated_by_user_id?: string;
    created_at: string;
    updated_at: string;
  };

  // الشحن والقوالب
  shipping_and_templates: {
    shipping_info?: ShippingInfo;
    template_info?: TemplateInfo;
    shipping_method_type: string;
    use_shipping_clone: boolean;
  };

  // النماذج 🆕
  form_data?: FormData | null;

  // البيانات المتقدمة (حسب النطاق)
  wholesale_tiers: WholesaleTier[];
  advanced_settings?: AdvancedSettings;
  marketing_settings?: MarketingSettings;
  purchase_page_config?: any;
  special_offers_config?: SpecialOffersConfig;
}

export interface ProductImage {
  id: string;
  url: string;
  sort_order: number;
}

export interface ProductColor {
  id: string;
  name: string;
  color_code: string;
  image_url?: string;
  quantity: number;
  price?: number;
  purchase_price?: number;
  is_default: boolean;
  barcode?: string;
  variant_number?: number;
  has_sizes?: boolean;
  sizes: ProductSize[];
}

export interface ProductSize {
  id: string;
  size_name: string;
  quantity: number;
  price?: number;
  purchase_price?: number;
  barcode?: string;
  is_default: boolean;
}

export interface WholesaleTier {
  id: string;
  min_quantity: number;
  price: number;
}

export interface ShippingInfo {
  type: 'clone' | 'provider';
  id: number;
  name: string;
  original_provider?: string;
  code?: string;
  unified_price?: boolean;
  home_price?: number;
  desk_price?: number;
}

export interface TemplateInfo {
  id: string;
  name: string;
  type: string;
  is_default: boolean;
}

export interface FormField {
  id: string;
  name: string;
  type: string;
  label: string;
  order: number;
  required: boolean;
  isVisible: boolean;
  placeholder?: string;
  validation?: any;
  options?: any[];
  dependency?: any;
  linkedFields?: any;
  description?: string;
  defaultValue?: any;
}

export interface FormData {
  id: string;
  name: string;
  fields: FormField[];
  is_default: boolean;
  is_active: boolean;
  settings: Record<string, any>;
  type: 'custom' | 'default';
  created_at: string;
  updated_at: string;
}

export interface AdvancedSettings {
  use_custom_currency: boolean;
  custom_currency_code?: string;
  is_base_currency: boolean;
  skip_cart: boolean;
  enable_sticky_buy_button: boolean;
  require_login_to_purchase: boolean;
  prevent_repeat_purchase: boolean;
  disable_quantity_selection: boolean;
  enable_stock_notification: boolean;
  fake_visitor_counter: {
    enabled: boolean;
    min_visitors: number;
    max_visitors: number;
  };
  fake_low_stock: {
    enabled: boolean;
    min_threshold: number;
    max_threshold: number;
  };
  stock_countdown: {
    enabled: boolean;
    duration_hours: number;
    reset_on_zero: boolean;
  };
  social_proof: {
    show_recent_purchases: boolean;
    show_visitor_locations: boolean;
    show_last_stock_update: boolean;
  };
  ui_enhancements: {
    prevent_exit_popup: boolean;
    show_popularity_badge: boolean;
    popularity_badge_text?: string;
    enable_gift_wrapping: boolean;
  };
  referral_program: {
    enabled: boolean;
    commission_type?: string;
    commission_value?: number;
    cookie_duration_days?: number;
    buyer_discount_enabled: boolean;
    buyer_discount_percentage: number;
  };
}

export interface MarketingSettings {
  reviews: {
    enabled: boolean;
    verify_purchase: boolean;
    auto_approve: boolean;
    allow_images: boolean;
    enable_replies: boolean;
    display_style: string;
  };
  fake_engagement: {
    fake_star_ratings: {
      enabled: boolean;
      rating_value: number;
      rating_count: number;
    };
    fake_purchase_counter: {
      enabled: boolean;
      purchase_count: number;
    };
  };
  tracking_pixels: {
    facebook: {
      enabled: boolean;
      pixel_id?: string;
      conversion_api_enabled: boolean;
      advanced_matching: boolean;
    };
    tiktok: {
      enabled: boolean;
      pixel_id?: string;
      events_api_enabled: boolean;
    };
    snapchat: {
      enabled: boolean;
      pixel_id?: string;
    };
    google_ads: {
      enabled: boolean;
      conversion_id?: string;
      gtag_id?: string;
    };
  };
  offer_timer: {
    enabled: boolean;
    title?: string;
    type?: string;
    end_date?: string;
    duration_minutes?: number;
    display_style?: string;
  };
  loyalty_points: {
    enabled: boolean;
    name_singular?: string;
    name_plural?: string;
    points_per_currency_unit?: number;
  };
  test_mode: boolean;
}

export interface SpecialOffer {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  bonusQuantity?: number;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  freeShipping: boolean;
  isRecommended: boolean;
  isPopular: boolean;
  savings: number;
  pricePerUnit: number;
  features: string[];
  badgeText?: string;
  badgeColor: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

export interface SpecialOffersConfig {
  enabled: boolean;
  offers: SpecialOffer[];
  displayStyle: 'cards' | 'grid' | 'list';
  showSavings: boolean;
  showUnitPrice: boolean;
  currency: string;
}

export interface ProductStats {
  total_colors: number;
  total_sizes: number;
  total_images: number;
  total_wholesale_tiers: number;
  has_advanced_settings: boolean;
  has_marketing_settings: boolean;
  has_custom_form: boolean;
  last_updated: string;
}

export interface ResponseMeta {
  query_timestamp: string;
  data_freshness: string;
  performance_optimized: boolean;
  organization_id: string;
  form_strategy: 'custom_form_found' | 'default_form_used' | 'no_form_available';
}

export interface ErrorInfo {
  message: string;
  code: string;
  timestamp: string;
}

// الدالة الرئيسية لجلب بيانات المنتج الكاملة
export const getProductCompleteData = async (
  productIdentifier: string, // يمكن أن يكون ID أو slug
  options: {
    organizationId?: string;
    includeInactive?: boolean;
    dataScope?: DataScope;
  } = {}
): Promise<ProductCompleteResponse | null> => {
  try {
    // استخراج الساب-دومين لتمييز نسخة الدالة ذات 5 معاملات وتفادي PGRST203
    let orgSubdomain: string | null = null;
    try {
      const stored = localStorage.getItem('bazaar_current_subdomain');
      if (stored && stored !== 'www' && stored !== 'main') {
        orgSubdomain = stored;
      } else if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        const parts = host.split(':')[0].split('.');
        if (parts.length > 1 && parts[0] && parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] !== '127') {
          orgSubdomain = parts[0];
        }
      }
    } catch {}

    const { data, error } = await supabase.rpc('get_product_complete_data' as any, {
      p_product_identifier: productIdentifier, // تم تغيير الاسم
      p_organization_id: options.organizationId || null,
      p_include_inactive: options.includeInactive || false,
      p_data_scope: options.dataScope || 'full',
      p_org_subdomain: orgSubdomain
    });

    if (error) {
      throw error;
    }

    return data as ProductCompleteResponse;
  } catch (error) {
    return null;
  }
};

// دوال مساعدة لتحليل البيانات
export const getProductMainPrice = (product: CompleteProduct): number => {
  // إذا كان للمنتج متغيرات وأسعار مختلفة، أعد أقل سعر
  if (product.variants?.has_variants && product.variants.use_variant_prices && product.variants.colors && Array.isArray(product.variants.colors)) {
    const colorPrices = product.variants.colors
      .filter(color => color.price !== null && color.price !== undefined)
      .map(color => color.price!);
    
    if (colorPrices.length > 0) {
      return Math.min(...colorPrices);
    }

    // تحقق من أسعار المقاسات
    const sizePrices: number[] = [];
    product.variants.colors.forEach(color => {
      if (color.sizes && Array.isArray(color.sizes)) {
        color.sizes.forEach(size => {
          if (size.price !== null && size.price !== undefined) {
            sizePrices.push(size.price);
          }
        });
      }
    });

    if (sizePrices.length > 0) {
      return Math.min(...sizePrices);
    }
  }

  return product.pricing?.price || 0;
};

export const getProductMaxPrice = (product: CompleteProduct): number => {
  // إذا كان للمنتج متغيرات وأسعار مختلفة، أعد أعلى سعر
  if (product.variants.has_variants && product.variants.use_variant_prices) {
    const colorPrices = product.variants.colors
      .filter(color => color.price !== null && color.price !== undefined)
      .map(color => color.price!);
    
    if (colorPrices.length > 0) {
      return Math.max(...colorPrices);
    }

    // تحقق من أسعار المقاسات
    const sizePrices: number[] = [];
    product.variants.colors.forEach(color => {
      color.sizes.forEach(size => {
        if (size.price !== null && size.price !== undefined) {
          sizePrices.push(size.price);
        }
      });
    });

    if (sizePrices.length > 0) {
      return Math.max(...sizePrices);
    }
  }

  return product.pricing.price;
};

export const getTotalStock = (product: CompleteProduct): number => {
  if (product.variants?.has_variants && product.variants.colors && Array.isArray(product.variants.colors)) {
    if (product.variants.use_sizes) {
      // جمع كميات جميع المقاسات - لكن فقط إذا كانت المقاسات موجودة ومملوءة
      let totalWithSizes = 0;
      let hasAnySizes = false;

      for (const color of product.variants.colors) {
        if (color.sizes && Array.isArray(color.sizes) && color.sizes.length > 0) {
          // إذا كان لديه مقاسات، استخدم مجموع كميات المقاسات
          const sizesTotal = color.sizes.reduce((sizeTotal, size) => {
            return sizeTotal + (size.quantity || 0);
          }, 0);
          totalWithSizes += sizesTotal;
          hasAnySizes = true;
        } else {
          // إذا لم يكن لديه مقاسات، استخدم كمية اللون
          totalWithSizes += (color.quantity || 0);
        }
      }

      // إذا لم تكن هناك مقاسات فعلية، استخدم مجموع كميات الألوان
      if (!hasAnySizes) {
        totalWithSizes = product.variants.colors.reduce((total, color) => {
          return total + (color.quantity || 0);
        }, 0);
      }

      return totalWithSizes;
    } else {
      // جمع كميات الألوان فقط
      const totalColors = product.variants.colors.reduce((total, color) => {
        return total + (color.quantity || 0);
      }, 0);

      return totalColors;
    }
  }

  return product.inventory?.stock_quantity || 0;
};

export const getDefaultColor = (product: CompleteProduct): ProductColor | null => {
  if (!product.variants?.has_variants || !product.variants.colors || !Array.isArray(product.variants.colors)) return null;
  
  // أولاً: البحث عن اللون الافتراضي المتوفر في المخزون
  const defaultColorWithStock = product.variants.colors.find(color => 
    color.is_default && color.quantity > 0
  );
  if (defaultColorWithStock) return defaultColorWithStock;
  
  // ثانياً: البحث عن أول لون متوفر في المخزون
  const firstAvailableColor = product.variants.colors.find(color => color.quantity > 0);
  if (firstAvailableColor) return firstAvailableColor;
  
  // ثالثاً: البحث عن اللون الافتراضي (حتى لو لم يكن متوفر في المخزون)
  const defaultColor = product.variants.colors.find(color => color.is_default);
  if (defaultColor) return defaultColor;
  
  // رابعاً: إرجاع أول لون (حتى لو لم يكن متوفر في المخزون)
  return product.variants.colors[0] || null;
};

export const getDefaultSize = (color: ProductColor): ProductSize | null => {
  if (!color.sizes || color.sizes.length === 0) return null;
  
  // أولاً: البحث عن المقاس الافتراضي المتوفر في المخزون
  const defaultSizeWithStock = color.sizes.find(size => 
    size.is_default && size.quantity > 0
  );
  if (defaultSizeWithStock) return defaultSizeWithStock;
  
  // ثانياً: البحث عن أول مقاس متوفر في المخزون
  const firstAvailableSize = color.sizes.find(size => size.quantity > 0);
  if (firstAvailableSize) return firstAvailableSize;
  
  // ثالثاً: البحث عن المقاس الافتراضي (حتى لو لم يكن متوفر في المخزون)
  const defaultSize = color.sizes.find(size => size.is_default);
  if (defaultSize) return defaultSize;
  
  // رابعاً: إرجاع أول مقاس (حتى لو لم يكن متوفر في المخزون)
  return color.sizes[0] || null;
};

export const getVariantPrice = (
  product: CompleteProduct, 
  colorId?: string, 
  sizeId?: string
): number => {
  if (!product.variants.use_variant_prices) {
    return product.pricing.price;
  }

  if (colorId) {
    const color = product.variants.colors.find(c => c.id === colorId);
    if (color) {
      if (sizeId && color.sizes && color.sizes.length > 0) {
        const size = color.sizes.find(s => s.id === sizeId);
        if (size && size.price !== null && size.price !== undefined) {
          return size.price;
        }
      }
      
      if (color.price !== null && color.price !== undefined) {
        return color.price;
      }
    }
  }

  return product.pricing.price;
};

export const getVariantStock = (
  product: CompleteProduct,
  colorId?: string,
  sizeId?: string
): number => {
  if (!product.variants?.has_variants || !product.variants.colors || !Array.isArray(product.variants.colors)) {
    return product.inventory?.stock_quantity || 0;
  }

  if (colorId) {
    const color = product.variants.colors.find(c => c.id === colorId);
    if (color) {
      // إذا كان المنتج يستخدم المقاسات وتم تحديد مقاس
      if (sizeId && color.sizes && Array.isArray(color.sizes) && color.sizes.length > 0) {
        const size = color.sizes.find(s => s.id === sizeId);
        return size ? (size.quantity || 0) : 0;
      }

      // إذا كان المنتج يستخدم المقاسات لكن لم يتم تحديد مقاس، أو إذا لم تكن هناك مقاسات فعلية
      if (product.variants?.use_sizes && color.sizes && Array.isArray(color.sizes) && color.sizes.length > 0) {
        // جمع جميع مقاسات اللون
        const colorTotalStock = color.sizes.reduce((total, size) => {
          return total + (size.quantity || 0);
        }, 0);
        return colorTotalStock;
      }

      // استخدام كمية اللون مباشرة
      return color.quantity || 0;
    } else {
      return 0;
    }
  }

  return getTotalStock(product);
};

export const isProductAvailable = (product: CompleteProduct): boolean => {
  if (!product.status.is_active) {
    return false;
  }

  const totalStock = getTotalStock(product);
  return totalStock > 0;
};

export const getWholesalePrice = (
  product: CompleteProduct, 
  quantity: number
): number | null => {
  if (!product.selling_options.allow_wholesale || product.wholesale_tiers.length === 0) {
    return null;
  }

  // العثور على أفضل مستوى جملة للكمية المطلوبة
  const applicableTiers = product.wholesale_tiers.filter(tier => quantity >= tier.min_quantity);
  
  if (applicableTiers.length === 0) return null;

  // أعد أفضل سعر (الأقل)
  const bestTier = applicableTiers.reduce((best, current) => 
    current.price < best.price ? current : best
  );

  return bestTier.price;
};

// دالة للحصول على السعر النهائي للمنتج حسب الكمية والمتغيرات
export const getFinalPrice = (
  product: CompleteProduct,
  quantity: number = 1,
  colorId?: string,
  sizeId?: string
): {
  price: number;
  originalPrice: number;
  compareAtPrice?: number;
  isWholesale: boolean;
  wholesaleTier?: WholesaleTier;
  discount?: number;
  discountPercentage?: number;
  hasCompareAtPrice: boolean;
  compareAtDiscountPercentage?: number;
} => {
  const basePrice = getVariantPrice(product, colorId, sizeId);
  const wholesalePrice = getWholesalePrice(product, quantity);
  
  let finalPrice = basePrice;
  let isWholesale = false;
  let wholesaleTier: WholesaleTier | undefined;

  // تحقق من أسعار الجملة
  if (wholesalePrice !== null) {
    finalPrice = wholesalePrice;
    isWholesale = true;
    wholesaleTier = product.wholesale_tiers.find(tier => quantity >= tier.min_quantity);
  }

  const totalPrice = finalPrice * quantity;
  const originalTotalPrice = basePrice * quantity;
  
  // حساب الخصم
  const discount = originalTotalPrice - totalPrice;
  const discountPercentage = originalTotalPrice > 0 ? (discount / originalTotalPrice) * 100 : 0;

  // معالجة السعر المقارن
  const compareAtPrice = product.pricing?.compare_at_price;
  const hasCompareAtPrice = Boolean(compareAtPrice && compareAtPrice > basePrice);
  const compareAtDiscountPercentage = hasCompareAtPrice && compareAtPrice 
    ? ((compareAtPrice - basePrice) / compareAtPrice) * 100 
    : undefined;

  return {
    price: totalPrice,
    originalPrice: originalTotalPrice,
    compareAtPrice: compareAtPrice ? compareAtPrice * quantity : undefined,
    isWholesale,
    wholesaleTier,
    discount: discount > 0 ? discount : undefined,
    discountPercentage: discountPercentage > 0 ? discountPercentage : undefined,
    hasCompareAtPrice,
    compareAtDiscountPercentage
  };
};

// دوال العروض الخاصة الجديدة
export const getBestSpecialOffer = (
  product: CompleteProduct,
  requestedQuantity: number
): SpecialOffer | null => {

  if (!product.special_offers_config?.enabled || !product.special_offers_config.offers) {
    return null;
  }

  // العثور على العروض المتاحة للكمية المطلوبة
  const availableOffers = product.special_offers_config.offers.filter(
    offer => requestedQuantity >= offer.quantity
  );

  if (availableOffers.length === 0) {
    return null;
  }

  // اختيار العرض بأفضل قيمة (أعلى توفير نسبي)
  const bestOffer = availableOffers.reduce((best, current) => {
    const bestSavingsPerUnit = best.savings / (best.quantity + (best.bonusQuantity || 0));
    const currentSavingsPerUnit = current.savings / (current.quantity + (current.bonusQuantity || 0));
    
    return currentSavingsPerUnit > bestSavingsPerUnit ? current : best;
  });

  return bestOffer;
};

export const calculateSpecialOfferPrice = (
  product: CompleteProduct,
  offer: SpecialOffer,
  requestedQuantity: number
): {
  totalPrice: number;
  totalQuantity: number;
  pricePerUnit: number;
  savings: number;
  originalPrice: number;
} => {
  const basePrice = getVariantPrice(product);
  const sets = Math.floor(requestedQuantity / offer.quantity);
  const remainder = requestedQuantity % offer.quantity;

  let totalPrice: number;
  let totalQuantity: number;
  let savings: number;

  if (requestedQuantity >= offer.quantity) {
    // الطريقة العادية: المجموعات الكاملة + الباقي
    const totalOfferPrice = sets * offer.discountedPrice;
    const remainderPrice = remainder * basePrice;
    
    totalPrice = totalOfferPrice + remainderPrice;
    totalQuantity = requestedQuantity + (sets * (offer.bonusQuantity || 0));
  } else {
    // العرض غير مُطبق: استخدام السعر العادي
    totalPrice = requestedQuantity * basePrice;
    totalQuantity = requestedQuantity;
  }

  const originalPrice = requestedQuantity * basePrice;
  savings = originalPrice - totalPrice;

  return {
    totalPrice,
    totalQuantity,
    pricePerUnit: totalPrice / totalQuantity,
    savings: Math.max(0, savings),
    originalPrice
  };
};

export const getSpecialOfferSummary = (
  product: CompleteProduct,
  selectedOffer: SpecialOffer | null,
  requestedQuantity: number
): {
  finalPrice: number;
  finalQuantity: number;
  savings: number;
  originalPrice: number;
  offerApplied: boolean;
  offerDetails?: {
    name: string;
    freeShipping: boolean;
    features: string[];
  };
} => {
  const basePrice = getVariantPrice(product);
  const originalPrice = requestedQuantity * basePrice;

  if (!selectedOffer) {
    return {
      finalPrice: originalPrice,
      finalQuantity: requestedQuantity,
      savings: 0,
      originalPrice,
      offerApplied: false
    };
  }

  const calculation = calculateSpecialOfferPrice(product, selectedOffer, requestedQuantity);

  return {
    finalPrice: calculation.totalPrice,
    finalQuantity: calculation.totalQuantity,
    savings: calculation.savings,
    originalPrice: calculation.originalPrice,
    offerApplied: true,
    offerDetails: {
      name: selectedOffer.name,
      freeShipping: selectedOffer.freeShipping,
      features: selectedOffer.features
    }
  };
};

// دالة تنظيف الـ cache
export const clearProductCache = (productId?: string) => {
  if (typeof window !== 'undefined' && window.productCache) {
    if (productId) {
      // مسح منتج محدد
      const keysToDelete = Array.from(window.productCache.keys()).filter(key => 
        key.startsWith(`${productId}-`)
      );
      keysToDelete.forEach(key => window.productCache.delete(key));
    } else {
      // مسح جميع المنتجات
      window.productCache.clear();
    }
  }
};

// دالة تنظيف cache المنتجات المنتهية الصلاحية
export const cleanExpiredProductCache = () => {
  if (typeof window !== 'undefined' && window.productCache) {
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
    
    for (const [key, value] of window.productCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        window.productCache.delete(key);
      }
    }
    
  }
};

// إضافة cache إلى window للوصول العالمي
declare global {
  interface Window {
    productCache: Map<string, {
      data: CompleteProduct;
      timestamp: number;
      organizationId?: string;
    }>;
  }
}

// تهيئة الـ cache
if (typeof window !== 'undefined' && !window.productCache) {
  window.productCache = new Map();
  
  // تنظيف دوري كل 10 دقائق
  setInterval(cleanExpiredProductCache, 10 * 60 * 1000);
}

export default {
  getProductCompleteData,
  getProductMainPrice,
  getProductMaxPrice,
  getTotalStock,
  getDefaultColor,
  getDefaultSize,
  getVariantPrice,
  getVariantStock,
  isProductAvailable,
  getWholesalePrice,
  getFinalPrice,
  getBestSpecialOffer,
  calculateSpecialOfferPrice,
  getSpecialOfferSummary
};
