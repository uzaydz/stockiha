import React from 'react';
import Layout from '@/components/Layout';
import { eCommerceStoreCourseData } from '@/data/eCommerceStoreCourseData';
import StoreHero from '@/components/courses/store/StoreHero';
import StoreFeatures from '@/components/courses/store/StoreFeatures';
import CourseModules from '@/components/courses/CourseModules';
import CourseStats from '@/components/courses/CourseStats';

const ECommerceStoreCourse: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Hero Section */}
        <StoreHero />
        
        {/* Course Statistics */}
        <CourseStats courseData={eCommerceStoreCourseData} />
        
        {/* Course Features */}
        <StoreFeatures />
        
        {/* Course Modules */}
        <CourseModules modules={eCommerceStoreCourseData.modules} courseSlug="e-commerce-store" />
      </div>
    </Layout>
  );
};

export default ECommerceStoreCourse; 