import { NextApiRequest, NextApiResponse } from 'next';
import { checkYalidineTriggersStatus } from '@/api/yalidine/fees-sync-fix';

/**
 * معالج API للتحقق من حالة جداول ياليدين
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // التحقق من طريقة الطلب
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        success: false, 
        message: 'طريقة الطلب غير مدعومة' 
      });
    }

    // استدعاء وظيفة التحقق من حالة محفزات ياليدين
    const statusInfo = await checkYalidineTriggersStatus();

    // الرد بحالة الجداول
    res.status(200).json({
      success: statusInfo.success,
      message: statusInfo.message,
      tableStats: statusInfo.tableStats,
      triggerStatus: statusInfo.triggerStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ غير متوقع في التحقق من جداول ياليدين',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
