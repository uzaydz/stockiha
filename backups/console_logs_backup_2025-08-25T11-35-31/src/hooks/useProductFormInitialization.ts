import { useEffect, useCallback, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getProductById, Product } from '@/lib/api/products'; // Using Product from API
import { getProductColors } from '@/lib/api/productVariants'; // إضافة import لجلب الألوان
import { z } from 'zod'; // Added import for z
import { ProductFormValues, ProductColor, WholesaleTier, productAdvancedSettingsSchema, ProductWithVariants } from '@/types/product';

// Defined ProductAdvancedSettings locally using z.infer
type ProductAdvancedSettings = z.infer<typeof productAdvancedSettingsSchema>;

interface UseProductFormInitializationProps {
  id?: string;
  form: UseFormReturn<ProductFormValues>;
  organizationId?: string;
  setAdditionalImages: React.Dispatch<React.SetStateAction<string[]>>;
  setProductColors: React.Dispatch<React.SetStateAction<ProductColor[]>>;
  setWholesaleTiers: React.Dispatch<React.SetStateAction<WholesaleTier[]>>;
  setUseVariantPrices: React.Dispatch<React.SetStateAction<boolean>>;
  setUseSizes: React.Dispatch<React.SetStateAction<boolean>>;
  setHasVariantsState: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useProductFormInitialization = ({
  id,
  form,
  organizationId,
  setAdditionalImages,
  setProductColors,
  setWholesaleTiers,
  setUseVariantPrices,
  setUseSizes,
  setHasVariantsState,
}: UseProductFormInitializationProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [productNameForTitle, setProductNameForTitle] = useState<string>('');
  const [initialDataSet, setInitialDataSet] = useState(false);
  const isEditMode = !!id;
  const navigate = useNavigate();

  // Debug logging moved to useEffect to prevent running on every render
  useEffect(() => {
    console.log('🔍 [useProductFormInitialization] Hook initialized:');
    console.log('🔍 [useProductFormInitialization] id:', id);
    console.log('🔍 [useProductFormInitialization] isEditMode:', isEditMode);
    console.log('🔍 [useProductFormInitialization] organizationId:', organizationId);
  }, [id, isEditMode, organizationId]);

  const resetData = useCallback((productData: Product | null) => {
    console.log('🔍 [useProductFormInitialization] resetData called');
    console.log('🔍 [useProductFormInitialization] productData:', productData);

    const defaultAdvancedSettings: ProductAdvancedSettings = productAdvancedSettingsSchema.parse({});

    let categoryIdValue = '';
    if (productData?.category_id) {
      categoryIdValue = productData.category_id;
    }

    let subcategoryIdValue: string | undefined;
    if (productData?.subcategory_id) {
      subcategoryIdValue = productData.subcategory_id;
    }
      
    // Safely access potentially missing fields from Product for ProductFormValues
    const formAdvancedSettings = productData?.product_advanced_settings 
        ? { ...defaultAdvancedSettings, ...productData.product_advanced_settings }
        : defaultAdvancedSettings;

    const formFeatures = (productData as any)?.features || []; // features not strongly typed in Product
    const formSpecifications = (productData as any)?.specifications || {}; // specifications not strongly typed in Product
    const formWholesaleTiers = (productData as any)?.wholesale_tiers || []; // wholesale_tiers not strongly typed in Product
    const formUseVariantPrices = (productData as any)?.use_variant_prices || false; // use_variant_prices not strongly typed in Product

    const defaultValuesForForm: ProductFormValues = {
      id: productData?.id || '',
      organization_id: productData?.organization_id || organizationId || undefined,
      name: productData?.name || '',
      description: productData?.description || '',
      price: productData?.price ?? 0,
      purchase_price: productData?.purchase_price ?? 0,
      sku: productData?.sku || '',
      category_id: categoryIdValue,
      stock_quantity: productData?.stock_quantity ?? 0,
      thumbnail_image: productData?.thumbnail_image || '',
      has_variants: productData?.has_variants || false,
      show_price_on_landing: productData?.show_price_on_landing ?? true,
      is_featured: productData?.is_featured || false,
      is_new: productData?.is_new ?? true,
      allow_retail: productData?.allow_retail ?? true,
      allow_wholesale: productData?.allow_wholesale || false,
      allow_partial_wholesale: productData?.allow_partial_wholesale || false,
      use_sizes: productData?.use_sizes || false,
      use_shipping_clone: productData?.use_shipping_clone || false,
      compare_at_price: productData?.compare_at_price ?? undefined,
      wholesale_price: productData?.wholesale_price ?? undefined,
      partial_wholesale_price: productData?.partial_wholesale_price ?? undefined,
      min_wholesale_quantity: productData?.min_wholesale_quantity ?? undefined,
      min_partial_wholesale_quantity: productData?.min_partial_wholesale_quantity ?? undefined,
      subcategory_id: subcategoryIdValue,
      brand: productData?.brand || '',
      barcode: productData?.barcode || '',
      name_for_shipping: productData?.name_for_shipping || '',
      unit_type: productData?.unit_type || '',
      unit_purchase_price: productData?.unit_purchase_price ?? undefined,
      unit_sale_price: productData?.unit_sale_price ?? undefined,
      form_template_id: productData?.form_template_id || null,
      shipping_provider_id: productData?.shipping_provider_id || null,
      shipping_method_type: (productData as any)?.shipping_method_type || 'default',
      shipping_clone_id: productData?.shipping_clone_id || null,
      features: formFeatures,
      specifications: formSpecifications,
      slug: productData?.slug || '',
      is_digital: productData?.is_digital || false,
      created_by_user_id: productData?.created_by_user_id || undefined,
      updated_by_user_id: productData?.updated_by_user_id || undefined,
      additional_images: productData?.additional_images || [],
      colors: productData?.colors || [],
      wholesale_tiers: formWholesaleTiers,
      use_variant_prices: formUseVariantPrices,
      is_sold_by_unit: productData?.is_sold_by_unit ?? true,
      advancedSettings: formAdvancedSettings as ProductAdvancedSettings,
      special_offers_config: (productData as any)?.special_offers_config || undefined,
      advanced_description: (productData as any)?.advanced_description || null,
      marketingSettings: productData?.product_marketing_settings ? {
        // Review Settings
        enable_reviews: productData.product_marketing_settings.enable_reviews ?? true,
        reviews_verify_purchase: productData.product_marketing_settings.reviews_verify_purchase ?? false,
        reviews_auto_approve: productData.product_marketing_settings.reviews_auto_approve ?? true,
        allow_images_in_reviews: productData.product_marketing_settings.allow_images_in_reviews ?? true,
        enable_review_replies: productData.product_marketing_settings.enable_review_replies ?? true,
        review_display_style: productData.product_marketing_settings.review_display_style ?? 'stars_summary',

        // Fake Engagement Settings
        enable_fake_star_ratings: productData.product_marketing_settings.enable_fake_star_ratings ?? false,
        fake_star_rating_value: productData.product_marketing_settings.fake_star_rating_value ?? 4.5,
        fake_star_rating_count: productData.product_marketing_settings.fake_star_rating_count ?? 100,
        enable_fake_purchase_counter: productData.product_marketing_settings.enable_fake_purchase_counter ?? false,
        fake_purchase_count: productData.product_marketing_settings.fake_purchase_count ?? 50,

        // Facebook Pixel Settings
        enable_facebook_pixel: productData.product_marketing_settings.enable_facebook_pixel ?? false,
        facebook_pixel_id: productData.product_marketing_settings.facebook_pixel_id,
        facebook_standard_events: (productData.product_marketing_settings.facebook_standard_events as Record<string, boolean>) || {},
        facebook_advanced_matching_enabled: productData.product_marketing_settings.facebook_advanced_matching_enabled ?? false,
        facebook_conversations_api_enabled: productData.product_marketing_settings.facebook_conversations_api_enabled ?? false,
        enable_facebook_conversion_api: productData.product_marketing_settings.enable_facebook_conversion_api ?? false,
        facebook_access_token: productData.product_marketing_settings.facebook_access_token,
        facebook_test_event_code: productData.product_marketing_settings.facebook_test_event_code,
        facebook_dataset_id: productData.product_marketing_settings.facebook_dataset_id,

        // TikTok Pixel Settings
        enable_tiktok_pixel: productData.product_marketing_settings.enable_tiktok_pixel ?? false,
        tiktok_pixel_id: productData.product_marketing_settings.tiktok_pixel_id,
        tiktok_standard_events: (productData.product_marketing_settings.tiktok_standard_events as Record<string, boolean>) || {},
        tiktok_advanced_matching_enabled: productData.product_marketing_settings.tiktok_advanced_matching_enabled ?? false,
        tiktok_events_api_enabled: productData.product_marketing_settings.tiktok_events_api_enabled ?? false,
        tiktok_access_token: productData.product_marketing_settings.tiktok_access_token,
        tiktok_test_event_code: productData.product_marketing_settings.tiktok_test_event_code,

        // Snapchat Pixel Settings
        enable_snapchat_pixel: productData.product_marketing_settings.enable_snapchat_pixel ?? false,
        snapchat_pixel_id: productData.product_marketing_settings.snapchat_pixel_id,
        snapchat_standard_events: (productData.product_marketing_settings.snapchat_standard_events as Record<string, boolean>) || {},
        snapchat_advanced_matching_enabled: productData.product_marketing_settings.snapchat_advanced_matching_enabled ?? false,
        snapchat_events_api_enabled: productData.product_marketing_settings.snapchat_events_api_enabled ?? false,
        snapchat_api_token: productData.product_marketing_settings.snapchat_api_token,
        snapchat_test_event_code: productData.product_marketing_settings.snapchat_test_event_code,

        // Google Ads Tracking Settings
        enable_google_ads_tracking: productData.product_marketing_settings.enable_google_ads_tracking ?? false,
        google_ads_conversion_id: productData.product_marketing_settings.google_ads_conversion_id,
        google_ads_conversion_label: productData.product_marketing_settings.google_ads_conversion_label,
        google_gtag_id: productData.product_marketing_settings.google_gtag_id,
        google_ads_global_site_tag_enabled: productData.product_marketing_settings.google_ads_global_site_tag_enabled ?? false,
        google_ads_event_snippets: (productData.product_marketing_settings.google_ads_event_snippets as Record<string, string>) || {},
        google_ads_phone_conversion_number: productData.product_marketing_settings.google_ads_phone_conversion_number,
        google_ads_phone_conversion_label: productData.product_marketing_settings.google_ads_phone_conversion_label,
        google_ads_enhanced_conversions_enabled: productData.product_marketing_settings.google_ads_enhanced_conversions_enabled ?? false,

        // Offer Timer Settings
        offer_timer_enabled: productData.product_marketing_settings.offer_timer_enabled ?? false,
        offer_timer_title: productData.product_marketing_settings.offer_timer_title,
        offer_timer_type: (productData.product_marketing_settings.offer_timer_type as 'specific_date' | 'evergreen' | 'fixed_duration_per_visitor') || null,
        offer_timer_end_date: productData.product_marketing_settings.offer_timer_end_date,
        offer_timer_duration_minutes: productData.product_marketing_settings.offer_timer_duration_minutes,
        offer_timer_display_style: productData.product_marketing_settings.offer_timer_display_style,
        offer_timer_text_above: productData.product_marketing_settings.offer_timer_text_above,
        offer_timer_text_below: productData.product_marketing_settings.offer_timer_text_below,
        offer_timer_end_action: (productData.product_marketing_settings.offer_timer_end_action as 'hide_timer' | 'show_message' | 'redirect_to_url') || null,
        offer_timer_end_action_url: productData.product_marketing_settings.offer_timer_end_action_url,
        offer_timer_end_action_message: productData.product_marketing_settings.offer_timer_end_action_message,
        offer_timer_restart_for_new_session: productData.product_marketing_settings.offer_timer_restart_for_new_session ?? false,
        offer_timer_cookie_duration_days: productData.product_marketing_settings.offer_timer_cookie_duration_days,
        offer_timer_show_on_specific_pages_only: productData.product_marketing_settings.offer_timer_show_on_specific_pages_only ?? false,
        offer_timer_specific_page_urls: productData.product_marketing_settings.offer_timer_specific_page_urls || [],

        // Loyalty Points Settings
        loyalty_points_enabled: productData.product_marketing_settings.loyalty_points_enabled ?? false,
        loyalty_points_name_singular: productData.product_marketing_settings.loyalty_points_name_singular,
        loyalty_points_name_plural: productData.product_marketing_settings.loyalty_points_name_plural,
        points_per_currency_unit: productData.product_marketing_settings.points_per_currency_unit,
        min_purchase_to_earn_points: productData.product_marketing_settings.min_purchase_to_earn_points,
        max_points_per_order: productData.product_marketing_settings.max_points_per_order,
        redeem_points_for_discount: productData.product_marketing_settings.redeem_points_for_discount ?? false,
        points_needed_for_fixed_discount: productData.product_marketing_settings.points_needed_for_fixed_discount,
        fixed_discount_value_for_points: productData.product_marketing_settings.fixed_discount_value_for_points,
        points_expiration_months: productData.product_marketing_settings.points_expiration_months ?? 0,
      } : {
        // Default values when no marketing settings exist
        enable_reviews: true,
        reviews_verify_purchase: false,
        reviews_auto_approve: true,
        allow_images_in_reviews: true,
        enable_review_replies: true,
        review_display_style: 'stars_summary',
        enable_fake_star_ratings: false,
        fake_star_rating_value: 4.5,
        fake_star_rating_count: 100,
        enable_fake_purchase_counter: false,
        fake_purchase_count: 50,
        enable_facebook_pixel: false,
        facebook_pixel_id: null,
        facebook_standard_events: {},
        facebook_advanced_matching_enabled: false,
        facebook_conversations_api_enabled: false,
        enable_facebook_conversion_api: false,
        facebook_access_token: null,
        facebook_test_event_code: null,
        facebook_dataset_id: null,
        enable_tiktok_pixel: false,
        tiktok_pixel_id: null,
        tiktok_standard_events: {},
        tiktok_advanced_matching_enabled: false,
        tiktok_events_api_enabled: false,
        tiktok_access_token: null,
        tiktok_test_event_code: null,
        enable_snapchat_pixel: false,
        snapchat_pixel_id: null,
        snapchat_standard_events: {},
        snapchat_advanced_matching_enabled: false,
        snapchat_events_api_enabled: false,
        snapchat_api_token: null,
        snapchat_test_event_code: null,
        enable_google_ads_tracking: false,
        google_ads_conversion_id: null,
        google_ads_conversion_label: null,
        google_gtag_id: null,
        google_ads_global_site_tag_enabled: false,
        google_ads_event_snippets: {},
        google_ads_phone_conversion_number: null,
        google_ads_phone_conversion_label: null,
        google_ads_enhanced_conversions_enabled: false,
        offer_timer_enabled: false,
        offer_timer_title: null,
        offer_timer_type: null,
        offer_timer_end_date: null,
        offer_timer_duration_minutes: null,
        offer_timer_display_style: null,
        offer_timer_text_above: null,
        offer_timer_text_below: null,
        offer_timer_end_action: null,
        offer_timer_end_action_url: null,
        offer_timer_end_action_message: null,
        offer_timer_restart_for_new_session: false,
        offer_timer_cookie_duration_days: null,
        offer_timer_show_on_specific_pages_only: false,
        offer_timer_specific_page_urls: [],
        loyalty_points_enabled: false,
        loyalty_points_name_singular: null,
        loyalty_points_name_plural: null,
        points_per_currency_unit: null,
        min_purchase_to_earn_points: null,
        max_points_per_order: null,
        redeem_points_for_discount: false,
        points_needed_for_fixed_discount: null,
        fixed_discount_value_for_points: null,
        points_expiration_months: 0,
      },
    };
    form.reset(defaultValuesForForm);

        if (productData) {
      // تصفية الصور الإضافية من الروابط الفارغة
      const validImages = (productData.additional_images || []).filter((url: string) => url && url.trim() !== '');
      setAdditionalImages(validImages);
      
      // تنظيف الألوان من قيم null
      const cleanedColors = (productData.colors || []).map((color: any) => ({
        ...color,
        barcode: color.barcode === null ? undefined : color.barcode,
        price: color.price === null ? undefined : color.price,
        purchase_price: color.purchase_price === null ? undefined : color.purchase_price,
        variant_number: color.variant_number === null ? undefined : color.variant_number,
        image_url: color.image_url === null ? undefined : color.image_url,
        sizes: color.sizes ? color.sizes.map((size: any) => ({
          ...size,
          barcode: size.barcode === null ? undefined : size.barcode,
          price: size.price === null ? undefined : size.price,
          purchase_price: size.purchase_price === null ? undefined : size.purchase_price,
        })) : undefined
      }));
      
      // تفعيل المتغيرات تلقائياً إذا كان المنتج يحتوي على ألوان
      const hasColors = cleanedColors.length > 0;
      const shouldHaveVariants = productData.has_variants || hasColors;
      
      console.log('🔍 [useProductFormInitialization] Product data analysis:');
      console.log('🔍 [useProductFormInitialization] Original has_variants:', productData.has_variants);
      console.log('🔍 [useProductFormInitialization] Colors count:', cleanedColors.length);
      console.log('🔍 [useProductFormInitialization] Should have variants:', shouldHaveVariants);
      console.log('🔍 [useProductFormInitialization] Colors:', cleanedColors);
      
      setProductColors(cleanedColors);
      setWholesaleTiers(formWholesaleTiers); // Use the safe value
      setUseVariantPrices(formUseVariantPrices); // Use the safe value
      setUseSizes(productData.use_sizes || false);
      setHasVariantsState(shouldHaveVariants);
      setProductNameForTitle(productData.name || '');
      
      // تحديث النموذج بالألوان المنظفة والمتغيرات المفعلة
      form.setValue('colors', cleanedColors, { shouldValidate: false, shouldDirty: false });
      form.setValue('has_variants', shouldHaveVariants, { shouldValidate: false, shouldDirty: false });
    } else {
      setAdditionalImages([]);
      setProductColors([]);
      setWholesaleTiers([]);
      setUseVariantPrices(false);
      setUseSizes(false);
      setHasVariantsState(false);
      setProductNameForTitle('');
      
      // تحديث النموذج بمصفوفة فارغة
      form.setValue('colors', [], { shouldValidate: false, shouldDirty: false });
    }
    setInitialDataSet(true);
  }, [form, organizationId]);

  useEffect(() => {
    const loadProduct = async () => {
      console.log('🔍 [useProductFormInitialization] loadProduct called');
      console.log('🔍 [useProductFormInitialization] id:', id);
      console.log('🔍 [useProductFormInitialization] isEditMode:', isEditMode);
      
      if (!id) { // Should only run in edit mode if id is present
        console.log('🔍 [useProductFormInitialization] No id provided, skipping loadProduct');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        console.log('🔍 [useProductFormInitialization] Fetching product data for id:', id);
        const fetchedProductData = await getProductById(id); // Returns Product | null
        
        if (fetchedProductData) {
          console.log('🔍 [useProductFormInitialization] Product data fetched:', fetchedProductData);
          // جلب الالوان منفصلاً
          const colors = await getProductColors(id);
          
          console.log('🔍 [useProductFormInitialization] Loaded product colors:', colors);
          console.log('🔍 [useProductFormInitialization] Colors count:', colors?.length || 0);
          
          // تنظيف الألوان من قيم null
          const cleanedColors = (colors || []).map((color: any) => ({
            ...color,
            barcode: color.barcode === null ? undefined : color.barcode,
            price: color.price === null ? undefined : color.price,
            purchase_price: color.purchase_price === null ? undefined : color.purchase_price,
            variant_number: color.variant_number === null ? undefined : color.variant_number,
            image_url: color.image_url === null ? undefined : color.image_url,
            sizes: color.sizes ? color.sizes.map((size: any) => ({
              ...size,
              barcode: size.barcode === null ? undefined : size.barcode,
              price: size.price === null ? undefined : size.price,
              purchase_price: size.purchase_price === null ? undefined : size.purchase_price,
            })) : undefined
          }));
          
          // إضافة الألوان إلى بيانات المنتج
          const productWithColors = {
            ...fetchedProductData,
            colors: cleanedColors
          } as any;
          
          resetData(productWithColors);
        } else {
            toast.error('لم يتم العثور على المنتج لتحميله.');
            // Optionally navigate away or handle as a new form if id was invalid
             resetData(null); // Reset to new product form if product not found
        }
      } catch (error) {
        toast.error('حدث خطأ أثناء تحميل بيانات المنتج.');
        resetData(null); // Reset to new product form on error
      }
      setIsLoading(false);
    };

    if (isEditMode) {
      loadProduct();
    } else {
      // New product mode
      resetData(null);
        setIsLoading(false);
    }
  }, [isEditMode, id, organizationId, resetData]);

  return { isLoading, productNameForTitle, isEditMode, initialDataSet };
};
