export interface Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  totalVideos: number;
  totalDuration: string;
  level: 'مبتدئ' | 'متوسط' | 'متقدم' | 'شامل';
  isFree: boolean;
  targetAudience: string[];
  path: string;
  status: 'متاح' | 'قريباً' | 'جديد';
  tags: string[];
  color: string;
}

export const coursesList: Course[] = [
  {
    id: 'digital-marketing',
    title: 'دورة التسويق الإلكتروني الشاملة',
    description: 'تعلم كل شيء عن التسويق بفيسبوك وإنستقرام بالتفصيل الممل',
    icon: '📱',
    totalVideos: 50,
    totalDuration: '7+ ساعات',
    level: 'شامل',
    isFree: true,
    targetAudience: ['مشتركي سطوكيها', 'مشتركي كتوبي'],
    path: '/dashboard/courses/digital-marketing',
    status: 'متاح',
    tags: ['فيسبوك', 'إنستقرام', 'إعلانات', 'تسويق رقمي'],
    color: 'bg-blue-500'
  },
  {
    id: 'e-commerce',
    title: 'دورة التجارة الإلكترونية والدفع عند الاستلام في الجزائر',
    description: 'تعلم كيفية تحويل تجارتك من تقليدية إلى إلكترونية ناجحة في السوق الجزائري مع سطوكيها',
    icon: '🛒',
    totalVideos: 14,
    totalDuration: '3 ساعات 30 دقيقة',
    level: 'شامل',
    isFree: true,
    targetAudience: ['مشتركي سطوكيها', 'مشتركي كتوبي'],
    path: '/dashboard/courses/e-commerce',
    status: 'جديد',
    tags: ['تجارة إلكترونية', 'سطوكيها', 'COD', 'الجزائر'],
    color: 'bg-green-500'
  },
  {
    id: 'e-commerce-store',
    title: 'دورة إنشاء متجر إلكتروني عبر منصة سطوكيها',
    description: 'تعلم كيفية إنشاء متجرك الإلكتروني الأول من الصفر باستخدام منصة سطوكيها - خطوة بخطوة للمبتدئين',
    icon: '🏪',
    totalVideos: 35,
    totalDuration: '6 ساعات',
    level: 'مبتدئ',
    isFree: true,
    targetAudience: ['المبتدئين في التجارة الإلكترونية', 'أصحاب الأعمال التقليدية'],
    path: '/dashboard/courses/e-commerce-store',
    status: 'جديد',
    tags: ['سطوكيها', 'إنشاء متجر', 'مبتدئين', 'خطوة بخطوة'],
    color: 'bg-purple-500'
  },
  {
    id: 'tiktok-marketing',
    title: 'الدورة الشاملة في التيك توك أدس',
    description: 'دورة شاملة تغطي جميع جوانب الإعلانات على منصة تيك توك، من التعرف على المنصة وأساسيات إنشاء الحسابات الإعلانية إلى استراتيجيات إطلاق الحملات وتحليل نتائجها',
    icon: '🎵',
    totalVideos: 39,
    totalDuration: '8 ساعات 20 دقيقة',
    level: 'شامل',
    isFree: true,
    targetAudience: ['المسوقين الرقميين', 'أصحاب الأعمال', 'المهتمين بالإعلانات الرقمية'],
    path: '/dashboard/courses/tiktok-marketing',
    status: 'جديد',
    tags: ['تيك توك', 'إعلانات', 'تسويق رقمي', 'سوشيال ميديا'],
    color: 'bg-pink-500'
  },
  {
    id: 'traditional-business',
    title: 'دورة التجار التقليديين: من المحل إلى المنصة الرقمية مع سطوكيها',
    description: 'دورة شاملة مصممة خصيصاً للتجار التقليديين لتعلم كيفية استخدام منصة سطوكيها لإدارة متاجرهم التقليدية وتحويلها إلى تجارة إلكترونية متكاملة',
    icon: '🏪',
    totalVideos: 42,
    totalDuration: '8 ساعات',
    level: 'شامل',
    isFree: true,
    targetAudience: ['التجار التقليديين', 'أصحاب المحلات التجارية', 'أصحاب الأعمال الصغيرة'],
    path: '/dashboard/courses/traditional-business',
    status: 'جديد',
    tags: ['سطوكيها', 'نقطة البيع', 'تحول رقمي', 'تجار تقليديين'],
    color: 'bg-orange-500'
  },
  {
    id: 'service-providers',
    title: 'دورة مقدمي الخدمات والتصليحات مع سطوكيها',
    description: 'دورة شاملة لتعلم كيفية إدارة مراكز الخدمات والتصليحات باستخدام نظام سطوكيها المتطور مع تتبع الطلبيات، إدارة الطوابير، وإشعارات SMS التلقائية',
    icon: '🔧',
    totalVideos: 38,
    totalDuration: '7 ساعات',
    level: 'شامل',
    isFree: true,
    targetAudience: ['مراكز التصليح', 'مقدمي الخدمات التقنية', 'ورش الإصلاح'],
    path: '/dashboard/courses/service-providers',
    status: 'جديد',
    tags: ['خدمات', 'تصليحات', 'طابور ذكي', 'تتبع', 'SMS'],
    color: 'bg-cyan-500'
  }
]; 