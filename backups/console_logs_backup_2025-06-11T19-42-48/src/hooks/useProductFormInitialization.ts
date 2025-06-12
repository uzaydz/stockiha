import { useEffect, useCallback, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getProductById, Product } from '@/lib/api/products'; // Using Product from API
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

  const resetData = useCallback((productData: Product | null) => {

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
      marketingSettings: {
        // Review Settings
        enable_reviews: true,
        reviews_verify_purchase: false,
        reviews_auto_approve: true,
        allow_images_in_reviews: true,
        enable_review_replies: true,
        review_display_style: 'stars_summary',

        // Fake Engagement Settings
        enable_fake_star_ratings: false,
        fake_star_rating_value: 4.5,
        fake_star_rating_count: 100,
        enable_fake_purchase_counter: false,
        fake_purchase_count: 50,

        // Facebook Pixel Settings
        enable_facebook_pixel: false,
        facebook_pixel_id: null,
        facebook_standard_events: {},
        facebook_advanced_matching_enabled: false,
        facebook_conversations_api_enabled: false,
        facebook_access_token: null,
        facebook_test_event_code: null,

        // TikTok Pixel Settings
        enable_tiktok_pixel: false,
        tiktok_pixel_id: null,
        tiktok_standard_events: {},
        tiktok_advanced_matching_enabled: false,
        tiktok_events_api_enabled: false,
        tiktok_access_token: null,
        tiktok_test_event_code: null,

        // Snapchat Pixel Settings
        enable_snapchat_pixel: false,
        snapchat_pixel_id: null,
        snapchat_standard_events: {},
        snapchat_advanced_matching_enabled: false,
        snapchat_events_api_enabled: false,
        snapchat_api_token: null,
        snapchat_test_event_code: null,

        // Google Ads Tracking Settings
        enable_google_ads_tracking: false,
        google_ads_conversion_id: null,
        google_ads_global_site_tag_enabled: false,
        google_ads_event_snippets: {},
        google_ads_phone_conversion_number: null,
        google_ads_phone_conversion_label: null,
        google_ads_enhanced_conversions_enabled: false,

        // Offer Timer Settings
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

        // Loyalty Points Settings
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
      setAdditionalImages(productData.additional_images || []);
      setProductColors(productData.colors || []);
      setWholesaleTiers(formWholesaleTiers); // Use the safe value
      setUseVariantPrices(formUseVariantPrices); // Use the safe value
      setUseSizes(productData.use_sizes || false);
      setHasVariantsState(productData.has_variants || false);
      setProductNameForTitle(productData.name || '');
          } else {
        setAdditionalImages([]);
        setProductColors([]);
        setWholesaleTiers([]);
        setUseVariantPrices(false);
        setUseSizes(false);
        setHasVariantsState(false);
      setProductNameForTitle('');
    }
    setInitialDataSet(true);
  }, [form, organizationId, setAdditionalImages, setProductColors, setWholesaleTiers, setUseVariantPrices, setUseSizes, setHasVariantsState, setProductNameForTitle, setInitialDataSet]);

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) { // Should only run in edit mode if id is present
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const fetchedProductData = await getProductById(id); // Returns Product | null
        if (fetchedProductData) {
            resetData(fetchedProductData);
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
  }, [isEditMode, id, resetData, organizationId, setIsLoading, navigate]); // Added navigate to deps as it's used indirectly via toast potentially

  return { isLoading, productNameForTitle, isEditMode, initialDataSet };
};
