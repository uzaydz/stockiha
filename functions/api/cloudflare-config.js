/**
 * Cloudflare Pages Function - للتحقق من إعدادات Cloudflare
 */

export async function onRequest(context) {
  const { request, env } = context;

  // السماح بالطرق GET فقط
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    // الحصول على متغيرات البيئة من Cloudflare Pages
    const CLOUDFLARE_API_TOKEN = env.CF_API_TOKEN || env.CLOUDFLARE_API_TOKEN || env.VITE_CLOUDFLARE_API_TOKEN;
    const CLOUDFLARE_ZONE_ID = env.CF_ZONE_ID || env.CLOUDFLARE_ZONE_ID || env.VITE_CLOUDFLARE_ZONE_ID;
    const CLOUDFLARE_PROJECT_NAME = env.CF_PROJECT_NAME || env.CLOUDFLARE_PROJECT_NAME || env.VITE_CLOUDFLARE_PROJECT_NAME;

    // التحقق من توفر جميع المتغيرات المطلوبة
    const hasConfig = !!(
      CLOUDFLARE_API_TOKEN &&
      CLOUDFLARE_ZONE_ID &&
      CLOUDFLARE_PROJECT_NAME
    );

    // إرجاع النتيجة
    return new Response(JSON.stringify({
      success: true,
      hasConfig: hasConfig,
      config: {
        hasToken: !!CLOUDFLARE_API_TOKEN,
        hasZoneId: !!CLOUDFLARE_ZONE_ID,
        hasProjectName: !!CLOUDFLARE_PROJECT_NAME,
        projectName: CLOUDFLARE_PROJECT_NAME || null
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('خطأ في Cloudflare Pages Function cloudflare-config:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      hasConfig: false
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}
