import { SystemModule } from './types';
import { module1 } from './module1';

// Helper to create placeholder modules quickly
const createPlaceholderModule = (id: number, slug: string, title: string, shortTitle: string, desc: string, videoCount: number): SystemModule => ({
    id,
    slug,
    title,
    shortTitle,
    description: desc,
    lessons: Array(videoCount).fill(null).map((_, i) => ({
        id: `m${id}-l${i + 1}`,
        title: `درس قادم ${i + 1}`,
        description: "هذا الدرس قيد التحضير وسيتم توفيره قريباً.",
        status: 'coming-soon',
        order: i + 1,
        duration: '00:00'
    }))
});

export const systemTrainingModules: SystemModule[] = [
    module1,
    createPlaceholderModule(2, 'inventory-products', "المرحلة 2: خفايا المخزون والمنتجات", "المخزون", "احتراف إدارة المنتجات: المتغيرات، الباركود، التصنيفات، وجرد المخزون", 12),
    createPlaceholderModule(3, 'pos-pro', "المرحلة 3: نقطة البيع (POS) الاحترافية", "نقطة البيع", "كل ما يحتاجه الكاشير: جلسات العمل، البيع السريع، الديون، والمرتجعات", 10),
    createPlaceholderModule(4, 'call-center', "المرحلة 4: مركز التأكيد (Call Center)", "التأكيد", "إدارة فريق التأكيد: توزيع الطلبات، مساحة عمل العميل، وتتبع الأداء", 8),
    createPlaceholderModule(5, 'ecommerce', "المرحلة 5: التجارة الإلكترونية والتسويق", "المتجر", "بناء واجهة متجرك: محرر القوالب، باني صفحات الهبوط، والسلات المتروكة", 15),
    createPlaceholderModule(6, 'services', "المرحلة 6: الخدمات والمنتجات الرقمية", "الخدمات", "كيف تبيع الخدمات: نظام الصيانة، الاشتراكات، والمنتجات الرقمية", 8),
    createPlaceholderModule(7, 'purchases', "المرحلة 7: المشتريات وسلسلة التوريد", "المشتريات", "إدارة الموردين: أوامر الشراء، الديون، والمصاريف التشغيلية", 7),
    createPlaceholderModule(8, 'flexi-reports', "المرحلة 8: التقارير المتقدمة (Flexi)", "التقارير", "أدوات التحليل المتقدمة: تقارير مخصصة، كشف 104، وحساب الزكاة", 10),
    createPlaceholderModule(9, 'advanced-tools', "المرحلة 9: أدوات إضافية للمحترفين", "أدوات", "استكشف الأدوات المخفية: منشئ النماذج، ونظام الإحالة", 6),
];

export * from './types';
