import React from 'react';
import { POSOrdersDataProvider } from '@/context/POSOrdersDataContext';

// =================================================================
// 🎯 POSOrdersWrapper - تطبيق POSOrdersDataProvider
// =================================================================

interface POSOrdersWrapperProps {
  children: React.ReactNode;
}

const POSOrdersWrapper: React.FC<POSOrdersWrapperProps> = ({ children }) => {
  
  return (
    <POSOrdersDataProvider>
      {children}
    </POSOrdersDataProvider>
  );
};

export default POSOrdersWrapper;
