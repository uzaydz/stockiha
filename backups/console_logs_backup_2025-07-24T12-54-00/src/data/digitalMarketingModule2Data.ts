export interface Video {
  id: number;
  title: string;
  description?: string;
  duration?: string;
  videoUrl: string;
  videoType: 'vimeo' | 'vadoo';
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

export const module2Data: ModuleData = {
  id: 2,
  title: "التصميم هو الحل",
  description: "في هذا القسم، سنناقش كيف يمكن أن يكون التصميم الاحترافي هو الحل المثالي لجذب انتباه العملاء وتعزيز علامتك التجارية",
  totalVideos: 6,
  totalDuration: "2.5 ساعة",
  videos: [
    {
      id: 1,
      title: "تناسق الألوان",
      description: "في هذا الفيديو، سنتحدث عن أهمية تناسق الألوان في التصميم، وكيف يمكن لاختيار الألوان المناسبة أن يعزز جاذبية العلامة التجارية ويخلق تجربة بصرية متكاملة تجذب العملاء وتترك انطباعًا قويًا.",
      duration: "25 دقيقة",
      videoUrl: "https://player.vimeo.com/video/666376598",
      videoType: 'vimeo',
      embedCode: `<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666376598?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="132"></iframe></div>`
    },
    {
      id: 2,
      title: "الإستلهام",
      description: "في هذا الفيديو، سنستكشف مفهوم الإلهام وكيفية استغلاله لتطوير أفكار إبداعية ومبتكرة في التسويق والتصميم. سنتحدث عن مصادر الإلهام وكيفية تحويلها إلى استراتيجيات فعالة تعزز نجاحك.",
      duration: "20 دقيقة",
      videoUrl: "https://player.vimeo.com/video/666376516",
      videoType: 'vimeo',
      embedCode: `<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/666376516?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="1-3-3.mp4"></iframe></div>`
    },
    {
      id: 3,
      title: "التصميم الجزء الأول",
      description: "في هذا الفيديو، سنغوص في عالم التصميم ونتعرف على أسسه، من اختيار العناصر البصرية إلى ترتيبها بشكل يجذب الانتباه ويعبر عن هوية العلامة التجارية. ستتعلم كيفية تصميم محتوى احترافي يلبي احتياجات جمهورك ويحقق أهدافك التسويقية.",
      duration: "30 دقيقة",
      videoUrl: "https://player.vimeo.com/video/667848449",
      videoType: 'vimeo',
      embedCode: `<div style="padding:56.22% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/667848449?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="1-3-1 p1.mp4"></iframe></div>`
    },
    {
      id: 4,
      title: "التصميم الجزء الثاني",
      description: "في هذا الفيديو، سنغوص في عالم التصميم ونتعرف على أسسه، من اختيار العناصر البصرية إلى ترتيبها بشكل يجذب الانتباه ويعبر عن هوية العلامة التجارية.",
      duration: "25 دقيقة",
      videoUrl: "https://player.vimeo.com/video/667878354",
      videoType: 'vimeo',
      embedCode: `<div style="padding:56.22% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/667878354?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="1-3-1 p2.mp4"></iframe></div>`
    },
    {
      id: 5,
      title: "التصميم الجزء الثالث",
      description: "في هذا الفيديو، سنغوص في عالم التصميم ونتعرف على أسسه، من اختيار العناصر البصرية إلى ترتيبها بشكل يجذب الانتباه ويعبر عن هوية العلامة التجارية.",
      duration: "28 دقيقة",
      videoUrl: "https://player.vimeo.com/video/667913415",
      videoType: 'vimeo',
      embedCode: `<div style="padding:56.22% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/667913415?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="1-3-1 p3"></iframe></div>`
    },
    {
      id: 6,
      title: "تصميم شعار احترافي لمشروعك بالذكاء الإصطناعي",
      description: "في هذا الفيديو، سنتعرف على منصة Meta Business Suite وكيفية استخدامها لإدارة صفحاتك وحملاتك الإعلانية بشكل متكامل، بما في ذلك جدولة المحتوى، متابعة الأداء، والتفاعل مع جمهورك من مكان واحد بسهولة واحترافية.",
      duration: "22 دقيقة",
      videoUrl: "https://api.vadoo.tv/iframe_test?id=lSSDC4rNBdEnn15j0IWIcSvaU3Cq2fiS",
      videoType: 'vadoo',
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=lSSDC4rNBdEnn15j0IWIcSvaU3Cq2fiS" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    }
  ]
}; 