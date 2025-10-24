import React, { createContext, useContext, useState, useCallback } from 'react';

interface VirtualNumpadContextType {
  isEnabled: boolean;
  toggleNumpad: () => void;
  enableNumpad: () => void;
  disableNumpad: () => void;
}

const VirtualNumpadContext = createContext<VirtualNumpadContextType | undefined>(undefined);

export const VirtualNumpadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState(false);

  const toggleNumpad = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  const enableNumpad = useCallback(() => {
    setIsEnabled(true);
  }, []);

  const disableNumpad = useCallback(() => {
    setIsEnabled(false);
  }, []);

  return (
    <VirtualNumpadContext.Provider value={{ isEnabled, toggleNumpad, enableNumpad, disableNumpad }}>
      {children}
    </VirtualNumpadContext.Provider>
  );
};

export const useVirtualNumpad = () => {
  const context = useContext(VirtualNumpadContext);
  if (context === undefined) {
    throw new Error('useVirtualNumpad must be used within a VirtualNumpadProvider');
  }
  return context;
};
