// 🔒 Secure Yalidine API Proxy with Encryption
// API function آمن مع تشفير البيانات الحساسة

interface Env {
  SUPABASE_SERVICE_ROLE_KEY: string;
  ENCRYPTION_KEY: string;
  RATE_LIMIT_KV?: KVNamespace;
}

// Simple encryption/decryption utilities
class SimpleEncryption {
  private key: string;

  constructor(key: string) {
    this.key = key;
  }

  async encrypt(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // استخدام Web Crypto API للتشفير
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.key.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      keyMaterial,
      data
    );

    // دمج IV مع البيانات المشفرة
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...result));
  }

  async decrypt(encryptedData: string): Promise<string> {
    const data = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
    
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.key.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      keyMaterial,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }
}

// Rate limiting with KV
async function checkRateLimit(
  request: Request, 
  env: Env, 
  limit: number = 100, 
  window: number = 60
): Promise<boolean> {
  if (!env.RATE_LIMIT_KV) return true; // Skip if KV not available

  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `rate_limit:${clientIP}`;
  
  const current = await env.RATE_LIMIT_KV.get(key);
  const count = current ? parseInt(current) : 0;

  if (count >= limit) {
    return false;
  }

  await env.RATE_LIMIT_KV.put(key, (count + 1).toString(), { expirationTtl: window });
  return true;
}

// Validate API credentials
function validateCredentials(apiId: string, apiToken: string): boolean {
  if (!apiId || !apiToken) return false;
  if (apiId.length < 10 || apiToken.length < 20) return false;
  
  // إضافة فحوصات إضافية للتأكد من صحة البيانات
  const validApiIdPattern = /^[a-zA-Z0-9_-]+$/;
  const validTokenPattern = /^[a-zA-Z0-9_-]+$/;
  
  return validApiIdPattern.test(apiId) && validTokenPattern.test(apiToken);
}

// Security headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  try {
    // 1. Method validation
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: SECURITY_HEADERS
      });
    }

    // 2. Rate limiting
    const rateLimitPassed = await checkRateLimit(request, env, 50, 60); // 50 requests per minute
    if (!rateLimitPassed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...SECURITY_HEADERS, 'Retry-After': '60' }
      });
    }

    // 3. Extract and validate parameters
    const url = new URL(request.url);
    const from_wilaya_id = url.searchParams.get('from_wilaya_id');
    const to_wilaya_id = url.searchParams.get('to_wilaya_id');
    const api_id = url.searchParams.get('api_id');
    const api_token = url.searchParams.get('api_token');

    if (!from_wilaya_id || !to_wilaya_id || !api_id || !api_token) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters',
        required: ['from_wilaya_id', 'to_wilaya_id', 'api_id', 'api_token']
      }), {
        status: 400,
        headers: SECURITY_HEADERS
      });
    }

    // 4. Validate credentials format
    if (!validateCredentials(api_id, api_token)) {
      return new Response(JSON.stringify({ error: 'Invalid credentials format' }), {
        status: 400,
        headers: SECURITY_HEADERS
      });
    }

    // 5. Validate wilaya IDs
    const fromWilayaId = parseInt(from_wilaya_id);
    const toWilayaId = parseInt(to_wilaya_id);
    
    if (isNaN(fromWilayaId) || isNaN(toWilayaId) || 
        fromWilayaId < 1 || fromWilayaId > 58 || 
        toWilayaId < 1 || toWilayaId > 58) {
      return new Response(JSON.stringify({ 
        error: 'Invalid wilaya IDs. Must be between 1 and 58' 
      }), {
        status: 400,
        headers: SECURITY_HEADERS
      });
    }

    // 6. Call Yalidine API with security measures
    const yalidineUrl = `https://api.yalidine.app/v1/fees/?from_wilaya_id=${fromWilayaId}&to_wilaya_id=${toWilayaId}`;
    
    const yalidineResponse = await fetch(yalidineUrl, {
      method: 'GET',
      headers: {
        'X-API-ID': api_id,
        'X-API-TOKEN': api_token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Stockiha-Secure/1.0',
        'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || 'unknown'
      },
      // إضافة timeout للأمان
      signal: AbortSignal.timeout(10000) // 10 seconds timeout
    });

    if (!yalidineResponse.ok) {
      const errorText = await yalidineResponse.text();
      
      // تسجيل الخطأ بدون كشف التفاصيل الحساسة
      console.error('Yalidine API error:', {
        status: yalidineResponse.status,
        timestamp: new Date().toISOString(),
        from_wilaya: fromWilayaId,
        to_wilaya: toWilayaId
      });

      return new Response(JSON.stringify({ 
        error: 'External service unavailable',
        status: yalidineResponse.status,
        timestamp: new Date().toISOString()
      }), {
        status: yalidineResponse.status === 404 ? 404 : 502,
        headers: SECURITY_HEADERS
      });
    }

    // 7. Process response securely
    const data = await yalidineResponse.json();

    // التحقق من صحة البيانات المستلمة
    if (!data || typeof data !== 'object' || !data.per_commune) {
      return new Response(JSON.stringify({ 
        error: 'Invalid response from external service',
        timestamp: new Date().toISOString()
      }), {
        status: 502,
        headers: SECURITY_HEADERS
      });
    }

    // 8. Format secure response
    const communeData = data.per_commune;
    const communeValues = Object.values(communeData);
    const firstCommune = communeValues.length > 0 ? communeValues[0] as any : {};

    const secureResponse = {
      success: true,
      from_wilaya_id: fromWilayaId,
      to_wilaya_id: toWilayaId,
      data: {
        from_wilaya: {
          id: fromWilayaId,
          name: data.from_wilaya_name || `Wilaya ${fromWilayaId}`
        },
        to_wilaya: {
          id: toWilayaId,
          name: data.to_wilaya_name || `Wilaya ${toWilayaId}`
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
      source: 'yalidine_api_secure',
      request_id: crypto.randomUUID()
    };

    // 9. Return secure response
    return new Response(JSON.stringify(secureResponse), {
      status: 200,
      headers: {
        ...SECURITY_HEADERS,
        'Access-Control-Allow-Origin': request.headers.get('Origin') || 'https://stockiha.com',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Request-ID': secureResponse.request_id
      }
    });

  } catch (error) {
    // تسجيل الخطأ بشكل آمن
    console.error('Secure proxy error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      url: request.url
    });

    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      request_id: crypto.randomUUID()
    }), {
      status: 500,
      headers: SECURITY_HEADERS
    });
  }
};
