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

// دالة للحصول على IP من request مع تحسينات شاملة
function getClientIpAddress(req) {
  // محاولة جلب IP من headers مختلفة (ترتيب حسب الأولوية)
  const possibleHeaders = [
    'x-forwarded-for',
    'x-real-ip', 
    'x-client-ip',
    'x-cluster-client-ip',
    'cf-connecting-ip', // Cloudflare
    'fastly-client-ip', // Fastly
    'true-client-ip',
    'x-azure-clientip' // Azure
  ];
  
  for (const header of possibleHeaders) {
    const value = req.headers[header];
    if (value) {
      // x-forwarded-for قد يحتوي على عدة IPs مفصولة بفواصل
      const ips = value.split(',').map(ip => ip.trim());
      const firstValidIp = ips.find(ip => {
        // تجاهل IPs المحلية والخاصة
        return ip && 
               ip !== '127.0.0.1' && 
               ip !== '::1' && 
               !ip.startsWith('10.') && 
               !ip.startsWith('192.168.') && 
               !(ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31);
      });
      
      if (firstValidIp) {
        console.log(`🌐 تم جلب IP من ${header}: ${firstValidIp}`);
        return firstValidIp;
      }
    }
  }
  
  // محاولة أخيرة من connection
  const connectionIp = req.connection?.remoteAddress || 
                      req.socket?.remoteAddress || 
                      req.connection?.socket?.remoteAddress;
                      
  if (connectionIp && connectionIp !== '127.0.0.1' && connectionIp !== '::1') {
    console.log(`🌐 تم جلب IP من connection: ${connectionIp}`);
    return connectionIp;
  }
  
  console.log('⚠️ لم يتم العثور على IP صالح، استخدام fallback');
  return null; // لا نرسل IP غير صحيح
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

    // تحسين payload قبل الإرسال مع إصلاح مشاكل البيانات
    const improvedPayload = {
      ...payload,
      data: payload.data.map(event => {
        // الحصول على IP الحقيقي
        const clientIp = getClientIpAddress(req);
        
        // معالجة user_data بعناية
        const cleanUserData = {};
        
        // إضافة البيانات الأساسية فقط إذا كانت صحيحة
        if (event.user_data?.ph && typeof event.user_data.ph === 'string') {
          cleanUserData.ph = [hashData(event.user_data.ph)];
        }
        
        if (event.user_data?.em && typeof event.user_data.em === 'string') {
          cleanUserData.em = [hashData(event.user_data.em)];
        }
        
        // معرف خارجي
        if (event.user_data?.external_id) {
          cleanUserData.external_id = event.user_data.external_id;
        } else if (event.custom_data?.order_id) {
          cleanUserData.external_id = event.custom_data.order_id.toString();
        }
        
        // معلومات الشبكة
        if (clientIp) {
          cleanUserData.client_ip_address = clientIp;
        }
        
        if (event.user_data?.client_user_agent) {
          cleanUserData.client_user_agent = event.user_data.client_user_agent;
        }
        
        // معرفات Facebook (إذا كانت متوفرة)
        if (event.user_data?.fbp) {
          cleanUserData.fbp = event.user_data.fbp;
        }
        
        if (event.user_data?.fbc) {
          cleanUserData.fbc = event.user_data.fbc;
        }
        
        // معلومات جغرافية أساسية
        cleanUserData.country = ['dz'];
        
        if (event.user_data?.language) {
          cleanUserData.language = [event.user_data.language];
        }
        
        // معلومات custom_data نظيفة
        const cleanCustomData = {};
        
        if (event.custom_data?.content_ids && Array.isArray(event.custom_data.content_ids)) {
          cleanCustomData.content_ids = event.custom_data.content_ids;
        }
        
        if (event.custom_data?.content_type) {
          cleanCustomData.content_type = event.custom_data.content_type;
        }
        
        if (event.custom_data?.currency) {
          cleanCustomData.currency = event.custom_data.currency;
        }
        
        if (event.custom_data?.value && typeof event.custom_data.value === 'number') {
          cleanCustomData.value = event.custom_data.value;
        }
        
        if (event.custom_data?.order_id) {
          cleanCustomData.order_id = event.custom_data.order_id.toString();
        }
        
        return {
          event_name: event.event_name,
          event_time: event.event_time || Math.floor(Date.now() / 1000),
          event_id: event.event_id,
          action_source: 'website',
          event_source_url: event.event_source_url || 'https://app.bazaarli.com',
          user_data: cleanUserData,
          custom_data: cleanCustomData
        };
      })
    };

    // إضافة test_event_code فقط إذا كان متوفر
    if (payload.test_event_code) {
      improvedPayload.test_event_code = payload.test_event_code;
    }

    console.log('🔵 إرسال حدث محسن إلى Facebook Conversion API:', {
      pixel_id,
      api_version: 'v22.0',
      event_count: improvedPayload.data?.length || 0,
      test_event_code: improvedPayload.test_event_code,
      has_user_data: !!improvedPayload.data?.[0]?.user_data,
      user_data_keys: Object.keys(improvedPayload.data?.[0]?.user_data || {}),
      custom_data_keys: Object.keys(improvedPayload.data?.[0]?.custom_data || {}),
      client_ip: getClientIpAddress(req)
    });

    // طباعة payload للتشخيص (في وضع الاختبار فقط)
    if (improvedPayload.test_event_code) {
      console.log('🧪 Payload للتشخيص:', JSON.stringify(improvedPayload, null, 2));
    }

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
        statusText: facebookResponse.statusText,
        url: `https://graph.facebook.com/v22.0/${pixel_id}/events`,
        error: facebookData,
        request_payload_size: JSON.stringify(improvedPayload).length,
        has_test_event_code: !!improvedPayload.test_event_code
      });
      
      // معالجة أنواع الأخطاء المختلفة
      let errorMessage = 'خطأ غير معروف من Facebook';
      let errorDetails = '';
      
      if (facebookData.error) {
        errorMessage = facebookData.error.message || 'خطأ من Facebook';
        errorDetails = facebookData.error.error_user_title || facebookData.error.error_user_msg || '';
        
        // أخطاء شائعة
        if (facebookData.error.code === 100) {
          errorMessage = 'خطأ في معاملات الطلب - تحقق من صحة البيانات';
        } else if (facebookData.error.code === 190) {
          errorMessage = 'خطأ في access token - تحقق من صحة التوكن';
        } else if (facebookData.error.code === 803) {
          errorMessage = 'خطأ في بيانات user_data - تحقق من تنسيق البيانات';
        }
      }
      
      console.error('💡 تفاصيل الخطأ:', {
        error_code: facebookData.error?.code,
        error_message: errorMessage,
        error_details: errorDetails,
        error_trace: facebookData.error?.fbtrace_id
      });
      
      return res.status(facebookResponse.status).json({
        error: 'فشل في إرسال الحدث إلى Facebook',
        facebook_error: {
          code: facebookData.error?.code,
          message: errorMessage,
          details: errorDetails,
          fbtrace_id: facebookData.error?.fbtrace_id
        },
        status: facebookResponse.status,
        debug_info: {
          payload_size: JSON.stringify(improvedPayload).length,
          event_count: improvedPayload.data?.length || 0,
          has_test_code: !!improvedPayload.test_event_code
        }
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