import React, { createContext, useContext, ReactNode } from 'react';
import { useProductPageContext } from '@/context/ProductPageContext';

interface AdvancedDescriptionContextType {
  quantity: number;
  setQuantity: (quantity: number) => void;
}

const AdvancedDescriptionContext = createContext<AdvancedDescriptionContextType | undefined>(undefined);

interface AdvancedDescriptionProviderProps {
  children: ReactNode;
}

export const AdvancedDescriptionProvider: React.FC<AdvancedDescriptionProviderProps> = ({ children }) => {
  const { quantity, setQuantity } = useProductPageContext();

  return (
    <AdvancedDescriptionContext.Provider value={{ quantity, setQuantity }}>
      {children}
    </AdvancedDescriptionContext.Provider>
  );
};

export const useAdvancedDescriptionContext = () => {
  const context = useContext(AdvancedDescriptionContext);
  if (context === undefined) {
    throw new Error('useAdvancedDescriptionContext must be used within an AdvancedDescriptionProvider');
  }
  return context;
}; 