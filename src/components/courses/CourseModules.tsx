import React, { useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, ChevronDown, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseModule } from '@/data/digitalMarketingCourseData';

interface CourseModulesProps {
  modules: CourseModule[];
  courseSlug?: string;
}

const CourseModules: React.FC<CourseModulesProps> = ({ modules, courseSlug = 'digital-marketing' }) => {
  const navigate = useNavigate();
  const [expandedModule, setExpandedModule] = useState<number | null>(null);

  const handleWatchCourse = (moduleId: number) => {
    // Handle e-commerce course modules
    if (courseSlug === 'e-commerce') {
      if (moduleId === 1) {
        startTransition(() => {
          navigate('/dashboard/courses/e-commerce/module/1');
        });
      } else if (moduleId === 2) {
        startTransition(() => {
          navigate('/dashboard/courses/e-commerce/module/2');
        });
      }
      return;
    }

    // Handle TikTok Ads course modules (New Unified Player)
    if (courseSlug === 'tiktok-ads' || courseSlug === 'tiktok-marketing') {
      startTransition(() => {
        navigate(`/dashboard/courses/tiktok-ads/learn/${moduleId}`);
      });
      return;
    }

    // Handle System Training (New Unified Player)
    if (courseSlug === 'system-training') {
      startTransition(() => {
        navigate(`/dashboard/courses/system-training/learn/${moduleId}`);
      });
      return;
    }

    // Handle digital marketing course modules (existing logic)
    if (moduleId >= 1 && moduleId <= 12) {
      startTransition(() => {
        navigate(`/dashboard/courses/digital-marketing/module/${moduleId}`);
      });
    }
  };

  return (
    <div id="course-modules" className="mb-6">
      {/* Section Header */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-foreground mb-2">
          محاور الدورة التعليمية
        </h2>
        <p className="text-sm text-muted-foreground">
          {modules.length} محور تعليمي مصمم بعناية
        </p>
      </div>

      {/* Modules List */}
      <div className="space-y-3">
        {modules.map((module) => {
          const isExpanded = expandedModule === module.id;

          return (
            <div
              key={module.id}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              {/* Module Header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Left side - Module info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Module number */}
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${module.level === 'مبتدئ' ? 'bg-green-600' :
                          module.level === 'متوسط' ? 'bg-yellow-600' :
                            'bg-red-600'
                        }`}>
                        {module.id}
                      </div>
                    </div>

                    {/* Module details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-sm font-bold text-foreground">
                          {module.title}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${module.level === 'مبتدئ' ? 'bg-green-100 text-green-700' :
                            module.level === 'متوسط' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                          }`}>
                          {module.level}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                        {module.description}
                      </p>

                      {/* Module stats */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <PlayCircle className="w-3.5 h-3.5 text-orange-600" />
                          <span>{module.videoCount} فيديو</span>
                        </div>

                        {module.duration && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-orange-600" />
                            <span>{module.duration}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-orange-600" />
                          <span>{module.topics.length} موضوع</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right side - Actions */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => handleWatchCourse(module.id)}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 text-xs"
                    >
                      <PlayCircle className="w-3.5 h-3.5 mr-1" />
                      مشاهدة
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedModule(isExpanded ? null : module.id)}
                      className="p-1.5"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border">
                  <div className="pt-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-orange-600" />
                        ما ستتعلمه في هذا المحور:
                      </h4>

                      <div className="space-y-2">
                        {module.topics.map((topic, topicIndex) => (
                          <div key={topicIndex} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-orange-600 rounded-full flex-shrink-0 mt-1.5"></div>
                            <span className="text-sm text-foreground leading-relaxed">
                              {topic}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CourseModules;
