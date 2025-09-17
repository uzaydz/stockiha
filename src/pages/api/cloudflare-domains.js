/**
 * API Route للتعامل مع عمليات النطاقات في Cloudflare Pages
 * يدعم: إضافة النطاق، إزالة النطاق، التحقق من حالة النطاق، الحصول على CNAME target
 */

export default async function handler(req, res) {
  // السماح بالطرق POST فقط
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { action, domain } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action parameter is required'
      });
    }

    // الحصول على متغيرات البيئة
    const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.VITE_CLOUDFLARE_API_TOKEN;
    const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || process.env.VITE_CLOUDFLARE_ZONE_ID;
    const CLOUDFLARE_PROJECT_NAME = process.env.CLOUDFLARE_PROJECT_NAME || process.env.VITE_CLOUDFLARE_PROJECT_NAME;

    // التحقق من توفر المتغيرات المطلوبة
    if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ZONE_ID || !CLOUDFLARE_PROJECT_NAME) {
      return res.status(500).json({
        success: false,
        error: 'إعدادات Cloudflare غير متوفرة. يرجى إضافة VITE_CLOUDFLARE_API_TOKEN و VITE_CLOUDFLARE_PROJECT_NAME و VITE_CLOUDFLARE_ZONE_ID.'
      });
    }

    const CLOUDFLARE_API_URL = 'https://api.cloudflare.com/client/v4';

    switch (action) {
      case 'add-domain':
        return await handleAddDomain(req, res, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, CLOUDFLARE_PROJECT_NAME, CLOUDFLARE_API_URL);

      case 'remove-domain':
        return await handleRemoveDomain(req, res, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, CLOUDFLARE_PROJECT_NAME, CLOUDFLARE_API_URL);

      case 'verify-domain':
        return await handleVerifyDomain(req, res, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, CLOUDFLARE_PROJECT_NAME, CLOUDFLARE_API_URL);

      case 'get-cname-target':
        return await handleGetCnameTarget(req, res, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, CLOUDFLARE_PROJECT_NAME, CLOUDFLARE_API_URL);

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown action: ${action}`
        });
    }

  } catch (error) {
    console.error('خطأ في API cloudflare-domains:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * إضافة نطاق إلى Cloudflare Pages
 */
async function handleAddDomain(req, res, token, zoneId, projectName, apiUrl) {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({
      success: false,
      error: 'Domain parameter is required'
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
      return res.status(response.status).json({
        success: false,
        error: data.errors?.[0]?.message || 'فشل في إضافة النطاق إلى Cloudflare',
        details: data
      });
    }

    res.status(200).json({
      success: true,
      data: data.result,
      message: 'تم إضافة النطاق بنجاح'
    });

  } catch (error) {
    console.error('Error adding domain:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في إضافة النطاق'
    });
  }
}

/**
 * إزالة نطاق من Cloudflare Pages
 */
async function handleRemoveDomain(req, res, token, zoneId, projectName, apiUrl) {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({
      success: false,
      error: 'Domain parameter is required'
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

    if (!response.ok) {
      console.error('Cloudflare API Error (remove-domain):', data);
      // إذا كان النطاق غير موجود، نعتبر العملية ناجحة
      if (response.status === 404) {
        return res.status(200).json({
          success: true,
          message: 'النطاق غير موجود في Cloudflare (ربما تم حذفه مسبقاً)'
        });
      }

      return res.status(response.status).json({
        success: false,
        error: data.errors?.[0]?.message || 'فشل في إزالة النطاق من Cloudflare',
        details: data
      });
    }

    res.status(200).json({
      success: true,
      data: data.result,
      message: 'تم إزالة النطاق بنجاح'
    });

  } catch (error) {
    console.error('Error removing domain:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في إزالة النطاق'
    });
  }
}

/**
 * التحقق من حالة النطاق
 */
async function handleVerifyDomain(req, res, token, zoneId, projectName, apiUrl) {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({
      success: false,
      error: 'Domain parameter is required'
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
      return res.status(response.status).json({
        success: false,
        error: data.errors?.[0]?.message || 'فشل في التحقق من حالة النطاق',
        details: data
      });
    }

    const domainData = data.result;
    const isVerified = domainData.status === 'active';
    const sslStatus = domainData.ssl_status || 'pending';

    res.status(200).json({
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
    });

  } catch (error) {
    console.error('Error verifying domain:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في التحقق من حالة النطاق'
    });
  }
}

/**
 * الحصول على CNAME target للنطاق
 */
async function handleGetCnameTarget(req, res, token, zoneId, projectName, apiUrl) {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({
      success: false,
      error: 'Domain parameter is required'
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
      return res.status(response.status).json({
        success: false,
        error: data.errors?.[0]?.message || 'فشل في الحصول على CNAME target',
        details: data
      });
    }

    const domainData = data.result;

    res.status(200).json({
      success: true,
      data: {
        cname_target: domainData.cname_target,
        domain: domain,
        status: domainData.status
      },
      message: 'تم الحصول على CNAME target بنجاح'
    });

  } catch (error) {
    console.error('Error getting CNAME target:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في الحصول على CNAME target'
    });
  }
}
