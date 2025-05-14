import React from 'react';
import Layout from '@/components/Layout';
import DomainSettingsComponent from '@/components/settings/DomainSettings';
import { Helmet } from 'react-helmet-async';

const DomainSettings: React.FC = () => {
  return (
    <Layout>
      <Helmet>
        <title>إعدادات النطاقات المخصصة | Bazaar</title>
      </Helmet>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">النطاقات المخصصة</h1>
            <p className="text-muted-foreground">
              قم بإعداد وإدارة النطاقات المخصصة لمتجرك الإلكتروني
            </p>
          </div>
        </div>

        <DomainSettingsComponent />
      </div>
    </Layout>
  );
};

export default DomainSettings; 