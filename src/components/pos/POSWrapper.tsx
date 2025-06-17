import React from 'react';
import { POSDataProvider } from '@/context/POSDataContext';
import POS from '@/pages/POS';

// =================================================================
// 🎯 POSWrapper - يطبق POSDataProvider على صفحة نقطة البيع
// =================================================================

const POSWrapper: React.FC = () => {
  return (
    <POSDataProvider>
      <POS />
    </POSDataProvider>
  );
};

export default POSWrapper; 