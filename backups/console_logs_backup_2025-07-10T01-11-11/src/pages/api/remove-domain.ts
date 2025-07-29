/**
 * ملاحظة: هذا الملف من Next.js غير مستخدم بعد التحول إلى Vite.
 *
 * تم استبداله بتنفيذ Express API في المسار التالي:
 * src/server/api/domain-verification-api.js (المسار: POST /remove-domain)
 *
 * يجب تجاهل هذا الملف وقد يتم حذفه في المستقبل.
 * لا تحاول تصحيح الأخطاء الموجودة فيه.
 */

// استيرادات وكود معطل لمنع أخطاء التجميع
// import { NextApiRequest, NextApiResponse } from 'next';

// تنفيذ فارغ لمنع أخطاء التنفيذ
export default async function handler(req: any, res: any) {
  return res.status(410).json({
    success: false,
    error: 'هذه الواجهة البرمجية لم تعد مستخدمة بعد التحول إلى Vite. استخدم تنفيذ Express API بدلاً من ذلك.'
  });
}
