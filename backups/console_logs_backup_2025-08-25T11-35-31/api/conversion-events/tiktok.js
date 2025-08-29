import { createClient } from '@supabase/supabase-js';

// إعداد Supabase client - استخدام anon key للـ API endpoints
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://wrnssatuvmumsczyldth.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXN6enlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MjE0MzQsImV4cCI6MjA0ODI5NzQzNH0.GjXqhPJlFVIGvnTVGKQj-_lPsL8Dn8XCBCxFbKIhqXM';

let supabase = null;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} catch (error) {
  console.error('Failed to create Supabase client:', error);
}

/**
 * TikTok Events API endpoint
 * POST /api/conversion-events/tiktok
 */
export default async function handler(req, res) {
  // تمكين CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  if (!supabase) {
    return res.status(500).json({
      error: 'خطأ في التكوين - قاعدة البيانات غير متاحة'
    });
  }

  try {
    const {
      event_type,
      product_id,
      order_id,
      value,
      currency,
      user_data,
      custom_data,
      pixel_id,
      access_token,
      test_event_code
    } = req.body;

    if (!event_type || !product_id || !pixel_id || !access_token) {
      return res.status(400).json({
        error: 'معاملات مطلوبة مفقودة: event_type, product_id, pixel_id, access_token'
      });
    }

    // التحقق من صحة pixel_id
    if (!pixel_id || typeof pixel_id !== 'string' || pixel_id.trim() === '') {
      return res.status(400).json({
        error: 'pixel_id غير صالح - يجب أن يكون نص غير فارغ',
        received_pixel_id: pixel_id,
        type: typeof pixel_id
      });
    }

    // تنظيف pixel_id من أي مسافات أو رموز غير مرغوب فيها
    const cleanPixelId = pixel_id.toString().trim();

    // Debug logging للبيانات المرسلة
    console.log('🔍 [TikTok API Debug] Request data:', {
      pixel_id: cleanPixelId,
      original_pixel_id: pixel_id,
      pixel_id_type: typeof pixel_id,
      access_token: access_token ? '***exists***' : 'missing',
      event_type,
      product_id,
      user_data,
      custom_data
    });

    // إعداد بيانات الحدث لـ TikTok Events API وفقاً لتوثيق TikTok الرسمي
    const eventTime = Math.floor(Date.now() / 1000);
    const eventId = `${product_id}_${event_type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const eventData = {
      event_source: 'web',
      event_source_id: cleanPixelId, // يجب أن يكون نفس pixel_id
      data: [{
        event: event_type,
        event_id: eventId,
        event_time: eventTime,
        properties: {
          content_id: product_id,
          content_type: 'product',
          currency: currency || 'DZD',
          ...(value && { value: parseFloat(value) }),
          ...(order_id && { order_id }),
          ...custom_data
        },
        ...(user_data && {
          user: {
            ...(user_data.email && { email: user_data.email }),
            ...(user_data.phone && { phone_number: user_data.phone }),
            ...(user_data.external_id && { external_id: user_data.external_id })
          }
        })
      }],
      ...(test_event_code && { test_event_code })
    };

    // التحقق من وجود الحقول المطلوبة
    const requiredFields = ['event_source', 'event_source_id', 'data'];
    const missingFields = requiredFields.filter(field => !eventData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'حقول مطلوبة مفقودة في eventData',
        missing_fields: missingFields,
        provided_data: Object.keys(eventData)
      });
    }

    // التحقق من بيانات الحدث الفردي
    const firstEvent = eventData.data[0];
    const requiredEventFields = ['event', 'event_id', 'event_time'];
    const missingEventFields = requiredEventFields.filter(field => !firstEvent[field]);
    
    if (missingEventFields.length > 0) {
      return res.status(400).json({
        error: 'حقول مطلوبة مفقودة في بيانات الحدث',
        missing_event_fields: missingEventFields,
        provided_event_data: Object.keys(firstEvent)
      });
    }

    // Debug logging للبيانات النهائية
    console.log('📤 [TikTok API] Sending to TikTok:', {
      url: 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
      eventData: JSON.stringify(eventData, null, 2),
      event_source: eventData.event_source,
      event_source_id: eventData.event_source_id,
      data_length: eventData.data.length,
      first_event: eventData.data[0]
    });

    // إرسال إلى TikTok Events API
    const tiktokResponse = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: {
        'Access-Token': access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    const tiktokResult = await tiktokResponse.json();
    
    // Debug logging للاستجابة
    console.log('📥 [TikTok API] Response:', {
      status: tiktokResponse.status,
      result: tiktokResult
    });

    // حفظ الحدث في قاعدة البيانات
    const { data: savedEvent, error: dbError } = await supabase
      .from('conversion_events')
      .insert({
        product_id,
        order_id: order_id || null,
        event_type,
        platform: 'tiktok',
        user_data: user_data || {},
        custom_data: {
          ...custom_data,
          pixel_id: cleanPixelId,
          tiktok_response: tiktokResult
        },
        event_id: eventData.data[0].event_id,
        status: tiktokResponse.ok ? 'sent' : 'failed',
        error_message: !tiktokResponse.ok ? JSON.stringify(tiktokResult) : null,
        timestamp: new Date().toISOString(),
        sent_at: tiktokResponse.ok ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
    }

    if (!tiktokResponse.ok) {
      return res.status(tiktokResponse.status).json({
        error: 'فشل في إرسال الحدث إلى TikTok Events API',
        details: tiktokResult,
        saved_locally: !dbError
      });
    }

    return res.status(200).json({
      success: true,
      tiktok_response: tiktokResult,
      saved_event: savedEvent,
      message: 'تم إرسال الحدث إلى TikTok Events API بنجاح'
    });

  } catch (error) {
    console.error('TikTok Events API error:', error);
    
    return res.status(500).json({
      error: 'خطأ داخلي في الخادم',
      details: error.message
    });
  }
}
