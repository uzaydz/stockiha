import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { coursesList } from '@/data/coursesListData';
import {
  PlayCircle, Clock, Search, LayoutGrid, List, ArrowRight,
  Filter, ChevronDown, CheckCircle2, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useUser } from '@/context/UserContext';
import { CoursesService, CourseWithAccess } from '@/lib/courses-service';
import { supabase } from '@/lib/supabase';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import CourseCover from '@/components/courses/CourseCover';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { getCourseEntryPath } from '@/lib/courseRoutes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CoursesIndexProps extends POSSharedLayoutControls { }

const CoursesIndex: React.FC<CoursesIndexProps> = ({ useStandaloneLayout = true } = {}) => {
  const navigate = useNavigate();
  const { user, organizationId } = useUser();
  const [coursesWithAccess, setCoursesWithAccess] = useState<CourseWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'accessible' | 'lifetime'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Data Fetching - محسن للسرعة
  useEffect(() => {
    // عرض البيانات المحلية فوراً (من coursesList)
    const localCourses: CourseWithAccess[] = coursesList.map(c => ({
      id: c.id,
      title: c.title,
      slug: c.id,
      description: c.description,
      is_accessible: false,
      is_lifetime: false
    }));
    setCoursesWithAccess(localCourses);
    setLoading(false);

    // ثم جلب البيانات الحقيقية من السيرفر
    const fetchData = async () => {
      if (!organizationId) return;
      try {
        const courses = await CoursesService.getCoursesWithAccess(organizationId);
        if (courses.length > 0) {
          setCoursesWithAccess(courses);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
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

  const Content = () => (
    <div className="min-h-full bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-slate-100 font-sans selection:bg-orange-500/20">

      {/* 1. Ultra-Clean Minimal Header */}
      <div className="w-full bg-white dark:bg-[#09090b] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">

          {/* Brand / Breadcrumb area */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-8 bg-orange-500 rounded-full inline-block"></span>
              أكاديمية سطوكيها
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 pl-4">
              منصة التعلم المتكاملة للتجارة الإلكترونية
            </p>
          </div>

          {/* Search & Utility Bar */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative group flex-1 md:w-80">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="ابحث عن مهارة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-100 dark:bg-slate-900 border-transparent focus:bg-white dark:focus:bg-black focus:ring-1 focus:ring-orange-500 h-10 rounded-lg transition-all"
              />
            </div>

            {/* Filter Dropdown (Mobile/Desktop) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 gap-2 border-slate-200 dark:border-slate-800">
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">تصفية</span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setFilter('all')}>
                  {filter === 'all' && <CheckCircle2 className="w-4 h-4 mr-2 text-orange-500" />}
                  الكل
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('accessible')}>
                  {filter === 'accessible' && <CheckCircle2 className="w-4 h-4 mr-2 text-orange-500" />}
                  دوراتي (المفتوحة)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('lifetime')}>
                  {filter === 'lifetime' && <CheckCircle2 className="w-4 h-4 mr-2 text-orange-500" />}
                  Premium
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Toggle */}
            <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shrink-0">
              <button onClick={() => setViewMode('grid')} className={cn("p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors", viewMode === 'grid' && "bg-slate-100 dark:bg-slate-800 text-orange-600")}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <div className="w-px h-full bg-slate-200 dark:bg-slate-800" />
              <button onClick={() => setViewMode('list')} className={cn("p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors", viewMode === 'list' && "bg-slate-100 dark:bg-slate-800 text-orange-600")}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className={cn(
            "gap-6 md:gap-8",
            viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col max-w-4xl mx-auto"
          )}>
            {filteredCourses.map((course) => {
              const localData = getLocalCourseData(course.slug);
              const isLocked = !course.is_accessible;

              return (
                <div
                  key={course.id}
                  className={cn(
                    "group relative bg-white dark:bg-[#121214] border border-slate-200 dark:border-slate-800 hover:border-orange-500/30 dark:hover:border-orange-500/30 transition-all duration-300 overflow-hidden cursor-pointer",
                    viewMode === 'grid' ? "rounded-2xl hover:shadow-2xl hover:-translate-y-1 flex flex-col" : "rounded-xl flex flex-row h-48 hover:shadow-lg"
                  )}
                  onClick={() => !isLocked && navigate(getCourseEntryPath(course.slug))}
                >
                  {/* Visual Header */}
                  <div className={cn(
                    "relative shrink-0 overflow-hidden",
                    viewMode === 'grid' ? "h-48 w-full border-b border-slate-100 dark:border-slate-800" : "w-64 h-full border-l border-slate-100 dark:border-slate-800"
                  )}>
                    <CourseCover slug={course.slug} className={cn(
                      "w-full h-full transform transition-transform duration-700 group-hover:scale-110",
                      isLocked && "grayscale opacity-40 blur-[1px]"
                    )} />

                    {/* Status Overlay */}
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <Lock className="w-6 h-6 text-white/80" />
                      </div>
                    )}

                    {/* Play Icon on Hover */}
                    {!isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                          <PlayCircle className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content Body */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400 px-2.5 py-0.5 rounded-full border border-orange-100 dark:border-orange-500/10">
                        {localData?.level || 'تدريب عام'}
                      </span>
                      {isLocked && <Badge variant="secondary" className="text-[10px] h-5">مغلق</Badge>}
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {course.title}
                    </h3>

                    <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 leading-relaxed mb-auto">
                      {course.description || localData?.description}
                    </p>

                    <div className="pt-4 mt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50">
                      <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>{localData?.totalVideos || 0} درس</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{localData?.totalDuration}</span>
                        </div>
                      </div>

                      {!isLocked && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                          <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredCourses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-60">
            <Search className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
            <p className="text-slate-500 text-lg">لا توجد نتائج مطابقة</p>
            <Button variant="link" onClick={() => { setSearchQuery(''); setFilter('all'); }} className="text-orange-500">
              مسح التصفية
            </Button>
          </div>
        )}
      </div>

    </div>
  );

  return useStandaloneLayout ? <Layout><Content /></Layout> : <Content />;
};

export default CoursesIndex;
