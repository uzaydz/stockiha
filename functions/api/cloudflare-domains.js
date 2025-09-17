/**
 * Cloudflare Pages Function - للتعامل مع عمليات النطاقات في Cloudflare Pages
 */

export async function onRequest(context) {
  const { request, env } = context;

  // السماح بالطرق POST فقط
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    const { action, domain } = await request.json();

    if (!action) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Action parameter is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // الحصول على متغيرات البيئة من Cloudflare Pages
    const CLOUDFLARE_API_TOKEN = env.CF_API_TOKEN || env.CLOUDFLARE_API_TOKEN || env.VITE_CLOUDFLARE_API_TOKEN;
    const CLOUDFLARE_ZONE_ID = env.CF_ZONE_ID || env.CLOUDFLARE_ZONE_ID || env.VITE_CLOUDFLARE_ZONE_ID;
    const CLOUDFLARE_PROJECT_NAME = env.CF_PROJECT_NAME || env.CLOUDFLARE_PROJECT_NAME || env.VITE_CLOUDFLARE_PROJECT_NAME;

    // التحقق من توفر المتغيرات المطلوبة
    if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ZONE_ID || !CLOUDFLARE_PROJECT_NAME) {
      return new Response(JSON.stringify({
        success: false,
        error: 'إعدادات Cloudflare غير متوفرة. يرجى إضافة VITE_CLOUDFLARE_API_TOKEN و VITE_CLOUDFLARE_PROJECT_NAME و VITE_CLOUDFLARE_ZONE_ID.'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    const CLOUDFLARE_API_URL = 'https://api.cloudflare.com/client/v4';

    switch (action) {
      case 'add-domain':
        return await handleAddDomain(request, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, CLOUDFLARE_PROJECT_NAME, CLOUDFLARE_API_URL, domain);

      case 'remove-domain':
        return await handleRemoveDomain(request, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, CLOUDFLARE_PROJECT_NAME, CLOUDFLARE_API_URL, domain);

      case 'verify-domain':
        return await handleVerifyDomain(request, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, CLOUDFLARE_PROJECT_NAME, CLOUDFLARE_API_URL, domain);

      case 'get-cname-target':
        return await handleGetCnameTarget(request, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, CLOUDFLARE_PROJECT_NAME, CLOUDFLARE_API_URL, domain);

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Unknown action: ${action}`
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
    }

  } catch (error) {
    console.error('خطأ في Cloudflare Pages Function cloudflare-domains:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}

/**
 * إضافة نطاق إلى Cloudflare Pages
 */
async function handleAddDomain(request, token, zoneId, projectName, apiUrl, domain) {
  if (!domain) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Domain parameter is required'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    // إضافة النطاق إلى Cloudflare Pages
    const response = await fetch(`${apiUrl}/accounts/${zoneId}/pages/projects/${projectName}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: domain
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cloudflare API Error (add-domain):', data);
      return new Response(JSON.stringify({
        success: false,
        error: data.errors?.[0]?.message || 'فشل في إضافة النطاق إلى Cloudflare',
        details: data
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: data.result,
      message: 'تم إضافة النطاق بنجاح'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Error adding domain:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'فشل في إضافة النطاق'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}

/**
 * إزالة نطاق من Cloudflare Pages
 */
async function handleRemoveDomain(request, token, zoneId, projectName, apiUrl, domain) {
  if (!domain) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Domain parameter is required'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    // إزالة النطاق من Cloudflare Pages
    const response = await fetch(`${apiUrl}/accounts/${zoneId}/pages/projects/${projectName}/domains/${domain}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    // حتى لو فشل الحذف من Cloudflare (النطاق غير موجود)، نعتبر العملية ناجحة
    if (!response.ok) {
      console.warn('⚠️ فشل حذف النطاق من Cloudflare (ربما غير موجود):', data);
      return new Response(JSON.stringify({
        success: true,
        message: 'النطاق غير موجود في Cloudflare (ربما تم حذفه مسبقاً)'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: data.result,
      message: 'تم إزالة النطاق بنجاح'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Error removing domain:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'فشل في إزالة النطاق'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}

/**
 * التحقق من حالة النطاق
 */
async function handleVerifyDomain(request, token, zoneId, projectName, apiUrl, domain) {
  if (!domain) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Domain parameter is required'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    // التحقق من حالة النطاق
    const response = await fetch(`${apiUrl}/accounts/${zoneId}/pages/projects/${projectName}/domains/${domain}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cloudflare API Error (verify-domain):', data);
      return new Response(JSON.stringify({
        success: false,
        error: data.errors?.[0]?.message || 'فشل في التحقق من حالة النطاق',
        details: data
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    const domainData = data.result;
    const isVerified = domainData.status === 'active';
    const sslStatus = domainData.ssl_status || 'pending';

    return new Response(JSON.stringify({
      success: true,
      data: {
        domain: domain,
        status: domainData.status,
        verified: isVerified,
        ssl_status: sslStatus,
        verification_data: domainData.verification_data,
        cname_target: domainData.cname_target
      },
      message: isVerified ? 'النطاق مفعل ويعمل بشكل صحيح' : 'النطاق قيد المعالجة'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Error verifying domain:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'فشل في التحقق من حالة النطاق'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}

/**
 * الحصول على CNAME target للنطاق
 */
async function handleGetCnameTarget(request, token, zoneId, projectName, apiUrl, domain) {
  if (!domain) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Domain parameter is required'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    // الحصول على معلومات النطاق
    const response = await fetch(`${apiUrl}/accounts/${zoneId}/pages/projects/${projectName}/domains/${domain}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cloudflare API Error (get-cname-target):', data);
      return new Response(JSON.stringify({
        success: false,
        error: data.errors?.[0]?.message || 'فشل في الحصول على CNAME target',
        details: data
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    const domainData = data.result;

    return new Response(JSON.stringify({
      success: true,
      data: {
        cname_target: domainData.cname_target,
        domain: domain,
        status: domainData.status
      },
      message: 'تم الحصول على CNAME target بنجاح'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Error getting CNAME target:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'فشل في الحصول على CNAME target'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}
