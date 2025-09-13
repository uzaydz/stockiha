import type { NextApiRequest, NextApiResponse } from 'next';
import { autoDomainVerification } from '@/api/domain-auto-verification';
import { verifyDomainDNS } from '@/api/domain-verification-api';

/**
 * API للتحقق الفوري من النطاق
 * POST /api/verify-domain-now
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    const { domain, organizationId } = req.body;

    if (!domain || !organizationId) {
      return res.status(400).json({
        success: false,
        error: 'البيانات المطلوبة غير مكتملة. يرجى توفير domain و organizationId.'
      });
    }

    // تنظيف النطاق
    const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();

    

    // التحقق الفوري من النطاق
    const isVerified = await autoDomainVerification.verifySpecificDomain(cleanDomain, organizationId);

    if (isVerified) {
      return res.status(200).json({
        success: true,
        message: 'تم التحقق من النطاق بنجاح',
        domain: cleanDomain,
        verified: true,
        timestamp: new Date().toISOString()
      });
    } else {
      // الحصول على تفاصيل الخطأ
      const dnsResult = await verifyDomainDNS(cleanDomain);
      
      return res.status(400).json({
        success: false,
        message: 'فشل في التحقق من النطاق',
        domain: cleanDomain,
        verified: false,
        details: {
          dns_records: dnsResult.records,
          error_message: dnsResult.message,
          required_setup: [
            {
              type: 'CNAME',
              name: cleanDomain,
              value: 'stockiha.pages.dev',
              note: 'أو يمكن توجيهه إلى www.' + cleanDomain
            },
            {
              type: 'CNAME',
              name: 'www.' + cleanDomain,
              value: 'stockiha.pages.dev',
              note: 'مطلوب للنطاق مع www'
            }
          ]
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('خطأ في API التحقق الفوري:', error);
    
    return res.status(500).json({
      success: false,
      error: 'حدث خطأ في معالجة الطلب',
      details: error instanceof Error ? error.message : 'خطأ غير معروف',
      timestamp: new Date().toISOString()
    });
  }
}
