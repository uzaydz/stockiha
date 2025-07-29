export interface Video {
  id: number;
  title: string;
  description?: string;
  duration?: string;
  videoUrl: string;
  videoType: 'vimeo' | 'vadoo';
  embedCode: string;
}

export interface ModuleData {
  id: number;
  title: string;
  description: string;
  totalVideos: number;
  totalDuration: string;
  videos: Video[];
}

export const module1Data: ModuleData = {
  id: 1,
  title: "البداية في التسويق الإلكتروني",
  description: "علم فن التسويق الإلكتروني من خلال دورتنا المكثفة لتصميم حملات إعلانية ناجحة وتحليل بيانات السوق",
  totalVideos: 9,
  totalDuration: "2 ساعة",
  videos: [
    {
      id: 1,
      title: "ماذا تحتاج للبدأ في مجال التسويق والتجارة الإلكترونية",
      description: "مقدمة شاملة للأساسيات المطلوبة للدخول في عالم التسويق الإلكتروني",
      duration: "15 دقيقة",
      videoUrl: "https://player.vimeo.com/video/1002287696",
      videoType: 'vimeo',
      embedCode: `<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1002287696?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="مذا تحتاح للبدأ في التسويق و التجارة الإلكترونية"></iframe></div>`
    },
    {
      id: 2,
      title: "قبل البداية في مسيرتك في الإعلانات",
      description: "هذا الفيديو هو مقدمة شاملة لكيفية التحضير لبداية مسيرتك في عالم الإعلانات",
      duration: "18 دقيقة",
      videoUrl: "https://api.vadoo.tv/iframe_test?id=YrQi4pTZ8nfknc9fAS6vsdOKor0LkdQ8",
      videoType: 'vadoo',
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=YrQi4pTZ8nfknc9fAS6vsdOKor0LkdQ8" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 3,
      title: "تسخين الحساب الشخصي الثانوي",
      description: "تعلم كيفية إعداد وتسخين الحساب الشخصي الثانوي للحصول على أفضل النتائج",
      duration: "12 دقيقة",
      videoUrl: "https://api.vadoo.tv/iframe_test?id=AwQJv6ddxB02GIzJLVjeeVs8r30MKzlO",
      videoType: 'vadoo',
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=AwQJv6ddxB02GIzJLVjeeVs8r30MKzlO" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 4,
      title: "فتح صفحة تجارية و ضبط إعداداتها",
      description: "خطوات مفصلة لإنشاء صفحة تجارية على فيسبوك وإعدادها بشكل صحيح",
      duration: "20 دقيقة",
      videoUrl: "https://api.vadoo.tv/iframe_test?id=Uf9AejAS43fnhauHPF0k9EebDVn1QIb8",
      videoType: 'vadoo',
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=Uf9AejAS43fnhauHPF0k9EebDVn1QIb8" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 5,
      title: "إعدادات الصفحة التجارية",
      description: "تفاصيل مهمة حول إعدادات الصفحة التجارية للحصول على أقصى استفادة",
      duration: "16 دقيقة",
      videoUrl: "https://api.vadoo.tv/iframe_test?id=n1XpANVB1IOsrzsoanjlnoOGj5F36Nfc",
      videoType: 'vadoo',
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=n1XpANVB1IOsrzsoanjlnoOGj5F36Nfc" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 6,
      title: "إدارة الصفحة",
      description: "كيفية إدارة الصفحة التجارية بفعالية والتفاعل مع العملاء",
      duration: "14 دقيقة",
      videoUrl: "https://api.vadoo.tv/iframe_test?id=4mrNSZXocOREfiRemc6EwPDPA9ej76H0",
      videoType: 'vadoo',
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=4mrNSZXocOREfiRemc6EwPDPA9ej76H0" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 7,
      title: "Meta Business Suite",
      description: "شرح شامل لاستخدام Meta Business Suite لإدارة أعمالك على منصات فيسبوك",
      duration: "22 دقيقة",
      videoUrl: "https://api.vadoo.tv/iframe_test?id=IHuJaZt982IegR5f20eYUL7C39rCrArb",
      videoType: 'vadoo',
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=IHuJaZt982IegR5f20eYUL7C39rCrArb" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 8,
      title: "ربط حساب أنستقرام وواتساب",
      description: "كيفية ربط حسابات إنستقرام وواتساب بصفحتك التجارية لتوسيع نطاق الوصول",
      duration: "18 دقيقة",
      videoUrl: "https://api.vadoo.tv/iframe_test?id=iHI6tEKTTRaO9qrhWy4d70fjWZAzK3Zv",
      videoType: 'vadoo',
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=iHI6tEKTTRaO9qrhWy4d70fjWZAzK3Zv" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 9,
      title: "سر محرك العملاء المحتملين",
      description: "اكتشف الأسرار المتقدمة لجذب العملاء المحتملين وتحويلهم إلى عملاء فعليين",
      duration: "25 دقيقة",
      videoUrl: "https://api.vadoo.tv/iframe_test?id=CnRdocyO21gK03DduZp35HvnQaHNgcKC",
      videoType: 'vadoo',
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=CnRdocyO21gK03DduZp35HvnQaHNgcKC" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    }
  ]
}; 