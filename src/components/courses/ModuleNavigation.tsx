import React, { useEffect, startTransition, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModuleNavigationProps {
  currentModule: number;
  totalModules: number;
  courseSlug: string;
  completedVideos?: number;
  totalVideos?: number;
}

const ModuleNavigation: React.FC<ModuleNavigationProps> = ({ 
  currentModule, 
  totalModules, 
  courseSlug,
  completedVideos = 0,
  totalVideos = 0
}) => {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  // Preload adjacent modules using React.lazy for better performance
  useEffect(() => {
    const preloadModule = async (moduleNumber: number) => {
      if (moduleNumber >= 1 && moduleNumber <= totalModules) {
        try {
          // Import the module component dynamically based on course slug and module number
          const modulePath = `../pages/courses/modules/${courseSlug === 'digital-marketing' ? 'DigitalMarketing' : 'ECommerce'}Module${moduleNumber}`;
          await import(/* @vite-ignore */ modulePath);
        } catch (error) {
          // Silently ignore import errors for non-existent modules
          console.warn(`Failed to preload module ${moduleNumber}:`, error);
        }
      }
    };

    // Preload next module with a small delay to avoid blocking current render
    const timeoutId = setTimeout(() => {
      preloadModule(currentModule + 1);
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentModule, totalModules, courseSlug]);

  const goToPreviousModule = () => {
    if (currentModule > 1 && !isNavigating) {
      setIsNavigating(true);
      startTransition(() => {
        navigate(`/dashboard/courses/${courseSlug}/module/${currentModule - 1}`, {
          replace: false,
          state: { from: currentModule }
        });
      });
    }
  };

  const goToNextModule = () => {
    if (currentModule < totalModules && !isNavigating) {
      setIsNavigating(true);
      startTransition(() => {
        navigate(`/dashboard/courses/${courseSlug}/module/${currentModule + 1}`, {
          replace: false,
          state: { from: currentModule }
        });
      });
    }
  };

  const goToModulesList = () => {
    if (!isNavigating) {
      setIsNavigating(true);
      startTransition(() => {
        navigate(`/dashboard/courses/${courseSlug}`, {
          replace: false,
          state: { from: `module-${currentModule}` }
        });
      });
    }
  };

  const isModuleCompleted = totalVideos > 0 && completedVideos === totalVideos;
  const moduleProgress = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;

  return (
    <div className="mt-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-right">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                التنقل بين المحاور
              </h3>
              {isModuleCompleted && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  ✓ مكتمل
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              المحور {currentModule} من {totalModules} محاور
              {totalVideos > 0 && (
                <span className="block mt-1">
                  {completedVideos} من {totalVideos} فيديو مكتمل ({Math.round(moduleProgress)}%)
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Previous Module Button */}
            <Button
              variant="outline"
              onClick={goToPreviousModule}
              disabled={currentModule === 1 || isNavigating}
              className="flex items-center gap-2"
            >
              {isNavigating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              المحور السابق
            </Button>

            {/* All Modules Button */}
            <Button
              variant="outline"
              onClick={goToModulesList}
              disabled={isNavigating}
              className="flex items-center gap-2"
            >
              {isNavigating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              قائمة المحاور
            </Button>
            
            {/* Next Module Button */}
            <Button
              onClick={goToNextModule}
              disabled={currentModule === totalModules || isNavigating}
              className={`flex items-center gap-2 ${
                currentModule === totalModules || isNavigating
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : isModuleCompleted 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-primary hover:bg-primary/90'
              } text-white`}
            >
              {isModuleCompleted ? '✓ ' : ''}المحور التالي
              {isNavigating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Completion Message */}
        {isModuleCompleted && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✓</span>
              </div>
              <div>
                <h4 className="font-semibold">أحسنت! أكملت هذا المحور بنجاح</h4>
                <p className="text-sm mt-1">
                  يمكنك الآن الانتقال إلى المحور التالي لمواصلة رحلة التعلم
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span>المحور 1</span>
            <span>المحور {totalModules}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(currentModule / totalModules) * 100}%` }}
            ></div>
          </div>
          <div className="text-center mt-2 text-sm text-gray-600 dark:text-gray-300">
            تقدمك في الدورة: {currentModule} من {totalModules} محاور ({Math.round((currentModule / totalModules) * 100)}%)
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleNavigation;
