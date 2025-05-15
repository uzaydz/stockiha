import { NextApiRequest, NextApiResponse } from 'next';
import { verifyVercelDomainStatus } from '@/api/domain-verification-api';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * واجهة برمجة للتحقق من حالة نطاق مخصص مع Vercel
 * 
 * GET /api/check-domain-status
 * Query parameters:
 *   domain: string  // النطاق المراد التحقق منه
 *   organizationId: string  // معرف المؤسسة المرتبطة بالنطاق
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // التحقق من أن الطلب هو GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'طريقة غير مسموح بها. استخدم GET.'
    });
  }

  try {
    // استخراج البيانات من طلب API
    const { domain, organizationId } = req.query;

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

    // التحقق من حالة النطاق مع Vercel
    const verificationStatus = await verifyVercelDomainStatus(
      domain as string,
      VERCEL_PROJECT_ID,
      VERCEL_TOKEN
    );

    try {
      // تحديث سجل النطاق في قاعدة البيانات
      const { error: dbError } = await supabase.rpc(
        'update_domain_verification_status',
        {
          p_organization_id: organizationId,
          p_domain: domain,
          p_status: verificationStatus.verified ? 'active' : 'pending',
          p_message: verificationStatus.message
        }
      );

      if (dbError) {
        console.error('خطأ في تحديث سجل النطاق:', dbError);
      }
    } catch (dbError) {
      console.error('خطأ في تحديث سجل النطاق:', dbError);
      // نواصل بغض النظر عن خطأ تحديث قاعدة البيانات
    }

    // إرجاع النتيجة
    return res.status(200).json({
      success: true,
      data: {
        domain: domain,
        verified: verificationStatus.verified || false,
        message: verificationStatus.message || '',
        reason: verificationStatus.reason || '',
        verification: verificationStatus.verification || null
      }
    });
  } catch (error) {
    console.error('خطأ غير متوقع أثناء التحقق من حالة النطاق:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    });
  }
} 