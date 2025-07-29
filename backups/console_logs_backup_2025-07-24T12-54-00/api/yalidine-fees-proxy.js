export default async function handler(req, res) {
  // إعداد CORS headers أولاً
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // السماح فقط بطلبات GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { from_wilaya_id, to_wilaya_id, api_id, api_token } = req.query;

  console.log('🌐 [YalidineProxy] Request received:', {
    from_wilaya_id,
    to_wilaya_id,
    hasApiId: !!api_id,
    hasApiToken: !!api_token,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  // التحقق من المعاملات المطلوبة
  if (!from_wilaya_id || !to_wilaya_id || !api_id || !api_token) {
    console.error('❌ [YalidineProxy] Missing parameters:', {
      from_wilaya_id: !!from_wilaya_id,
      to_wilaya_id: !!to_wilaya_id,
      api_id: !!api_id,
      api_token: !!api_token
    });
    return res.status(400).json({ 
      error: 'Missing required parameters: from_wilaya_id, to_wilaya_id, api_id, api_token' 
    });
  }

  try {
    console.log('🔄 [YalidineProxy] Starting API call process');
    
    // إنشاء URL لـ API ياليدين
    const yalidineUrl = `https://api.yalidine.app/v1/fees/?from_wilaya_id=${from_wilaya_id}&to_wilaya_id=${to_wilaya_id}`;
    console.log('🔗 [YalidineProxy] Yalidine URL:', yalidineUrl);
    
    // إرسال الطلب إلى API ياليدين
    console.log('📞 [YalidineProxy] Making fetch request with credentials:', {
      hasApiId: !!api_id,
      hasApiToken: !!api_token,
      apiIdLength: api_id ? api_id.length : 0,
      apiTokenLength: api_token ? api_token.length : 0
    });
    
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

    console.log('📡 [YalidineProxy] Response received:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type')
    });

    if (!response.ok) {
      console.error('❌ [YalidineProxy] Bad response from Yalidine API');
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: 'Yalidine API error', 
        status: response.status,
        statusText: response.statusText,
        details: errorText 
      });
    }

    // قراءة الاستجابة
    console.log('📖 [YalidineProxy] Parsing JSON response');
    const data = await response.json();
    
    console.log('📦 [YalidineProxy] API Response:', {
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      hasPerCommune: !!(data && data.per_commune),
      communeCount: data && data.per_commune ? Object.keys(data.per_commune).length : 0
    });

    // التحقق من صحة البيانات المستلمة
    if (!data || Object.keys(data).length === 0 || !data.per_commune) {
      console.error('❌ [YalidineProxy] Invalid data structure');
      return res.status(404).json({ 
        error: 'No fees data available for this route',
        from_wilaya_id: parseInt(from_wilaya_id),
        to_wilaya_id: parseInt(to_wilaya_id),
        raw_data: data
      });
    }

    // تحويل البيانات إلى التنسيق المتوقع
    const communeData = data.per_commune;
    const communeValues = Object.values(communeData);
    const firstCommune = communeValues.length > 0 ? communeValues[0] : {};
    
    console.log('🏘️ [YalidineProxy] Commune Data:', {
      communeCount: communeValues.length,
      firstCommuneKeys: firstCommune ? Object.keys(firstCommune) : [],
      hasExpressHome: !!(firstCommune && firstCommune.express_home),
      hasExpressDesk: !!(firstCommune && firstCommune.express_desk),
      expressHome: firstCommune ? firstCommune.express_home : 'undefined',
      expressDesk: firstCommune ? firstCommune.express_desk : 'undefined'
    });
    
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
            price: (firstCommune && firstCommune.express_home) ? firstCommune.express_home : 500,
            currency: "DZD",
            description: "التوصيل للمنزل"
          },
          stopdesk_delivery: {
            price: (firstCommune && firstCommune.express_desk) ? firstCommune.express_desk : 350,
            currency: "DZD",
            description: "التوصيل لمكتب التوقف"
          }
        },
        zone: data.zone || 1,
        estimated_delivery_days: "1-3",
        insurance_rate: data.insurance_percentage ? (data.insurance_percentage + "%") : "1%",
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

    console.log('✅ [YalidineProxy] Success:', {
      from_wilaya_id: parseInt(from_wilaya_id),
      to_wilaya_id: parseInt(to_wilaya_id),
      communeCount: Object.keys(communeData).length,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('🔥 [YalidineProxy] Error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({ 
      error: 'Internal proxy error', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
