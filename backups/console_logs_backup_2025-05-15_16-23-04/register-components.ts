/**
 * هذا الملف مسؤول عن تسجيل مكونات المتجر في نظام محرر المتجر
 * يتم استيراد هذا الملف في بداية تشغيل التطبيق
 */

import { AboutEditor } from '@/components/store-editor';
import { StoreComponent } from '@/types/store-editor';
import { lazy } from 'react';

// مستودع المكونات المسجلة
const componentsRegistry: Record<string, any> = {};

/**
 * تسجيل مكون في نظام محرر المتجر
 * @param component معلومات المكون
 */
export function registerComponent(component: {
  type: string;
  name: string;
  description: string;
  icon: string;
  editor: any;
  defaultSettings: any;
  order?: number;
  category?: string;
  isEnabledByDefault?: boolean;
  isSingleton?: boolean;
  component?: any;
}) {
  // تحويل النوع إلى حروف صغيرة للتناسق
  const type = component.type.toLowerCase();
  
  // تسجيل المكون في المستودع
  componentsRegistry[type] = component;
  
  console.log(`تم تسجيل مكون: ${component.name} (${type})`);
  
  return component;
}

/**
 * الحصول على معلومات مكون مسجل
 * @param type نوع المكون
 */
export function getComponent(type: string) {
  const normalizedType = type.toLowerCase();
  return componentsRegistry[normalizedType];
}

/**
 * الحصول على قائمة جميع المكونات المسجلة
 */
export function getAllComponents() {
  return Object.values(componentsRegistry)
    .sort((a, b) => (a.order || 999) - (b.order || 999));
}

/**
 * تسجيل مكون "عن متجرنا"
 */
registerComponent({
  // معرف المكون - يجب أن يطابق قيمة component_type في قاعدة البيانات
  type: 'about',
  
  // اسم المكون المعروض في واجهة المستخدم
  name: 'عن متجرنا',
  
  // الوصف المختصر للمكون
  description: 'عرض معلومات عن المتجر، مميزاته، وإحصائيات عن نشاطه',
  
  // الأيقونة المرتبطة بالمكون
  icon: 'Building',
  
  // مكون المحرر - يتم استخدامه لتعديل إعدادات المكون
  editor: AboutEditor,
  
  // البيانات الافتراضية للمكون
  defaultSettings: {
    title: 'عن متجرنا',
    subtitle: 'متجر إلكتروني موثوق به منذ سنوات',
    description: 'تأسس متجرنا بهدف تقديم منتجات عالية الجودة وخدمات متميزة للعملاء. نحن نفخر بتوفير تجربة تسوق سهلة وآمنة مع ضمان أفضل الأسعار والجودة العالية.',
    image: 'https://images.unsplash.com/photo-1612690669207-fed642192c40?q=80&w=1740',
    storeInfo: {
      yearFounded: new Date().getFullYear() - 3,
      customersCount: 500,
      productsCount: 150,
      branches: 2
    },
    features: [
      'منتجات أصلية بضمان الوكيل',
      'شحن سريع لجميع مناطق الجزائر',
      'دعم فني متخصص',
      'خدمة ما بعد البيع'
    ]
  },
  
  // ترتيب المكون في قائمة المكونات المتاحة (رقم أصغر = أعلى)
  order: 3,
  
  // فئة المكون
  category: 'content',
  
  // ما إذا كان المكون متاحًا بشكل افتراضي
  isEnabledByDefault: true,
  
  // ما إذا كان يمكن إضافة المكون مرة واحدة فقط
  isSingleton: true
});

/**
 * تسجيل مكون "العروض المحدودة" مع العد التنازلي
 */
registerComponent({
  // معرف المكون - يجب أن يطابق قيمة component_type في قاعدة البيانات
  type: 'countdownoffers',
  
  // اسم المكون المعروض في واجهة المستخدم
  name: 'عروض محدودة بوقت',
  
  // الوصف المختصر للمكون
  description: 'عرض المنتجات بأسعار تخفيضية لفترة محدودة مع عداد تنازلي',
  
  // الأيقونة المرتبطة بالمكون
  icon: 'Clock',
  
  // مكون المحرر - يتم تحميله بشكل كسول
  editor: lazy(() => import('@/components/store-editor/editors/CountdownOffersEditor')),
  
  // البيانات الافتراضية للمكون
  defaultSettings: {
    title: 'عروض محدودة بوقت',
    subtitle: 'تسوق الآن قبل انتهاء العروض الحصرية',
    currency: 'دج',
    layout: 'grid',
    maxItems: 3,
    buttonText: 'تسوق الآن',
    theme: 'light',
    showViewAll: false,
    viewAllUrl: '/offers',
    offers: []
  },
  
  // ترتيب المكون في قائمة المكونات المتاحة
  order: 4,
  
  // فئة المكون
  category: 'products',
  
  // ما إذا كان المكون متاحًا بشكل افتراضي
  isEnabledByDefault: true,
  
  // ما إذا كان يمكن إضافة المكون مرة واحدة فقط
  isSingleton: false,
  
  // مكون العرض في الواجهة الأمامية - يتم تحميله بشكل كسول
  component: lazy(() => import('@/components/store/CountdownOffersSection'))
}); 