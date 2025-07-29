import React from 'react';
import Layout from '@/components/Layout';
import { traditionalBusinessCourseData } from '@/data/traditionalBusinessCourseData';
import TraditionalBusinessHero from '@/components/courses/traditional/TraditionalBusinessHero';
import TraditionalBusinessFeatures from '@/components/courses/traditional/TraditionalBusinessFeatures';
import CourseModules from '@/components/courses/CourseModules';
import CourseStats from '@/components/courses/CourseStats';

const TraditionalBusinessCourse: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Hero Section */}
        <TraditionalBusinessHero />
        
        {/* Course Statistics */}
        <CourseStats courseData={traditionalBusinessCourseData} />
        
        {/* Course Features */}
        <TraditionalBusinessFeatures />
        
        {/* Course Modules */}
        <CourseModules modules={traditionalBusinessCourseData.modules} courseSlug="traditional-business" />
      </div>
    </Layout>
  );
};

export default TraditionalBusinessCourse;
