import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { serviceProvidersCourseData } from '@/data/serviceProvidersCourseData';
import ServiceProvidersHero from '@/components/courses/services/ServiceProvidersHero';
import ServiceProvidersFeatures from '@/components/courses/services/ServiceProvidersFeatures';
import CourseModules from '@/components/courses/CourseModules';
import CourseStats from '@/components/courses/CourseStats';
import CourseAccessGuard from '@/components/courses/CourseAccessGuard';
import { CoursesService } from '@/lib/courses-service';
import { useUser } from '@/context/UserContext';
import { CourseWithAccess } from '@/lib/courses-service';
import CourseAccessBadge from '@/components/courses/CourseAccessBadge';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

interface ServiceProvidersCourseProps extends POSSharedLayoutControls {}

const ServiceProvidersCourse: React.FC<ServiceProvidersCourseProps> = ({ useStandaloneLayout = true } = {}) => {
  const { user, organizationId } = useUser();
  const [course, setCourse] = useState<CourseWithAccess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      if (user && organizationId) {
        try {
          setLoading(true);
          // البحث عن الدورة بالـ slug المناسب
          const courseData = await CoursesService.getCourseBySlug('service-providers');
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
        </div>
      </div>
    );
    return useStandaloneLayout ? <Layout>{notFoundContent}</Layout> : notFoundContent;
  }

  const content = (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Course Access Info */}
        {user && organizationId && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-800 dark:text-blue-200">حالة الوصول:</span>
                <CourseAccessBadge
                  accessType={course.access_type}
                  isAccessible={course.is_accessible || false}
                  expiresAt={course.expires_at}
                  isLifetime={course.is_lifetime}
                  showDetails={true}
                />
              </div>
              
              {course.is_lifetime && (
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  🎉 هذه الدورة متاحة لك مدى الحياة!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Course Content - Protected by Access Guard */}
        <CourseAccessGuard courseId={course.id}>
          {/* Hero Section */}
          <ServiceProvidersHero />
          
          {/* Course Statistics */}
          <CourseStats courseData={serviceProvidersCourseData} />
          
          {/* Course Features */}
          <ServiceProvidersFeatures />
          
          {/* Course Modules */}
          <CourseModules modules={serviceProvidersCourseData.modules} courseSlug="service-providers" />
        </CourseAccessGuard>
      </div>
  );

  return useStandaloneLayout ? <Layout>{content}</Layout> : content;
};

export default ServiceProvidersCourse;
