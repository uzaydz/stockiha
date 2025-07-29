import React from 'react';
import Layout from '@/components/Layout';
import CallCenterAdminLayout from '@/components/admin/call-center/CallCenterAdminLayout';
import CallCenterDistributionSettings from '@/components/admin/call-center/CallCenterDistributionSettings';

const DistributionSettingsPage: React.FC = () => {
  return (
    <Layout>
      <CallCenterAdminLayout>
        <CallCenterDistributionSettings />
      </CallCenterAdminLayout>
    </Layout>
  );
};

export default DistributionSettingsPage;
