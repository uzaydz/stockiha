import express from 'express';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  verifyAndUpdateDomainStatus, 
  removeDomainFromVercelProject, 
  linkDomainToVercelProject 
} from '@/api/domain-verification-api';

const router = express.Router();

// القيمة الوسيطة المتوقعة لـ CNAME
const INTERMEDIATE_DOMAIN = 'connect.ktobi.online';

/**
 * التحقق من حالة النطاق
 * GET /api/check-domain-status
 */
router.get('/check-domain-status', async (req, res) => {
  const { domain, organizationId } = req.query;

  if (!domain || !organizationId) {
    return res.status(400).json({
      success: false,
      error: 'البيانات المطلوبة غير مكتملة. يرجى توفير domain و organizationId.'
    });
  }

  try {
    const result = await verifyAndUpdateDomainStatus(
      organizationId as string,
      domain as string
    );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    });
  }
});

/**
 * ربط نطاق جديد
 * POST /api/link-domain
 */
router.post('/link-domain', async (req, res) => {
  const { domain, organizationId } = req.body;

  if (!domain || !organizationId) {
    return res.status(400).json({
      success: false,
      error: 'البيانات المطلوبة غير مكتملة. يرجى توفير domain و organizationId.'
    });
  }

  try {
    // الحصول على معلومات المشروع و token من البيئة
    const VERCEL_TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN;
    const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

    if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
      return res.status(500).json({
        success: false,
        error: 'لم يتم تكوين متغيرات البيئة اللازمة للاتصال بـ Vercel API.'
      });
    }

    // ربط النطاق بـ Vercel
    const linkResult = await linkDomainToVercelProject(
      domain,
      VERCEL_PROJECT_ID,
      VERCEL_TOKEN
    );

    if (!linkResult.success) {
      return res.status(500).json({
        success: false,
        error: linkResult.error || 'فشل في ربط النطاق بـ Vercel'
      });
    }

    // تحديث النطاق في المؤسسة
    const supabase = getSupabaseClient();
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ domain })
      .eq('id', organizationId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'تم ربط النطاق بـ Vercel ولكن فشل في تحديثه في قاعدة البيانات'
      });
    }

    return res.status(200).json({
      success: true,
      data: linkResult.data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    });
  }
});

/**
 * إزالة نطاق
 * POST /api/remove-domain
 */
router.post('/remove-domain', async (req, res) => {
  const { domain, organizationId } = req.body;

  if (!domain || !organizationId) {
    return res.status(400).json({
      success: false,
      error: 'البيانات المطلوبة غير مكتملة. يرجى توفير domain و organizationId.'
    });
  }

  try {
    const supabase = getSupabaseClient();

    // التحقق من أن النطاق مرتبط بالمؤسسة المحددة
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('domain')
      .eq('id', organizationId)
      .single();

    if (orgError) {
      return res.status(404).json({
        success: false,
        error: 'المؤسسة غير موجودة'
      });
    }

    if (organization.domain !== domain) {
      return res.status(400).json({
        success: false,
        error: 'النطاق غير مرتبط بهذه المؤسسة'
      });
    }

    // الحصول على معلومات المشروع و token من البيئة
    const VERCEL_TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN;
    const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

    if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
      return res.status(500).json({
        success: false,
        error: 'لم يتم تكوين متغيرات البيئة اللازمة للاتصال بـ Vercel API.'
      });
    }

    // إزالة النطاق من Vercel
    const removeResult = await removeDomainFromVercelProject(
      domain,
      VERCEL_PROJECT_ID,
      VERCEL_TOKEN
    );

    if (!removeResult.success) {
      // سنستمر في تنفيذ الحذف من قاعدة البيانات حتى لو فشل الحذف من Vercel
    }

    // إزالة النطاق من المؤسسة
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ domain: null })
      .eq('id', organizationId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'حدث خطأ أثناء إزالة النطاق من المؤسسة'
      });
    }

    // حذف سجل التحقق بشكل مباشر بدلاً من استخدام RPC
    const { error: deleteError } = await supabase
      .from('domain_verifications')
      .delete()
      .eq('organization_id', organizationId)
      .eq('domain', domain);

    if (deleteError) {
    }

    return res.status(200).json({
      success: true,
      message: 'تمت إزالة النطاق بنجاح'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    });
  }
});

/**
 * واجهة برمجة للتحقق من صحة إعدادات DNS للنطاق المخصص
 * POST /api/check-domain
 */
router.post('/check-domain', async (req, res) => {
  try {
    // استخراج البيانات من طلب API
    const { domain, organizationId } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'البيانات المطلوبة غير مكتملة. يرجى توفير domain.'
      });
    }

    // تنظيف النطاق
    const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();
    
    // النتائج
    const results = {
      apex: {
        valid: false,
        expected: INTERMEDIATE_DOMAIN,
        actual: null,
        error: null
      },
      www: {
        valid: false,
        expected: INTERMEDIATE_DOMAIN,
        actual: null,
        error: null
      }
    };
    
    // استخدام DNS المتوفر في Node.js
    const dns = require('dns');
    const promisify = require('util').promisify;
    const resolveCname = promisify(dns.resolveCname);
    
    // التحقق من سجل النطاق الأساسي (@)
    try {
      const cnameRecords = await resolveCname(cleanDomain);
      results.apex.actual = cnameRecords[0].toLowerCase();
      results.apex.valid = cnameRecords[0].toLowerCase() === INTERMEDIATE_DOMAIN.toLowerCase();
    } catch (error) {
      results.apex.error = error instanceof Error ? error.message : 'خطأ غير معروف';
    }
    
    // التحقق من سجل www
    try {
      const wwwDomain = `www.${cleanDomain}`;
      const cnameRecordsWww = await resolveCname(wwwDomain);
      results.www.actual = cnameRecordsWww[0].toLowerCase();
      results.www.valid = cnameRecordsWww[0].toLowerCase() === INTERMEDIATE_DOMAIN.toLowerCase();
    } catch (error) {
      results.www.error = error instanceof Error ? error.message : 'خطأ غير معروف';
    }
    
    // حساب النتيجة الإجمالية
    const isValid = results.apex.valid || results.www.valid;
    
    // تحديث جدول domain_verifications إذا تم ربط النطاق بمؤسسة
    if (organizationId) {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase
        .from('domain_verifications')
        .upsert([
          {
            organization_id: organizationId,
            domain: cleanDomain,
            status: isValid ? 'verified' : 'pending',
            verification_data: results,
            last_checked: new Date().toISOString()
          }
        ]);
      
      if (updateError) {
      }
    }
    
    // إرجاع النتيجة
    return res.status(200).json({
      success: true,
      domain: cleanDomain,
      isValid,
      results
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    });
  }
});

export default router;
