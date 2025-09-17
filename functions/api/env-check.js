/**
 * Cloudflare Pages Function - للتحقق من المتغيرات البيئية
 */

export async function onRequest(context) {
  const { request, env } = context;

  try {
    const response = {
      timestamp: new Date().toISOString(),
      environment: {
        CF_API_TOKEN: env.CF_API_TOKEN ? '***' + env.CF_API_TOKEN.slice(-4) : null,
        CF_ZONE_ID: env.CF_ZONE_ID,
        CF_PROJECT_NAME: env.CF_PROJECT_NAME,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN ? '***' + env.CLOUDFLARE_API_TOKEN.slice(-4) : null,
        CLOUDFLARE_ZONE_ID: env.CLOUDFLARE_ZONE_ID,
        CLOUDFLARE_PROJECT_NAME: env.CLOUDFLARE_PROJECT_NAME,
        VITE_CLOUDFLARE_API_TOKEN: env.VITE_CLOUDFLARE_API_TOKEN ? '***' + env.VITE_CLOUDFLARE_API_TOKEN.slice(-4) : null,
        VITE_CLOUDFLARE_ZONE_ID: env.VITE_CLOUDFLARE_ZONE_ID,
        VITE_CLOUDFLARE_PROJECT_NAME: env.VITE_CLOUDFLARE_PROJECT_NAME,
      },
      hasConfig: !!(
        (env.CF_API_TOKEN || env.CLOUDFLARE_API_TOKEN || env.VITE_CLOUDFLARE_API_TOKEN) &&
        (env.CF_ZONE_ID || env.CLOUDFLARE_ZONE_ID || env.VITE_CLOUDFLARE_ZONE_ID) &&
        (env.CF_PROJECT_NAME || env.CLOUDFLARE_PROJECT_NAME || env.VITE_CLOUDFLARE_PROJECT_NAME)
      ),
      request: {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries())
      }
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('خطأ في Cloudflare Pages Function env-check:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
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
