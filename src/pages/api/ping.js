/**
 * نقطة نهاية API بسيطة للتحقق من حالة الاتصال
 */
export default function handler(req, res) {
  // إرجاع استجابة بسيطة بدون محتوى
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}
