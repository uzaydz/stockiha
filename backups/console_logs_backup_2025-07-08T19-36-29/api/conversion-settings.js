import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  const { method } = req;
  const { organizationId } = req.query;

  // التحقق من وجود معرف المؤسسة
  if (!organizationId) {
    return res.status(400).json({ 
      error: 'Organization ID is required',
      message: 'معرف المؤسسة مطلوب' 
    });
  }

  try {
    switch (method) {
      case 'GET':
        return await getConversionSettings(req, res, organizationId);
      case 'POST':
      case 'PUT':
        return await upsertConversionSettings(req, res, organizationId);
      case 'DELETE':
        return await deleteConversionSettings(req, res, organizationId);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ 
          error: `Method ${method} Not Allowed`,
          message: `الطريقة ${method} غير مسموحة` 
        });
    }
  } catch (error) {
    console.error('Conversion Settings API Error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'خطأ داخلي في الخادم',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// جلب إعدادات التحويل
async function getConversionSettings(req, res, organizationId) {
  const { data, error } = await supabase
    .from('organization_conversion_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching conversion settings:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch conversion settings',
      message: 'فشل في جلب إعدادات التحويل' 
    });
  }

  // إذا لم توجد إعدادات، إرجاع إعدادات افتراضية
  if (!data) {
    const defaultSettings = {
      organization_id: organizationId,
      facebook: {
        enabled: false,
        pixel_id: null,
        conversion_api_enabled: false,
        access_token: null,
        test_event_code: null
      },
      google: {
        enabled: false,
        gtag_id: null,
        ads_conversion_id: null,
        ads_conversion_label: null
      },
      tiktok: {
        enabled: false,
        pixel_id: null,
        events_api_enabled: false,
        access_token: null,
        test_event_code: null
      },
      test_mode: true
    };

    return res.status(200).json(defaultSettings);
  }

  // تنسيق البيانات
  const formattedData = {
    organization_id: data.organization_id,
    facebook: {
      enabled: data.facebook_enabled,
      pixel_id: data.facebook_pixel_id,
      conversion_api_enabled: data.facebook_conversion_api_enabled,
      access_token: data.facebook_access_token,
      test_event_code: data.facebook_test_event_code
    },
    google: {
      enabled: data.google_enabled,
      gtag_id: data.google_gtag_id,
      ads_conversion_id: data.google_ads_conversion_id,
      ads_conversion_label: data.google_ads_conversion_label
    },
    tiktok: {
      enabled: data.tiktok_enabled,
      pixel_id: data.tiktok_pixel_id,
      events_api_enabled: data.tiktok_events_api_enabled,
      access_token: data.tiktok_access_token,
      test_event_code: data.tiktok_test_event_code
    },
    test_mode: data.test_mode,
    created_at: data.created_at,
    updated_at: data.updated_at
  };

  return res.status(200).json(formattedData);
}

// إنشاء أو تحديث إعدادات التحويل
async function upsertConversionSettings(req, res, organizationId) {
  const { facebook, google, tiktok, test_mode } = req.body;

  // التحقق من صحة البيانات
  if (!facebook && !google && !tiktok) {
    return res.status(400).json({ 
      error: 'At least one platform settings is required',
      message: 'إعدادات منصة واحدة على الأقل مطلوبة' 
    });
  }

  // تحضير البيانات للإدراج/التحديث
  const settingsData = {
    organization_id: organizationId,
    // Facebook settings
    facebook_enabled: facebook?.enabled || false,
    facebook_pixel_id: facebook?.pixel_id || null,
    facebook_conversion_api_enabled: facebook?.conversion_api_enabled || false,
    facebook_access_token: facebook?.access_token || null,
    facebook_test_event_code: facebook?.test_event_code || null,
    // Google settings
    google_enabled: google?.enabled || false,
    google_gtag_id: google?.gtag_id || null,
    google_ads_conversion_id: google?.ads_conversion_id || null,
    google_ads_conversion_label: google?.ads_conversion_label || null,
    // TikTok settings
    tiktok_enabled: tiktok?.enabled || false,
    tiktok_pixel_id: tiktok?.pixel_id || null,
    tiktok_events_api_enabled: tiktok?.events_api_enabled || false,
    tiktok_access_token: tiktok?.access_token || null,
    tiktok_test_event_code: tiktok?.test_event_code || null,
    // General settings
    test_mode: test_mode !== undefined ? test_mode : true
  };

  const { data, error } = await supabase
    .from('organization_conversion_settings')
    .upsert(settingsData, { 
      onConflict: 'organization_id',
      returning: 'minimal' 
    });

  if (error) {
    console.error('Error upserting conversion settings:', error);
    return res.status(500).json({ 
      error: 'Failed to save conversion settings',
      message: 'فشل في حفظ إعدادات التحويل',
      details: error.message 
    });
  }

  return res.status(200).json({ 
    success: true,
    message: 'تم حفظ إعدادات التحويل بنجاح',
    data: settingsData 
  });
}

// حذف إعدادات التحويل
async function deleteConversionSettings(req, res, organizationId) {
  const { data, error } = await supabase
    .from('organization_conversion_settings')
    .delete()
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error deleting conversion settings:', error);
    return res.status(500).json({ 
      error: 'Failed to delete conversion settings',
      message: 'فشل في حذف إعدادات التحويل' 
    });
  }

  return res.status(200).json({ 
    success: true,
    message: 'تم حذف إعدادات التحويل بنجاح' 
  });
} 