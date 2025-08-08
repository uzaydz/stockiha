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

export const eCommerceModule1Data: ModuleData = {
  moduleNumber: 1,
  title: "أساسيات التجارة الإلكترونية",
  description: "فهم أساسيات التجارة الإلكترونية وأنواعها ودراسة السوق والمنتجات",
  totalVideos: 6,
  estimatedDuration: "1 ساعة 45 دقيقة",
  videos: [
    {
      id: 1,
      title: "ما هي التجارة الإلكترونية",
      description: "مقدمة شاملة عن مفهوم التجارة الإلكترونية وأهميتها في العصر الحديث. ستتعرف على الفرق بين التجارة التقليدية والإلكترونية، الفرص المتاحة في السوق الجزائري، والمزايا التي توفرها التجارة الإلكترونية لأصحاب الأعمال والعملاء على حد سواء.",
      embedCode: `<div style="padding:62.5% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666497698?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="3-1-2.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`,
      duration: "18 دقيقة"
    },
    {
      id: 2,
      title: "أنواع التجارة الإلكترونية",
      description: "تعرف على الأنواع المختلفة للتجارة الإلكترونية مثل B2B وB2C وC2C والفرق بينها. سنناقش أيضاً خصائص كل نوع ومتى يكون استخدام كل نوع مناسباً حسب طبيعة عملك والسوق المستهدف.",
      embedCode: `<div style="padding:62.5% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666386975?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="3-1-3.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`,
      duration: "15 دقيقة"
    },
    {
      id: 3,
      title: "الدفع عند الاستلام",
      description: "فهم مفصل لنظام الدفع عند الاستلام (COD) وأهميته في السوق الجزائري. سنتناول مزايا وعيوب هذا النظام، كيفية إدارته بنجاح، والتحديات التي قد تواجهها مع استراتيجيات التعامل معها.",
      embedCode: `<div style="padding:62.5% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666496996?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="3-1-4.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`,
      duration: "20 دقيقة"
    },
    {
      id: 4,
      title: "كيفية دراسة السوق والمنتج",
      description: "منهجية شاملة لدراسة السوق وتحليل المنتجات قبل البدء في التجارة الإلكترونية. ستتعلم كيفية تحديد الفرص، تحليل المنافسة، فهم احتياجات العملاء، وتقييم جدوى المنتجات المختلفة في السوق الجزائري.",
      embedCode: `<div style="padding:62.5% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666495675?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="3-2-1.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`,
      duration: "22 دقيقة"
    },
    {
      id: 5,
      title: "عملية شراء المنتج",
      description: "دليل تفصيلي حول عملية شراء المنتجات للتجارة الإلكترونية. سنغطي كيفية العثور على الموردين الموثوقين، التفاوض على الأسعار، ضمان جودة المنتجات، وإدارة علاقات الموردين لضمان استمرارية العمل.",
      embedCode: `<div style="padding:62.5% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666495455?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="3-2-2.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`,
      duration: "16 دقيقة"
    },
    {
      id: 6,
      title: "كيفية شراء المنتجات من المنزل",
      description: "تعلم كيفية إدارة عملية الشراء والتوريد من المنزل. سنستكشف الأدوات والمنصات المختلفة للشراء عبر الإنترنت، كيفية تقييم الموردين عن بُعد، وإدارة عمليات الاستيراد والجمارك بطريقة فعالة ومربحة.",
      embedCode: `<div style="padding:62.5% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666387129?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="3-2-3.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`,
      duration: "14 دقيقة"
    }
  ]
};
