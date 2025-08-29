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

export const module4Data: ModuleData = {
  id: 4,
  title: "مدير الأعمال ومدير الإعلانات",
  description: "تعرف على أدوات إدارة الأعمال والإعلانات المتقدمة في فيسبوك ومحرك العملاء المحتملين",
  totalVideos: 2,
  totalDuration: "18 دقيقة",
  videos: [
    {
      id: 1,
      title: "ماهو مدير الأعمال",
      description: "في هذا الفيديو، سنشرح كيفية ربط حساب إنستقرام وواتساب بصفحة الفيسبوك التجارية الخاصة بك",
      duration: "10 دقائق",
      url: "https://player.vimeo.com/video/1001961301",
      type: "vimeo",
      embedCode: `<div style="padding:64.52% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1001961301?badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="مدير الأعمال"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`
    },
    {
      id: 2,
      title: "ماهو مدير الإعلانات",
      description: "في هذا الفيديو، سنكشف لك سر محرك العملاء المحتملين وكيفية استخدامه بشكل فعال لجذب العملاء المهتمين بمنتجاتك أو خدماتك، مما يساعد في زيادة معدلات التحويل وبناء قاعدة عملاء قوية",
      duration: "8 دقائق",
      url: "https://player.vimeo.com/video/1002241474",
      type: "vimeo",
      embedCode: `<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1002241474?badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="بوت الصفحة الخاص بك"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`
    }
  ]
};
