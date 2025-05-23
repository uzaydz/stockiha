/**
 * Facebook Conversion API endpoint (Updated to v22.0)
 * POST /api/facebook-conversion-api
 */

import crypto from 'crypto';

// دالة hashing للبيانات الحساسة
function hashData(data) {
  if (!data) return null;
  return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
}

// دالة للحصول على IP من request
function getClientIpAddress(req) {
  return req.headers['x-forwarded-for'] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.connection?.socket?.remoteAddress ||
         '127.0.0.1';
}

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
    const { pixel_id, access_token, payload } = req.body;

    if (!pixel_id || !access_token || !payload) {
      return res.status(400).json({
        error: 'معاملات مطلوبة مفقودة: pixel_id, access_token, payload'
      });
    }

    // تحسين payload قبل الإرسال
    const improvedPayload = {
      ...payload,
      data: payload.data.map(event => {
        // تحسين user_data
        const improvedUserData = {
          ...event.user_data,
          // إضافة client IP و user agent من الطلب
          client_ip_address: event.user_data?.client_ip_address || getClientIpAddress(req),
          client_user_agent: event.user_data?.client_user_agent || req.headers['user-agent'],
        };

        // تطبيق hashing على البيانات الحساسة
        if (event.user_data?.em) {
          improvedUserData.em = [hashData(event.user_data.em)];
        }
        if (event.user_data?.ph) {
          improvedUserData.ph = [hashData(event.user_data.ph)];
        }

        return {
          ...event,
          user_data: improvedUserData,
          // التأكد من وجود action_source
          action_source: event.action_source || 'website',
          // التأكد من وجود event_source_url
          event_source_url: event.event_source_url || 'https://app.bazaarli.com'
        };
      })
    };

    console.log('🔵 إرسال حدث محسن إلى Facebook Conversion API:', {
      pixel_id,
      api_version: 'v22.0',
      event_count: improvedPayload.data?.length || 0,
      test_event_code: improvedPayload.test_event_code,
      has_user_data: !!improvedPayload.data?.[0]?.user_data,
      client_ip: getClientIpAddress(req)
    });

    // إرسال إلى Facebook Conversion API باستخدام v22.0
    const facebookResponse = await fetch(
      `https://graph.facebook.com/v22.0/${pixel_id}/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(improvedPayload)
      }
    );

    const facebookData = await facebookResponse.json();

    if (facebookResponse.ok) {
      console.log('✅ تم إرسال الحدث إلى Facebook بنجاح:', {
        events_received: facebookData.events_received || 0,
        messages: facebookData.messages || [],
        fbtrace_id: facebookData.fbtrace_id
      });
      
      return res.status(200).json({
        success: true,
        facebook_response: facebookData,
        events_received: facebookData.events_received || 0,
        messages: facebookData.messages || [],
        fbtrace_id: facebookData.fbtrace_id
      });
    } else {
      console.error('❌ خطأ من Facebook Conversion API:', {
        status: facebookResponse.status,
        error: facebookData,
        request_payload: JSON.stringify(improvedPayload, null, 2)
      });
      
      return res.status(400).json({
        error: 'فشل في إرسال الحدث إلى Facebook',
        facebook_error: facebookData,
        status: facebookResponse.status,
        details: facebookData.error || 'خطأ غير معروف'
      });
    }

  } catch (error) {
    console.error('❌ خطأ في Facebook Conversion API endpoint:', error);
    return res.status(500).json({
      error: 'خطأ داخلي في الخادم',
      details: error.message
    });
  }
} 