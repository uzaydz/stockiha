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

const TikTokAdsCourse: React.FC = () => {
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
          console.error('Error fetching course:', error);
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
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">جاري تحميل الدورة...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400">لم يتم العثور على الدورة</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
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
            <CourseStats courseData={tiktokAdsCourseData} />

            {/* Course Features */}
            <TikTokFeatures />

            {/* Course Modules */}
            <CourseModules modules={tiktokAdsCourseData.modules} courseSlug="tiktok-marketing" />

            {/* Additional Call to Action */}
            <div className="mt-6 text-center">
              <div className="bg-card border border-border rounded-md p-6">
                <div className="max-w-xl mx-auto">
                  <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-lg">🎵</span>
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-3">
                    هل أنت جاهز لإتقان TikTok Ads؟
                  </h3>

                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    ابدأ رحلتك في عالم إعلانات TikTok اليوم وانضم إلى آلاف المتخرجين الناجحين
                    الذين حققوا نتائج استثنائية على المنصة الأسرع نمواً
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => document.getElementById('course-modules')?.scrollIntoView({ behavior: 'smooth' })}
                      className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-6 py-2.5 rounded-md font-bold text-sm"
                    >
                      ابدأ الدورة الآن
                    </button>

                    <button className="border border-border text-foreground hover:bg-muted px-6 py-2.5 rounded-md font-bold text-sm">
                      شارك مع أصدقائك
                    </button>
                  </div>

                  <div className="mt-4 text-xs text-muted-foreground">
                    📞 تحتاج مساعدة؟ تواصل معنا في أي وقت
                  </div>
                </div>
              </div>
            </div>
          </CourseAccessGuard>
        </div>
      </div>
    </Layout>
  );
};

export default TikTokAdsCourse;
