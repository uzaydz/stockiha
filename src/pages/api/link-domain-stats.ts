import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase-server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { isAdminUser } from '@/lib/auth';

/**
 * واجهة برمجة للحصول على إحصائيات النطاقات المخصصة
 * 
 * GET /api/link-domain-stats
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
    // التحقق من صحة الجلسة والصلاحيات
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح لك بالوصول. يرجى تسجيل الدخول.'
      });
    }

    // يسمح فقط للمسؤولين بالوصول إلى هذه البيانات
    const isAdmin = await isAdminUser(session.user.id);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح لك بالوصول إلى إحصائيات النطاقات.'
      });
    }

    // استعلام إحصائيات النطاقات
    const { data: totalOrganizations, error: totalError } = await supabase
      .from('organizations')
      .select('count', { count: 'exact' });

    const { data: domainsCount, error: domainsError } = await supabase
      .from('organizations')
      .select('count', { count: 'exact' })
      .not('domain', 'is', null);

    const { data: verifiedDomainsCount, error: verifiedError } = await supabase
      .from('domain_verifications')
      .select('count', { count: 'exact' })
      .eq('status', 'active');

    const { data: pendingDomainsCount, error: pendingError } = await supabase
      .from('domain_verifications')
      .select('count', { count: 'exact' })
      .eq('status', 'pending');

    const { data: errorDomainsCount, error: errorCountError } = await supabase
      .from('domain_verifications')
      .select('count', { count: 'exact' })
      .eq('status', 'error');

    // التحقق من وجود أخطاء
    if (totalError || domainsError || verifiedError || pendingError || errorCountError) {
      return res.status(500).json({
        success: false,
        error: 'حدث خطأ أثناء استعلام إحصائيات النطاقات'
      });
    }

    // إرجاع النتيجة
    return res.status(200).json({
      success: true,
      data: {
        totalOrganizations: totalOrganizations[0]?.count || 0,
        totalDomains: domainsCount[0]?.count || 0,
        verifiedDomains: verifiedDomainsCount[0]?.count || 0,
        pendingDomains: pendingDomainsCount[0]?.count || 0,
        errorDomains: errorDomainsCount[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('خطأ غير متوقع أثناء استعلام إحصائيات النطاقات:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    });
  }
} 