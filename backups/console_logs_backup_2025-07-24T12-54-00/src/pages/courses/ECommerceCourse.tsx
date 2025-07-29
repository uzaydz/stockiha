import React from 'react';
import Layout from '@/components/Layout';
import { eCommerceAlgeriaCourseData } from '@/data/eCommerceAlgeriaCourseData';
import ECommerceHero from '@/components/courses/ecommerce/ECommerceHero';
import ECommerceFeatures from '@/components/courses/ecommerce/ECommerceFeatures';
import CourseModules from '@/components/courses/CourseModules';
import CourseStats from '@/components/courses/CourseStats';

const ECommerceCourse: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Hero Section */}
        <ECommerceHero />
        
        {/* Course Statistics */}
        <CourseStats courseData={eCommerceAlgeriaCourseData} />
        
        {/* Course Features */}
        <ECommerceFeatures />
        
        {/* Course Modules */}
        <CourseModules modules={eCommerceAlgeriaCourseData.modules} courseSlug="e-commerce" />
      </div>
    </Layout>
  );
};

export default ECommerceCourse; 