import { createClient } from '@supabase/supabase-js';

// إعداد Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * API Route لجلب إعدادات التحويل للمنتج
 * GET /api/conversion-settings/[productId]
 */
export default async function handler(req, res) {
  // تمكين CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    const { productId } = req.query;

    if (!productId) {
      return res.status(400).json({
        error: 'معرف المنتج مطلوب'
      });
    }

    // استخدام الدالة الجديدة المحسنة
    const { data, error } = await supabase
      .rpc('get_simple_conversion_settings', { 
        p_product_id: productId 
      });

    if (error) {
      return res.status(500).json({
        error: 'فشل في جلب الإعدادات',
        details: error.message
      });
    }

    // إعداد headers للتخزين المؤقت
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 دقائق
    res.setHeader('ETag', `"${Date.now()}"`);
    res.setHeader('Last-Modified', new Date().toUTCString());

    return res.status(200).json({ 
      settings: data || {},
      cached_at: new Date().toISOString(),
      success: true
    });

  } catch (error) {
    return res.status(500).json({
      error: 'خطأ داخلي في الخادم',
      details: error.message
    });
  }
}
