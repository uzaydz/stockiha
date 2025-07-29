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

export const tiktokAdsModule6Data: ModuleData = {
  moduleNumber: 6,
  title: "البدء في تصميم الإعلان",
  description: "تعرف على أدوات إنشاء الإعلانات داخل تيك توك من الهوية البصرية والإبداع الذكي إلى ضبط تفاصيل الإعلان لتحقيق أعلى تأثير.",
  totalVideos: 3,
  estimatedDuration: "50 دقيقة",
  videos: [
    {
      id: 1,
      title: "مراجعة عامة في الحملة الإعلانية",
      description: "في هذا الدرس، سنتناول كيفية إجراء مراجعة شاملة لحملتك الإعلانية على تيك توك، بما في ذلك تقييم الأهداف، الأداء، والنتائج المحققة. سنتعرف أيضاً على كيفية تحليل البيانات لتحديد ما إذا كانت الحملة تحقق أهدافها أم لا، وكيفية إجراء التعديلات اللازمة لتحسين النتائج. ستتعلم منهجية منظمة لمراجعة وتقييم فعالية حملاتك الإعلانية.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=Z14dIi3H9oRw9HLsycOAYT6vyrf5Rdyz" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "16 دقيقة"
    },
    {
      id: 2,
      title: "الإبداع الذكي (Smart Creative)",
      description: "في هذا الدرس، سنتعرف على مفهوم \"الإبداع الذكي\" في إعلانات تيك توك، وكيف يمكن استخدام أدوات الإبداع الذكي لإنشاء إعلانات تلقائياً تتكيف مع الجمهور المستهدف بشكل أفضل. سنوضح أيضاً كيفية تحسين الإعلانات باستخدام تقنيات الذكاء الاصطناعي لتحقيق أفضل أداء دون الحاجة لتصميم يدوي متكرر، وكيفية الاستفادة من التعلم الآلي في تحسين المحتوى.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=IKiMrQ9VljgSMWhewLJrH9EWZWCvsIB3" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "18 دقيقة"
    },
    {
      id: 3,
      title: "مجموعة الإعلانات (Ad Set)",
      description: "في هذا الدرس، سنتعرف على مفهوم مجموعة الإعلانات (Ad Set) في حملات تيك توك الإعلانية، وكيفية تنظيم الإعلانات ضمن مجموعات لتحديد الاستهداف، الميزانية، والجدولة. سنستعرض أيضاً كيفية ضبط الخيارات المختلفة ضمن كل مجموعة لتحقيق أقصى فعالية للحملة، وأفضل الممارسات في تنظيم وإدارة مجموعات الإعلانات المتعددة.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=urcAYDnYAUB7ESvc9DyN5M2vcxWfKVON" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "16 دقيقة"
    }
  ]
};
