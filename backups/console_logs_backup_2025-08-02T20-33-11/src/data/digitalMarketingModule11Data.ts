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

export const module11Data: ModuleData = {
  id: 11,
  title: "فن التعامل مع العملاء",
  description: "إتقان مهارات التواصل مع العملاء وفهم أنواعهم المختلفة لبناء علاقات قوية وزيادة المبيعات",
  totalVideos: 4,
  totalDuration: "28 دقيقة",
  videos: [
    {
      id: 1,
      title: "أنواع العملاء",
      description: "تعرف على الأنواع المختلفة للعملاء وكيفية التعامل مع كل نوع بالطريقة المناسبة. سنتعلم تصنيف العملاء حسب شخصياتهم وأساليب اتخاذ القرار، مثل العميل المتردد، العميل المتسرع، العميل المحلل، والعميل الاجتماعي. ستكتشف كيفية تحديد نوع العميل من أول تفاعل وتطوير استراتيجيات مخصصة لكل نوع لزيادة احتمالية إتمام البيع.",
      duration: "7 دقائق",
      url: "https://player.vimeo.com/video/666383827",
      type: "vimeo",
      embedCode: `<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666383827?badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="1-12-1.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`
    },
    {
      id: 2,
      title: "كيفية التحدث مع العميل",
      description: "أسرار التواصل الفعال مع العملاء وبناء الثقة من خلال الكلمات المناسبة. سنتعلم تقنيات الاستماع النشط، طرح الأسئلة الصحيحة، واستخدام لغة الجسد المناسبة. ستكتشف كيفية بدء المحادثة بطريقة إيجابية، تحديد احتياجات العميل الحقيقية، والتعامل مع الاعتراضات بمهنية عالية لتحويل المحادثة إلى فرصة بيع ناجحة.",
      duration: "7 دقائق",
      url: "https://player.vimeo.com/video/666384203",
      type: "vimeo",
      embedCode: `<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666384203?badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="1-12-2.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`
    },
    {
      id: 3,
      title: "كيفية التعامل مع العميل",
      description: "استراتيجيات متقدمة للتعامل مع المواقف الصعبة والعملاء المتطلبين. سنتعلم كيفية إدارة توقعات العملاء، التعامل مع الشكاوى بإيجابية، وتحويل العملاء الغاضبين إلى عملاء راضين ومخلصين. ستكتشف تقنيات حل المشاكل، وطرق تقديم البدائل والحلول، وكيفية الحفاظ على هدوءك ومهنيتك في جميع المواقف.",
      duration: "7 دقائق",
      url: "https://player.vimeo.com/video/666384303",
      type: "vimeo",
      embedCode: `<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666384303?badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="1-12-3.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`
    },
    {
      id: 4,
      title: "مهارات التحدث",
      description: "تطوير مهارات التحدث والإقناع لتصبح محترف مبيعات متميز. سنتعلم تقنيات الإقناع النفسي، استخدام القصص والأمثلة بفعالية، وبناء العروض التقديمية المقنعة. ستكتشف كيفية استخدام النبرة الصوتية المناسبة، اختيار الكلمات المؤثرة، وتوقيت عرض المنتج أو الخدمة للحصول على أفضل استجابة من العملاء وزيادة معدلات الإقناع والبيع.",
      duration: "7 دقائق",
      url: "https://player.vimeo.com/video/666384457",
      type: "vimeo",
      embedCode: `<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666384457?badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="1-12-4.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`
    }
  ]
};
