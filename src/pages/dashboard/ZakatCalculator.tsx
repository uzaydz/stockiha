import React from 'react';
import Layout from '@/components/Layout';
import ZakatCalculator from '@/components/zakat/ZakatCalculator';

const ZakatPage: React.FC = () => {
  return (
    <Layout>
      <ZakatCalculator />
    </Layout>
  );
};

export default ZakatPage;
