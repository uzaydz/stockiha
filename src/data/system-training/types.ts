export type LessonStatus = 'ready' | 'coming-soon' | 'maintenance';

export interface SystemLesson {
    id: string; // unique string id e.g., 'm1-l1'
    title: string;
    description?: string;
    duration?: string;
    videoUrl?: string; // Embed URL or video source
    thumbnailUrl?: string; // Optional thumbnail
    status: LessonStatus;
    order: number;
}

export interface SystemModule {
    id: number;
    slug: string; // e.g., 'setup-and-basics'
    title: string;
    shortTitle: string; // For navigation pills
    description: string;
    lessons: SystemLesson[];
    icon?: any; // To be mapped in component
}

export interface SystemCourseData {
    modules: SystemModule[];
}
