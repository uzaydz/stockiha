export interface CourseModule {
  id: number;
  title: string;
  description: string;
  videoCount: number;
  duration?: string;
  level: 'مبتدئ' | 'متوسط' | 'متقدم';
  topics: string[];
}

export interface CourseData {
  title: string;
  description: string;
  totalVideos: number;
  totalDuration: string;
  isFree: boolean;
  targetAudience: string[];
  modules: CourseModule[];
}

export const tiktokAdsCourseData: CourseData = {
  title: "الدورة الشاملة في التيك توك أدس",
  description: "دورة شاملة تغطي جميع جوانب الإعلانات على منصة تيك توك، من التعرف على المنصة وأساسيات إنشاء الحسابات الإعلانية إلى استراتيجيات إطلاق الحملات وتحليل نتائجها",
  totalVideos: 39,
  totalDuration: "8 ساعات 20 دقيقة",
  isFree: true,
  targetAudience: ["المسوقين الرقميين", "أصحاب الأعمال", "المهتمين بالإعلانات الرقمية", "مشتركي سطوكيها", "مشتركي كتوبي"],
  modules: [
    {
      id: 0,
      title: "سياسة تيك توك - مهم جداً",
      description: "تعرف على سياسات تيك توك الإعلانية وقواعد المنصة الأساسية التي يجب فهمها قبل البدء في إنشاء الحملات الإعلانية",
      videoCount: 1,
      duration: "25 دقيقة",
      level: "مبتدئ",
      topics: ["سياسات المحتوى", "قوانين الاستهداف", "قيود المنتجات", "تجنب تعليق الحساب", "أساسيات الأمان"]
    },
    {
      id: 1,
      title: "مقدمة إلى تيك توك وتيك توك أدس",
      description: "تعرف على تيك توك كمنصة اجتماعية وكيف يمكن استخدامها كأداة إعلانية فعالة من خلال التعرف على منصة تيك توك أدس وحسابات Business Center",
      videoCount: 4,
      duration: "45 دقيقة",
      level: "مبتدئ",
      topics: ["تاريخ تيك توك", "TikTok Ads Manager", "Business Center", "الفرق بين TikTok وTikTok Ads", "إحصائيات المنصة"]
    },
    {
      id: 2,
      title: "الحسابات الإعلانية على تيك توك",
      description: "تعلم الفرق بين الحسابات الإعلانية العادية وAgency وكيفية الحصول على حسابات مناسبة لإدارة الحملات بمرونة وكفاءة",
      videoCount: 8,
      duration: "1 ساعة 30 دقيقة",
      level: "مبتدئ",
      topics: ["إنشاء حساب إعلاني", "حسابات Agency", "إدارة الأذونات", "ربط الحسابات", "أنواع الحسابات", "التحقق من الحساب"]
    },
    {
      id: 3,
      title: "أساسيات مدير إعلانات تيك توك",
      description: "اكتشف أدوات مدير إعلانات تيك توك وكيف تبدأ حملتك الإعلانية الأولى بإعدادات صحيحة ونظام فوترة واضح",
      videoCount: 3,
      duration: "35 دقيقة",
      level: "مبتدئ",
      topics: ["واجهة Ads Manager", "إعداد طرق الدفع", "الفوترة", "لوحة المعلومات", "التقارير الأساسية", "الإعدادات الأولية"]
    },
    {
      id: 4,
      title: "أهداف الحملة الإعلانية",
      description: "استكشف أهداف الحملة المختلفة مثل التفاعل، الترافيك، والمبيعات، وكيفية استخدامها لتحقيق نتائج مخصصة لاحتياجاتك",
      videoCount: 8,
      duration: "1 ساعة 50 دقيقة",
      level: "متوسط",
      topics: ["أهداف الحملة", "Reach", "Traffic", "Conversions", "App Install", "Lead Generation", "متى تستخدم كل هدف"]
    },
    {
      id: 5,
      title: "إعداد المجموعة الإعلانية",
      description: "تعلم كيفية إعداد المجموعات الإعلانية بما يشمل تحديد الجمهور، اختيار الاهتمامات، وإعداد الميزانيات وجدولة الإعلانات",
      videoCount: 7,
      duration: "1 ساعة 45 دقيقة",
      level: "متوسط",
      topics: ["إعداد Ad Group", "استهداف الجمهور", "الاهتمامات", "السلوكيات", "الديموغرافيات", "الميزانيات", "الجدولة", "المواضع"]
    },
    {
      id: 6,
      title: "البدء في تصميم الإعلان",
      description: "تعرف على أدوات إنشاء الإعلانات داخل تيك توك من الهوية البصرية والإبداع الذكي إلى ضبط تفاصيل الإعلان لتحقيق أعلى تأثير",
      videoCount: 3,
      duration: "50 دقيقة",
      level: "متوسط",
      topics: ["أنواع الإعلانات", "In-feed Ads", "Brand Takeover", "TopView", "Branded Hashtag", "Branded Effects", "إنتاج المحتوى", "Creative Best Practices"]
    },
    {
      id: 7,
      title: "إضافات مهمة في حملتك",
      description: "تعلم كيفية قياس أداء الحملات وتحسينها من خلال تحليلات تفصيلية وإنشاء اختبارات A/B لزيادة الفعالية",
      videoCount: 4,
      duration: "1 ساعة 20 دقيقة",
      level: "متقدم",
      topics: ["A/B Testing", "تحسين الأداء", "KPIs", "ROI", "CPA", "CPM", "CTR", "Optimization"]
    },
    {
      id: 8,
      title: "البكسل والجماهير المخصصة",
      description: "تعلم كيفية تثبيت بكسل تيك توك وإنشاء جماهير مخصصة ومشابهة لتحسين استهداف حملاتك الإعلانية وزيادة معدلات التحويل",
      videoCount: 4,
      duration: "1 ساعة 15 دقيقة",
      level: "متقدم",
      topics: ["TikTok Pixel", "Event Tracking", "Custom Audiences", "Lookalike Audiences", "Retargeting", "Conversion Tracking", "Attribution"]
    }
  ]
};
