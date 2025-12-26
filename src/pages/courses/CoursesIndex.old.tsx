import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { coursesList } from '@/data/coursesListData';
import { PlayCircle, Clock, BookOpen, Users, Badge as BadgeIcon, ArrowLeft, GraduationCap, Crown, Zap, Lock, AlertTriangle, Smartphone, Store, Music, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/UserContext';
import { CoursesService, CourseWithAccess } from '@/lib/courses-service';
import CourseAccessBadge from '@/components/courses/CourseAccessBadge';
import { CoursesAccessType } from '@/types/activation';
import { supabase } from '@/lib/supabase';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import { getCourseEntryPath } from '@/lib/courseRoutes';

interface CoursesIndexProps extends POSSharedLayoutControls {}

const CoursesIndex: React.FC<CoursesIndexProps> = ({ useStandaloneLayout = true } = {}) => {
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
    const loadingContent = (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري تحميل الدورات...</p>
        </div>
      </div>
    );
    return useStandaloneLayout ? <Layout>{loadingContent}</Layout> : loadingContent;
  }

  // إذا كانت المؤسسة في فترة تجريبية ولا يمكنها الوصول للدورات
  if (organizationStatus === 'trial' && !canAccessCourses) {
    const trialContent = (
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
    );
    return useStandaloneLayout ? <Layout>{trialContent}</Layout> : trialContent;
  }

  const content = (
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            الدورات التعليمية
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            دورات تعليمية شاملة ومجانية مصممة خصيصاً لمشتركي سطوكيها وكتوبي
            لتطوير مهاراتكم في التسويق الرقمي والتجارة الإلكترونية
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="w-8 h-8 bg-blue-50 rounded-md flex items-center justify-center mx-auto mb-1.5">
              <BookOpen className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-lg font-bold text-foreground mb-1">
              {coursesWithAccess.length}
            </div>
            <div className="text-xs text-muted-foreground">دورة متاحة</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="w-8 h-8 bg-green-50 rounded-md flex items-center justify-center mx-auto mb-1.5">
              <PlayCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-lg font-bold text-foreground mb-1">
              {coursesWithAccess.reduce((acc, course) => {
                const localData = getLocalCourseData(course.slug);
                return acc + (localData?.totalVideos || 0);
              }, 0)}+
            </div>
            <div className="text-xs text-muted-foreground">فيديو تعليمي</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="w-8 h-8 bg-purple-50 rounded-md flex items-center justify-center mx-auto mb-1.5">
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-lg font-bold text-foreground mb-1">
              {coursesWithAccess.filter(c => c.is_accessible).length}
            </div>
            <div className="text-xs text-muted-foreground">دورة متاحة لك</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="w-8 h-8 bg-blue-50 rounded-md flex items-center justify-center mx-auto mb-1.5">
              <GraduationCap className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-lg font-bold text-foreground mb-1">
              {coursesWithAccess.filter(c => c.is_lifetime).length}
            </div>
            <div className="text-xs text-muted-foreground">مدى الحياة</div>
          </div>
        </div>

        {/* Filters */}
        {user && organizationId && canAccessCourses && (
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="text-xs px-3 py-1.5"
            >
              جميع الدورات ({coursesWithAccess.length})
            </Button>
            <Button
              variant={filter === 'accessible' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('accessible')}
              className="text-xs px-3 py-1.5"
            >
              الدورات المتاحة ({coursesWithAccess.filter(c => c.is_accessible).length})
            </Button>
            <Button
              variant={filter === 'lifetime' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('lifetime')}
              className="text-xs px-3 py-1.5"
            >
              الدورات مدى الحياة ({coursesWithAccess.filter(c => c.is_lifetime).length})
            </Button>
          </div>
        )}

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {filteredCourses.map((course) => {
            const localData = getLocalCourseData(course.slug);
            
            return (
              <div
                key={course.id}
                className={`bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 ${
                  !course.is_accessible ? 'opacity-60' : ''
                }`}
              >
                {/* Course Header */}
                <div className="p-4">
                  {/* Course Icon & Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center text-white ${localData?.color || 'bg-gray-500'}`}>
                      {localData?.iconComponent === 'Smartphone' && <Smartphone className="w-4 h-4" />}
                      {localData?.iconComponent === 'Store' && <Store className="w-4 h-4" />}
                      {localData?.iconComponent === 'Music' && <Music className="w-4 h-4" />}
                      {localData?.iconComponent === 'Wrench' && <Wrench className="w-4 h-4" />}
                      {!localData?.iconComponent && <BookOpen className="w-4 h-4" />}
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
                  <h3 className="text-sm font-bold text-foreground mb-2 leading-tight">
                    {course.title}
                  </h3>

                  {/* Course Description */}
                  <p className="text-muted-foreground text-xs mb-3 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>

                  {/* Course Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-5 h-5 bg-blue-50 rounded-md flex items-center justify-center flex-shrink-0">
                        <PlayCircle className="w-3 h-3 text-blue-500" />
                      </div>
                      <span>{localData?.totalVideos || 0} فيديو</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-5 h-5 bg-green-50 rounded-md flex items-center justify-center flex-shrink-0">
                        <Clock className="w-3 h-3 text-green-500" />
                      </div>
                      <span>{localData?.totalDuration || 'غير محدد'} ساعة</span>
                    </div>
                  </div>

                  {/* Course Level & Status */}
                  <div className="flex items-center gap-2 mb-3">
                    {localData?.level && (
                      <Badge className="text-xs px-2 py-1 bg-muted text-muted-foreground border-0">
                        {localData.level}
                      </Badge>
                    )}
                    {localData?.status && (
                      <Badge className="text-xs px-2 py-1 bg-muted text-muted-foreground border-0">
                        {localData.status}
                      </Badge>
                    )}
                  </div>

                  {/* Course Actions */}
                  <div className="flex gap-2">
                    {course.is_accessible ? (
	                      <Button 
	                        className="flex-1 text-xs px-3 py-1.5 h-8 bg-blue-500 hover:bg-blue-600"
	                        onClick={() => navigate(getCourseEntryPath(course.slug))}
	                      >
	                        ابدأ الدورة
	                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="flex-1 text-xs px-3 py-1.5 h-8"
                        disabled
                      >
                        غير متاحة
                      </Button>
                    )}
                    
	                    <Button 
	                      variant="outline" 
	                      size="sm"
	                      className="text-xs px-3 py-1.5 h-8 border-border text-foreground hover:bg-muted"
	                      onClick={() => navigate(getCourseEntryPath(course.slug))}
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
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">
              لا توجد دورات متاحة
            </h3>
            <p className="text-sm text-muted-foreground">
              {filter === 'accessible' 
                ? 'لا توجد دورات متاحة لك حالياً. تأكد من أن اشتراكك نشط.'
                : 'لا توجد دورات تطابق الفلتر المحدد.'
              }
            </p>
          </div>
        )}
      </div>
  );

  return useStandaloneLayout ? <Layout>{content}</Layout> : content;
};

export default CoursesIndex;
