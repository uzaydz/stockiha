export interface Video {
  id: number;
  title: string;
  description: string;
  duration?: string;
  url: string;
  type: 'vimeo' | 'vadoo';
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

export const module6Data: ModuleData = {
  id: 6,
  title: "تحسين وإعداد الحملات الإعلانية",
  description: "اتقن فن تحسين حملاتك الإعلانية باستخدام الذكاء الاصطناعي وتعلم إعدادات الميزانية والجماهير والمواضع لتحقيق أفضل النتائج",
  totalVideos: 4,
  totalDuration: "32 دقيقة",
  videos: [
    {
      id: 1,
      title: "تحسين حسابك الإعلاني بالذكاء الاصطناعي",
      description: "اكتشف قوة الذكاء الاصطناعي في تحسين أداء حملاتك الإعلانية. سنتعلم كيفية استخدام أدوات Meta الذكية لتحليل البيانات تلقائياً، تحسين الاستهداف، وتعديل الحملات بناءً على الأداء الفعلي. ستتعلم أيضاً كيفية الاستفادة من خوارزميات التعلم الآلي لتقليل التكلفة وزيادة معدل التحويل.",
      duration: "9 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=uTxNdkmGVJyOc7gObRCD3nc6GQsQiwwi",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=uTxNdkmGVJyOc7gObRCD3nc6GQsQiwwi" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 2,
      title: "الميزانية والجدول الزمني",
      description: "تعلم كيفية إدارة ميزانيتك الإعلانية بذكاء وتحديد الجدول الزمني الأمثل لحملاتك. سنغطي استراتيجيات توزيع الميزانية على الحملات المختلفة، كيفية تحديد التوقيت المناسب لعرض الإعلانات لجمهورك المستهدف، وطرق مراقبة الإنفاق لضمان الحصول على أفضل عائد استثمار.",
      duration: "8 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=YrQi4pTZ8nfknc9fAS6vsdOKor0LkdQ8",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=YrQi4pTZ8nfknc9fAS6vsdOKor0LkdQ8" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 3,
      title: "إعدادات الجماهير",
      description: "إتقان فن اختيار وإعداد الجماهير المستهدفة هو مفتاح نجاح أي حملة إعلانية. في هذا الفيديو، ستتعلم كيفية تحديد الجمهور المثالي لمنتجك أو خدمتك، استخدام البيانات الديموغرافية والاهتمامات والسلوكيات، وإنشاء جماهير مخصصة ومتشابهة لتوسيع نطاق وصولك بفعالية.",
      duration: "8 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=ikFPsQJlUQ1wbx5qTqsmYv5SjfJ2QHZJ",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=ikFPsQJlUQ1wbx5qTqsmYv5SjfJ2QHZJ" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 4,
      title: "المواضع الإعلانية",
      description: "تعرف على جميع المواضع الإعلانية المتاحة عبر منصات Meta وكيفية اختيار الأنسب لأهدافك التسويقية. سنستعرض مواضع Facebook و Instagram و Messenger و Audience Network، ونتعلم كيفية تحسين كل موضع لتحقيق أفضل أداء وأقل تكلفة، مع نصائح حول متى تستخدم المواضع التلقائية ومتى تختار يدوياً.",
      duration: "7 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=BCNvqGHpEzKv17dJk2nXL0yjf0OGXPKr",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=BCNvqGHpEzKv17dJk2nXL0yjf0OGXPKr" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    }
  ]
}; 