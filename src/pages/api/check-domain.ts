import { NextApiRequest, NextApiResponse } from 'next';
import dns from 'dns';
import { promisify } from 'util';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { supabase } from '@/lib/supabase-server';

// تحويل وظائف DNS إلى وعود
const resolveCname = promisify(dns.resolveCname);

/**
 * واجهة برمجة للتحقق من صحة إعدادات DNS للنطاق المخصص
 * 
 * POST /api/check-domain
 * Body: {
 *   domain: string  // اسم النطاق المراد التحقق منه
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

  // التحقق من صحة الجلسة
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({
      success: false,
      error: 'غير مصرح لك بالوصول. يرجى تسجيل الدخول.'
    });
  }

  try {
    // استخراج البيانات من طلب API
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'البيانات المطلوبة غير مكتملة. يرجى توفير domain.'
      });
    }

    // تنظيف النطاق
    const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();
    
    // القيمة الصحيحة المتوقعة
    const EXPECTED_CNAME = 'connect.ktobi.online';
    
    // النتائج
    const results = {
      apex: {
        valid: false,
        expected: EXPECTED_CNAME,
        actual: null,
        error: null
      },
      www: {
        valid: false,
        expected: EXPECTED_CNAME,
        actual: null,
        error: null
      }
    };
    
    // التحقق من سجل النطاق الأساسي (@)
    try {
      const cnameRecords = await resolveCname(cleanDomain);
      results.apex.actual = cnameRecords[0].toLowerCase();
      results.apex.valid = cnameRecords[0].toLowerCase() === EXPECTED_CNAME.toLowerCase();
    } catch (error) {
      results.apex.error = error instanceof Error ? error.message : 'خطأ غير معروف';
    }
    
    // التحقق من سجل www
    try {
      const wwwDomain = `www.${cleanDomain}`;
      const cnameRecordsWww = await resolveCname(wwwDomain);
      results.www.actual = cnameRecordsWww[0].toLowerCase();
      results.www.valid = cnameRecordsWww[0].toLowerCase() === EXPECTED_CNAME.toLowerCase();
    } catch (error) {
      results.www.error = error instanceof Error ? error.message : 'خطأ غير معروف';
    }
    
    // حساب النتيجة الإجمالية
    const isValid = results.apex.valid || results.www.valid;
    
    // تحديث جدول domain_verifications إذا تم ربط النطاق بمؤسسة
    const { data: domainData } = await supabase
      .from('organizations')
      .select('id')
      .eq('domain', cleanDomain)
      .single();
    
    if (domainData) {
      const { error: updateError } = await supabase
        .from('domain_verifications')
        .upsert([
          {
            organization_id: domainData.id,
            domain: cleanDomain,
            status: isValid ? 'verified' : 'pending',
            verification_data: results,
            last_checked: new Date().toISOString()
          }
        ]);
      
      if (updateError) {
        console.error('خطأ في تحديث حالة التحقق:', updateError);
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
    console.error('خطأ أثناء التحقق من النطاق:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    });
  }
} 