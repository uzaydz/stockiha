export interface ModuleVideo {
  id: number;
  title: string;
  description: string;
  embedCode: string;
  duration?: string;
}

export interface ModuleData {
  moduleNumber: number;
  title: string;
  description: string;
  totalVideos: number;
  estimatedDuration: string;
  videos: ModuleVideo[];
}

export const tiktokAdsModule1Data: ModuleData = {
  moduleNumber: 1,
  title: "مقدمة إلى تيك توك وتيك توك أدس",
  description: "تعرف على تيك توك كمنصة اجتماعية وكيف يمكن استخدامها كأداة إعلانية فعالة من خلال التعرف على منصة تيك توك أدس وحسابات Business Center.",
  totalVideos: 4,
  estimatedDuration: "45 دقيقة",
  videos: [
    {
      id: 1,
      title: "ما هو تيك توك؟",
      description: "نظرة عامة على منصة تيك توك، تطورها، وجاذبيتها كشبكة اجتماعية سريعة النمو ومليئة بالفرص الإعلانية. ستتعلم في هذا الفيديو كيف تطورت المنصة من تطبيق بسيط لمشاركة الفيديوهات القصيرة إلى قوة إعلانية عالمية، وكيف يمكن للشركات والمسوقين الاستفادة من قاعدة المستخدمين الضخمة والمتفاعلة.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=HDQlXEiBDfB5mdT6YhG23l9HNhrKqS2y" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "12 دقيقة"
    },
    {
      id: 2,
      title: "ما هي منصة تيك توك أدس؟",
      description: "تعريف بمنصة تيك توك الإعلانية وأهم مميزاتها التي تجعلها أداة قوية للوصول إلى جمهور عالمي متنوع. ستكتشف في هذا الفيديو قوة منصة TikTok for Business، وكيف تختلف عن الإعلانات التقليدية، والإمكانيات الهائلة التي توفرها للمعلنين من خلال تقنيات الذكاء الاصطناعي والاستهداف الدقيق.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=pPvkVnv918YwG1K1rAZdrPcPWbrDJu6R" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "10 دقائق"
    },
    {
      id: 3,
      title: "ما هو مدير الأعمال؟",
      description: "شرح أهمية Business Center لإدارة الحملات والحسابات الإعلانية بفعالية داخل تيك توك. تعلم كيف يساعدك مدير الأعمال في تنظيم حملاتك، إدارة الصلاحيات، تتبع الأداء، والتحكم في الميزانيات بشكل احترافي. ستفهم أيضاً أهمية هذه الأداة في إدارة عدة حسابات إعلانية وفرق عمل مختلفة.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=6dIgN4c3bkJOA1b1Kv1QCun84AyCeRje" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "8 دقائق"
    },
    {
      id: 4,
      title: "كيفية الحصول على حساب Business Center مفعل بهوية",
      description: "دليل عملي للحصول على حساب Business Center باستخدام الوثائق المطلوبة لضمان جاهزيته للإعلانات. ستتعلم خطوة بخطوة عملية التسجيل، الوثائق المطلوبة، طرق التحقق من الهوية، وكيفية تجنب الأخطاء الشائعة التي قد تؤدي إلى رفض الطلب. كما ستحصل على نصائح مهمة لضمان الموافقة السريعة على حسابك.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=cKFJVxxR1QPI37llNY3mYp7FXbqYwEob" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "15 دقيقة"
    }
  ]
}; 