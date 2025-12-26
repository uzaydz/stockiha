import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import TikTokAdsPlayer from '@/components/courses/TikTokAdsPlayer';
import { tiktokAdsModules } from '@/data/tiktok-ads';

const TikTokAdsStudyPage: React.FC = () => {
    const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId?: string }>();
    const navigate = useNavigate();

    // Find current module
    const currentModule = useMemo(() => {
        if (!moduleId) return tiktokAdsModules[0];
        // Try finding by ID or Slug
        return tiktokAdsModules.find(m => m.id.toString() === moduleId || m.slug === moduleId) || tiktokAdsModules[0];
    }, [moduleId]);

    // Find current lesson index
    const currentLessonIndex = useMemo(() => {
        if (!lessonId) return 0;
        const idx = currentModule.lessons.findIndex(l => l.id === lessonId);
        return idx !== -1 ? idx : 0;
    }, [lessonId, currentModule]);

    // Handle lesson change
    const handleLessonChange = (index: number) => {
        const lesson = currentModule.lessons[index];
        if (lesson) {
            navigate(`/dashboard/courses/tiktok-ads/learn/${currentModule.id}/${lesson.id}`);
        }
    };

    // Determine Prev/Next Module availability
    const modulesCount = tiktokAdsModules.length;
    const currentModuleIndex = tiktokAdsModules.findIndex(m => m.id === currentModule.id);
    const hasNextModule = currentModuleIndex < modulesCount - 1;
    const hasPrevModule = currentModuleIndex > 0;

    const handleNextModule = () => {
        if (hasNextModule) {
            const nextModule = tiktokAdsModules[currentModuleIndex + 1];
            // Go to first lesson of next module
            const firstLesson = nextModule.lessons[0];
            navigate(`/dashboard/courses/tiktok-ads/learn/${nextModule.id}/${firstLesson.id}`);
        }
    };

    const handlePrevModule = () => {
        if (hasPrevModule) {
            const prevModule = tiktokAdsModules[currentModuleIndex - 1];
            // Go to first lesson of prev module
            const firstLesson = prevModule.lessons[0];
            navigate(`/dashboard/courses/tiktok-ads/learn/${prevModule.id}/${firstLesson.id}`);
        }
    };

    // Validate URL and redirect if needed (e.g. if lessonId is missing)
    useEffect(() => {
        if (!lessonId && currentModule.lessons.length > 0) {
            const firstLesson = currentModule.lessons[0];
            navigate(`/dashboard/courses/tiktok-ads/learn/${currentModule.id}/${firstLesson.id}`, { replace: true });
        }
    }, [lessonId, currentModule, navigate]);

    if (!currentModule) return <div>الوحدة غير موجودة</div>;

    // Use POSPureLayout to maintain consistency with the POS system
    return (
        <POSPureLayout>
            <div className="h-full bg-background">
                <TikTokAdsPlayer
                    module={currentModule}
                    currentLessonIndex={currentLessonIndex}
                    onLessonChange={handleLessonChange}
                    onNextModule={handleNextModule}
                    onPrevModule={handlePrevModule}
                    hasNextModule={hasNextModule}
                    hasPrevModule={hasPrevModule}
                />
            </div>
        </POSPureLayout>
    );
};

export default TikTokAdsStudyPage;
