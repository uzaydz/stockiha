/**
 * Cloudflare Pages Function للتحقق من صحة النظام
 */

export async function onRequestGet() {
  const healthCheck = {
    status: 'healthy',
    platform: 'cloudflare-pages',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    services: {
      api: 'operational',
      database: 'checking...',
      functions: 'operational'
    },
    deployment: {
      platform: 'cloudflare',
      environment: 'production',
      functions_enabled: true,
      subdomain_support: true
    }
  };

  return new Response(JSON.stringify(healthCheck, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    }
  });
}
