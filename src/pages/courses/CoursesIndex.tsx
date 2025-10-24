import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { coursesList } from '@/data/coursesListData';
import { PlayCircle, Clock, BookOpen, Users, ArrowLeft, GraduationCap, Crown, Zap, Lock, AlertTriangle, Smartphone, Store, Music, Wrench, Star, TrendingUp, Award, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/UserContext';
import { CoursesService, CourseWithAccess } from '@/lib/courses-service';
import CourseAccessBadge from '@/components/courses/CourseAccessBadge';
import { supabase } from '@/lib/supabase';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import { cn } from '@/lib/utils';

interface CoursesIndexProps extends POSSharedLayoutControls {}

// صور الدورات (يمكن استبدالها بصور حقيقية)
const courseImages: Record<string, string> = {
  'digital-marketing': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
  'tiktok-ads': 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=600&fit=crop',
  'e-commerce-store': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop',
  'e-commerce': 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop',
  'traditional-business': 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&h=600&fit=crop',
  'service-providers': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
};

// ألوان موحدة ومتناسقة لكل دورة
const courseGradients: Record<string, string> = {
  'digital-marketing': 'from-slate-700 to-slate-800',
  'tiktok-ads': 'from-slate-700 to-slate-800',
  'e-commerce-store': 'from-slate-700 to-slate-800',
  'e-commerce': 'from-slate-700 to-slate-800',
  'traditional-business': 'from-slate-700 to-slate-800',
  'service-providers': 'from-slate-700 to-slate-800',
};

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
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('subscription_status, subscription_tier, created_at')
          .eq('id', organizationId)
          .single();

        if (!orgError && orgData) {
          setOrganizationStatus(orgData.subscription_status as any);
        }

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
          console.error('Error fetching courses:', error);
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

  const getLocalCourseData = (courseId: string) => {
    return coursesList.find(c => c.id === courseId);
  };

  const canAccessCourses = organizationStatus === 'active' || 
    (organizationStatus === 'trial' && subscriptionInfo && subscriptionInfo.status === 'active');

  if (loading) {
    const loadingContent = (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
            <GraduationCap className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">جاري تحميل الدورات التدريبية...</p>
        </div>
      </div>
    );
    return useStandaloneLayout ? <Layout>{loadingContent}</Layout> : loadingContent;
  }

  if (organizationStatus === 'trial' && !canAccessCourses) {
    const trialContent = (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-orange-200 dark:border-orange-800 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl text-orange-800 dark:text-orange-200">
                الدورات غير متاحة في الفترة التجريبية
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                عذراً، الدورات التعليمية متاحة فقط للمشتركين النشطين.
              </p>
              
              <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-6">
                <h4 className="font-bold text-orange-800 dark:text-orange-200 mb-4 text-lg">
                  ما يمكنك فعله في الفترة التجريبية:
                </h4>
                <ul className="text-orange-700 dark:text-orange-300 space-y-2 text-right">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>إدارة المنتجات والمخزون</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>استخدام نقطة البيع</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>إدارة العملاء</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>تجربة التقارير الأساسية</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3 justify-center pt-4">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => navigate('/dashboard')}
                  className="px-8"
                >
                  العودة للوحة التحكم
                </Button>
                <Button 
                  size="lg"
                  onClick={() => navigate('/dashboard/subscription')}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 px-8"
                >
                  <Crown className="w-5 h-5 ml-2" />
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
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Courses Grid - تصميم بطاقات حديث */}
      <div className="grid gap-4 grid-cols-12 auto-rows-[300px]">
        {filteredCourses.map((course, index) => {
          const localData = getLocalCourseData(course.slug);
          const gradient = courseGradients[course.slug] || 'from-gray-600 to-gray-800';
          const image = courseImages[course.slug] || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop';
          
          // تحديد حجم البطاقة بناءً على الموقع
          const getCardSize = (idx: number) => {
            const pattern = idx % 7;
            if (pattern === 0 || pattern === 1 || pattern === 2) {
              return "col-span-12 sm:col-span-4"; // 3 بطاقات صغيرة
            } else if (pattern === 3) {
              return "col-span-12 sm:col-span-5"; // بطاقة متوسطة
            } else {
              return "col-span-12 sm:col-span-7"; // بطاقة كبيرة
            }
          };

          const cardSize = getCardSize(index);
          const isLargeCard = cardSize.includes("col-span-7") || cardSize.includes("col-span-5");
          
          return (
            <Card
              key={course.id}
              className={cn(
                "relative overflow-hidden shadow-xl cursor-pointer",
                "border-2 border-transparent hover:border-orange-500/50",
                "rounded-2xl",
                cardSize,
                !course.is_accessible && "opacity-70"
              )}
              onClick={() => course.is_accessible && navigate(`/dashboard/courses/${course.slug}`)}
            >
              {/* صورة الخلفية بتأثير overlay */}
              <div className="absolute inset-0">
                <img
                  src={image}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-85", gradient)}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30"></div>
              </div>

              {/* محتوى البطاقة */}
              <CardHeader className="absolute z-10 top-4 flex-col items-start gap-3">
                {/* Access Badge */}
                {user && organizationId && canAccessCourses && (
                  <CourseAccessBadge
                    accessType={course.access_type}
                    isAccessible={course.is_accessible || false}
                    expiresAt={course.expires_at}
                    isLifetime={course.is_lifetime}
                    showDetails={false}
                  />
                )}
                
                {/* Lock Icon */}
                {!course.is_accessible && (
                  <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    <Lock className="w-4 h-4 text-white" />
                    <span className="text-xs text-white font-semibold">مقفلة</span>
                  </div>
                )}

                {/* العنوان والوصف */}
                <div className="mt-1">
                  <div className="inline-flex items-center gap-2 bg-orange-500/20 backdrop-blur-sm rounded-full px-3 py-1 mb-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    <p className="text-xs text-orange-100 font-bold tracking-wide">
                      {localData?.level || 'دورة تدريبية'}
                    </p>
                  </div>
                  <h4 className="text-white font-bold text-2xl leading-tight drop-shadow-lg">
                    {course.title}
                  </h4>
                  {isLargeCard && (
                    <p className="text-white/85 text-sm mt-2 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  )}
                </div>
              </CardHeader>

              {/* Footer مع المعلومات والأزرار */}
              {isLargeCard ? (
                <div className="absolute bg-white dark:bg-slate-900/95 backdrop-blur-sm bottom-0 left-0 right-0 z-10 border-t-2 border-orange-500/20">
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4">
                      {/* أيقونة الدورة */}
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-xl flex items-center justify-center">
                        {localData?.iconComponent === 'Smartphone' && <Smartphone className="w-6 h-6 text-orange-600 dark:text-orange-400" />}
                        {localData?.iconComponent === 'Store' && <Store className="w-6 h-6 text-orange-600 dark:text-orange-400" />}
                        {localData?.iconComponent === 'Music' && <Music className="w-6 h-6 text-orange-600 dark:text-orange-400" />}
                        {localData?.iconComponent === 'Wrench' && <Wrench className="w-6 h-6 text-orange-600 dark:text-orange-400" />}
                        {!localData?.iconComponent && <GraduationCap className="w-6 h-6 text-orange-600 dark:text-orange-400" />}
                      </div>
                      
                      {/* المعلومات */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-4 text-sm font-medium">
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                              <PlayCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            {localData?.totalVideos || 0} فيديو
                          </span>
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                              <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            {localData?.totalDuration || '0'} ساعة
                          </span>
                        </div>
                        {course.is_lifetime && (
                          <Badge className="w-fit bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-700 dark:text-orange-400 border border-orange-500/30 font-semibold">
                            <Crown className="w-3 h-3 ml-1" />
                            مدى الحياة
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* زر الإجراء */}
                    {course.is_accessible ? (
                      <Button 
                        size="sm"
                        className="rounded-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25 px-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/courses/${course.slug}`);
                        }}
                      >
                        <PlayCircle className="w-4 h-4 ml-2" />
                        ابدأ الآن
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-slate-300 dark:border-slate-700"
                        disabled
                      >
                        <Lock className="w-4 h-4 ml-1" />
                        مقفلة
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                // Footer للبطاقات الصغيرة
                <div className="absolute bottom-4 left-4 right-4 z-10">
                  <div className="flex items-center justify-between text-sm font-medium text-white bg-gradient-to-r from-orange-500/90 to-orange-600/90 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg">
                    <span className="flex items-center gap-2">
                      <PlayCircle className="w-4 h-4" />
                      <span className="font-bold">{localData?.totalVideos || 0}</span>
                    </span>
                    <div className="w-px h-4 bg-white/30"></div>
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-bold">{localData?.totalDuration || '0'}س</span>
                    </span>
                  </div>
                </div>
              )}

            </Card>
          );
        })}
      </div>

      {/* No Courses Message */}
      {filteredCourses.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-muted to-muted/50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <BookOpen className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">
              لا توجد دورات متاحة
            </h3>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              {filter === 'accessible' 
                ? 'لا توجد دورات متاحة لك حالياً. تأكد من أن اشتراكك نشط.'
                : 'لا توجد دورات تطابق الفلتر المحدد.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return useStandaloneLayout ? <Layout>{content}</Layout> : content;
};

export default CoursesIndex;
