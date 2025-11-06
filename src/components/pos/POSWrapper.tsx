import React from 'react';
import { POSDataProvider } from '@/context/POSDataContext';
import { UnifiedDataProvider } from '@/context/UnifiedDataContext';
import POSAdvanced from '@/pages/POSAdvanced';

// =================================================================
// 🎯 POSWrapper - يطبق POSDataProvider على صفحة نقطة البيع
// =================================================================

const POSWrapper: React.FC = () => {
  return (
    <div data-pos-context="wrapper">
      <UnifiedDataProvider>
        <POSDataProvider>
          <POSAdvanced />
        </POSDataProvider>
      </UnifiedDataProvider>
    </div>
  );
};

export default POSWrapper;
