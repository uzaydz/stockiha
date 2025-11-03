import React from 'react';
import { PlayCircle } from 'lucide-react';
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
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-3">
          دورة التسويق الإلكتروني الشاملة
        </h1>

        <p className="text-sm text-muted-foreground mb-6">
          {courseData.description}
        </p>

        <Button
          onClick={handleStartCourse}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 text-sm font-bold rounded-lg"
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          ابدأ الدورة الآن
        </Button>
      </div>
    </div>
  );
};

export default CourseHero;
