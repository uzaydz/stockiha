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

export const tiktokAdsModule0Data: ModuleData = {
  moduleNumber: 0,
  title: "سياسة تيك توك - مهم جداً",
  description: "تعرف على سياسات تيك توك الإعلانية وقواعد المنصة الأساسية التي يجب فهمها قبل البدء في إنشاء الحملات الإعلانية.",
  totalVideos: 1,
  estimatedDuration: "25 دقيقة",
  videos: [
    {
      id: 1,
      title: "سياسة تيك توك الإعلانية - أساسيات مهمة",
      description: "في هذا الدرس المهم جداً، سنتعرف على سياسات تيك توك الإعلانية والقواعد الأساسية التي يجب عليك معرفتها قبل البدء في إنشاء أي حملة إعلانية. سنغطي السياسات المتعلقة بالمحتوى المسموح وغير المسموح، قوانين الاستهداف، القيود على أنواع المنتجات والخدمات، وكيفية تجنب انتهاك هذه السياسات لضمان عدم تعليق حسابك الإعلاني. هذا الدرس ضروري لكل مُعلن يريد النجاح على تيك توك دون مواجهة مشاكل قانونية أو تقنية.",
      embedCode: `<div><div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><figure style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%; margin-block-end: 0; margin-block-start: 0; margin-inline-start: 0; margin-inline-end: 0;" ><iframe src="https://api.vadoo.tv/iframe_test?id=QrGGnYsKzbHxwyXlhTfeDdrF7JojAP5P" scrolling="no" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; overflow:hidden; border-radius: 5px;" allowfullscreen="1" allow="autoplay"></iframe></figure></div></div>`,
      duration: "25 دقيقة"
    }
  ]
}; 