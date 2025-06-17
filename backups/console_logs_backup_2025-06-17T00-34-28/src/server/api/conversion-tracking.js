import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// إعداد Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// جلب إعدادات التحويل للمنتج
router.get('/conversion-settings/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    // استخدام الدالة المحسنة مع التخزين المؤقت
    const { data, error } = await supabase
      .rpc('get_conversion_settings_cached', { 
        p_product_id: productId 
      });

    if (error) {
      return res.status(500).json({
        error: 'فشل في جلب الإعدادات'
      });
    }

    // إعداد headers للتخزين المؤقت
    res.set({
      'Cache-Control': 'public, max-age=300', // 5 دقائق
      'ETag': `"${Date.now()}"`,
      'Last-Modified': new Date().toUTCString()
    });

    res.json({ 
      settings: data || {},
      cached_at: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      error: 'خطأ داخلي في الخادم'
    });
  }
});

// حفظ أحداث التحويل
router.post('/conversion-events', async (req, res) => {
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

    // التحقق من البيانات المطلوبة
    if (!product_id || !event_type || !platform) {
      return res.status(400).json({
        error: 'بيانات مفقودة: product_id, event_type, platform مطلوبة'
      });
    }

    // إنشاء event_id فريد إذا لم يتم توفيره
    const finalEventId = event_id || `${product_id}_${event_type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // حفظ الحدث في قاعدة البيانات
    const { data, error } = await supabase
      .from('conversion_events')
      .insert({
        product_id,
        order_id,
        event_type,
        platform,
        user_data,
        custom_data,
        event_id: finalEventId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // duplicate key error
        return res.status(409).json({
          error: 'حدث مكرر',
          event_id: finalEventId
        });
      }
      return res.status(500).json({
        error: 'فشل في حفظ الحدث'
      });
    }

    // إضافة إلى طابور المعالجة للإرسال إلى المنصات الخارجية
    const { error: queueError } = await supabase
      .from('conversion_event_queue')
      .insert({
        event_id: data.id,
        product_id,
        event_type,
        platform,
        payload: {
          user_data,
          custom_data,
          order_id
        },
        status: 'queued',
        scheduled_at: new Date().toISOString()
      });

    if (queueError) {
    }

    res.status(201).json({
      success: true,
      event_id: finalEventId,
      data
    });

  } catch (error) {
    res.status(500).json({
      error: 'خطأ داخلي في الخادم'
    });
  }
});

// إرسال أحداث إلى Facebook Conversion API
router.post('/facebook-conversion-api', async (req, res) => {
  try {
    const { pixel_id, access_token, payload } = req.body;

    if (!pixel_id || !access_token || !payload) {
      return res.status(400).json({
        error: 'pixel_id, access_token, payload مطلوبة'
      });
    }

    // إرسال إلى Facebook
    const response = await fetch(`https://graph.facebook.com/v18.0/${pixel_id}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'فشل في إرسال الحدث إلى Facebook',
        details: result
      });
    }

    res.json({
      success: true,
      facebook_response: result
    });

  } catch (error) {
    res.status(500).json({
      error: 'خطأ داخلي في الخادم'
    });
  }
});

// تتبع حالة الأحداث
router.get('/conversion-events/:eventId/status', async (req, res) => {
  try {
    const { eventId } = req.params;

    const { data, error } = await supabase
      .from('conversion_events')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error) {
      return res.status(404).json({
        error: 'الحدث غير موجود'
      });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({
      error: 'خطأ داخلي في الخادم'
    });
  }
});

export default router;
