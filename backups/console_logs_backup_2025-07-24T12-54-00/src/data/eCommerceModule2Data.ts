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

export const eCommerceModule2Data: ModuleData = {
  moduleNumber: 2,
  title: "استراتيجيات وأدوات التجارة الإلكترونية",
  description: "تطبيقات مساعدة، اختيار المنتجات، التفوق على المنافسة، التوصيل وشركات التوصيل",
  totalVideos: 8,
  estimatedDuration: "1 ساعة 45 دقيقة",
  videos: [
    {
      id: 1,
      title: "تطبيقات تساعدك في تجارتك",
      description: "استكشاف أهم التطبيقات والأدوات الرقمية التي تساعدك في إدارة تجارتك الإلكترونية بكفاءة. سنتعرف على تطبيقات إدارة المخزون، تطبيقات التصوير والتحرير، أدوات التسويق الرقمي، وتطبيقات خدمة العملاء التي ستسهل عليك العمل وتحسن من أدائك.",
      embedCode: `<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666387235?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="3-3-1-p1.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`,
      duration: "15 دقيقة"
    },
    {
      id: 2,
      title: "مبدأ اختيار المنتجات",
      description: "منهجية علمية لاختيار المنتجات الرابحة في التجارة الإلكترونية. سنتعلم كيفية تحليل الطلب على المنتجات، تقييم هامش الربح، دراسة المنافسة، وفهم دورة حياة المنتج لضمان اختيار منتجات ذات إمكانية نجاح عالية في السوق.",
      embedCode: `<div style="padding:62.5% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666389070?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="3-4-1.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`,
      duration: "18 دقيقة"
    },
    {
      id: 3,
      title: "التفوق على المنافسة",
      description: "استراتيجيات متقدمة للتميز عن المنافسين وبناء ميزة تنافسية قوية. سنناقش كيفية تحليل نقاط قوة وضعف المنافسين، تطوير عروض قيمة فريدة، تحسين تجربة العميل، وبناء علاقات قوية مع العملاء للحفاظ على ولائهم.",
      embedCode: `<div style="padding:62.5% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666367214?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="3-4-2.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`,
      duration: "16 دقيقة"
    },
    {
      id: 4,
      title: "استراتيجية العمل",
      description: "وضع خطة عمل شاملة للتجارة الإلكترونية تشمل الأهداف قصيرة وطويلة المدى. سنتعلم كيفية تحديد الرؤية والرسالة، وضع أهداف SMART، تخطيط الموارد المالية والبشرية، وإنشاء خطة تسويقية فعالة لضمان نمو مستدام للعمل.",
      embedCode: `<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666505180?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="3-5-1.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`,
      duration: "20 دقيقة"
    },
    {
      id: 5,
      title: "كيفية التوصيل وشركات التوصيل",
      description: "دليل شامل حول خدمات التوصيل في الجزائر وكيفية اختيار الشركة المناسبة لعملك. سنتعرف على أهم شركات التوصيل المحلية، مقارنة الأسعار والخدمات، فهم آليات العمل مع كل شركة، وكيفية تحسين تجربة التوصيل للعملاء.",
      embedCode: `<div style="padding:62.5% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666571012?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="3-1-6.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`,
      duration: "14 دقيقة"
    },
    {
      id: 6,
      title: "التسجيل مع شركة التوصيل",
      description: "خطوات تفصيلية للتسجيل والعمل مع شركات التوصيل المختلفة. سنتعلم المتطلبات اللازمة، الوثائق المطلوبة، عملية التقديم، والإعدادات الأولية لبدء العمل مع شركات التوصيل بطريقة احترافية وفعالة.",
      embedCode: `<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666389503?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="3-6-4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`,
      duration: "12 دقيقة"
    },
    {
      id: 7,
      title: "العمل مع شركة ياليدين",
      description: "دليل مخصص للعمل مع شركة ياليدين، إحدى أهم شركات التوصيل في الجزائر. سنتعرف على مميزات الشركة، طرق التعامل معها، النظام الإلكتروني الخاص بها، وكيفية الاستفادة من خدماتها لتحسين عمليات التوصيل وزيادة رضا العملاء.",
      embedCode: `<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666389658?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="3-6-5.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`,
      duration: "13 دقيقة"
    },
    {
      id: 8,
      title: "التجسس على المنافسين",
      description: "تقنيات مشروعة لمراقبة وتحليل استراتيجيات المنافسين لتحسين أدائك التجاري. سنتعلم كيفية مراقبة أسعار المنافسين، تحليل منتجاتهم وخدماتهم، دراسة استراتيجياتهم التسويقية، واستخدام هذه المعلومات لتطوير أعمالك والبقاء في المقدمة.",
      embedCode: `<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666510733?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="3-3-1-p4.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`,
      duration: "17 دقيقة"
    }
  ]
}; 