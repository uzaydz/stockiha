/**
 * Facebook Conversion API endpoint
 * POST /api/facebook-conversion-api
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
    const { pixel_id, access_token, payload } = req.body;

    if (!pixel_id || !access_token || !payload) {
      return res.status(400).json({
        error: 'معاملات مطلوبة مفقودة: pixel_id, access_token, payload'
      });
    }

    console.log('🔵 إرسال حدث إلى Facebook Conversion API:', {
      pixel_id,
      event_count: payload.data?.length || 0
    });

    // إرسال إلى Facebook Conversion API
    const facebookResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pixel_id}/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(payload)
      }
    );

    const facebookData = await facebookResponse.json();

    if (facebookResponse.ok) {
      console.log('✅ تم إرسال الحدث إلى Facebook بنجاح:', facebookData);
      return res.status(200).json({
        success: true,
        facebook_response: facebookData,
        events_received: facebookData.events_received || 0,
        messages: facebookData.messages || []
      });
    } else {
      console.error('❌ خطأ من Facebook Conversion API:', facebookData);
      return res.status(400).json({
        error: 'فشل في إرسال الحدث إلى Facebook',
        facebook_error: facebookData
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