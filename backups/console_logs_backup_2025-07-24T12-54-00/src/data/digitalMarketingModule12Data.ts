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

export const module12Data: ModuleData = {
  id: 12,
  title: "بكسل فيسبوك - الأساس لنجاح إعلاناتك",
  description: "إتقان إعداد واستخدام بكسل فيسبوك لتتبع التحويلات وتحسين أداء حملاتك الإعلانية وزيادة عائد الاستثمار",
  totalVideos: 3,
  totalDuration: "24 دقيقة",
  videos: [
    {
      id: 1,
      title: "بكسل فيسبوك - الجزء الأول",
      description: "مقدمة شاملة لفهم بكسل فيسبوك وأهميته في التسويق الرقمي. سنتعلم ما هو البكسل، كيف يعمل، ولماذا هو ضروري لنجاح حملاتك الإعلانية. ستكتشف كيفية إنشاء البكسل في Business Manager، وفهم الأحداث المختلفة التي يمكن تتبعها مثل زيارات الصفحة، الإضافة للسلة، والمشتريات. سنغطي أيضاً أساسيات تجميع البيانات وحماية خصوصية المستخدمين.",
      duration: "8 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=t4uXyP2mfUiMQNYOkkM0pu6k1KDPZ0Ev",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=t4uXyP2mfUiMQNYOkkM0pu6k1KDPZ0Ev" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 2,
      title: "بكسل فيسبوك - الجزء الثاني",
      description: "دليل تفصيلي لتثبيت وإعداد بكسل فيسبوك على موقعك الإلكتروني. سنتعلم طرق التثبيت المختلفة من الكود المباشر إلى استخدام Google Tag Manager وإضافات WordPress. ستكتشف كيفية التحقق من عمل البكسل بشكل صحيح، إعداد الأحداث المخصصة، وتكوين التحويلات الهامة لعملك. سنغطي أيضاً حل المشاكل الشائعة في التثبيت وضمان دقة جمع البيانات.",
      duration: "8 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=o0bonqSDGLdTanK69SF78qbvnXmreccD",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=o0bonqSDGLdTanK69SF78qbvnXmreccD" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    },
    {
      id: 3,
      title: "بكسل فيسبوك - الجزء الثالث",
      description: "استراتيجيات متقدمة لاستخدام بيانات البكسل في تحسين حملاتك الإعلانية. سنتعلم كيفية إنشاء جماهير مخصصة ومتشابهة باستخدام بيانات البكسل، تحسين التوصيل للتحويلات، وقياس عائد الاستثمار بدقة. ستكتشف كيفية استخدام أدوات التحليل المتقدمة، إعداد تقارير التحويل، وتطبيق استراتيجيات إعادة الاستهداف الفعالة. سنغطي أيضاً كيفية التعامل مع iOS 14.5+ والتحديات الجديدة في تتبع البيانات.",
      duration: "8 دقائق",
      url: "https://api.vadoo.tv/iframe_test?id=uQq15l6n79sazzKr9O2db0Hc0XQUttKp",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=uQq15l6n79sazzKr9O2db0Hc0XQUttKp" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    }
  ]
}; 