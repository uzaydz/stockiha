/**
 * Cloudflare Pages Function للتحقق من النطاقات
 * يحل محل Vercel domain verification API
 */

interface Env {
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

interface CloudflareDNSRecord {
  type: string;
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
  params: any;
  waitUntil: (promise: Promise<any>) => void;
}) {
  const { request, env } = context;
  
  try {
    const { customDomain, organizationId, action } = await request.json();

    if (!customDomain || !organizationId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'البيانات المطلوبة غير مكتملة. يرجى توفير customDomain و organizationId.'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // تنظيف النطاق
    const cleanDomain = customDomain.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();

    if (action === 'verify') {
      return await verifyDomain(cleanDomain, organizationId, env);
    } else if (action === 'setup') {
      return await setupDomain(cleanDomain, organizationId, env);
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'نوع العملية غير مدعوم. استخدم verify أو setup'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('خطأ في التحقق من النطاق:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'حدث خطأ في معالجة الطلب',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function verifyDomain(domain: string, organizationId: string, env: Env) {
  try {
    // التحقق من إعدادات DNS
    const dnsCheck = await checkDNSRecords(domain);
    
    if (dnsCheck.isValid) {
      // تحديث قاعدة البيانات
      if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabaseResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/organizations?id=eq.${organizationId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({
            domain: domain,
            domain_verified: true,
            domain_verified_at: new Date().toISOString()
          })
        });

        if (!supabaseResponse.ok) {
          throw new Error('فشل في تحديث قاعدة البيانات');
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'تم التحقق من النطاق بنجاح',
          domain: domain,
          verified: true,
          dns_records: dnsCheck.records
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'فشل التحقق من النطاق',
          message: 'إعدادات DNS غير صحيحة',
          required_records: [
            {
              type: 'CNAME',
              name: domain,
              value: 'stockiha.pages.dev',
              note: 'أضف هذا السجل في إعدادات DNS الخاصة بك'
            }
          ],
          current_records: dnsCheck.records
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    throw error;
  }
}

async function setupDomain(domain: string, organizationId: string, env: Env) {
  try {
    // إضافة النطاق إلى Cloudflare Zone (إذا كان متوفراً)
    if (env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ZONE_ID) {
      const dnsRecord: CloudflareDNSRecord = {
        type: 'CNAME',
        name: domain,
        content: 'stockiha.pages.dev',
        ttl: 1, // Auto TTL
        proxied: true
      };

      const cloudflareResponse = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dnsRecord)
        }
      );

      const cloudflareData = await cloudflareResponse.json();

      if (cloudflareResponse.ok) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'تم إعداد النطاق بنجاح في Cloudflare',
            domain: domain,
            dns_record: cloudflareData.result
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      } else {
        throw new Error(`Cloudflare API Error: ${cloudflareData.errors?.[0]?.message || 'خطأ غير معروف'}`);
      }
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'تعليمات إعداد النطاق',
          domain: domain,
          instructions: [
            {
              step: 1,
              title: 'إضافة سجل CNAME',
              description: 'في إعدادات DNS الخاصة بمزود النطاق',
              record: {
                type: 'CNAME',
                name: domain,
                value: 'stockiha.pages.dev'
              }
            },
            {
              step: 2,
              title: 'انتظار انتشار DNS',
              description: 'قد يستغرق الأمر حتى 24 ساعة'
            },
            {
              step: 3,
              title: 'التحقق من النطاق',
              description: 'استخدم API التحقق بعد انتشار DNS'
            }
          ]
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    throw error;
  }
}

async function checkDNSRecords(domain: string) {
  try {
    // استخدام DNS over HTTPS للتحقق من السجلات
    const dnsResponse = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=CNAME`,
      {
        headers: {
          'Accept': 'application/dns-json'
        }
      }
    );

    const dnsData = await dnsResponse.json();
    
    let isValid = false;
    const records = [];

    if (dnsData.Answer) {
      for (const record of dnsData.Answer) {
        records.push({
          type: record.type === 5 ? 'CNAME' : 'A',
          name: record.name,
          value: record.data
        });

        // التحقق من وجود CNAME يشير إلى stockiha.pages.dev
        if (record.type === 5 && record.data.includes('stockiha.pages.dev')) {
          isValid = true;
        }
      }
    }

    return {
      isValid,
      records
    };

  } catch (error) {
    console.error('خطأ في فحص DNS:', error);
    return {
      isValid: false,
      records: [],
      error: error instanceof Error ? error.message : 'خطأ في فحص DNS'
    };
  }
}

// دعم OPTIONS للـ CORS
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
