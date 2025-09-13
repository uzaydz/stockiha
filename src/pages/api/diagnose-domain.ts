import type { NextApiRequest, NextApiResponse } from 'next';
import { diagnoseDomain, quickDiagnose } from '@/tools/domain-diagnostic';

/**
 * API لتشخيص مشاكل النطاقات المخصصة
 * GET /api/diagnose-domain?domain=example.com&quick=true
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.'
    });
  }

  try {
    const { domain, quick } = req.query;

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'يرجى توفير النطاق المراد تشخيصه'
      });
    }

    // تنظيف النطاق
    const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();

    

    if (quick === 'true') {
      // تشخيص سريع
      const quickResult = await quickDiagnose(cleanDomain);
      
      return res.status(200).json({
        success: true,
        domain: cleanDomain,
        type: 'quick',
        result: quickResult,
        timestamp: new Date().toISOString()
      });
    } else {
      // تشخيص شامل
      const fullResult = await diagnoseDomain(cleanDomain);
      
      return res.status(200).json({
        success: true,
        domain: cleanDomain,
        type: 'full',
        result: fullResult,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('خطأ في API تشخيص النطاق:', error);
    
    return res.status(500).json({
      success: false,
      error: 'حدث خطأ أثناء تشخيص النطاق',
      details: error instanceof Error ? error.message : 'خطأ غير معروف',
      timestamp: new Date().toISOString()
    });
  }
}
