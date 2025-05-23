import { createClient } from '@supabase/supabase-js';

// إعداد Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Conversion Events API endpoint
 * POST /api/conversion-events
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

  try {
    const {
      product_id,
      order_id,
      event_type,
      platform,
      user_data,
      custom_data,
      event_id
    } = req.body;

    if (!product_id || !event_type || !platform) {
      return res.status(400).json({
        error: 'معاملات مطلوبة مفقودة: product_id, event_type, platform'
      });
    }

    console.log('📊 تسجيل حدث تحويل:', {
      product_id,
      event_type,
      platform,
      order_id
    });

    // إدراج الحدث في جدول conversion_events
    const { data, error } = await supabase
      .from('conversion_events')
      .insert({
        product_id,
        order_id: order_id || null,
        event_type,
        platform,
        user_data: user_data || {},
        custom_data: custom_data || {},
        event_id: event_id || `${product_id}_${event_type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ خطأ في تسجيل حدث التحويل:', error);
      return res.status(500).json({
        error: 'فشل في تسجيل الحدث',
        details: error.message
      });
    }

    console.log('✅ تم تسجيل حدث التحويل بنجاح:', data);

    return res.status(200).json({
      success: true,
      event: data,
      message: 'تم تسجيل الحدث بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في Conversion Events endpoint:', error);
    return res.status(500).json({
      error: 'خطأ داخلي في الخادم',
      details: error.message
    });
  }
} 