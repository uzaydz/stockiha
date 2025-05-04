import { registerComponent } from '@/lib/store-editor/component-registry';
import AboutEditor from '@/components/store-editor/editors/AboutEditor';
import { lazy } from 'react';

// تسجيل محرر مكون "عن متجرنا" في نظام محرر المتجر
registerComponent({
  // معرف المكون - يجب أن يطابق قيمة component_type في قاعدة البيانات
  type: 'about',
  
  // اسم المكون المعروض في واجهة المستخدم
  name: 'عن متجرنا',
  
  // الوصف المختصر للمكون
  description: 'عرض معلومات عن المتجر، مميزاته، وإحصائيات عن نشاطه',
  
  // الأيقونة المرتبطة بالمكون (استخدم أيقونة مناسبة من مكتبة Lucide)
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
  isSingleton: true,
  
  // مكون العرض في الواجهة الأمامية - يتم تحميله بشكل كسول (lazy loading)
  component: lazy(() => import('@/components/store/StoreAbout'))
}); 