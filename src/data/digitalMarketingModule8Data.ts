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

export const module8Data: ModuleData = {
  id: 8,
  title: "إتقان استهداف الجماهير",
  description: "دليل شامل لفهم أنواع الجماهير المختلفة وكيفية استهدافها بدقة لضمان وصول إعلاناتك للأشخاص المناسبين",
  totalVideos: 4,
  totalDuration: "32 دقيقة",
  videos: [
    {
      id: 1,
      title: "الجماهير - الجزء الأول",
      description: "مقدمة شاملة لفهم أنواع الجماهير في فيسبوك وإنستقرام. سنتعلم الفرق بين الجماهير المحفوظة والمخصصة والمتشابهة، وكيفية إنشاء استراتيجية استهداف فعالة. ستتعرف على أساسيات تحديد الجمهور المثالي لمنتجك أو خدمتك وأهمية فهم سلوك العملاء.",
      duration: "8 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=QmTZ5JFFXUfLfB0XDzWmm9h9rCWirlFu",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=QmTZ5JFFXUfLfB0XDzWmm9h9rCWirlFu" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 2,
      title: "الجماهير - الجزء الثاني",
      description: "تعمق في تقنيات الاستهداف المتقدمة واستخدام البيانات الديموغرافية بذكاء. سنتعلم كيفية تحليل عمر الجمهور، الجنس، الموقع الجغرافي، والاهتمامات لإنشاء شرائح جماهير دقيقة. ستكتشف كيفية استخدام Audience Insights لفهم جمهورك بشكل أعمق وتحسين استهدافك.",
      duration: "8 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=4eGPlrepPmEg0WYNLHtKmWHyhBtDo2B6",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=4eGPlrepPmEg0WYNLHtKmWHyhBtDo2B6" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 3,
      title: "الجماهير - الجزء الثالث",
      description: "إتقان الجماهير المخصصة وطرق إنشائها من قوائم العملاء الحاليين، زوار الموقع، والمتفاعلين مع صفحاتك. سنتعلم كيفية رفع قوائم العملاء، استخدام Facebook Pixel لإنشاء جماهير مخصصة، وتقسيم الجماهير حسب السلوك والتفاعل لضمان وصول رسائلك لأكثر الأشخاص اهتماماً.",
      duration: "8 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=Ed6Pjk54UFhbCd2PqhWFuCUfrStgjncw",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=Ed6Pjk54UFhbCd2PqhWFuCUfrStgjncw" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 4,
      title: "الجماهير - الجزء الرابع",
      description: "استكشاف الجماهير المتشابهة وقوتها في توسيع نطاق وصولك لعملاء جدد يشبهون عملاءك الحاليين. سنتعلم كيفية إنشاء lookalike audiences فعالة، اختيار المصدر المناسب، وضبط نسبة التشابه للحصول على أفضل النتائج. ستكتشف استراتيجيات متقدمة لاختبار وتحسين جماهيرك باستمرار.",
      duration: "8 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=Uf9AejAS43fnhauHPF0k9EebDVn1QIb8",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=Uf9AejAS43fnhauHPF0k9EebDVn1QIb8" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    }
  ]
};
