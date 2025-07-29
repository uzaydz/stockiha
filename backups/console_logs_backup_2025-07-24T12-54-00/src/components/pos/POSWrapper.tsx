import React from 'react';
import { POSDataProvider } from '@/context/POSDataContext';
import { UnifiedDataProvider } from '@/context/UnifiedDataContext';
import POS from '@/pages/POS';

// =================================================================
// 🎯 POSWrapper - يطبق POSDataProvider على صفحة نقطة البيع
// =================================================================

const POSWrapper: React.FC = () => {
  return (
    <div data-pos-context="wrapper">
      <UnifiedDataProvider>
        <POSDataProvider>
          <POS />
        </POSDataProvider>
      </UnifiedDataProvider>
    </div>
  );
};

export default POSWrapper;
