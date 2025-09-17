/**
 * API Route للتحقق من إعدادات Cloudflare
 * يُستخدم للتحقق من توفر متغيرات البيئة المطلوبة لـ Cloudflare API
 */

export default function handler(req, res) {
  // السماح بالطرق GET فقط
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // الحصول على متغيرات البيئة
    const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.VITE_CLOUDFLARE_API_TOKEN;
    const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || process.env.VITE_CLOUDFLARE_ZONE_ID;
    const CLOUDFLARE_PROJECT_NAME = process.env.CLOUDFLARE_PROJECT_NAME || process.env.VITE_CLOUDFLARE_PROJECT_NAME;

    // التحقق من توفر جميع المتغيرات المطلوبة
    const hasConfig = !!(
      CLOUDFLARE_API_TOKEN &&
      CLOUDFLARE_ZONE_ID &&
      CLOUDFLARE_PROJECT_NAME
    );

    // إرجاع النتيجة
    res.status(200).json({
      success: true,
      hasConfig: hasConfig,
      config: {
        hasToken: !!CLOUDFLARE_API_TOKEN,
        hasZoneId: !!CLOUDFLARE_ZONE_ID,
        hasProjectName: !!CLOUDFLARE_PROJECT_NAME,
        projectName: CLOUDFLARE_PROJECT_NAME || null
      }
    });

  } catch (error) {
    console.error('خطأ في API cloudflare-config:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      hasConfig: false
    });
  }
}
