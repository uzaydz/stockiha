import React, { useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, ChevronDown, BookOpen, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CourseModule } from '@/data/digitalMarketingCourseData';

interface CourseModulesProps {
  modules: CourseModule[];
  courseSlug?: string; // 'digital-marketing' or 'e-commerce'
}

const CourseModules: React.FC<CourseModulesProps> = ({ modules, courseSlug = 'digital-marketing' }) => {
  const navigate = useNavigate();
  const [expandedModule, setExpandedModule] = useState<number | null>(null);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'مبتدئ': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'متوسط': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'متقدم': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

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
      } else {
      }
      return;
    }

    // Handle e-commerce store course modules
    if (courseSlug === 'e-commerce-store') {
      return;
    }

    // Handle TikTok Marketing course modules
    if (courseSlug === 'tiktok-marketing') {
      if (moduleId === 0) {
        startTransition(() => {
          navigate('/dashboard/courses/tiktok-marketing/module/0');
        });
      } else if (moduleId === 1) {
        startTransition(() => {
          navigate('/dashboard/courses/tiktok-marketing/module/1');
        });
      } else if (moduleId === 2) {
        startTransition(() => {
          navigate('/dashboard/courses/tiktok-marketing/module/2');
        });
      } else if (moduleId === 3) {
        startTransition(() => {
          navigate('/dashboard/courses/tiktok-marketing/module/3');
        });
      } else if (moduleId === 4) {
        startTransition(() => {
          navigate('/dashboard/courses/tiktok-marketing/module/4');
        });
      } else if (moduleId === 5) {
        startTransition(() => {
          navigate('/dashboard/courses/tiktok-marketing/module/5');
        });
      } else if (moduleId === 6) {
        startTransition(() => {
          navigate('/dashboard/courses/tiktok-marketing/module/6');
        });
      } else if (moduleId === 7) {
        startTransition(() => {
          navigate('/dashboard/courses/tiktok-marketing/module/7');
        });
      } else if (moduleId === 8) {
        startTransition(() => {
          navigate('/dashboard/courses/tiktok-marketing/module/8');
        });
      } else {
      }
      return;
    }

    // Handle Traditional Business course modules
    if (courseSlug === 'traditional-business') {
      return;
    }

    // Handle Service Providers course modules
    if (courseSlug === 'service-providers') {
      return;
    }
    
    // Handle digital marketing course modules (existing logic)
    if (moduleId === 1) {
      startTransition(() => {
        navigate('/dashboard/courses/digital-marketing/module/1');
      });
    } else if (moduleId === 2) {
      startTransition(() => {
        navigate('/dashboard/courses/digital-marketing/module/2');
      });
    } else if (moduleId === 3) {
      startTransition(() => {
        navigate('/dashboard/courses/digital-marketing/module/3');
      });
    } else if (moduleId === 4) {
      startTransition(() => {
        navigate('/dashboard/courses/digital-marketing/module/4');
      });
    } else if (moduleId === 5) {
      startTransition(() => {
        navigate('/dashboard/courses/digital-marketing/module/5');
      });
    } else if (moduleId === 6) {
      startTransition(() => {
        navigate('/dashboard/courses/digital-marketing/module/6');
      });
    } else if (moduleId === 7) {
      startTransition(() => {
        navigate('/dashboard/courses/digital-marketing/module/7');
      });
    } else if (moduleId === 8) {
      startTransition(() => {
        navigate('/dashboard/courses/digital-marketing/module/8');
      });
    } else if (moduleId === 9) {
      startTransition(() => {
        navigate('/dashboard/courses/digital-marketing/module/9');
      });
    } else if (moduleId === 10) {
      startTransition(() => {
        navigate('/dashboard/courses/digital-marketing/module/10');
      });
    } else if (moduleId === 11) {
      startTransition(() => {
        navigate('/dashboard/courses/digital-marketing/module/11');
      });
    } else if (moduleId === 12) {
      startTransition(() => {
        navigate('/dashboard/courses/digital-marketing/module/12');
      });
    } else {
    }
  };

  return (
    <div id="course-modules">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          محاور الدورة
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {modules.length} محور تعليمي شامل يغطي كل جوانب {
            courseSlug === 'e-commerce' ? 'التجارة الإلكترونية في الجزائر' :
            courseSlug === 'e-commerce-store' ? 'إنشاء المتجر الإلكتروني' :
            courseSlug === 'tiktok-marketing' ? 'إعلانات تيك توك' :
            courseSlug === 'traditional-business' ? 'التحول الرقمي للتجار التقليديين' :
            courseSlug === 'service-providers' ? 'إدارة مراكز الخدمات والتصليحات' :
            'التسويق الإلكتروني'
          }
        </p>
      </div>

      <div className="space-y-3">
        {modules.map((module) => {
          const isExpanded = expandedModule === module.id;

          return (
            <div
              key={module.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">{module.id}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {module.title}
                        </h3>
                        <Badge className={getLevelColor(module.level)}>
                          {module.level}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <PlayCircle className="w-3 h-3" />
                          <span>{module.videoCount} فيديو</span>
                        </div>
                        {module.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{module.duration}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleWatchCourse(module.id)}
                      className="bg-primary hover:bg-primary/90 text-white px-4 py-1 text-sm"
                    >
                      <PlayCircle className="w-3 h-3 mr-1" />
                      شاهد
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedModule(isExpanded ? null : module.id)}
                      className="p-2"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      {module.description}
                    </p>
                    
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        ما ستتعلمه:
                      </h4>
                      {module.topics.map((topic, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bonus Section */}
      <div className="mt-8 bg-gradient-to-r from-primary to-blue-600 rounded-lg p-6 text-white">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 mb-3">
            <CreditCard className="w-4 h-4" />
            <span className="text-sm font-medium">مكافأة خاصة</span>
          </div>
          
          <h3 className="text-lg font-bold mb-2">
            دورة إنشاء الحسابات الإعلانية اللامتناهية
          </h3>
          
          <p className="text-sm text-blue-100 mb-4">
            كمكافأة خاصة، احصل على دورة حصرية لإنشاء حسابات إعلانية متعددة
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              className="bg-white text-primary hover:bg-gray-100 px-4 py-2 text-sm"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              شاهد الدروس الآن
            </Button>
            
            <Button
              variant="outline"
              className="border-white text-white hover:bg-white/10 px-4 py-2 text-sm"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              أطلب بطاقة فيزا مجاناً
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseModules;
