import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabase';
import { removeDomainFromVercelProject } from '@/api/domain-verification-api';

/**
 * واجهة برمجة لإزالة نطاق مخصص
 * 
 * POST /api/remove-domain
 * Body:
 *   domain: string  // النطاق المراد إزالته
 *   organizationId: string  // معرف المؤسسة
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // التحقق من أن الطلب هو POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'طريقة غير مسموح بها. استخدم POST.'
    });
  }

  try {
    // استخراج البيانات من طلب API
    const { domain, organizationId } = req.body;

    if (!domain || !organizationId) {
      return res.status(400).json({
        success: false,
        error: 'البيانات المطلوبة غير مكتملة. يرجى توفير domain و organizationId.'
      });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({
        success: false, 
        error: 'فشل في الاتصال بقاعدة البيانات'
      });
    }

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

    console.log('Vercel Configuration:', { 
      hasToken: !!VERCEL_TOKEN, 
      hasProjectId: !!VERCEL_PROJECT_ID,
      domain,
      organizationId
    });

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
      console.error('خطأ في إزالة النطاق من Vercel:', removeResult.error);
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

    try {
      // حذف سجل التحقق باستخدام RPC
      const { error: deleteError } = await supabase.rpc(
        'delete_domain_verification',
        {
          p_organization_id: organizationId,
          p_domain: domain
        }
      );

      if (deleteError) {
        console.error('خطأ في حذف سجل التحقق:', deleteError);
      }
    } catch (deleteError) {
      console.error('خطأ غير متوقع في حذف سجل التحقق:', deleteError);
      // سنتجاهل هذا الخطأ ونستمر
    }

    // إرجاع النتيجة
    return res.status(200).json({
      success: true,
      message: 'تمت إزالة النطاق بنجاح'
    });
  } catch (error) {
    console.error('خطأ غير متوقع أثناء إزالة النطاق:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    });
  }
} 