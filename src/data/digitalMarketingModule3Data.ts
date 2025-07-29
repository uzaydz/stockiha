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

export const module3Data: ModuleData = {
  id: 3,
  title: "الإعلانات البسيطة",
  description: "تعلم كيفية إطلاق الإعلانات بطريقة بسيطة مباشرة من صفحة فيسبوك لتسخين الحساب الإعلاني",
  totalVideos: 2,
  totalDuration: "15 دقيقة",
  videos: [
    {
      id: 1,
      title: "إطلاق إعلان بالطريقة البسيطة",
      description: "في هذا الفيديو، سنتعلم كيفية إطلاق إعلان بطريقة بسيطة مباشرة من صفحة فيسبوك، دون الحاجة للدخول إلى مدير الإعلانات. هذه الطريقة مناسبة لتسخين الحساب الإعلاني فقط، لكنها ليست الخيار الأمثل للحملات الكبيرة أو المعقدة",
      duration: "8 دقائق",
      url: "https://player.vimeo.com/video/1002244357",
      type: "vimeo",
      embedCode: `<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1002244357?badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="طريقة عمل إعلان بسيط لصفحة الجزء الأول"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`
    },
    {
      id: 2,
      title: "إطلاق الإعلان بطريقة أخرى بسيطة",
      description: "في هذا الفيديو، سنتعلم كيفية إطلاق إعلان بطريقة بسيطة مباشرة من صفحة فيسبوك، دون الحاجة للدخول إلى مدير الإعلانات. هذه الطريقة مناسبة لتسخين الحساب الإعلاني فقط، لكنها ليست الخيار الأمثل للحملات الكبيرة أو المعقدة",
      duration: "7 دقائق",
      url: "https://player.vimeo.com/video/1002297498",
      type: "vimeo",
      embedCode: `<div style="padding:64.36% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1002297498?badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="طريقة إطلاق الإعلان الجزء الثاني"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`
    }
  ]
};
