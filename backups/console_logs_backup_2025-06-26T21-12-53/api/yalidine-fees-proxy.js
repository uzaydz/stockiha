export default async function handler(req, res) {
  // السماح فقط بطلبات GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { from_wilaya_id, to_wilaya_id, api_id, api_token } = req.query;

  // التحقق من المعاملات المطلوبة
  if (!from_wilaya_id || !to_wilaya_id || !api_id || !api_token) {
    return res.status(400).json({ 
      error: 'Missing required parameters: from_wilaya_id, to_wilaya_id, api_id, api_token' 
    });
  }

  try {
    console.log(`🌐 Proxy request to Yalidine API: from=${from_wilaya_id}, to=${to_wilaya_id}`);
    
    // إنشاء URL لـ API ياليدين
    const yalidineUrl = `https://api.yalidine.app/v1/fees/?from_wilaya_id=${from_wilaya_id}&to_wilaya_id=${to_wilaya_id}`;
    
    // إرسال الطلب إلى API ياليدين
    const response = await fetch(yalidineUrl, {
      method: 'GET',
      headers: {
        'X-API-ID': api_id,
        'X-API-TOKEN': api_token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Bazaar-Console/1.0'
      }
    });

    console.log(`📡 Yalidine API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Yalidine API error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ 
        error: 'Yalidine API error', 
        status: response.status,
        details: errorText 
      });
    }

    // قراءة الاستجابة
    const data = await response.json();
    console.log(`📊 Yalidine API data:`, JSON.stringify(data, null, 2));

    // التحقق من صحة البيانات المستلمة
    if (!data || Object.keys(data).length === 0 || !data.per_commune) {
      console.warn(`⚠️ Empty or invalid response from Yalidine API`);
      return res.status(404).json({ 
        error: 'No fees data available for this route',
        from_wilaya_id: parseInt(from_wilaya_id),
        to_wilaya_id: parseInt(to_wilaya_id),
        raw_data: data
      });
    }

    // تحويل البيانات إلى التنسيق المتوقع
    const communeData = data.per_commune;
    const firstCommune = Object.values(communeData)[0];
    
    // إنشاء استجابة موحدة بالتنسيق المتوقع
    const responseData = {
      success: true,
      from_wilaya_id: parseInt(from_wilaya_id),
      to_wilaya_id: parseInt(to_wilaya_id),
      data: {
        from_wilaya: {
          id: parseInt(from_wilaya_id),
          name: data.from_wilaya_name || `Wilaya ${from_wilaya_id}`
        },
        to_wilaya: {
          id: parseInt(to_wilaya_id),
          name: data.to_wilaya_name || `Wilaya ${to_wilaya_id}`
        },
        fees: {
          home_delivery: {
            price: firstCommune?.express_home || 500,
            currency: "DZD",
            description: "التوصيل للمنزل"
          },
          stopdesk_delivery: {
            price: firstCommune?.express_desk || 350,
            currency: "DZD",
            description: "التوصيل لمكتب التوقف"
          }
        },
        zone: data.zone || 1,
        estimated_delivery_days: "1-3",
        insurance_rate: data.insurance_percentage ? `${data.insurance_percentage}%` : "1%",
        max_weight: "30kg",
        max_dimensions: "100x100x100cm",
        per_commune: communeData,
        cod_percentage: data.cod_percentage,
        retour_fee: data.retour_fee,
        oversize_fee: data.oversize_fee
      },
      timestamp: new Date().toISOString(),
      source: 'yalidine_api_direct'
    };

    console.log(`✅ Proxy response successful:`, JSON.stringify(responseData, null, 2));

    // إعداد CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json(responseData);

  } catch (error) {
    console.error(`💥 Proxy error:`, error);
    return res.status(500).json({ 
      error: 'Internal proxy error', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 