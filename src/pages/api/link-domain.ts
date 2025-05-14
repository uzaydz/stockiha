import { NextApiRequest, NextApiResponse } from 'next';
import { linkDomainToVercelProject, verifyVercelDomainStatus } from '@/api/domain-verification-api';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { supabase } from '@/lib/supabase-server';
import { organizationHasPermission } from '@/lib/auth';

/**
 * واجهة برمجة لربط نطاق مخصص للمتجر بمشروع Vercel
 * 
 * POST /api/link-domain
 * Body: {
 *   customDomain: string  // اسم النطاق المخصص
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
    // التحقق من صحة الجلسة والصلاحيات
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح لك بالوصول. يرجى تسجيل الدخول.'
      });
    }

    // استخراج البيانات من طلب API
    const { customDomain, organizationId } = req.body;

    if (!customDomain || !organizationId) {
      return res.status(400).json({
        success: false,
        error: 'البيانات المطلوبة غير مكتملة. يرجى توفير customDomain و organizationId.'
      });
    }

    // التحقق من الصلاحيات للمؤسسة
    const hasPermission = await organizationHasPermission(
      session.user.id,
      organizationId,
      'manageOrganizationSettings'
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية إدارة إعدادات المؤسسة.'
      });
    }

    // الحصول على معلومات المشروع و token من البيئة
    const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN as string;
    const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID as string;

    if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
      return res.status(500).json({
        success: false,
        error: 'لم يتم تكوين متغيرات البيئة اللازمة للاتصال بـ Vercel API.'
      });
    }

    // ربط النطاق بمشروع Vercel
    const linkResult = await linkDomainToVercelProject(
      customDomain,
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
      .update({ domain: customDomain })
      .eq('id', organizationId);

    if (dbError) {
      console.error('حدث خطأ أثناء تحديث النطاق في قاعدة البيانات:', dbError);
      return res.status(500).json({
        success: false,
        error: 'حدث خطأ أثناء تحديث النطاق في قاعدة البيانات'
      });
    }

    // التحقق من حالة النطاق (DNS و SSL)
    const verificationStatus = await verifyVercelDomainStatus(
      customDomain,
      VERCEL_PROJECT_ID,
      VERCEL_TOKEN
    );

    // إنشاء سجل في جدول domain_verifications لتتبع حالة النطاق
    const { error: verificationError } = await supabase
      .from('domain_verifications')
      .insert([
        {
          organization_id: organizationId,
          domain: customDomain,
          status: verificationStatus.verified ? 'verified' : 'pending',
          verification_data: linkResult.data?.verification || null,
          last_checked: new Date().toISOString()
        }
      ]);

    if (verificationError) {
      console.error('حدث خطأ أثناء إنشاء سجل التحقق:', verificationError);
    }

    // إرجاع النتيجة
    return res.status(200).json({
      success: true,
      data: {
        domain: customDomain,
        verificationStatus: verificationStatus,
        verificationData: linkResult.data?.verification || null
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