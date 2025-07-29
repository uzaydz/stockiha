import React from 'react';
import Layout from '@/components/Layout';
import { tiktokAdsCourseData } from '@/data/tiktokAdsCourseData';
import TikTokHero from '@/components/courses/tiktok/TikTokHero';
import TikTokFeatures from '@/components/courses/tiktok/TikTokFeatures';
import CourseModules from '@/components/courses/CourseModules';
import CourseStats from '@/components/courses/CourseStats';

const TikTokAdsCourse: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Hero Section */}
        <TikTokHero />
        
        {/* Course Statistics */}
        <CourseStats courseData={tiktokAdsCourseData} />
        
        {/* Course Features */}
        <TikTokFeatures />
        
        {/* Course Modules */}
        <CourseModules modules={tiktokAdsCourseData.modules} courseSlug="tiktok-marketing" />
      </div>
    </Layout>
  );
};

export default TikTokAdsCourse; 