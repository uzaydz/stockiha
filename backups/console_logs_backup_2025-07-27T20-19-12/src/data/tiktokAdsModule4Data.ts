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

export const tiktokAdsModule4Data: ModuleData = {
  moduleNumber: 4,
  title: "أهداف الحملة الإعلانية",
  description: "استكشف أهداف الحملة المختلفة مثل التفاعل، الترافيك، والمبيعات، وكيفية استخدامها لتحقيق نتائج مخصصة لاحتياجاتك.",
  totalVideos: 8,
  estimatedDuration: "1 ساعة 50 دقيقة",
  videos: [
    {
      id: 1,
      title: "نظرة عامة على الحملة الإعلانية",
      description: "في هذا الدرس، سنقدم شرحاً عاماً لمفهوم الحملة الإعلانية على تيك توك، مع التركيز على أهم عناصرها مثل الأهداف، الميزانية، والمجموعات الإعلانية. سنتعرف على كيفية تنظيم الحملة لتكون نقطة انطلاق فعالة لتحقيق استراتيجياتك التسويقية. ستحصل على فهم شامل لبنية الحملة الإعلانية وكيفية التخطيط لها بشكل استراتيجي.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=9n2iDnwINMHnHrWzbDWMSaqzVBmeSH9Z" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "12 دقيقة"
    },
    {
      id: 2,
      title: "شرح هدف Reach",
      description: "في هذا الدرس، سنتناول هدف Reach في الحملات الإعلانية، والذي يهدف إلى زيادة عدد الأشخاص الذين يشاهدون إعلانك. سنشرح كيفية استخدام هذا الهدف للوصول إلى أكبر عدد ممكن من الجمهور خلال فترة زمنية محددة، مع تحقيق أقصى قدر من الوعي بالعلامة التجارية. ستتعلم متى وكيف تستخدم هذا الهدف بفعالية لبناء الوعي بالعلامة التجارية.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=mb4MXM0Ots7GUtaMOfy52kAheM73ELYJ" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "10 دقائق"
    },
    {
      id: 3,
      title: "الزيارات (Traffic)",
      description: "في هذا الدرس، سنتعرف على هدف Traffic في حملات تيك توك الإعلانية، والذي يهدف إلى توجيه المستخدمين إلى موقع ويب أو صفحة معينة. سنشرح كيفية إعداد هذا الهدف لجذب أكبر عدد ممكن من الزوار، مع تحسين أداء الإعلانات لزيادة النقرات وتحقيق الأهداف المرجوة. ستتعلم استراتيجيات فعالة لجذب الزيارات عالية الجودة إلى موقعك.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 72.97%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 72.97%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=oVLez6lLYO3Tm5G7EvKJ8DzLwX9Ycv0d" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "14 دقيقة"
    },
    {
      id: 4,
      title: "مشاهدات الفيديو (Video Views)",
      description: "في هذا الدرس، سنتعرف على هدف Video Views في إعلانات تيك توك، والذي يركز على زيادة عدد مرات مشاهدة الفيديو الخاص بك. سنشرح كيفية إعداد هذا الهدف لجذب أكبر عدد من المشاهدين وزيادة التفاعل مع محتوى الفيديو، مما يساعد في تعزيز الوعي بالعلامة التجارية أو المنتج. ستتعلم كيفية إنشاء محتوى جذاب يشجع على المشاهدة الكاملة.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 72.97%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 72.97%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=Rz07Rd1JJtlsG0N9GK1MWjabANyTzDnO" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "16 دقيقة"
    },
    {
      id: 5,
      title: "Community Interaction",
      description: "في هذا الدرس، سنتناول هدف Community Interaction في إعلانات تيك توك، الذي يهدف إلى زيادة التفاعل مع محتوى علامتك التجارية مثل الإعجابات، التعليقات، والمشاركات. سنشرح كيفية استخدام هذا الهدف لتعزيز علاقة الجمهور مع علامتك التجارية وبناء مجتمع نشط ومتفاعل حول منتجاتك أو خدماتك. ستتعلم تقنيات فعالة لتحفيز التفاعل الإيجابي.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 72.97%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 72.97%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=vZXmNyPUJFYF8vXBqXPy6SmjlwtUEP13" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "13 دقيقة"
    },
    {
      id: 6,
      title: "ترويج التطبيق (App Promotion)",
      description: "في هذا الدرس، سنتعرف على هدف App Promotion في إعلانات تيك توك، الذي يركز على زيادة تنزيلات التطبيق أو التفاعل معه. سنشرح كيفية إعداد هذا الهدف لجذب المستخدمين المستهدفين إلى تطبيقك، وتعزيز أدائه من خلال استراتيجيات فعالة لتحفيز التنزيل والاستخدام. ستتعلم كيفية تحسين معدلات التحويل للتطبيقات وزيادة عدد المستخدمين النشطين.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 72.97%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 72.97%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=Z8AjuR7wNabQC4cUiCBziE2WgASeKkse" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "15 دقيقة"
    },
    {
      id: 7,
      title: "هدف توليد العملاء المحتملين (Lead Generation)",
      description: "في هذا الدرس، سنتعرف على هدف Lead Generation في إعلانات تيك توك، الذي يهدف إلى جمع بيانات العملاء المحتملين مباشرة من المنصة من خلال نماذج مدمجة. سنوضح كيفية إعداد هذا الهدف لتسهيل الحصول على معلومات قيمة مثل البريد الإلكتروني أو رقم الهاتف، واستخدامها لتعزيز استراتيجيات التسويق والمبيعات. ستتعلم تصميم نماذج فعالة تحقق معدلات تحويل عالية.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 72.97%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 72.97%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=tDVmx23a3CczC47c8PWWVpuwfu6JXQhT" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "18 دقيقة"
    },
    {
      id: 8,
      title: "التحويلات للموقع (Website Conversions)",
      description: "في هذا الدرس، سنتعرف على هدف Website Conversions في إعلانات تيك توك، الذي يركز على تشجيع المستخدمين على اتخاذ إجراء محدد على موقعك الإلكتروني، مثل الشراء أو التسجيل. سنشرح كيفية إعداد هذا الهدف، تتبع التحويلات باستخدام البكسل، وتحسين الأداء لتحقيق نتائج ملموسة وزيادة العائد على الاستثمار. ستتعلم كيفية إنشاء مسار تحويل فعال يؤدي إلى نتائج ملموسة.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 72.97%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 72.97%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=RAVv4FeYC9pckiVyp157OpLFw5HcYqpA" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "22 دقيقة"
    }
  ]
};
