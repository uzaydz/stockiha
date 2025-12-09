import { ProductFormValues, ProductColor, WholesaleTier } from '@/types/product';

/**
 * Cleans and validates product color data
 */
export const cleanProductColorData = (color: ProductColor): any => {
  const cleanedColor: any = {
    id: color.id,
    name: color.name?.trim() || '',
    color_code: color.color_code || '#000000',
    image_url: color.image_url === null || color.image_url === undefined ? undefined : String(color.image_url),
    quantity: Number(color.quantity) || 0,
    is_default: Boolean(color.is_default),
    product_id: color.product_id,
    has_sizes: Boolean(color.has_sizes),
  };

  // Add optional fields only if they have valid values
  if (color.price !== undefined && color.price !== null) {
    cleanedColor.price = Number(color.price);
  }
  if (color.purchase_price !== undefined && color.purchase_price !== null) {
    cleanedColor.purchase_price = Number(color.purchase_price);
  }
  if (color.barcode && typeof color.barcode === 'string' && color.barcode.trim() && color.barcode !== 'null') {
    cleanedColor.barcode = color.barcode.trim();
  }
  if (color.variant_number !== undefined && color.variant_number !== null) {
    cleanedColor.variant_number = Number(color.variant_number);
  }

  // Handle sizes if they exist
  if (color.sizes && color.sizes.length > 0) {
    cleanedColor.sizes = color.sizes.map(size => {
      const cleanedSize: any = {
        id: size.id,
        color_id: size.color_id,
        product_id: size.product_id,
        size_name: size.size_name?.trim() || '',
        quantity: Number(size.quantity) || 0,
        is_default: Boolean(size.is_default),
      };

      // Clean optional size fields
      if (size.price !== undefined && size.price !== null) {
        cleanedSize.price = Number(size.price);
      }
      if (size.purchase_price !== undefined && size.purchase_price !== null) {
        cleanedSize.purchase_price = Number(size.purchase_price);
      }
      if (size.barcode && typeof size.barcode === 'string' && size.barcode.trim() && size.barcode !== 'null') {
        cleanedSize.barcode = size.barcode.trim();
      }

      return cleanedSize;
    });
    
    // ✅ إضافة تسجيل للتأكد من وجود المقاسات
    console.log(`📏 تم تنظيف ${cleanedColor.sizes.length} مقاس للون: ${color.name}`);
  }
  
  return cleanedColor;
};

/**
 * Cleans and validates wholesale tier data
 */
export const cleanWholesaleTierData = (tier: WholesaleTier): any => ({
  ...tier,
  min_quantity: Number(tier.min_quantity),
  price_per_unit: Number(tier.price_per_unit),
});

/**
 * Validates product colors before submission
 */
export const validateProductColors = (colors: ProductColor[], hasVariants: boolean): { isValid: boolean; errors: string[] } => {
  if (!hasVariants || colors.length === 0) {
    return { isValid: true, errors: [] };
  }

  const errors: string[] = [];
  
  colors.forEach((color, index) => {
    if (!color.name?.trim()) {
      errors.push(`اللون ${index + 1}: اسم اللون مطلوب`);
    }
    if (!color.color_code) {
      errors.push(`اللون ${index + 1}: كود اللون مطلوب`);
    }
    if (color.quantity === undefined || color.quantity < 0) {
      errors.push(`اللون ${index + 1}: الكمية يجب أن تكون صحيحة`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Prepares form data for submission
 */
export const prepareFormSubmissionData = (
  data: ProductFormValues,
  organizationId: string,
  additionalImages: string[],
  productColors: ProductColor[],
  wholesaleTiers: WholesaleTier[]
): any => {
  console.log('='.repeat(80));
  console.log('[prepareFormSubmissionData] 📋 PREPARE STARTED');
  console.log('='.repeat(80));

  // 🔍 DEBUG: فحص البيانات الواردة
  console.log('[prepareFormSubmissionData] 📥 Input Parameters:', {
    dataName: data.name,
    organizationId: organizationId,
    additionalImagesCount: additionalImages?.length || 0,
    productColorsCount: productColors?.length || 0,
    wholesaleTiersCount: wholesaleTiers?.length || 0,
  });

  // 🔍 DEBUG: أنواع البيع المتقدمة من النموذج
  console.log('[prepareFormSubmissionData] 📦 Advanced Selling Types from form:', {
    sell_by_weight: data.sell_by_weight,
    weight_unit: data.weight_unit,
    price_per_weight_unit: data.price_per_weight_unit,
    sell_by_box: data.sell_by_box,
    units_per_box: data.units_per_box,
    box_price: data.box_price,
    sell_by_meter: data.sell_by_meter,
    price_per_meter: data.price_per_meter,
  });

  // 🔍 DEBUG: التتبع المتقدم
  console.log('[prepareFormSubmissionData] 🔍 Tracking Features from form:', {
    track_expiry: data.track_expiry,
    default_expiry_days: data.default_expiry_days,
    track_serial_numbers: data.track_serial_numbers,
    track_batches: data.track_batches,
    has_warranty: data.has_warranty,
    warranty_duration_months: data.warranty_duration_months,
  });

  // ✅ التحقق من صحة organization_id
  if (!organizationId || organizationId === 'undefined' || organizationId === 'null' || organizationId.trim() === '') {
    throw new Error('معرف المؤسسة مطلوب وصيغته غير صحيحة');
  }

  // ✅ التحقق من صحة UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(organizationId)) {
    throw new Error('معرف المؤسسة يجب أن يكون بصيغة UUID صحيحة');
  }

  const imagesToSubmit = additionalImages.filter(url => typeof url === 'string' && url.length > 0);
  const colorsToSubmit = productColors.map(cleanProductColorData);
  const wholesaleTiersToSubmit = wholesaleTiers.map(cleanWholesaleTierData);

  // Debug: فحص الصور قبل الإرسال

  // Debug: فحص بيانات slug

  const finalSlug = data.slug && data.slug.trim() !== '' 
    ? data.slug.trim() 
    : `${data.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

  // 🔍 DEBUG: فحص البيانات قبل التحضير النهائي
  console.log('[prepareFormSubmissionData] 🔍 DEBUG - Input data.thumbnail_image:', data.thumbnail_image ? `exists (${Math.round(String(data.thumbnail_image).length/1024)}KB, starts with: ${String(data.thumbnail_image).substring(0,50)}...)` : 'NOT EXISTS or empty');
  console.log('[prepareFormSubmissionData] 🔍 DEBUG - additionalImages count:', additionalImages?.length || 0);

  // Debug: فحص البيانات النهائية
  console.log('🔍 تحضير بيانات المنتج:', {
    colorsCount: colorsToSubmit.length,
    colorsWithSizes: colorsToSubmit.filter(c => c.sizes && c.sizes.length > 0).length,
    totalSizes: colorsToSubmit.reduce((sum, c) => sum + (c.sizes?.length || 0), 0)
  });

  const finalData = {
    ...data,
    organization_id: organizationId, // ✅ استخدام organizationId المُتحقق منه
    // إزالة حقل images المكرر واستخدام additional_images فقط
    colors: colorsToSubmit,
    wholesale_tiers: wholesaleTiersToSubmit,
    price: Number(data.price),
    purchase_price: Number(data.purchase_price),
    stock_quantity: Number(data.stock_quantity),
    is_digital: data.is_digital || false,
    is_featured: data.is_featured || false,
    is_new: data.is_new === undefined ? true : data.is_new,
    has_variants: data.has_variants || false,
    show_price_on_landing: data.show_price_on_landing === undefined ? true : data.show_price_on_landing,
    allow_retail: data.allow_retail === undefined ? true : data.allow_retail,
    allow_wholesale: data.allow_wholesale || false,
    allow_partial_wholesale: data.allow_partial_wholesale || false,
    use_sizes: data.use_sizes || false,
    use_shipping_clone: data.use_shipping_clone || false,
    compare_at_price: data.compare_at_price ? Number(data.compare_at_price) : null,
    wholesale_price: data.wholesale_price ? Number(data.wholesale_price) : null,
    partial_wholesale_price: data.partial_wholesale_price ? Number(data.partial_wholesale_price) : null,
    min_wholesale_quantity: data.min_wholesale_quantity ? Number(data.min_wholesale_quantity) : null,
    min_partial_wholesale_quantity: data.min_partial_wholesale_quantity ? Number(data.min_partial_wholesale_quantity) : null,
    subcategory_id: data.subcategory_id || null,
    brand: data.brand || null,
    barcode: data.barcode || null,
    name_for_shipping: data.name_for_shipping || null,
    unit_type: data.unit_type || null,
    unit_purchase_price: data.unit_purchase_price ? Number(data.unit_purchase_price) : null,
    unit_sale_price: data.unit_sale_price ? Number(data.unit_sale_price) : null,
    form_template_id: data.form_template_id || null,
    shipping_provider_id: data.shipping_provider_id || null,
    shipping_clone_id: data.shipping_clone_id || null,
    features: data.features || [],
    specifications: data.specifications || {},
    slug: finalSlug,
    advancedSettings: data.advancedSettings || undefined,
    marketingSettings: data.marketingSettings || undefined,
    special_offers_config: data.special_offers_config || undefined,
    advanced_description: data.advanced_description || null,
    // الصور الإضافية تذهب لحقل additional_images
    additional_images: imagesToSubmit,

    // ========================================
    // 📦 أنواع البيع المتقدمة
    // ========================================

    // البيع بالوزن
    sell_by_weight: data.sell_by_weight || false,
    weight_unit: data.weight_unit || 'kg',
    price_per_weight_unit: data.price_per_weight_unit ? Number(data.price_per_weight_unit) : null,
    purchase_price_per_weight_unit: data.purchase_price_per_weight_unit ? Number(data.purchase_price_per_weight_unit) : null,
    min_weight: data.min_weight ? Number(data.min_weight) : null,
    max_weight: data.max_weight ? Number(data.max_weight) : null,
    average_item_weight: data.average_item_weight ? Number(data.average_item_weight) : null,
    // ⚡ مخزون الوزن
    available_weight: data.available_weight ? Number(data.available_weight) : null,
    total_weight_purchased: data.total_weight_purchased ? Number(data.total_weight_purchased) : null,

    // البيع بالكرتون/العلبة
    sell_by_box: data.sell_by_box || false,
    units_per_box: data.units_per_box ? Number(data.units_per_box) : null,
    box_price: data.box_price ? Number(data.box_price) : null,
    box_purchase_price: data.box_purchase_price ? Number(data.box_purchase_price) : null,
    box_barcode: data.box_barcode || null,
    allow_single_unit_sale: data.allow_single_unit_sale !== false,
    // ⚡ مخزون الصناديق
    available_boxes: data.available_boxes ? Number(data.available_boxes) : null,
    total_boxes_purchased: data.total_boxes_purchased ? Number(data.total_boxes_purchased) : null,

    // البيع بالمتر
    sell_by_meter: data.sell_by_meter || false,
    meter_unit: data.meter_unit || 'm',
    price_per_meter: data.price_per_meter ? Number(data.price_per_meter) : null,
    purchase_price_per_meter: data.purchase_price_per_meter ? Number(data.purchase_price_per_meter) : null,
    min_meters: data.min_meters ? Number(data.min_meters) : null,
    roll_length: data.roll_length ? Number(data.roll_length) : null,
    // ⚡ مخزون الأمتار
    available_length: data.available_length ? Number(data.available_length) : null,
    total_meters_purchased: data.total_meters_purchased ? Number(data.total_meters_purchased) : null,

    // ========================================
    // 🔍 التتبع المتقدم
    // ========================================

    // تتبع الصلاحية
    track_expiry: data.track_expiry || false,
    default_expiry_days: data.default_expiry_days ? Number(data.default_expiry_days) : null,
    alert_days_before_expiry: data.alert_days_before ? Number(data.alert_days_before) : null,

    // تتبع الأرقام التسلسلية
    track_serial_numbers: data.track_serial_numbers || false,
    require_serial_on_sale: data.require_serial_on_sale || false,
    supports_imei: data.supports_imei || false,

    // تتبع الدفعات
    track_batches: data.track_batches || false,
    use_fifo: data.use_fifo !== false,

    // ========================================
    // 🛡️ الضمان
    // ========================================
    has_warranty: data.has_warranty || false,
    warranty_duration_months: data.warranty_duration_months ? Number(data.warranty_duration_months) : null,
    warranty_type: data.warranty_type && ['manufacturer', 'store', 'extended'].includes(data.warranty_type) ? data.warranty_type : undefined,

    // ========================================
    // 💰 مستويات الأسعار
    // ========================================
    price_tiers: data.price_tiers || [],

    // تحويل وضع النشر من الواجهة إلى حقول قاعدة البيانات
    ...(data.publication_mode === 'publish_now' ? {
      publication_status: 'published',
      publish_at: null,
    } : data.publication_mode === 'draft' ? {
      publication_status: 'draft',
      publish_at: null,
    } : data.publication_mode === 'scheduled' ? {
      publication_status: 'scheduled',
      publish_at: data.publish_at || null,
    } : {}),
  };

  // 🔍 DEBUG: فحص الإعدادات المتقدمة
  console.log('[prepareFormSubmissionData] 📦 Advanced Settings:', {
    sell_by_weight: finalData.sell_by_weight,
    sell_by_box: finalData.sell_by_box,
    sell_by_meter: finalData.sell_by_meter,
    track_expiry: finalData.track_expiry,
    track_serial_numbers: finalData.track_serial_numbers,
    track_batches: finalData.track_batches,
    has_warranty: finalData.has_warranty,
    price_tiers_count: finalData.price_tiers?.length || 0
  });

  // 🔍 DEBUG: فحص البيانات النهائية
  console.log('[prepareFormSubmissionData] 🔍 DEBUG - finalData.thumbnail_image:', finalData.thumbnail_image ? `exists (${Math.round(String(finalData.thumbnail_image).length/1024)}KB)` : 'NOT EXISTS or empty');

  return finalData;
};

/**
 * Generates a unique slug for the product
 */
export const generateProductSlug = (name: string, existingSlug?: string): string => {
  if (existingSlug) return existingSlug;
  
  const baseSlug = name.toLowerCase()
    .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  return `${baseSlug}-${Date.now()}`;
};

/**
 * Formats price for display
 */
export const formatPrice = (price: number | string | undefined): string => {
  if (price === undefined || price === null) return '0.00';
  const numPrice = Number(price);
  if (isNaN(numPrice)) return '0.00';
  return numPrice.toFixed(2);
};

/**
 * Checks if a value is empty or null
 */
export const isEmptyValue = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'number') return isNaN(value);
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};
