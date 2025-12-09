import React from 'react';
import { POSDataProvider } from '@/context/POSDataContext';
import { UnifiedDataProvider } from '@/context/UnifiedDataContext';
import { POSModeProvider } from '@/context/POSModeContext';
import POSAdvanced from '@/pages/POSAdvanced';

// =================================================================
// 🎯 POSWrapper - يطبق POSDataProvider على صفحة نقطة البيع
// =================================================================

const POSWrapper: React.FC = () => {
  return (
    <div data-pos-context="wrapper">
      <UnifiedDataProvider>
        <POSDataProvider>
          <POSModeProvider>
            <POSAdvanced />
          </POSModeProvider>
        </POSDataProvider>
      </UnifiedDataProvider>
    </div>
  );
};

export default POSWrapper;
