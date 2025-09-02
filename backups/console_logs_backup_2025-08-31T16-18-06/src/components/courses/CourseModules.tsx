import React, { useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, ChevronDown, BookOpen, CreditCard, Shield, Award } from 'lucide-react';
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
    <div id="course-modules" className="mb-6">
      {/* Section Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-200 rounded-md px-3 py-1.5 mb-3">
          <BookOpen className="w-3.5 h-3.5 text-brand-500" />
          <span className="text-xs font-medium text-brand-700">محاور الدورة التعليمية</span>
        </div>

        <h2 className="text-lg font-bold text-foreground mb-2">
          رحلة تعليمية منظمة وشاملة
        </h2>

        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          {modules.length} محور تعليمي مصمم بعناية ليغطي كل جوانب {
            courseSlug === 'e-commerce' ? 'التجارة الإلكترونية في الجزائر' :
            courseSlug === 'e-commerce-store' ? 'إنشاء المتجر الإلكتروني' :
            courseSlug === 'tiktok-marketing' ? 'إعلانات تيك توك' :
            courseSlug === 'traditional-business' ? 'التحول الرقمي للتجار التقليديين' :
            courseSlug === 'service-providers' ? 'إدارة مراكز الخدمات والتصليحات' :
            'التسويق الإلكتروني'
          }
        </p>

        {/* Progress indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>📚 من المبتدئ إلى المتقدم</span>
          <span>•</span>
          <span>🎯 تركيز على النتائج العملية</span>
          <span>•</span>
          <span>⚡ تعلم تفاعلي وممتع</span>
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-3">
        {modules.map((module) => {
          const isExpanded = expandedModule === module.id;

          return (
            <div
              key={module.id}
              className={`bg-card border border-border rounded-md overflow-hidden ${
                isExpanded ? 'ring-1 ring-brand-200' : ''
              }`}
            >
              {/* Module Header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Left side - Module info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Module number */}
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm ${
                        module.level === 'مبتدئ' ? 'bg-green-500' :
                        module.level === 'متوسط' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}>
                        {module.id}
                      </div>
                    </div>

                    {/* Module details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-base font-bold text-foreground">
                              {module.title}
                            </h3>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                              module.level === 'مبتدئ' ? 'bg-green-50 text-green-700 border border-green-200' :
                              module.level === 'متوسط' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                              'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {module.level}
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                            {module.description}
                          </p>
                        </div>
                      </div>

                      {/* Module stats */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <PlayCircle className="w-3.5 h-3.5 text-brand-500" />
                          <span>{module.videoCount} فيديو</span>
                        </div>

                        {module.duration && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-brand-500" />
                            <span>{module.duration}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-brand-500" />
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
                      className="bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 text-xs"
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
                    <div className="bg-muted rounded-md p-4">
                      <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-brand-500" />
                        ما ستتعلمه في هذا المحور:
                      </h4>

                      <div className="space-y-2">
                        {module.topics.map((topic, topicIndex) => (
                          <div key={topicIndex} className="flex items-start gap-2">
                            <div className="w-4 h-4 bg-brand-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <div className="w-1.5 h-1.5 bg-brand-500 rounded-full"></div>
                            </div>
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

      {/* Bonus Section */}
      <div className="mt-6 bg-card border border-border rounded-md p-4">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-200 rounded-md px-3 py-1.5 mb-4">
            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
            <span className="text-xs font-medium text-brand-700">🎁 مكافأة حصرية</span>
            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
          </div>

          <h3 className="text-lg font-bold text-foreground mb-3">
            دورة إنشاء الحسابات الإعلانية اللامتناهية
          </h3>

          <p className="text-sm text-muted-foreground mb-4 max-w-xl mx-auto">
            كمكافأة خاصة لإكمال الدورة، احصل على دورة حصرية ومتقدمة لإنشاء حسابات إعلانية متعددة
            مع أحدث الطرق والتقنيات المضمونة
          </p>

          {/* Bonus features */}
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <div className="bg-muted rounded-md p-3">
              <div className="w-8 h-8 bg-yellow-50 rounded-md flex items-center justify-center mx-auto mb-2">
                <CreditCard className="w-4 h-4 text-yellow-600" />
              </div>
              <h4 className="text-sm font-bold text-foreground mb-1">حسابات لامتناهية</h4>
              <p className="text-xs text-muted-foreground">إنشاء عدد غير محدود</p>
            </div>

            <div className="bg-muted rounded-md p-3">
              <div className="w-8 h-8 bg-green-50 rounded-md flex items-center justify-center mx-auto mb-2">
                <Shield className="w-4 h-4 text-green-600" />
              </div>
              <h4 className="text-sm font-bold text-foreground mb-1">أمان مضمون</h4>
              <p className="text-xs text-muted-foreground">طرق آمنة ومحمية</p>
            </div>

            <div className="bg-muted rounded-md p-3">
              <div className="w-8 h-8 bg-blue-50 rounded-md flex items-center justify-center mx-auto mb-2">
                <Award className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="text-sm font-bold text-foreground mb-1">دعم فني</h4>
              <p className="text-xs text-muted-foreground">مساعدة على مدار الساعة</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 text-sm">
              <PlayCircle className="w-4 h-4 mr-1.5" />
              احصل على المكافأة الآن
            </Button>

            <Button variant="outline" className="border-border text-foreground hover:bg-muted px-6 py-2.5 text-sm">
              <CreditCard className="w-4 h-4 mr-1.5" />
              اطلب بطاقة فيزا مجاناً
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            ⚡ هذه المكافأة متاحة فقط للمتخرجين من الدورة الأساسية
          </p>
        </div>
      </div>
    </div>
  );
};

export default CourseModules;
