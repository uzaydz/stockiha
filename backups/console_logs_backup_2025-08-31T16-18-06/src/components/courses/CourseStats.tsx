import React from 'react';
import { PlayCircle, Clock, Award, Users, BookOpen, Star, TrendingUp } from 'lucide-react';
import { courseData } from '@/data/digitalMarketingCourseData';

interface CourseStatsProps {
  courseData?: {
    totalVideos: number;
    totalDuration: string;
    modules: { length: number } | any[];
  };
}

const CourseStats: React.FC<CourseStatsProps> = ({ courseData: customCourseData }) => {
  // Use custom course data if provided, otherwise fall back to default digital marketing course data
  const data = customCourseData || courseData;

  const stats = [
    {
      icon: PlayCircle,
      value: `${data.totalVideos}+`,
      label: 'فيديو تعليمي',
      sublabel: 'محتوى شامل ومفصل',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      icon: Clock,
      value: data.totalDuration,
      label: 'مدة الدورة',
      sublabel: 'تعلم بالسرعة المناسبة',
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800'
    },
    {
      icon: BookOpen,
      value: Array.isArray(data.modules) ? data.modules.length.toString() : data.modules.length.toString(),
      label: 'محور تعليمي',
      sublabel: 'من مبتدئ إلى متقدم',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      icon: Users,
      value: 'مجاناً',
      label: 'للمشتركين',
      sublabel: 'لا توجد رسوم خفية',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800'
    }
  ];

  return (
    <div className="mb-6">
      {/* Section Header */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-foreground mb-1">
          إحصائيات الدورة
        </h2>
        <p className="text-xs text-muted-foreground">
          كل ما تحتاجه للنجاح في رحلتك التعليمية
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-card border border-border rounded-md p-4 text-center"
            >
              {/* Icon */}
              <div className="w-8 h-8 bg-brand-50 rounded-md flex items-center justify-center mx-auto mb-2.5">
                <Icon className="w-4 h-4 text-brand-500" />
              </div>

              {/* Value */}
              <div className="text-lg font-bold text-foreground mb-1">
                {stat.value}
              </div>

              {/* Label */}
              <div className="text-sm font-medium text-muted-foreground mb-0.5">
                {stat.label}
              </div>

              {/* Sublabel */}
              <div className="text-xs text-muted-foreground">
                {stat.sublabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Stats Row */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="bg-card border border-border rounded-md p-3">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-semibold text-foreground">4.9/5</span>
          </div>
          <p className="text-xs text-muted-foreground">تقييم الطلاب</p>
        </div>

        <div className="bg-card border border-border rounded-md p-3">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-semibold text-foreground">95%</span>
          </div>
          <p className="text-xs text-muted-foreground">معدل الإكمال</p>
        </div>

        <div className="bg-card border border-border rounded-md p-3">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <Award className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-foreground">100%</span>
          </div>
          <p className="text-xs text-muted-foreground">ضمان الرضا</p>
        </div>
      </div>
    </div>
  );
};

export default CourseStats;
