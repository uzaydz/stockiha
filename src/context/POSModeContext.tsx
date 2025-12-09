import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type POSMode = 'sales' | 'return' | 'loss';

interface POSModeContextType {
    mode: POSMode;
    setMode: (mode: POSMode) => void;
    toggleReturnMode: () => void;
    toggleLossMode: () => void;
    resetMode: () => void;
}

const POSModeContext = createContext<POSModeContextType | undefined>(undefined);

export const POSModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mode, setModeState] = useState<POSMode>('sales');

    const setMode = useCallback((newMode: POSMode) => {
        setModeState(newMode);

        // Apply visual effects
        document.body.classList.remove('return-mode', 'loss-mode');
        if (newMode === 'return') document.body.classList.add('return-mode');
        if (newMode === 'loss') document.body.classList.add('loss-mode');
    }, []);

    const toggleReturnMode = useCallback(() => {
        setMode(mode === 'return' ? 'sales' : 'return');
    }, [mode, setMode]);

    const toggleLossMode = useCallback(() => {
        setMode(mode === 'loss' ? 'sales' : 'loss');
    }, [mode, setMode]);

    const resetMode = useCallback(() => {
        setMode('sales');
    }, [setMode]);

    return (
        <POSModeContext.Provider value={{ mode, setMode, toggleReturnMode, toggleLossMode, resetMode }}>
            {children}
        </POSModeContext.Provider>
    );
};

export const usePOSMode = () => {
    const context = useContext(POSModeContext);
    if (!context) {
        throw new Error('usePOSMode must be used within a POSModeProvider');
    }
    return context;
};
