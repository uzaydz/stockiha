import React from 'react';
import Layout from '@/components/Layout';
import CallCenterAdminLayout from '@/components/admin/call-center/CallCenterAdminLayout';
import CallCenterAgentsManagement from '@/components/admin/call-center/CallCenterAgentsManagement';

const AgentsManagementPage: React.FC = () => {
  return (
    <Layout>
      <CallCenterAdminLayout>
        <CallCenterAgentsManagement />
      </CallCenterAdminLayout>
    </Layout>
  );
};

export default AgentsManagementPage; 