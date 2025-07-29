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

export const module5Data: ModuleData = {
  id: 5,
  title: "أهداف الحملات الإعلانية",
  description: "تعلم كيفية إنشاء حملاتك الإعلانية الأولى بأهداف مختلفة لتحقيق أقصى استفادة من استثمارك الإعلاني",
  totalVideos: 6,
  totalDuration: "45 دقيقة",
  videos: [
    {
      id: 1,
      title: "حملتك الإعلانية الأولى - هدف الوعي",
      description: "في هذا الفيديو، ستتعلم كيفية إنشاء حملة إعلانية تهدف إلى زيادة الوعي بعلامتك التجارية. سنغطي أفضل الممارسات لاختيار الجمهور المناسب، وكيفية تصميم إعلانات جذابة تلفت الانتباه وتبني الوعي بالعلامة التجارية بشكل فعال.",
      duration: "8 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=UqDe7UWO0Q8m80iZvVBsJLW0ZuaadnZt",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=UqDe7UWO0Q8m80iZvVBsJLW0ZuaadnZt" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 2,
      title: "حملتك الإعلانية الأولى - هدف الزيارات",
      description: "تعلم كيفية إعداد حملة إعلانية تهدف إلى زيادة عدد زوار موقعك الإلكتروني. سنشرح استراتيجيات اختيار الكلمات المفتاحية، تحسين الإعلانات لجذب النقرات، وكيفية قياس فعالية الحملة في جلب حركة مرور مؤهلة إلى موقعك.",
      duration: "7 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=82RQcczxLYI7wmNzAMLFWKUAY9fG1SQf",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=82RQcczxLYI7wmNzAMLFWKUAY9fG1SQf" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 3,
      title: "حملتك الإعلانية الأولى - هدف التفاعل",
      description: "اكتشف كيفية بناء حملة إعلانية تركز على زيادة التفاعل مع منشوراتك وصفحاتك على وسائل التواصل الاجتماعي. سنتعلم كيفية تصميم محتوى يشجع على الإعجابات، التعليقات، والمشاركات، وكيفية استخدام هذا التفاعل لبناء مجتمع قوي حول علامتك التجارية.",
      duration: "6 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=HEbSkjXI1zNMcGYi8TMC4XLPpnFOO8mG",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=HEbSkjXI1zNMcGYi8TMC4XLPpnFOO8mG" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 4,
      title: "حملتك الإعلانية الأولى - هدف العملاء المحتملين",
      description: "تعلم استراتيجيات جمع العملاء المحتملين من خلال حملاتك الإعلانية. سنغطي كيفية إنشاء نماذج فعالة لجمع معلومات العملاء، تصميم عروض جذابة تشجع على التسجيل، وأفضل الممارسات لمتابعة العملاء المحتملين وتحويلهم إلى عملاء فعليين.",
      duration: "9 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=ybxXoL6BXBbrZ3uCZhLC5daKpiQPdJbA",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=ybxXoL6BXBbrZ3uCZhLC5daKpiQPdJbA" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 5,
      title: "حملتك الإعلانية الأولى - هدف التطبيق",
      description: "إذا كان لديك تطبيق جوال، فهذا الفيديو سيعلمك كيفية إنشاء حملات إعلانية تهدف إلى زيادة تحميل وتثبيت التطبيق. سنتعلم كيفية استهداف المستخدمين المناسبين، تحسين الإعلانات لزيادة معدل التحميل، وتتبع أداء التطبيق بعد التثبيت.",
      duration: "7 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=DidBLqr7WFV1TmpRiSrL4HPurkSl3vZL",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=DidBLqr7WFV1TmpRiSrL4HPurkSl3vZL" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 6,
      title: "حملتك الإعلانية الأولى - هدف المبيعات",
      description: "الهدف الأهم لمعظم الأعمال التجارية! تعلم كيفية إنشاء حملات إعلانية تركز على زيادة المبيعات والتحويلات. سنغطي استراتيجيات الاستهداف المتقدمة، تحسين صفحات الهبوط، تتبع التحويلات، وكيفية قياس عائد الاستثمار من حملاتك الإعلانية لضمان تحقيق أقصى ربحية.",
      duration: "8 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=C0iZU7RWr87t1tlh4kqUbgoXXyK7x8JL",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=C0iZU7RWr87t1tlh4kqUbgoXXyK7x8JL" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    }
  ]
}; 