// معالج أخطاء product_marketing_settings مع آلية إعادة المحاولة والتعامل مع خطأ 403
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

type ProductMarketingSettings = Database['public']['Tables']['product_marketing_settings']['Row'];
type ProductMarketingSettingsInsert = Database['public']['Tables']['product_marketing_settings']['Insert'];

// إعدادات إعادة المحاولة
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  backoffMultiplier: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 ثانية
  backoffMultiplier: 2,
  maxDelay: 5000 // 5 ثوان
};

// إعدادات افتراضية لـ product_marketing_settings - استخدام as any لتجنب type errors مؤقتاً
const DEFAULT_MARKETING_SETTINGS = {
  // Review Settings
  enable_reviews: true,
  reviews_verify_purchase: true,
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
  offer_timer_display_style: 'countdown',
  offer_timer_text_above: null,
  offer_timer_text_below: null,
  offer_timer_end_action: 'hide',
  offer_timer_end_action_url: null,
  offer_timer_end_action_message: null,
  offer_timer_restart_for_new_session: false,
  offer_timer_cookie_duration_days: null,
  offer_timer_show_on_specific_pages_only: false,
  offer_timer_specific_page_urls: null,

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

  // Global Test Mode
  test_mode: true
} as Partial<ProductMarketingSettingsInsert>;

// دالة للانتظار مع backoff
const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// دالة لحساب تأخير إعادة المحاولة
const calculateRetryDelay = (attempt: number, config: RetryConfig): number => {
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(exponentialDelay, config.maxDelay);
};

// معالج خطأ 403 المحسن
export const handleProductMarketingSettings403Error = async (
  error: any,
  action: string,
  retryFunction?: () => Promise<any>
): Promise<void> => {
  console.error(`❌ خطأ 403 في ${action}:`, error);
  
  if (error?.code === 'PGRST301' || error?.message?.includes('403') || error?.status === 403) {
    console.log('🔧 محاولة إصلاح خطأ 403 تلقائياً...');
    
    // محاولة إعادة تحميل الصفحة للحصول على session جديدة
    if (retryFunction) {
      await delay(1000);
      try {
        await retryFunction();
        console.log('✅ تم إصلاح خطأ 403 بنجاح');
        toast.success('تم إصلاح المشكلة وإعادة المحاولة بنجاح');
      } catch (retryError) {
        console.error('❌ فشل في إصلاح خطأ 403:', retryError);
        toast.error('مشكلة في صلاحيات الوصول. الرجاء تحديث الصفحة أو إعادة تسجيل الدخول.');
      }
    } else {
      toast.error('مشكلة في صلاحيات الوصول لإعدادات التسويق. سيتم إنشاؤها تلقائياً عند الحاجة.');
    }
  } else {
    console.error(`❌ خطأ غير متوقع في ${action}:`, error);
    toast.error(`خطأ في ${action}: ${error.message || 'خطأ غير محدد'}`);
  }
};

// دالة لإنشاء product_marketing_settings مع retry
export const createProductMarketingSettingsWithRetry = async (
  productId: string,
  organizationId: string,
  customSettings: Partial<ProductMarketingSettingsInsert> = {},
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<ProductMarketingSettings | null> => {
  
  const settingsToInsert: ProductMarketingSettingsInsert = {
    ...DEFAULT_MARKETING_SETTINGS,
    ...customSettings,
    product_id: productId,
    organization_id: organizationId
  };

  console.log('🚀 محاولة إنشاء product_marketing_settings:', { 
    productId, 
    organizationId,
    attempt: 1 
  });

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      console.log(`📝 المحاولة ${attempt + 1} لإنشاء product_marketing_settings`);
      
      const { data, error } = await supabase
        .from('product_marketing_settings')
        .insert(settingsToInsert)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ تم إنشاء product_marketing_settings بنجاح:', data);
      toast.success('تم إنشاء إعدادات التسويق بنجاح');
      return data;

    } catch (error: any) {
      console.error(`❌ فشل في المحاولة ${attempt + 1}:`, error);

      if (attempt === retryConfig.maxRetries) {
        console.error('❌ فشل في جميع المحاولات لإنشاء product_marketing_settings');
        await handleProductMarketingSettings403Error(error, 'إنشاء إعدادات التسويق');
        return null;
      }

      // التحقق من نوع الخطأ
      if (error?.code === 'PGRST301' || error?.message?.includes('403') || error?.status === 403) {
        console.log('🔧 خطأ 403 - محاولة إصلاح...');
        
        // محاولة التحقق من وجود السجل
        try {
          const { data: existing } = await supabase
            .from('product_marketing_settings')
            .select('*')
            .eq('product_id', productId)
            .single();
          
          if (existing) {
            console.log('✅ السجل موجود مسبقاً:', existing);
            return existing;
          }
        } catch (checkError) {
          console.log('🔍 السجل غير موجود، المتابعة مع إعادة المحاولة...');
        }
      }

      // انتظار قبل إعادة المحاولة
      if (attempt < retryConfig.maxRetries) {
        const delayMs = calculateRetryDelay(attempt, retryConfig);
        console.log(`⏳ انتظار ${delayMs}ms قبل إعادة المحاولة...`);
        await delay(delayMs);
      }
    }
  }

  return null;
};

// دالة لقراءة product_marketing_settings مع retry
export const getProductMarketingSettingsWithRetry = async (
  productId: string,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<ProductMarketingSettings | null> => {
  
  console.log('🔍 محاولة قراءة product_marketing_settings:', { productId });

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      console.log(`📖 المحاولة ${attempt + 1} لقراءة product_marketing_settings`);
      
      const { data, error } = await supabase
        .from('product_marketing_settings')
        .select('*')
        .eq('product_id', productId)
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ تم قراءة product_marketing_settings بنجاح:', data);
      return data;

    } catch (error: any) {
      console.error(`❌ فشل في المحاولة ${attempt + 1}:`, error);

      if (attempt === retryConfig.maxRetries) {
        console.error('❌ فشل في جميع المحاولات لقراءة product_marketing_settings');
        await handleProductMarketingSettings403Error(error, 'قراءة إعدادات التسويق');
        return null;
      }

      // انتظار قبل إعادة المحاولة
      if (attempt < retryConfig.maxRetries) {
        const delayMs = calculateRetryDelay(attempt, retryConfig);
        console.log(`⏳ انتظار ${delayMs}ms قبل إعادة المحاولة...`);
        await delay(delayMs);
      }
    }
  }

  return null;
};

// دالة لتحديث product_marketing_settings مع retry
export const updateProductMarketingSettingsWithRetry = async (
  productId: string,
  updates: Partial<ProductMarketingSettingsInsert>,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<ProductMarketingSettings | null> => {
  
  console.log('🔄 محاولة تحديث product_marketing_settings:', { productId, updates });

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      console.log(`✏️ المحاولة ${attempt + 1} لتحديث product_marketing_settings`);
      
      const { data, error } = await supabase
        .from('product_marketing_settings')
        .update(updates)
        .eq('product_id', productId)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ تم تحديث product_marketing_settings بنجاح:', data);
      toast.success('تم تحديث إعدادات التسويق بنجاح');
      return data;

    } catch (error: any) {
      console.error(`❌ فشل في المحاولة ${attempt + 1}:`, error);

      if (attempt === retryConfig.maxRetries) {
        console.error('❌ فشل في جميع المحاولات لتحديث product_marketing_settings');
        await handleProductMarketingSettings403Error(error, 'تحديث إعدادات التسويق');
        return null;
      }

      // انتظار قبل إعادة المحاولة
      if (attempt < retryConfig.maxRetries) {
        const delayMs = calculateRetryDelay(attempt, retryConfig);
        console.log(`⏳ انتظار ${delayMs}ms قبل إعادة المحاولة...`);
        await delay(delayMs);
      }
    }
  }

  return null;
};

// دالة مساعدة للتحقق من وجود إعدادات التسويق وإنشاؤها إذا لم تكن موجودة
export const ensureProductMarketingSettings = async (
  productId: string,
  organizationId: string,
  customSettings: Partial<ProductMarketingSettingsInsert> = {}
): Promise<ProductMarketingSettings | null> => {
  
  console.log('🔍 التحقق من وجود product_marketing_settings:', { productId, organizationId });

  // محاولة قراءة الإعدادات الموجودة
  let existingSettings = await getProductMarketingSettingsWithRetry(productId);
  
  if (existingSettings) {
    console.log('✅ الإعدادات موجودة مسبقاً:', existingSettings);
    return existingSettings;
  }

  // إنشاء إعدادات جديدة إذا لم تكن موجودة
  console.log('🆕 إنشاء إعدادات تسويق جديدة...');
  return await createProductMarketingSettingsWithRetry(productId, organizationId, customSettings);
};

// دالة لمعالجة أخطاء product_marketing_settings في العمليات العامة
export const handleMarketingSettingsOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  fallbackValue: T | null = null,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T | null> => {
  
  console.log(`🎯 تنفيذ عملية ${operationName}...`);

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      console.log(`🚀 المحاولة ${attempt + 1} لـ ${operationName}`);
      
      const result = await operation();
      console.log(`✅ نجح تنفيذ ${operationName}:`, result);
      return result;

    } catch (error: any) {
      console.error(`❌ فشل في المحاولة ${attempt + 1} لـ ${operationName}:`, error);

      if (attempt === retryConfig.maxRetries) {
        console.error(`❌ فشل في جميع المحاولات لـ ${operationName}`);
        await handleProductMarketingSettings403Error(error, operationName);
        return fallbackValue;
      }

      // انتظار قبل إعادة المحاولة
      if (attempt < retryConfig.maxRetries) {
        const delayMs = calculateRetryDelay(attempt, retryConfig);
        console.log(`⏳ انتظار ${delayMs}ms قبل إعادة المحاولة...`);
        await delay(delayMs);
      }
    }
  }

  return fallbackValue;
}; 