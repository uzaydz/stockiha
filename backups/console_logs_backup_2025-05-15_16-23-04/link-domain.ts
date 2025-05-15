import { NextApiRequest, NextApiResponse } from 'next';
import { linkDomainToVercelProject, verifyVercelDomainStatus } from '@/api/domain-verification-api';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * واجهة برمجة لربط نطاق مخصص للمتجر بمشروع Vercel
 * 
 * POST /api/link-domain
 * Body: {
 *   domain: string  // اسم النطاق المخصص
 *   organizationId: string  // معرف المؤسسة المرتبطة بالنطاق
 * }
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

    // ربط النطاق بمشروع Vercel
    const linkResult = await linkDomainToVercelProject(
      domain,
      VERCEL_PROJECT_ID,
      VERCEL_TOKEN
    );

    if (!linkResult.success) {
      return res.status(400).json({
        success: false,
        error: linkResult.error || 'حدث خطأ أثناء ربط النطاق'
      });
    }

    // تحديث النطاق في قاعدة البيانات
    const { error: dbError } = await supabase
      .from('organizations')
      .update({ domain: domain })
      .eq('id', organizationId);

    if (dbError) {
      console.error('حدث خطأ أثناء تحديث النطاق في قاعدة البيانات:', dbError);
      return res.status(500).json({
        success: false,
        error: 'حدث خطأ أثناء تحديث النطاق في قاعدة البيانات'
      });
    }

    try {
      // التحقق من حالة النطاق (DNS و SSL)
      const verificationStatus = await verifyVercelDomainStatus(
        domain,
        VERCEL_PROJECT_ID,
        VERCEL_TOKEN
      );

      // إنشاء سجل في جدول domain_verifications لتتبع حالة النطاق
      const { error: verificationError } = await supabase.rpc(
        'upsert_domain_verification',
        {
          p_organization_id: organizationId,
          p_domain: domain,
          p_status: verificationStatus.verified ? 'verified' : 'pending',
          p_verification_data: linkResult.data?.verification || null
        }
      );

      if (verificationError) {
        console.error('حدث خطأ أثناء إنشاء سجل التحقق:', verificationError);
      }
    } catch (verificationError) {
      console.error('خطأ في التحقق من النطاق:', verificationError);
      // لا نريد إيقاف العملية بسبب خطأ في التحقق
    }

    // إرجاع النتيجة
    return res.status(200).json({
      success: true,
      data: {
        domain: domain,
        verification: linkResult.data?.verification || null
      }
    });
  } catch (error) {
    console.error('خطأ غير متوقع أثناء ربط النطاق:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    });
  }
} 