export type LessonStatus = 'ready' | 'coming-soon' | 'maintenance';

export interface TikTokLesson {
    id: string; // unique string id e.g., 'm1-l1'
    title: string;
    description?: string;
    duration?: string;
    videoUrl?: string; // Embed URL or video source (embedCode from old structure)
    thumbnailUrl?: string; // Optional thumbnail
    status: LessonStatus;
    order: number;
}

export interface TikTokModule {
    id: number;
    slug: string; // e.g., 'introduction-to-tiktok'
    title: string;
    shortTitle: string; // For navigation pills
    description: string;
    lessons: TikTokLesson[];
    level: 'مبتدئ' | 'متوسط' | 'متقدم';
    icon?: any; // To be mapped in component
}

export interface TikTokCourseData {
    modules: TikTokModule[];
}
