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

export const tiktokAdsModule2Data: ModuleData = {
  moduleNumber: 2,
  title: "الحسابات الإعلانية على تيك توك",
  description: "تعلم الفرق بين الحسابات الإعلانية العادية وAgency وكيفية الحصول على حسابات مناسبة لإدارة الحملات بمرونة وكفاءة.",
  totalVideos: 8,
  estimatedDuration: "1 ساعة 20 دقيقة",
  videos: [
    {
      id: 1,
      title: "الفرق بين الحساب الإعلاني Agency والحساب الإعلاني العادي",
      description: "تعرف على ميزات وصلاحيات حسابات Agency مقارنة بالحسابات العادية، وكيفية اختيار الأنسب لعملك. ستفهم الاختلافات في الصلاحيات، حدود الإنفاق، طرق الدفع، وإمكانيات الإدارة المتقدمة التي توفرها حسابات الوكالة مقارنة بالحسابات الشخصية العادية.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 77.14%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 77.14%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=g0ukVWq2AsX8mafykP5CMqyPLYPascyK" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "15 دقيقة"
    },
    {
      id: 2,
      title: "كيفية فتح حسابات أجونسي تيك توك و فايسبوك",
      description: "خطوات مفصلة لإنشاء حساب Agency يتم تمويله مباشرة من منصة تيك توك لضمان سهولة إدارة الميزانية. تعلم عملية التسجيل، الوثائق المطلوبة، معايير الموافقة، وكيفية ربط حسابات فيسبوك مع تيك توك للحصول على إدارة موحدة ومتكاملة للحملات الإعلانية.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=OJVYOnH7Ov7zTyENaIgqxEkqobuK0Oc1" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "12 دقيقة"
    },
    {
      id: 3,
      title: "كيفية التحصل على حسابات إعلانية مجانية - الجزء الأول",
      description: "دليل لإنشاء حساب Agency يمنحك مرونة أكبر في شحن الرصيد والتحكم بتمويل الإعلانات خارجياً. ستتعلم الطرق المختلفة للحصول على حسابات إعلانية بدون تكلفة، متطلبات كل طريقة، والخطوات الأولى للبدء في إنشاء حساب وكالة قوي ومرن.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=tufoZgNgWjdc4dgGRUAdLnqElp5jXCrW" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "10 دقائق"
    },
    {
      id: 4,
      title: "كيفية التحصل على حسابات إعلانية مجانية - الجزء الثاني",
      description: "متابعة دليل إنشاء حساب Agency يمنحك مرونة أكبر في شحن الرصيد والتحكم بتمويل الإعلانات خارجياً. ستكمل في هذا الجزء عملية إعداد الحساب، تفعيل الميزات المتقدمة، وضبط الإعدادات الأساسية للحصول على أقصى استفادة من حساب الوكالة.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=YpkgKfvs3kDmxRqSGPdbcTUOLYxzgGhG" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "9 دقائق"
    },
    {
      id: 5,
      title: "كيفية التحصل على حسابات إعلانية مجانية - الجزء الثالث",
      description: "الجزء الأخير من دليل إنشاء حساب Agency يمنحك مرونة أكبر في شحن الرصيد والتحكم بتمويل الإعلانات خارجياً. ستتعلم كيفية اختبار الحساب، التأكد من صحة الإعدادات، وبدء استخدام الحساب بشكل فعال مع تجنب المشاكل الشائعة.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=6trTlLYgUi0qlr1zsKUKkRQEt1CQUl9S" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "8 دقائق"
    },
    {
      id: 6,
      title: "كيفية التحصل على الحسابات تيك توك سالف طوب أب",
      description: "دليل لإنشاء حساب Agency يمنحك مرونة أكبر في شحن الرصيد والتحكم بتمويل الإعلانات داخلياً. تعلم ميزات نظام Self Top Up، كيفية الوصول إليه، وكيف يختلف عن طرق التمويل الأخرى مع فوائده في إدارة الميزانيات بمرونة أكبر.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=BSigYqMQf8PG7ASXYpZF16spOtmV8hOE" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "11 دقيقة"
    },
    {
      id: 7,
      title: "الدرس الأول في الحسابات أجونسي Self Top Up",
      description: "درس متخصص وهام جداً يركز على تفاصيل حسابات Agency Self Top Up. ستتعلم المتطلبات الخاصة، عملية التقديم، والخطوات اللازمة للحصول على هذا النوع المتقدم من الحسابات مع شرح الفوائد والمميزات الحصرية التي يوفرها.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 57.88%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 57.88%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=oCIk91dSwEvBS1dvMJDztjjuiAsjJade" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "13 دقيقة"
    },
    {
      id: 8,
      title: "الدرس الثاني في الحسابات أجونسي Self Top Up",
      description: "الجزء الثاني والأخير من دروس حسابات Agency Self Top Up. ستتعلم كيفية إدارة وتشغيل هذه الحسابات بكفاءة، أفضل الممارسات للحفاظ على الحساب، وطرق تحقيق أقصى استفادة من المميزات المتقدمة مع نصائح عملية لتجنب المشاكل.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=X4uzv1Lzftp4OrDciYKxtROPW8GxqIxn" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "12 دقيقة"
    }
  ]
};
