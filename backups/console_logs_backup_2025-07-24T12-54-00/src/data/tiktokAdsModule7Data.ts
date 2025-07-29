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

export const tiktokAdsModule7Data: ModuleData = {
  moduleNumber: 7,
  title: "إضافات مهمة في حملتك",
  description: "تعلم كيفية قياس أداء الحملات وتحسينها من خلال تحليلات تفصيلية وإنشاء اختبارات A/B لزيادة الفعالية.",
  totalVideos: 4,
  estimatedDuration: "1 ساعة 20 دقيقة",
  videos: [
    {
      id: 1,
      title: "كيفية إنشاء اختبارات A/B (Split Test)",
      description: "في هذا الدرس، سنتعلم كيفية إنشاء اختبارات A/B (أو Split Test) لتجربة وتحليل نسخ مختلفة من الإعلانات أو استراتيجيات الاستهداف. سنوضح كيفية إعداد الاختبار، كيفية تحديد المتغيرات التي يجب اختبارها، وكيفية تحليل النتائج لاختيار الأنسب لزيادة فعالية حملاتك الإعلانية. ستتعلم منهجية علمية لتحسين أداء إعلاناتك من خلال البيانات والاختبارات المنظمة.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 64.06%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 64.06%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=Q4KTBfPnESQInxO7YZzORRYOCfW7IBi8" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "22 دقيقة"
    },
    {
      id: 2,
      title: "تحسين ميزانية الحملة باستخدام CBO (Campaign Budget Optimization)",
      description: "في هذا الدرس، سنتعرف على مفهوم تحسين ميزانية الحملة (CBO) وكيفية استخدامه لتحسين أداء الحملات الإعلانية على تيك توك. سنستعرض كيفية ضبط الميزانية الإجمالية بدلاً من تخصيص ميزانية لكل مجموعة إعلانات بشكل منفصل، وأهمية هذه الأداة في تعزيز الأداء وتقليل التكاليف. ستفهم كيف يوزع النظام الميزانية تلقائياً على أفضل المجموعات الإعلانية أداءً.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 64.06%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 64.06%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=E1xHCqu4pd5An0KOATmw558lSFEpGgGp" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "18 دقيقة"
    },
    {
      id: 3,
      title: "تحديد ميزانية الحملة (Set Campaign Budget)",
      description: "في هذا الدرس، سنتعلم كيفية تحديد ميزانية الحملة الإعلانية على تيك توك بشكل فعال. سنوضح الفرق بين الميزانية اليومية والميزانية الإجمالية، وكيفية اختيار الخيار الأنسب لحملتك لتحقيق التوازن بين الأداء والتكلفة، وضمان استخدام الميزانية بأقصى قدر من الفعالية. ستتعلم كيفية حساب الميزانية المناسبة بناءً على أهدافك وحجم الجمهور المستهدف.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 76.7%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 76.7%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=dMJmdYDCdvzSRzHjLMmq0i0ouZqoPupa" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "20 دقيقة"
    },
    {
      id: 4,
      title: "تحليل الحملة الإعلانية",
      description: "في هذا الدرس، سنتعرف على كيفية تحليل أداء الحملة الإعلانية على تيك توك باستخدام أدوات التحليل المتوفرة في مدير الإعلانات. سنشرح كيفية قراءة البيانات والنتائج، تحليل مؤشرات الأداء الرئيسية (KPIs)، واستخدام هذه المعلومات لإجراء تحسينات وتحقيق أفضل النتائج. ستتعلم كيفية تفسير البيانات واتخاذ قرارات مدروسة لتحسين أداء حملاتك المستقبلية.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 75.95%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 75.95%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=xXHSzix7XUUSzBMReRHUxrRfbdtXbwVQ" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "20 دقيقة"
    }
  ]
}; 