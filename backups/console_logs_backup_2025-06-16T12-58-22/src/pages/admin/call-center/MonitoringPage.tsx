import React from 'react';
import Layout from '@/components/Layout';
import CallCenterAdminLayout from '@/components/admin/call-center/CallCenterAdminLayout';
import CallCenterMonitoring from '@/components/admin/call-center/CallCenterMonitoring';

const MonitoringPage: React.FC = () => {
  return (
    <Layout>
      <CallCenterAdminLayout>
        <CallCenterMonitoring />
      </CallCenterAdminLayout>
    </Layout>
  );
};

export default MonitoringPage; 