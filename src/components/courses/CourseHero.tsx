import React from 'react';
import { GraduationCap, PlayCircle, Users, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { courseData } from '@/data/digitalMarketingCourseData';

const CourseHero: React.FC = () => {
  const handleStartCourse = () => {
    const modulesSection = document.getElementById('course-modules');
    if (modulesSection) {
      modulesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="text-center">
        {/* Free Badge */}
        <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full px-3 py-1 mb-4">
          <Gift className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300 font-medium">دورة مجانية</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          دورة التسويق الإلكتروني الشاملة
        </h1>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
          {courseData.description}
        </p>

        {/* Target Audience */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {courseData.targetAudience.map((audience, index) => (
            <span key={index} className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
              <Users className="w-3 h-3" />
              {audience}
            </span>
          ))}
        </div>

        {/* CTA Button */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button
            onClick={handleStartCourse}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            ابدأ الدورة الآن
          </Button>
          
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <GraduationCap className="w-4 h-4" />
            <span className="text-sm">+{courseData.totalVideos} فيديو تعليمي</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseHero;
