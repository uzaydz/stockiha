export interface CourseModule {
  id: number;
  title: string;
  description: string;
  videoCount: number;
  duration?: string;
  level: 'مبتدئ' | 'متوسط' | 'متقدم';
  topics: string[];
}

export interface CourseData {
  title: string;
  description: string;
  totalVideos: number;
  totalDuration: string;
  isFree: boolean;
  targetAudience: string[];
  modules: CourseModule[];
}

export const eCommerceAlgeriaCourseData: CourseData = {
  title: "دورة التجارة الإلكترونية والدفع عند الاستلام في الجزائر",
  description: "تعلم كيفية تحويل تجارتك من تقليدية إلى إلكترونية ناجحة في السوق الجزائري مع سطوكيها",
  totalVideos: 14,
  totalDuration: "3 ساعات 30 دقيقة",
  isFree: true,
  targetAudience: ["مشتركي سطوكيها", "مشتركي كتوبي"],
  modules: [
    {
      id: 1,
      title: "أساسيات التجارة الإلكترونية",
      description: "فهم أساسيات التجارة الإلكترونية وأنواعها ودراسة السوق والمنتجات",
      videoCount: 6,
      duration: "1 ساعة 45 دقيقة",
      level: "مبتدئ",
      topics: ["مفهوم التجارة الإلكترونية", "أنواع التجارة الإلكترونية", "الدفع عند الاستلام", "دراسة السوق", "شراء المنتجات", "التسوق من المنزل"]
    },
    {
      id: 2,
      title: "استراتيجيات وأدوات التجارة الإلكترونية",
      description: "تطبيقات مساعدة، اختيار المنتجات، التفوق على المنافسة، التوصيل وشركات التوصيل",
      videoCount: 8,
      duration: "1 ساعة 45 دقيقة",
      level: "متوسط",
      topics: ["تطبيقات مساعدة", "مبدأ اختيار المنتجات", "التفوق على المنافسة", "استراتيجية العمل", "التوصيل وشركات التوصيل", "التسجيل مع شركات التوصيل", "العمل مع شركة ياليدين", "التجسس على المنافسين"]
    }
  ]
};
