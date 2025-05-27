import React from 'react';
import { useTitle } from '@/hooks/useTitle';
import ServiceRequests from '@/components/pages/ServiceRequests';
import Layout from '@/components/Layout';

const ServiceRequestsPage = () => {
  useTitle('طلبات الخدمات');
  
  return (
    <Layout>
      <ServiceRequests />
    </Layout>
  );
};

export default ServiceRequestsPage;
