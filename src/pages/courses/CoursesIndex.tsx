import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { coursesList } from '@/data/coursesListData';
import { PlayCircle, Clock, BookOpen, Users, Badge as BadgeIcon, ArrowLeft, GraduationCap, Crown, Zap, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/UserContext';
import { CoursesService, CourseWithAccess } from '@/lib/courses-service';
import CourseAccessBadge from '@/components/courses/CourseAccessBadge';
import { CoursesAccessType } from '@/types/activation';
import { supabase } from '@/lib/supabase';

const CoursesIndex: React.FC = () => {
  const navigate = useNavigate();
  const { user, organizationId } = useUser();
  const [coursesWithAccess, setCoursesWithAccess] = useState<CourseWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'accessible' | 'lifetime'>('all');
  const [organizationStatus, setOrganizationStatus] = useState<'active' | 'trial' | 'inactive' | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  // جلب معلومات المؤسسة وحالة الاشتراك
  useEffect(() => {
    const fetchOrganizationInfo = async () => {
      if (!organizationId) return;

      try {
        // جلب معلومات المؤسسة
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('subscription_status, subscription_tier, created_at')
          .eq('id', organizationId)
          .single();

        if (!orgError && orgData) {
          setOrganizationStatus(orgData.subscription_status as any);
        }

        // جلب معلومات الاشتراك النشط
        const { data: subscriptionData, error: subError } = await supabase
          .from('organization_subscriptions')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!subError && subscriptionData && subscriptionData.length > 0) {
          setSubscriptionInfo(subscriptionData[0]);
        }
      } catch (error) {
        console.error('Error fetching organization info:', error);
      }
    };

    fetchOrganizationInfo();
  }, [organizationId]);

  // جلب الدورات مع معلومات الوصول
  useEffect(() => {
    const fetchCourses = async () => {
      if (user && organizationId) {
        try {
          setLoading(true);
          const courses = await CoursesService.getCoursesWithAccess(organizationId);
          setCoursesWithAccess(courses);
        } catch (error) {
          console.error('Error fetching courses with access:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user, organizationId]);

  // فلترة الدورات
  const filteredCourses = coursesWithAccess.filter(course => {
    switch (filter) {
      case 'accessible':
        return course.is_accessible;
      case 'lifetime':
        return course.is_lifetime;
      default:
        return true;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'متاح': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'جديد': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'قريباً': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'مبتدئ': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'متوسط': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'متقدم': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'شامل': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // البحث عن الدورة في البيانات المحلية
  const getLocalCourseData = (courseId: string) => {
    return coursesList.find(c => c.id === courseId);
  };

  // التحقق من أن المؤسسة يمكنها الوصول للدورات
  const canAccessCourses = organizationStatus === 'active' || 
    (organizationStatus === 'trial' && subscriptionInfo && subscriptionInfo.status === 'active');

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">جاري تحميل الدورات...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // إذا كانت المؤسسة في فترة تجريبية ولا يمكنها الوصول للدورات
  if (organizationStatus === 'trial' && !canAccessCourses) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-orange-800 dark:text-orange-200">
                  الدورات غير متاحة في الفترة التجريبية
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  عذراً، الدورات التعليمية متاحة فقط للمشتركين النشطين. 
                  في الفترة التجريبية، يمكنك تجربة الميزات الأساسية لمنصة سطوكيها.
                </p>
                
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                    ما يمكنك فعله في الفترة التجريبية:
                  </h4>
                  <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1 text-right">
                    <li>• إدارة المنتجات والمخزون</li>
                    <li>• استخدام نقطة البيع</li>
                    <li>• إدارة العملاء</li>
                    <li>• تجربة التقارير الأساسية</li>
                  </ul>
                </div>

                <div className="flex gap-3 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/dashboard')}
                  >
                    العودة للوحة التحكم
                  </Button>
                  <Button 
                    onClick={() => navigate('/dashboard/subscription')}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    الاشتراك الآن
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            الدورات التعليمية
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            دورات تعليمية شاملة ومجانية مصممة خصيصاً لمشتركي سطوكيها وكتوبي
            لتطوير مهاراتكم في التسويق الرقمي والتجارة الإلكترونية
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {coursesWithAccess.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">دورة متاحة</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <PlayCircle className="w-8 h-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {coursesWithAccess.reduce((acc, course) => {
                const localData = getLocalCourseData(course.slug);
                return acc + (localData?.totalVideos || 0);
              }, 0)}+
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">فيديو تعليمي</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {coursesWithAccess.filter(c => c.is_accessible).length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">دورة متاحة لك</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <GraduationCap className="w-8 h-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {coursesWithAccess.filter(c => c.is_lifetime).length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">مدى الحياة</div>
          </div>
        </div>

        {/* Filters */}
        {user && organizationId && canAccessCourses && (
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              جميع الدورات ({coursesWithAccess.length})
            </Button>
            <Button
              variant={filter === 'accessible' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('accessible')}
            >
              الدورات المتاحة ({coursesWithAccess.filter(c => c.is_accessible).length})
            </Button>
            <Button
              variant={filter === 'lifetime' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('lifetime')}
            >
              الدورات مدى الحياة ({coursesWithAccess.filter(c => c.is_lifetime).length})
            </Button>
          </div>
        )}

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredCourses.map((course) => {
            const localData = getLocalCourseData(course.slug);
            
            return (
              <div
                key={course.id}
                className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 ${
                  !course.is_accessible ? 'opacity-60' : ''
                }`}
              >
                {/* Course Header */}
                <div className="p-6">
                  {/* Course Icon & Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl ${localData?.color || 'bg-gray-500'}`}>
                      {localData?.icon || '📚'}
                    </div>
                    
                    {/* Access Badge */}
                    {user && organizationId && canAccessCourses && (
                      <CourseAccessBadge
                        accessType={course.access_type}
                        isAccessible={course.is_accessible || false}
                        expiresAt={course.expires_at}
                        isLifetime={course.is_lifetime}
                        showDetails={true}
                      />
                    )}
                  </div>

                  {/* Course Title */}
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {course.title}
                  </h3>

                  {/* Course Description */}
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {course.description}
                  </p>

                  {/* Course Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <PlayCircle className="w-4 h-4" />
                      <span>{localData?.totalVideos || 0} فيديو</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{localData?.totalDuration || 'غير محدد'}</span>
                    </div>
                  </div>

                  {/* Course Level & Status */}
                  <div className="flex items-center gap-2 mb-4">
                    {localData?.level && (
                      <Badge className={getLevelColor(localData.level)}>
                        {localData.level}
                      </Badge>
                    )}
                    {localData?.status && (
                      <Badge className={getStatusColor(localData.status)}>
                        {localData.status}
                      </Badge>
                    )}
                  </div>

                  {/* Course Actions */}
                  <div className="flex gap-2">
                    {course.is_accessible ? (
                      <Button 
                        className="flex-1"
                        onClick={() => navigate(`/dashboard/courses/${course.slug}`)}
                      >
                        ابدأ الدورة
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        disabled
                      >
                        غير متاحة
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/dashboard/courses/${course.slug}`)}
                    >
                      التفاصيل
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* No Courses Message */}
        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              لا توجد دورات متاحة
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'accessible' 
                ? 'لا توجد دورات متاحة لك حالياً. تأكد من أن اشتراكك نشط.'
                : 'لا توجد دورات تطابق الفلتر المحدد.'
              }
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CoursesIndex;
