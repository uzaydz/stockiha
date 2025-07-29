import React from 'react';
import Layout from '@/components/Layout';
import { serviceProvidersCourseData } from '@/data/serviceProvidersCourseData';
import ServiceProvidersHero from '@/components/courses/services/ServiceProvidersHero';
import ServiceProvidersFeatures from '@/components/courses/services/ServiceProvidersFeatures';
import CourseModules from '@/components/courses/CourseModules';
import CourseStats from '@/components/courses/CourseStats';

const ServiceProvidersCourse: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Hero Section */}
        <ServiceProvidersHero />
        
        {/* Course Statistics */}
        <CourseStats courseData={serviceProvidersCourseData} />
        
        {/* Course Features */}
        <ServiceProvidersFeatures />
        
        {/* Course Modules */}
        <CourseModules modules={serviceProvidersCourseData.modules} courseSlug="service-providers" />
      </div>
    </Layout>
  );
};

export default ServiceProvidersCourse;
