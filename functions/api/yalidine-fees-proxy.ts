/**
 * Cloudflare Pages Function لـ Yalidine API Proxy
 * يحل محل Vercel API Route
 */

interface Env {
  // يمكن إضافة متغيرات البيئة هنا إذا لزم الأمر
}

export async function onRequestGet(context: {
  request: Request;
  env: Env;
  params: any;
  waitUntil: (promise: Promise<any>) => void;
}) {
  const { request } = context;
  const url = new URL(request.url);
  
  try {
    // استخراج المعاملات من URL
    const fromWilayaId = url.searchParams.get('from_wilaya_id');
    const toWilayaId = url.searchParams.get('to_wilaya_id');
    const apiId = url.searchParams.get('api_id');
    const apiToken = url.searchParams.get('api_token');

    if (!fromWilayaId || !toWilayaId || !apiId || !apiToken) {
      return new Response(
        JSON.stringify({
          error: true,
          message: 'المعاملات المطلوبة مفقودة: from_wilaya_id, to_wilaya_id, api_id, api_token'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-API-ID, X-API-TOKEN'
          }
        }
      );
    }

    // إنشاء URL للـ Yalidine API
    const yalidineUrl = new URL('https://api.yalidine.app/v1/deliveryfees');
    yalidineUrl.searchParams.set('from_wilaya_id', fromWilayaId);
    yalidineUrl.searchParams.set('to_wilaya_id', toWilayaId);

    // طلب إلى Yalidine API
    const yalidineResponse = await fetch(yalidineUrl.toString(), {
      method: 'GET',
      headers: {
        'X-API-ID': apiId,
        'X-API-TOKEN': apiToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    const data = await yalidineResponse.json();

    return new Response(JSON.stringify(data), {
      status: yalidineResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-ID, X-API-TOKEN',
        'Access-Control-Expose-Headers': 'day-quota-left, hour-quota-left, minute-quota-left, second-quota-left',
        // نسخ headers الخاصة بـ rate limiting
        ...(yalidineResponse.headers.get('day-quota-left') && {
          'day-quota-left': yalidineResponse.headers.get('day-quota-left')!
        }),
        ...(yalidineResponse.headers.get('hour-quota-left') && {
          'hour-quota-left': yalidineResponse.headers.get('hour-quota-left')!
        }),
        ...(yalidineResponse.headers.get('minute-quota-left') && {
          'minute-quota-left': yalidineResponse.headers.get('minute-quota-left')!
        }),
        ...(yalidineResponse.headers.get('second-quota-left') && {
          'second-quota-left': yalidineResponse.headers.get('second-quota-left')!
        })
      }
    });

  } catch (error) {
    console.error('خطأ في Yalidine API Proxy:', error);
    
    return new Response(
      JSON.stringify({
        error: true,
        message: 'خطأ في الاتصال بـ API ياليدين',
        details: error instanceof Error ? error.message : 'خطأ غير معروف',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

// دعم POST requests أيضاً
export async function onRequestPost(context: {
  request: Request;
  env: Env;
  params: any;
  waitUntil: (promise: Promise<any>) => void;
}) {
  const { request } = context;
  
  try {
    const body = await request.json();
    const { from_wilaya_id, to_wilaya_id, api_id, api_token } = body;

    if (!from_wilaya_id || !to_wilaya_id || !api_id || !api_token) {
      return new Response(
        JSON.stringify({
          error: true,
          message: 'المعاملات المطلوبة مفقودة في body'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // إنشاء URL للـ Yalidine API
    const yalidineUrl = new URL('https://api.yalidine.app/v1/deliveryfees');
    yalidineUrl.searchParams.set('from_wilaya_id', from_wilaya_id);
    yalidineUrl.searchParams.set('to_wilaya_id', to_wilaya_id);

    const yalidineResponse = await fetch(yalidineUrl.toString(), {
      method: 'GET',
      headers: {
        'X-API-ID': api_id,
        'X-API-TOKEN': api_token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const data = await yalidineResponse.json();

    return new Response(JSON.stringify(data), {
      status: yalidineResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-ID, X-API-TOKEN'
      }
    });

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: true,
        message: 'خطأ في معالجة الطلب',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

// دعم OPTIONS للـ CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-ID, X-API-TOKEN',
      'Access-Control-Max-Age': '86400'
    }
  });
}