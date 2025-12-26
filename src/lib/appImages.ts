/**
 * مسارات الصور المُحسّنة لـ Electron و Web
 * هذا الملف يوفر مسارات صحيحة للصور في كل البيئات
 *
 * استخدام import بدلاً من المسارات الثابتة يضمن أن Vite يعالج الصور بشكل صحيح في الإنتاج
 */

// استيراد الصور مباشرة - Vite سيعالجها تلقائياً
// ملاحظة: الملفات في public/ يتم الوصول إليها بدون /public/ في المسار
import selkiaLogoImg from '/images/selkia-logo.webp';
import logoNewImg from '/images/logo-new.webp';
import logoImg from '/images/logo.webp';

// كشف بيئة Electron
export const isElectronEnv = typeof window !== 'undefined' && (
    (window as any).electronAPI !== undefined ||
    window.navigator?.userAgent?.includes('Electron') ||
    window.location.protocol === 'file:'
);

/**
 * الحصول على مسار الصورة الصحيح حسب البيئة
 * في Electron: يستخدم مسار نسبي من dist
 * في الويب: يستخدم المسار العادي
 */
export function getImagePath(imagePath: string): string {
    // إذا كان المسار يبدأ بـ http أو data، أعده كما هو
    if (imagePath.startsWith('http') || imagePath.startsWith('data:') || imagePath.startsWith('blob:')) {
        return imagePath;
    }

    // في Electron الإنتاج أو أي بيئة file://
    if (isElectronEnv || (typeof window !== 'undefined' && window.location.protocol === 'file:')) {
        // تحويل المسارات لتكون نسبية
        // من /assets/x.webp إلى ./assets/x.webp
        if (imagePath.startsWith('/assets/')) {
            return '.' + imagePath;
        }
        // من /images/x.webp إلى ./images/x.webp
        if (imagePath.startsWith('/')) {
            return '.' + imagePath;
        }
        // من images/x.webp إلى ./images/x.webp
        if (!imagePath.startsWith('./') && !imagePath.startsWith('../')) {
            return './' + imagePath;
        }
        return imagePath;
    }

    // في الويب: أعد المسار كما هو
    return imagePath;
}

// صور مُصدّرة جاهزة للاستخدام مع مسارات صحيحة
// استخدام imports مباشرة يضمن عمل الصور في الإنتاج
export const AppImages = {
    selkiaLogo: selkiaLogoImg,
    logoNew: logoNewImg,
    logo: logoImg,
    // يمكن إضافة المزيد من الصور هنا
} as const;

// Fallback للصور المفقودة - SVG inline لا يحتاج ملف خارجي
export const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%23ccc"%3E%3Crect width="100" height="100"/%3E%3C/svg%3E';
