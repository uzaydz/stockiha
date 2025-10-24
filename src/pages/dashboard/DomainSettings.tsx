import React from 'react';
import Layout from '@/components/Layout';
import DomainSettingsComponent from '@/components/settings/DomainSettings';
import { Helmet } from 'react-helmet-async';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

interface DomainSettingsProps extends POSSharedLayoutControls {}

const DomainSettings: React.FC<DomainSettingsProps> = ({ useStandaloneLayout = true } = {}) => {
  const content = (
    <>
      <Helmet>
        <title>إعدادات النطاقات المخصصة | سطوكيها - منصة إدارة المتاجر الذكية</title>
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
    </>
  );

  return useStandaloneLayout ? <Layout>{content}</Layout> : content;
};

export default DomainSettings;
