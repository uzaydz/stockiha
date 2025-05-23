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

        // معالجة user_data مع تحسينات شاملة
        const userData = {
          // البيانات المُجمعة من العميل (مع hashing في server)
          em: improvedUserData.em?.[0] ? hashData(improvedUserData.em[0]) : undefined,
          ph: improvedUserData.ph?.[0] ? hashData(improvedUserData.ph[0]) : undefined,
          
          // معرف خارجي - استخدام order_id أو إنشاء معرف فريد
          external_id: event.custom_data?.order_id || event.custom_data?.customer_id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          
          // معلومات الشبكة والمتصفح (أهم نقطة للتحسين)
          client_ip_address: getClientIpAddress(req), // IP الحقيقي من server
          client_user_agent: event.user_data?.client_user_agent,
          
          // معرفات Facebook
          fbc: event.user_data?.fbc, // Facebook Click ID
          fbp: event.user_data?.fbp, // Facebook Browser ID
          
          // معلومات جغرافية ولغوية محسنة
          country: 'dz', // كود الدولة (الجزائر)
          language: event.user_data?.language || 'ar',
          timezone: event.user_data?.timezone || 'Africa/Algiers',
          
          // معلومات إضافية للمطابقة المتقدمة
          currency: event.custom_data?.currency || 'DZD',
          
          // معلومات الجهاز (إذا كانت متوفرة)
          ...(event.user_data?.device_info && {
            device_id: event.user_data.device_info.device_id,
            device_model: event.user_data.device_info.model,
            device_os: event.user_data.device_info.os
          })
        };

        return {
          ...event,
          user_data: userData,
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