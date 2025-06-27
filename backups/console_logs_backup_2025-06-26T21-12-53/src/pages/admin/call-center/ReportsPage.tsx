import React from 'react';
import Layout from '@/components/Layout';
import CallCenterAdminLayout from '@/components/admin/call-center/CallCenterAdminLayout';
import CallCenterReports from '@/components/admin/call-center/CallCenterReports';

const ReportsPage: React.FC = () => {
  return (
    <Layout>
      <CallCenterAdminLayout>
        <CallCenterReports />
      </CallCenterAdminLayout>
    </Layout>
  );
};

export default ReportsPage;
