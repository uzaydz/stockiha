import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import SystemTrainingPlayer from '@/components/courses/SystemTrainingPlayer';
import { systemTrainingModules } from '@/data/system-training';

const SystemTrainingStudyPage: React.FC = () => {
    const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId?: string }>();
    const navigate = useNavigate();

    // Find current module
    const currentModule = useMemo(() => {
        if (!moduleId) return systemTrainingModules[0];
        // Try finding by ID or Slug
        return systemTrainingModules.find(m => m.id.toString() === moduleId || m.slug === moduleId) || systemTrainingModules[0];
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
            navigate(`/dashboard/courses/system-training/learn/${currentModule.id}/${lesson.id}`);
        }
    };

    // Determine Prev/Next Module availability
    const modulesCount = systemTrainingModules.length;
    const currentModuleIndex = systemTrainingModules.findIndex(m => m.id === currentModule.id);
    const hasNextModule = currentModuleIndex < modulesCount - 1;
    const hasPrevModule = currentModuleIndex > 0;

    const handleNextModule = () => {
        if (hasNextModule) {
            const nextModule = systemTrainingModules[currentModuleIndex + 1];
            // Go to first lesson of next module
            const firstLesson = nextModule.lessons[0];
            navigate(`/dashboard/courses/system-training/learn/${nextModule.id}/${firstLesson.id}`);
        }
    };

    const handlePrevModule = () => {
        if (hasPrevModule) {
            const prevModule = systemTrainingModules[currentModuleIndex - 1];
            // Go to first lesson of prev module
            const firstLesson = prevModule.lessons[0];
            navigate(`/dashboard/courses/system-training/learn/${prevModule.id}/${firstLesson.id}`);
        }
    };

    // Validate URL and redirect if needed (e.g. if lessonId is missing)
    useEffect(() => {
        if (!lessonId && currentModule.lessons.length > 0) {
            const firstLesson = currentModule.lessons[0];
            navigate(`/dashboard/courses/system-training/learn/${currentModule.id}/${firstLesson.id}`, { replace: true });
        }
    }, [lessonId, currentModule, navigate]);

    if (!currentModule) return <div>Module not found</div>;

    // Use POSPureLayout to maintain consistency with the POS system
    return (
        <POSPureLayout>
            <div className="h-full bg-background">
                <SystemTrainingPlayer
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

export default SystemTrainingStudyPage;
