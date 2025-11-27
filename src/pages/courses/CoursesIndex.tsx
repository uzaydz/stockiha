import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { coursesList } from '@/data/coursesListData';
import { 
  PlayCircle, Clock, BookOpen, Users, ArrowLeft, 
  GraduationCap, Crown, Zap, Lock, AlertTriangle, 
  Smartphone, Store, Music, Wrench, Star, TrendingUp, 
  Award, CheckCircle2, Sparkles, Search, LayoutGrid, List, Filter, SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUser } from '@/context/UserContext';
import { CoursesService, CourseWithAccess } from '@/lib/courses-service';
import CourseAccessBadge from '@/components/courses/CourseAccessBadge';
import { supabase } from '@/lib/supabase';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CoursesIndexProps extends POSSharedLayoutControls {}

// تعيين الصور والألوان
const getCourseStyle = (slug: string) => {
  const styles: Record<string, { image: string; gradient: string }> = {
    'digital-marketing': {
      image: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&h=600&fit=crop',
      gradient: 'from-blue-600 to-indigo-900'
    },
    'tiktok-ads': {
      image: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&h=600&fit=crop',
      gradient: 'from-pink-600 to-rose-900'
    },
    'e-commerce-store': {
      image: 'https://images.unsplash.com/photo-1472851294608-41531b665086?w=800&h=600&fit=crop',
      gradient: 'from-emerald-600 to-teal-900'
    },
    'e-commerce': {
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop',
      gradient: 'from-green-600 to-emerald-900'
    },
    'traditional-business': {
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop',
      gradient: 'from-orange-600 to-amber-900'
    },
    'service-providers': {
      image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop',
      gradient: 'from-cyan-600 to-blue-900'
    },
  };
  
  return styles[slug] || {
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop',
    gradient: 'from-slate-600 to-slate-900'
  };
};

const CoursesIndex: React.FC<CoursesIndexProps> = ({ useStandaloneLayout = true } = {}) => {
  const navigate = useNavigate();
  const { user, organizationId } = useUser();
  const [coursesWithAccess, setCoursesWithAccess] = useState<CourseWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'accessible' | 'lifetime'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [organizationStatus, setOrganizationStatus] = useState<'active' | 'trial' | 'inactive' | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  // جلب البيانات
  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId) return;
      
      try {
        setLoading(true);
        
        const { data: orgData } = await supabase
          .from('organizations')
          .select('subscription_status')
          .eq('id', organizationId)
          .single();

        if (orgData) setOrganizationStatus(orgData.subscription_status as any);

        const { data: subData } = await supabase
          .from('organization_subscriptions')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .single();
          
        if (subData) setSubscriptionInfo(subData);

        const courses = await CoursesService.getCoursesWithAccess(organizationId);
        setCoursesWithAccess(courses);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId]);

  const filteredCourses = coursesWithAccess.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (filter) {
      case 'accessible': return course.is_accessible;
      case 'lifetime': return course.is_lifetime;
      default: return true;
    }
  });

  const getLocalCourseData = (slug: string) => coursesList.find(c => c.id === slug);
  const canAccessCourses = organizationStatus === 'active' || 
    (organizationStatus === 'trial' && subscriptionInfo?.status === 'active');

  const Content = () => (
    <div className="min-h-screen bg-background">
      
      {/* Simplified Header */}
      <div className="bg-card border-b border-border/50">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-orange-600">
                <GraduationCap className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">أكاديمية ستوكيها</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                دورات تعليمية احترافية
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                طوّر مهاراتك في التجارة الإلكترونية وإدارة الأعمال مع نخبة من الدورات المتخصصة.
              </p>
            </div>
            
            {/* Quick Stats (Optional decoration) */}
            <div className="hidden md:flex gap-6 text-muted-foreground">
              <div className="text-center p-4 bg-background rounded-2xl border shadow-sm">
                <div className="text-2xl font-bold text-foreground">{coursesWithAccess.length}+</div>
                <div className="text-xs">دورة متاحة</div>
              </div>
              <div className="text-center p-4 bg-background rounded-2xl border shadow-sm">
                <div className="text-2xl font-bold text-foreground">24/7</div>
                <div className="text-xs">وصول دائم</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Toolbar */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
            
            {/* Search */}
            <div className="relative w-full md:w-96 group">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="ابحث عن دورة..."
                className="pr-9 bg-muted/50 border-transparent focus:bg-background focus:border-primary/20 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters & View Toggle */}
            <div className="flex w-full md:w-auto items-center gap-3 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
              <div className="bg-muted/50 p-1 rounded-lg flex items-center">
                <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
                  <TabsList className="bg-transparent h-9">
                    <TabsTrigger value="all" className="rounded-md px-4">الكل</TabsTrigger>
                    <TabsTrigger value="accessible" className="rounded-md px-4">دوراتي</TabsTrigger>
                    <TabsTrigger value="lifetime" className="rounded-md px-4 gap-2">
                      <Crown className="w-3.5 h-3.5 text-yellow-500" />
                      Premium
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="w-px h-6 bg-border/50 hidden md:block" />

              <div className="flex bg-muted/50 p-1 rounded-lg border border-transparent">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={cn("h-9 px-3 rounded-md hover:bg-background", viewMode === 'grid' && "bg-background shadow-sm text-primary")}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={cn("h-9 px-3 rounded-md hover:bg-background", viewMode === 'list' && "bg-background shadow-sm text-primary")}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="container mx-auto px-4 py-8 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[380px] bg-muted/30 rounded-2xl animate-pulse border border-border/50" />
            ))}
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className={cn(
            "gap-6",
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
              : "flex flex-col space-y-4"
          )}>
            {filteredCourses.map((course) => {
              const localData = getLocalCourseData(course.slug);
              const style = getCourseStyle(course.slug);
              const isLocked = !course.is_accessible;

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card 
                    className={cn(
                      "group overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer bg-card h-full flex flex-col",
                      viewMode === 'list' && "flex-row h-48"
                    )}
                    onClick={() => !isLocked && navigate(`/dashboard/courses/${course.slug}`)}
                  >
                    {/* Image Section */}
                    <div className={cn(
                      "relative overflow-hidden bg-muted",
                      viewMode === 'grid' ? "aspect-video w-full" : "w-72 shrink-0"
                    )}>
                      <img 
                        src={style.image} 
                        alt={course.title}
                        className={cn(
                          "w-full h-full object-cover transition-transform duration-500",
                          !isLocked && "group-hover:scale-105",
                          isLocked && "grayscale opacity-60"
                        )}
                      />
                      
                      {/* Badges Overlay */}
                      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 items-end">
                         {course.is_lifetime && (
                          <Badge className="bg-yellow-500 text-white border-0 shadow-sm backdrop-blur-md">
                            <Crown className="w-3 h-3 mr-1" />
                            Premium
                          </Badge>
                        )}
                        {localData?.status === 'جديد' && (
                          <Badge className="bg-blue-600 text-white border-0 shadow-sm backdrop-blur-md">
                            جديد
                          </Badge>
                        )}
                      </div>

                      {isLocked && (
                        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-20">
                          <div className="bg-background/80 backdrop-blur-md p-3 rounded-full shadow-lg">
                            <Lock className="w-6 h-6 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col flex-1 p-5">
                      <div className="flex-1 space-y-3">
                        {/* Meta info */}
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                            {localData?.level || 'دورة تدريبية'}
                          </span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {localData?.totalDuration} ساعة
                          </div>
                        </div>

                        <h3 className={cn(
                          "font-bold text-foreground group-hover:text-primary transition-colors leading-tight",
                          viewMode === 'grid' ? "text-xl line-clamp-2" : "text-2xl"
                        )}>
                          {course.title}
                        </h3>
                        
                        <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                          {course.description || localData?.description}
                        </p>
                      </div>

                      {/* Footer */}
                      <div className="pt-4 mt-4 border-t border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                           <PlayCircle className="w-4 h-4" />
                           <span>{localData?.totalVideos || 0} درس</span>
                        </div>

                        <div className={cn(
                          "flex items-center text-sm font-bold transition-all",
                          !isLocked ? "text-primary translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100" : "text-muted-foreground"
                        )}>
                          {isLocked ? (
                            <span className="flex items-center gap-1 text-xs">
                              غير مشترك
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              ابدأ الآن
                              <ArrowLeft className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-3xl border-2 border-dashed border-border/60">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              لا توجد نتائج
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              لم نعثر على دورات تطابق بحثك. جرب كلمات مفتاحية مختلفة أو قم بتغيير الفلاتر.
            </p>
            <Button 
              variant="outline" 
              className="mt-6"
              onClick={() => { setSearchQuery(''); setFilter('all'); }}
            >
              إعادة تعيين البحث
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return useStandaloneLayout ? <Layout>
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    </Layout> : <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>;
  }

  if (organizationStatus === 'trial' && !canAccessCourses) {
     return useStandaloneLayout ? <Layout>
      <div className="container mx-auto px-4 py-20">
        <Card className="max-w-2xl mx-auto border-orange-200 bg-orange-50/50">
           <CardContent className="text-center pt-10 pb-10">
             <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
               <AlertTriangle className="w-8 h-8" />
             </div>
             <h2 className="text-2xl font-bold text-slate-900 mb-4">المحتوى التعليمي غير متاح</h2>
             <p className="text-slate-600 mb-8">
               المحتوى التعليمي متاح فقط للمشتركين في الباقات المدفوعة. يرجى ترقية اشتراكك للوصول إلى جميع الدورات.
             </p>
             <Button onClick={() => navigate('/dashboard/subscription')} className="bg-orange-600 hover:bg-orange-700">
               <Crown className="w-4 h-4 mr-2" />
               ترقية الاشتراك
             </Button>
           </CardContent>
        </Card>
      </div>
     </Layout> : null;
  }

  return useStandaloneLayout ? <Layout><Content /></Layout> : <Content />;
};

export default CoursesIndex;
