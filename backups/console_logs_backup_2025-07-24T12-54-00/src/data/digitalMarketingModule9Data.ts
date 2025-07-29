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

export const module9Data: ModuleData = {
  id: 9,
  title: "إطلاق وتحسين الحملات الإعلانية",
  description: "تعلم كيفية إطلاق حملاتك الإعلانية بالطريقة الصحيحة وتحسينها باستخدام الذكاء الاصطناعي ومتابعة النتائج",
  totalVideos: 3,
  totalDuration: "27 دقيقة",
  videos: [
    {
      id: 1,
      title: "تحسين حسابك الإعلاني بالذكاء الاصطناعي",
      description: "اكتشف قوة الذكاء الاصطناعي في تحسين أداء حملاتك الإعلانية تلقائياً. سنتعلم كيفية تفعيل ميزات التعلم الآلي في فيسبوك، استخدام التحسين التلقائي للمزايدة، وكيفية الاستفادة من خوارزميات Meta لتحسين التوصيل وخفض التكاليف. ستتعرف على أدوات الذكاء الاصطناعي المتقدمة لتحليل البيانات واتخاذ قرارات أكثر ذكاءً.",
      duration: "10 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=uTxNdkmGVJyOc7gObRCD3nc6GQsQiwwi",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=uTxNdkmGVJyOc7gObRCD3nc6GQsQiwwi" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 2,
      title: "إطلاق حملتك الإعلانية بالتوصيلة الخاصة بفيسبوك",
      description: "دليل خطوة بخطوة لإطلاق حملتك الإعلانية الأولى باستخدام ميزة التوصيلة المبسطة من فيسبوك. سنتعلم كيفية اختيار الهدف المناسب، ضبط الميزانية والجدولة، اختيار الجمهور المثالي، وإنشاء إعلانات جذابة. ستكتشف النصائح والحيل لضمان إطلاق ناجح وتجنب الأخطاء الشائعة للمبتدئين.",
      duration: "9 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=zsPX6QEEo6GFEs9E0R03K7zYEQCe9f4C",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=zsPX6QEEo6GFEs9E0R03K7zYEQCe9f4C" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 3,
      title: "العثور على نتائج الحملة الإعلانية في مدير الإعلانات",
      description: "تعلم كيفية قراءة وتحليل نتائج حملاتك الإعلانية في مدير الإعلانات. سنستكشف جميع المقاييس المهمة مثل معدل النقر، تكلفة النقرة، معدل التحويل، وعائد الاستثمار. ستتعلم كيفية إنشاء تقارير مخصصة، مقارنة أداء الحملات المختلفة، وتحديد نقاط القوة والضعف لتحسين الأداء المستقبلي.",
      duration: "8 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=IHuJaZt982IegR5f20eYUL7C39rCrArb",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=IHuJaZt982IegR5f20eYUL7C39rCrArb" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    }
  ]
}; 