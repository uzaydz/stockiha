// Cloudflare Pages Function - Yalidine Fees Proxy
// محول من Vercel API إلى Cloudflare Pages Function

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // السماح فقط بطلبات GET
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const from_wilaya_id = url.searchParams.get('from_wilaya_id');
  const to_wilaya_id = url.searchParams.get('to_wilaya_id');
  const api_id = url.searchParams.get('api_id');
  const api_token = url.searchParams.get('api_token');

  // التحقق من المعاملات المطلوبة
  if (!from_wilaya_id || !to_wilaya_id || !api_id || !api_token) {
    return new Response(JSON.stringify({ 
      error: 'Missing required parameters: from_wilaya_id, to_wilaya_id, api_id, api_token' 
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
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
        'User-Agent': 'Stockiha-Console/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ 
        error: 'Yalidine API error', 
        status: response.status,
        statusText: response.statusText,
        details: errorText 
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // قراءة الاستجابة
    const data = await response.json();

    // التحقق من صحة البيانات المستلمة
    if (!data || Object.keys(data).length === 0 || !data.per_commune) {
      return new Response(JSON.stringify({ 
        error: 'No fees data available for this route',
        from_wilaya_id: parseInt(from_wilaya_id),
        to_wilaya_id: parseInt(to_wilaya_id),
        raw_data: data
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // تحويل البيانات إلى التنسيق المتوقع
    const communeData = data.per_commune;
    const communeValues = Object.values(communeData);
    const firstCommune = communeValues.length > 0 ? communeValues[0] : {};

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
      source: 'yalidine_api_cloudflare'
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal proxy error', 
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};
