import React from 'react';
import { PlayCircle, Clock, Award, Users } from 'lucide-react';
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
      value: `+${data.totalVideos}`,
      label: 'فيديو',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: Clock,
      value: data.totalDuration,
      label: 'من المحتوى',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      icon: Award,
      value: Array.isArray(data.modules) ? data.modules.length.toString() : data.modules.length.toString(),
      label: 'محور',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: Users,
      value: 'مجاني',
      label: 'للمشتركين',
      color: 'text-orange-600 dark:text-orange-400'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center"
          >
            <Icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
            <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {stat.value}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {stat.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CourseStats; 