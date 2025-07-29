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

export const tiktokAdsModule3Data: ModuleData = {
  moduleNumber: 3,
  title: "أساسيات مدير إعلانات تيك توك",
  description: "اكتشف أدوات مدير إعلانات تيك توك وكيف تبدأ حملتك الإعلانية الأولى بإعدادات صحيحة ونظام فوترة واضح.",
  totalVideos: 3,
  estimatedDuration: "35 دقيقة",
  videos: [
    {
      id: 1,
      title: "كل شيء حول Ads Manager",
      description: "في هذا الدرس، سنتعرف على منصة \"مدير الإعلانات\" (Ads Manager) على تيك توك، والتي تعتبر الأداة الرئيسية لإدارة الحملات الإعلانية. سنشرح كيفية استخدام Ads Manager لإنشاء وتحليل وإدارة الحملات الإعلانية بفعالية. سنتناول كيفية تحديد الأهداف، تخصيص الإعلانات، إدارة المجموعات الإعلانية، مراقبة الأداء، وتحليل النتائج لضمان تحسين الحملات وتحقيق الأهداف المحددة.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=csYvhmyXZ9bTyLn4zuuq6adnHDPfsirb" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "15 دقيقة"
    },
    {
      id: 2,
      title: "شرح الحملة الإعلانية",
      description: "في هذا الدرس، سنتناول مفهوم الحملة الإعلانية على تيك توك، وكيفية إعدادها لتحقيق أهداف تسويقية محددة. سنشرح المكونات الرئيسية للحملة، بما في ذلك اختيار الهدف الإعلاني، ضبط الميزانية، وتحديد الاستراتيجيات المناسبة للوصول إلى الجمهور المستهدف بفعالية. ستتعلم كيفية بناء هيكل حملة قوي يضمن تحقيق أقصى عائد على الاستثمار.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=bS8PRY9Abri5tkA3t3oFIHipspcdtbs8" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "12 دقيقة"
    },
    {
      id: 3,
      title: "الفوترة في إعلانات تيك توك",
      description: "في هذا الدرس، سنتعرف على نظام الفوترة في منصة إعلانات تيك توك، بما في ذلك طرق الدفع المتاحة، كيفية إعداد خيارات الدفع، وتتبع التكاليف المرتبطة بحملاتك الإعلانية. سنشرح أيضاً كيفية التعامل مع المشاكل الشائعة في الفوترة وإدارة نفقات الإعلانات بفعالية. ستحصل على فهم شامل لآلية الدفع ونصائح لتحسين إدارة الميزانية.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=UivYR3nREfOHdvWtqvXl60w30c8VOefJ" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "8 دقائق"
    }
  ]
};
