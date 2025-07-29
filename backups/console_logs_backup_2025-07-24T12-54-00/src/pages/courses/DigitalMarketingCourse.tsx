import React from 'react';
import Layout from '@/components/Layout';
import { courseData } from '@/data/digitalMarketingCourseData';
import CourseHero from '@/components/courses/CourseHero';
import CourseStats from '@/components/courses/CourseStats';
import CourseModules from '@/components/courses/CourseModules';
import CourseFeatures from '@/components/courses/CourseFeatures';

const DigitalMarketingCourse: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Hero Section */}
        <CourseHero />
        
        {/* Course Statistics */}
        <CourseStats />
        
        {/* Course Features */}
        <CourseFeatures />
        
        {/* Course Modules */}
        <CourseModules modules={courseData.modules} courseSlug="digital-marketing" />
      </div>
    </Layout>
  );
};

export default DigitalMarketingCourse; 