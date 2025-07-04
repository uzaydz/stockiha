/**
 * وسيط API ياليدين
 * 
 * هذا الملف يقوم بإعادة توجيه طلبات API ياليدين من خلال الخادم الخاص بنا
 * لحل مشاكل CORS وطلبات preflight
 */

import axios from 'axios';

export default async function handler(req, res) {
  // السماح بجميع طرق HTTP المطلوبة
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-API-ID, X-API-TOKEN, Content-Type, Cache-Control, Accept');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 ساعة - لتخزين preflight للتقليل من الطلبات المكررة
  
  // معالجة طلبات OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    // استخراج المسار من الطلب
    const endpoint = req.url.replace('/api/yalidine-proxy', '');
    const apiUrl = `https://api.yalidine.app/v1${endpoint}`;
    
    // الحصول على رؤوس API من الطلب
    const apiId = req.headers['x-api-id'];
    const apiToken = req.headers['x-api-token'];
    
    if (!apiId || !apiToken) {
      return res.status(400).json({ 
        error: true, 
        message: 'X-API-ID و X-API-TOKEN مطلوبان' 
      });
    }
    
    // إعداد خيارات الطلب
    const options = {
      method: req.method,
      url: apiUrl,
      headers: {
        'X-API-ID': apiId,
        'X-API-TOKEN': apiToken,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // زيادة وقت الانتظار إلى 30 ثانية
    };
    
    // إضافة البيانات للطلبات POST و PUT
    if (['POST', 'PUT'].includes(req.method) && req.body) {
      options.data = req.body;
    }
    
    // إعادة توجيه الطلب إلى API ياليدين
    
    const response = await axios(options);
    
    // إرسال الاستجابة إلى العميل
    return res.status(response.status).json(response.data);
  } catch (error) {
    
    // التحقق من نوع الخطأ والاستجابة بشكل مناسب
    if (error.response) {
      // الخطأ من الخادم البعيد - إرجاع نفس الحالة والرسالة
      return res.status(error.response.status).json({
        error: true,
        message: error.message,
        details: error.response.data
      });
    } else if (error.request) {
      // لم يتم استلام استجابة - خطأ شبكة محتمل
      return res.status(503).json({
        error: true,
        message: 'فشل الاتصال بخادم API ياليدين',
        details: error.message
      });
    } else {
      // خطأ آخر في إعداد الطلب
      return res.status(500).json({
        error: true,
        message: 'خطأ في معالجة الطلب',
        details: error.message
      });
    }
  }
}
