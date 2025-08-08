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

export const tiktokAdsModule8Data: ModuleData = {
  moduleNumber: 8,
  title: "البكسل والجماهير المخصصة",
  description: "تعلم كيفية تثبيت بكسل تيك توك وإنشاء جماهير مخصصة ومشابهة لتحسين استهداف حملاتك الإعلانية وزيادة معدلات التحويل.",
  totalVideos: 4,
  estimatedDuration: "1 ساعة 15 دقيقة",
  videos: [
    {
      id: 1,
      title: "ما هو البكسل؟",
      description: "في هذا الدرس، سنتعرف على مفهوم البكسل (Pixel) في إعلانات تيك توك، وهو أداة تتبع تسمح لك بمراقبة سلوك الزوار على موقعك بعد التفاعل مع إعلانك. سنوضح كيفية تثبيت البكسل على موقعك، وفوائده في تحسين الاستهداف وتحقيق نتائج أفضل من خلال تتبع التحويلات وتفاعل المستخدمين. ستفهم أهمية البكسل في قياس ROI وتحسين أداء الحملات.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=gUOPD1abyp3zqVPfB3TRNMzhOFG2aA7n" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "18 دقيقة"
    },
    {
      id: 2,
      title: "كيفية إنشاء وتركيب بكسل تيك توك",
      description: "في هذا الدرس، سنتعلم خطوات إنشاء بكسل تيك توك وتثبيته على موقعك الإلكتروني. سنشرح كيفية إنشاء البكسل من مدير الإعلانات، كيفية الحصول على الكود الخاص به، ثم كيفية إضافته إلى صفحات موقعك باستخدام طرق مختلفة مثل إضافة الكود يدوياً أو من خلال أدوات إدارة المواقع مثل Google Tag Manager، لضمان تتبع التحويلات وتحسين الحملات الإعلانية.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=h4Zgx56SutPNY6TmtPUanuIufJuzjJQ5" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "22 دقيقة"
    },
    {
      id: 3,
      title: "ربط البكسل في شوبيفاي",
      description: "في هذا الدرس، سنتعرف على كيفية ربط بكسل تيك توك مع متجر شوبيفاي الخاص بك. سنشرح خطوة بخطوة كيفية تثبيت تطبيق تيك توك على شوبيفاي، كيفية توصيل حساب تيك توك بالبكسل، وضبط الإعدادات اللازمة لتتبع التحويلات والتفاعل مع الزوار، مما يساعدك في تحسين حملاتك الإعلانية وزيادة المبيعات عبر متجرك. ستتعلم أيضاً كيفية تتبع الأحداث المهمة مثل الشراء وإضافة المنتجات للسلة.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 64.06%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 64.06%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=Yh5MT3hPzwKnpJVv0dIQrA07XdGPe9Ba" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "20 دقيقة"
    },
    {
      id: 4,
      title: "الجمهور المخصص والجمهور المشابه - الدرس الأخير",
      description: "في هذا الدرس الختامي، سنتعرف على كيفية إنشاء \"الجمهور المخصص\" (Custom Audience) على تيك توك لتوجيه الإعلانات إلى الأشخاص الذين تفاعلوا مع محتواك أو زاروا موقعك. كما سنتناول كيفية استخدام \"الجمهور المشابه\" (Lookalike Audience) لاستهداف مستخدمين مشابهين لأولئك الذين أبدوا اهتماماً بمنتجاتك أو خدماتك، مما يعزز فعالية حملاتك ويزيد من فرص الوصول إلى جمهور جديد وملائم.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=OpjptB1voVh8Y0ocviZiGeucAKrRW9IK" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "15 دقيقة"
    }
  ]
};
