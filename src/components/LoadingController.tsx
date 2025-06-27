import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LoadingPhase {
  id: string;
  priority: number;
  loaded: boolean;
  loading: boolean;
}

interface LoadingControllerContextType {
  canLoad: (phaseId: string) => boolean;
  markLoaded: (phaseId: string) => void;
  markLoading: (phaseId: string) => void;
  isPhaseLoading: (phaseId: string) => boolean;
  getAllowedConcurrentRequests: () => number;
}

const LoadingControllerContext = createContext<LoadingControllerContextType | null>(null);

export const useLoadingController = () => {
  const context = useContext(LoadingControllerContext);
  if (!context) {
    throw new Error('useLoadingController must be used within LoadingControllerProvider');
  }
  return context;
};

// تعريف مراحل التحميل مع الأولوية
const LOADING_PHASES: LoadingPhase[] = [
  { id: 'auth', priority: 1, loaded: false, loading: false }, // أولوية عالية جداً
  { id: 'tenant', priority: 2, loaded: false, loading: false }, // ثاني أعلى أولوية
  { id: 'organization-settings', priority: 3, loaded: false, loading: false },
  { id: 'navigation', priority: 4, loaded: false, loading: false }, // الفئات والقوائم
  { id: 'dashboard-stats', priority: 5, loaded: false, loading: false },
  { id: 'secondary-data', priority: 6, loaded: false, loading: false }, // البيانات الثانوية
];

interface LoadingControllerProviderProps {
  children: ReactNode;
  maxConcurrentRequests?: number;
}

export const LoadingControllerProvider: React.FC<LoadingControllerProviderProps> = ({ 
  children, 
  maxConcurrentRequests = 2 
}) => {
  const [phases, setPhases] = useState<LoadingPhase[]>(LOADING_PHASES);
  const [activeLoadingCount, setActiveLoadingCount] = useState(0);

  // التحقق من إمكانية التحميل
  const canLoad = (phaseId: string): boolean => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return true;
    
    // إذا كانت محملة بالفعل، لا نحتاج لتحميلها مرة أخرى
    if (phase.loaded) return false;
    
    // إذا كانت قيد التحميل بالفعل، لا نحتاج لتحميلها مرة أخرى
    if (phase.loading) return false;
    
    // تحقق من عدد الطلبات المتزامنة
    if (activeLoadingCount >= maxConcurrentRequests) {
      return false;
    }
    
    // تحقق من الأولوية - يجب أن تكون المراحل الأعلى أولوية محملة أولاً
    const higherPriorityPhases = phases.filter(p => 
      p.priority < phase.priority && !p.loaded
    );
    
    // إذا كانت هناك مراحل أعلى أولوية لم تحمل بعد، انتظر
    if (higherPriorityPhases.length > 0) {
      return false;
    }
    
    return true;
  };

  // تسجيل بداية التحميل
  const markLoading = (phaseId: string): void => {
    setPhases(prev => prev.map(phase => 
      phase.id === phaseId 
        ? { ...phase, loading: true }
        : phase
    ));
    setActiveLoadingCount(prev => prev + 1);
    
  };

  // تسجيل انتهاء التحميل
  const markLoaded = (phaseId: string): void => {
    setPhases(prev => prev.map(phase => 
      phase.id === phaseId 
        ? { ...phase, loaded: true, loading: false }
        : phase
    ));
    setActiveLoadingCount(prev => Math.max(0, prev - 1));
    
  };

  // التحقق من حالة التحميل لمرحلة معينة
  const isPhaseLoading = (phaseId: string): boolean => {
    const phase = phases.find(p => p.id === phaseId);
    return phase?.loading || false;
  };

  // الحصول على عدد الطلبات المسموح بها
  const getAllowedConcurrentRequests = (): number => {
    return Math.max(1, maxConcurrentRequests - activeLoadingCount);
  };

  const contextValue: LoadingControllerContextType = {
    canLoad,
    markLoaded,
    markLoading,
    isPhaseLoading,
    getAllowedConcurrentRequests
  };

  return (
    <LoadingControllerContext.Provider value={contextValue}>
      {children}
    </LoadingControllerContext.Provider>
  );
};

// Hook مخصص للتحكم في تحميل مرحلة معينة
export const usePhaseLoader = (phaseId: string) => {
  const { canLoad, markLoaded, markLoading, isPhaseLoading } = useLoadingController();
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  const canStartLoading = canLoad(phaseId) && !hasAttemptedLoad;
  const isLoading = isPhaseLoading(phaseId);

  const startLoading = () => {
    if (canStartLoading) {
      markLoading(phaseId);
      setHasAttemptedLoad(true);
      return true;
    }
    return false;
  };

  const finishLoading = () => {
    markLoaded(phaseId);
  };

  return {
    canStartLoading,
    isLoading,
    startLoading,
    finishLoading,
    hasAttemptedLoad
  };
};

export default LoadingControllerProvider;
