import { SystemModule } from './types';

export const module1: SystemModule = {
    id: 1,
    slug: 'setup-basics',
    title: "المرحلة 1: الإعدادات والأساسيات",
    shortTitle: "الإعدادات",
    description: "بداية رحلتك: إعداد المتجر، الهوية البصرية، وصلاحيات الفريق",
    lessons: [
        {
            id: 'm1-l1',
            title: "جولة شاملة في النظام",
            description: "نظرة عامة سريعة على واجهة النظام والتعرف على القوائم الرئيسية وكيفية التنقل.",
            duration: "15:00",
            status: 'coming-soon',
            order: 1
        },
        {
            id: 'm1-l2',
            title: "إعدادات المتجر والهوية",
            description: "ضبط اسم المتجر، الشعار، الألوان، ومعلومات التواصل التي تظهر في الفواتير.",
            duration: "10:00",
            status: 'coming-soon',
            order: 2
        },
        {
            id: 'm1-l3',
            title: "تخصيص وبرمجة الفاتورة",
            description: "كيفية تصميم شكل الفاتورة (Receipt) وإضافة سياسة الاسترجاع ورسائل التذييل.",
            duration: "12:00",
            status: 'coming-soon',
            order: 3
        },
        {
            id: 'm1-l4',
            title: "إدارة الموظفين",
            description: "إضافة الموظفين الجدد، وتحديد أدوارهم في النظام (كاشير، مدير، مخزني).",
            duration: "08:00",
            status: 'coming-soon',
            order: 4
        },
        {
            id: 'm1-l5',
            title: "نظام الصلاحيات والأمان",
            description: "شرح تفصيلي لنظام الصلاحيات (Permissions) للتحكم الدقيق فيما يمكن للموظف فعله.",
            duration: "14:00",
            status: 'coming-soon',
            order: 5
        },
        {
            id: 'm1-l6',
            title: "إعدادات الطابعات والأجهزة",
            description: "رمج طابعات الباركود والفواتير وربط قارئ الباركود بالنظام.",
            duration: "10:00",
            status: 'coming-soon',
            order: 6
        },
        {
            id: 'm1-l7',
            title: "العملات وطرق الدفع",
            description: "إعداد العملات المتعددة وطرق الدفع المختلفة (كاش، بطاقة، تحويل).",
            duration: "05:00",
            status: 'coming-soon',
            order: 7
        },
        {
            id: 'm1-l8',
            title: "النسخ الاحتياطي والبيانات",
            description: "كيفية أخذ نسخ احتياطية يدوية وتصدير البيانات للحفاظ عليها.",
            duration: "06:00",
            status: 'coming-soon',
            order: 8
        }
    ]
};
