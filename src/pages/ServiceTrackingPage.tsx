import React from 'react';
import { useTitle } from '@/hooks/useTitle';
import ServiceTracking from '@/components/pages/ServiceTracking';
import Layout from '@/components/Layout';

const ServiceTrackingPage = () => {
  useTitle('إدارة ومتابعة الخدمات');
  
  return (
    <Layout>
      <ServiceTracking />
    </Layout>
  );
};

export default ServiceTrackingPage; 