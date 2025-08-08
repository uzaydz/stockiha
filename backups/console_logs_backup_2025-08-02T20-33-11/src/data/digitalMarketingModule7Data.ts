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

export const module7Data: ModuleData = {
  id: 7,
  title: "تقنيات الإعلان المتقدمة",
  description: "اكتشف تقنيات الإعلان المتقدمة من التنسيقات الدوارة إلى إعلانات الشراكة والتتبع المتطور لرفع مستوى حملاتك الإعلانية",
  totalVideos: 6,
  totalDuration: "48 دقيقة",
  videos: [
    {
      id: 1,
      title: "الإعلانات",
      description: "تعمق في عالم الإعلانات الاحترافية وتعلم كيفية إنشاء إعلانات فعالة تلفت الانتباه وتحقق أهدافك التسويقية. سنغطي أساسيات كتابة النصوص الإعلانية، اختيار الصور والفيديوهات المناسبة، وتحسين عناصر الإعلان لتحقيق أعلى معدلات النقر والتحويل.",
      duration: "8 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=cakOOOP3H5kvLmr3cvkEuL1zvwV0FI4E",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=cakOOOP3H5kvLmr3cvkEuL1zvwV0FI4E" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 2,
      title: "التنسيقات الدوارة والتجربة الفورية",
      description: "استكشف قوة الإعلانات الدوارة والتجربة الفورية في جذب انتباه جمهورك. ستتعلم كيفية إنشاء إعلانات دوارة متعددة الصور لعرض منتجات مختلفة، وكيفية استخدام ميزة التجربة الفورية لإنشاء تجارب تفاعلية غامرة تحفز المستخدمين على التفاعل والشراء بطريقة مبتكرة وجذابة.",
      duration: "9 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=cakOOOP3H5kvLmr3cvkEuL1zvwV0FI4E",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=cakOOOP3H5kvLmr3cvkEuL1zvwV0FI4E" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 3,
      title: "إعلانات الشراكة",
      description: "تعلم كيفية الاستفادة من قوة إعلانات الشراكة لتوسيع نطاق وصولك وزيادة مصداقية علامتك التجارية. سنتعرف على كيفية العثور على شركاء مناسبين، بناء شراكات إعلانية مفيدة للطرفين، وإنشاء حملات تعاونية تحقق نتائج مذهلة من خلال دمج قوة علامتين تجاريتين أو أكثر.",
      duration: "7 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=CDUCXjHewJa4jqaSFPX3gMgR648KdTDA",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=CDUCXjHewJa4jqaSFPX3gMgR648KdTDA" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 4,
      title: "التتبع",
      description: "إتقان فن تتبع أداء حملاتك الإعلانية هو المفتاح لتحقيق النجاح المستدام. في هذا الفيديو، ستتعلم كيفية إعداد أنظمة التتبع المتقدمة، استخدام Facebook Pixel بفعالية، تتبع التحويلات والأهداف، وتحليل البيانات لاتخاذ قرارات مدروسة تحسن من أداء حملاتك باستمرار.",
      duration: "8 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=BcMzuR11hOCh0qbdrnmgdqCVxqoRfg4Y",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=BcMzuR11hOCh0qbdrnmgdqCVxqoRfg4Y" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 5,
      title: "الإعلان بطريقة الحجز بدلاً من المزايدة",
      description: "اكتشف استراتيجية متقدمة في الإعلان تضمن لك ظهور إعلاناتك في الأوقات والمواضع التي تريدها بالضبط. سنتعلم كيفية استخدام نموذج الحجز المضمون، مميزاته عن المزايدة التقليدية، ومتى يكون الخيار الأمثل لحملاتك، خاصة للأحداث المهمة أو الإطلاقات الجديدة.",
      duration: "8 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=ElUDux7x7GamdQRY1wztuKMtkduZAvyP",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=ElUDux7x7GamdQRY1wztuKMtkduZAvyP" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 6,
      title: "خصائص إضافية في الإعلان",
      description: "استكشف الخصائص والأدوات المتقدمة التي توفرها منصات Meta لتحسين أداء إعلاناتك. سنتعرف على ميزات مثل العروض الديناميكية، إعادة الاستهداف المتقدمة، استخدام البيانات المخصصة، والأتمتة الذكية. هذه الخصائص ستساعدك على تحقيق نتائج أفضل وتوفير الوقت في إدارة حملاتك.",
      duration: "8 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=vnz15BMTKUppNo9wXOryn1QFbFnzr9bW",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=vnz15BMTKUppNo9wXOryn1QFbFnzr9bW" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    }
  ]
};
