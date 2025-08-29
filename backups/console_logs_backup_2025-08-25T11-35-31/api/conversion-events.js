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

  // التحقق من توفر Supabase client
  if (!supabase) {
    return res.status(500).json({
      error: 'خطأ في التكوين - قاعدة البيانات غير متاحة'
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

    // إدراج الحدث في جدول conversion_events
    const insertData = {
      product_id,
      order_id: order_id || null,
      event_type,
      platform,
      user_data: user_data || {},
      custom_data: custom_data || {},
      event_id: event_id || `${product_id}_${event_type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'sent',
      timestamp: new Date().toISOString(),
      sent_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('conversion_events')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: 'فشل في تسجيل الحدث',
        details: error.message,
        code: error.code
      });
    }

    return res.status(200).json({
      success: true,
      event: data,
      message: 'تم تسجيل الحدث بنجاح'
    });

  } catch (error) {
    return res.status(500).json({
      error: 'خطأ داخلي في الخادم',
      details: error.message
    });
  }
}
