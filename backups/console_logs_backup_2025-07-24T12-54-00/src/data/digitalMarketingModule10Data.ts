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

export const module10Data: ModuleData = {
  id: 10,
  title: "بوت الصفحة والتفاعل التلقائي",
  description: "تعلم كيفية إنشاء وإعداد بوت الصفحة لتحسين تجربة العملاء وزيادة معدلات التحويل من خلال الردود التلقائية الذكية",
  totalVideos: 1,
  totalDuration: "12 دقيقة",
  videos: [
    {
      id: 1,
      title: "بوت الصفحة الخاص بك",
      description: "دليل شامل لإنشاء وإعداد بوت الصفحة على فيسبوك وإنستقرام. سنتعلم كيفية تصميم تدفق محادثة ذكي، إعداد الردود التلقائية، وإنشاء تجربة تفاعلية مخصصة لعملائك. ستكتشف كيفية استخدام البوت لجمع معلومات العملاء، توجيههم للمنتجات المناسبة، وتحسين خدمة العملاء عبر الأتمتة الذكية. سنغطي أيضاً أفضل الممارسات لكتابة رسائل البوت وضبط الإعدادات المتقدمة.",
      duration: "12 دقيقة",
      url: "https://api.vadoo.tv/iframe_test?id=T7FAJYKrMFoqtCyxIqxYttlAaSQy3FoC",
      type: "vadoo",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 66.18%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 66.18%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=T7FAJYKrMFoqtCyxIqxYttlAaSQy3FoC" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`
    }
  ]
}; 