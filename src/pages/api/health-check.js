/**
 * نقطة نهاية API بسيطة للتحقق من حالة الاتصال بالخادم
 * تستخدم هذه الدالة للتأكد من أن واجهة المستخدم يمكنها الوصول إلى الخادم
 */
export default async function handler(req, res) {
  // تعيين رؤوس CORS للسماح بالوصول من أي أصل
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  try {
    // اختبار الاتصال بـ Supabase إذا كان الطلب GET وليس HEAD
    // لا نقوم بهذا الاختبار في طلبات HEAD لأنها تستخدم للفحص السريع
    let supabaseStatus = { ok: true };
    
    if (req.method === 'GET') {
      try {
        // استيراد Supabase دينامياً لتجنب أخطاء الاستيراد الدائرية
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        
        // محاولة استعلام بسيط للتحقق من الاتصال
        const { data, error } = await supabase
          .from('health_check')
          .select('count(*)')
          .limit(1)
          .maybeSingle();
        
        if (error) {
          supabaseStatus = { ok: false, error: error.message };
        }
      } catch (err) {
        supabaseStatus = { ok: false, error: err.message };
      }
    }
    
    // إرجاع استجابة تشير إلى أن الخادم متاح ومعلومات عن حالة Supabase
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      supabase: supabaseStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 