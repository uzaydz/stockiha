import React from 'react';
import { POSDataProvider } from '@/context/POSDataContext';
import POS from '@/pages/POS';

// =================================================================
// 🎯 POSWrapper - يطبق POSDataProvider على صفحة نقطة البيع
// =================================================================

const POSWrapper: React.FC = () => {
  return (
    <div data-pos-context="wrapper">
      <POSDataProvider>
        <POS />
      </POSDataProvider>
    </div>
  );
};

export default POSWrapper; 