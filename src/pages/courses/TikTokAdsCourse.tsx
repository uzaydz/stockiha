import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { tiktokAdsCourseData } from '@/data/tiktokAdsCourseData';
import TikTokHero from '@/components/courses/tiktok/TikTokHero';
import TikTokFeatures from '@/components/courses/tiktok/TikTokFeatures';
import CourseModules from '@/components/courses/CourseModules';
import CourseStats from '@/components/courses/CourseStats';
import CourseAccessGuard from '@/components/courses/CourseAccessGuard';
import { CoursesService } from '@/lib/courses-service';
import { useUser } from '@/context/UserContext';
import { CourseWithAccess } from '@/lib/courses-service';
import CourseAccessBadge from '@/components/courses/CourseAccessBadge';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

interface TikTokAdsCourseProps extends POSSharedLayoutControls {}

const TikTokAdsCourse: React.FC<TikTokAdsCourseProps> = ({ useStandaloneLayout = true } = {}) => {
  const { user, organizationId } = useUser();
  const [course, setCourse] = useState<CourseWithAccess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      if (user && organizationId) {
        try {
          setLoading(true);
          const courseData = await CoursesService.getCourseBySlug('tiktok-ads');
          if (courseData) {
            const accessInfo = await CoursesService.checkCourseAccess(
              courseData.id,
              organizationId
            );
            
            setCourse({
              ...courseData,
              access_type: accessInfo?.access_type,
              is_accessible: accessInfo?.is_accessible || false,
              expires_at: accessInfo?.expires_at,
              is_lifetime: accessInfo?.is_lifetime || false
            });
          }
        } catch (error) {
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [user, organizationId]);

  if (loading) {
    const loadingContent = (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل الدورة...</p>
        </div>
      </div>
    );
    return useStandaloneLayout ? <Layout>{loadingContent}</Layout> : loadingContent;
  }

  if (!course) {
    const notFoundContent = (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">لم يتم العثور على الدورة</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            تأكد من أن الدورة موجودة في قاعدة البيانات بـ slug: tiktok-ads
          </p>
        </div>
      </div>
    );
    return useStandaloneLayout ? <Layout>{notFoundContent}</Layout> : notFoundContent;
  }

  const content = (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          {/* Course Access Info */}
          {user && organizationId && (
            <div className="mb-4">
              <div className="bg-card border border-border rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-50 rounded-md flex items-center justify-center">
                      <span className="text-sm">🔓</span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground block">حالة الوصول للدورة</span>
                      <CourseAccessBadge
                        accessType={course.access_type}
                        isAccessible={course.is_accessible || false}
                        expiresAt={course.expires_at}
                        isLifetime={course.is_lifetime}
                        showDetails={true}
                      />
                    </div>
                  </div>

                  {course.is_lifetime && (
                    <div className="flex items-center gap-2 bg-brand-50 rounded-md px-3 py-1.5">
                      <span className="text-sm">🎉</span>
                      <div>
                        <span className="text-xs font-bold text-brand-700">وصول مدى الحياة</span>
                        <p className="text-xs text-brand-600">لا تنتهي صلاحيتها أبداً</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Course Content - Protected by Access Guard */}
          <CourseAccessGuard courseId={course.id}>
            {/* Hero Section */}
            <TikTokHero />

            {/* Course Statistics */}
            <CourseStats />

            {/* Course Features */}
            <TikTokFeatures />

            {/* Course Modules */}
            <CourseModules modules={tiktokAdsCourseData.modules} courseSlug="tiktok-ads" />

            {/* Additional Call to Action */}
            <div className="mt-6">
              <div className="bg-card border border-border rounded-lg p-6 text-center">
                <h3 className="text-base font-bold text-foreground mb-2">
                  هل أنت جاهز لتحقيق النجاح؟
                </h3>

                <p className="text-sm text-muted-foreground mb-4 leading-relaxed max-w-xl mx-auto">
                  ابدأ رحلتك في عالم إعلانات TikTok اليوم وانضم إلى المتخرجين الناجحين
                </p>

                <button
                  onClick={() => document.getElementById('course-modules')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm"
                >
                  ابدأ الدورة الآن
                </button>
              </div>
            </div>
          </CourseAccessGuard>
        </div>
      </div>
  );

  return useStandaloneLayout ? <Layout>{content}</Layout> : content;
};

export default TikTokAdsCourse;
