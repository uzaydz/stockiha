import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useStaffSession } from './StaffSessionContext';
import { useTenant } from './TenantContext';
import type { POSWorkSession } from '@/services/workSessionService';
import type { LocalWorkSession } from '@/database/localDb';
import {
  getActiveWorkSession,
  getActiveOrPausedSession,
  startWorkSession,
  updateWorkSessionLocally,
  closeWorkSession,
  pauseWorkSession,
  resumeWorkSession,
  syncPendingWorkSessions,
} from '@/api/localWorkSessionService';

interface WorkSessionContextType {
  activeSession: POSWorkSession | null;
  isLoading: boolean;
  hasActiveSession: boolean;
  isAdminMode: boolean;
  refreshActiveSession: () => Promise<void>;
  updateSessionLocally: (updates: Partial<POSWorkSession>) => void;
  startSession: (openingCash: number, notes?: string) => Promise<boolean>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  closeSession: (closingCash: number, notes?: string) => Promise<boolean>;
}

const WorkSessionContext = createContext<WorkSessionContextType | undefined>(undefined);

export const WorkSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentStaff, isAdminMode } = useStaffSession();
  const { currentOrganization } = useTenant();
  const [activeSession, setActiveSession] = useState<POSWorkSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // جلب الجلسة النشطة من القاعدة المحلية
  const refreshActiveSession = useCallback(async () => {
    // المدير لا يحتاج جلسة - يمكنه البيع مباشرة
    if (isAdminMode) {
      setActiveSession(null);
      return;
    }

    if (!currentStaff?.id || !currentOrganization?.id) {
      setActiveSession(null);
      return;
    }

    setIsLoading(true);
    try {
      // جلب الجلسة النشطة أو المتوقفة
      const session = await getActiveOrPausedSession(currentStaff.id, currentOrganization.id);
      setActiveSession(session as POSWorkSession | null);
    } catch (error) {
      console.error('Error fetching active session:', error);
      setActiveSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentStaff?.id, currentOrganization?.id, isAdminMode]);

  // جلب الجلسة عند تغيير الموظف
  useEffect(() => {
    refreshActiveSession();
  }, [refreshActiveSession]);

  // مزامنة الجلسات المعلقة عند الاتصال
  useEffect(() => {
    const syncInterval = setInterval(() => {
      syncPendingWorkSessions().catch(error => {
        // تجاهل أخطاء التهيئة المبكرة بشكل صامت
        if (error?.message?.includes('Database not initialized')) {
          return;
        }
        console.error(error);
      });
    }, 30000); // كل 30 ثانية

    return () => clearInterval(syncInterval);
  }, []);

  // تحديث الجلسة محلياً (سريع)
  const updateSession = useCallback(
    (updates: Partial<POSWorkSession>) => {
      if (!activeSession?.id) return;
      
      setActiveSession(prev => prev ? { ...prev, ...updates } : null);
      
      // تحديث في القاعدة المحلية
      updateWorkSessionLocally(activeSession.id, updates).catch(console.error);
    },
    [activeSession?.id]
  );

  // بدء جلسة جديدة
  const startSessionHandler = useCallback(
    async (openingCash: number, notes?: string): Promise<boolean> => {
      if (!currentStaff?.id || !currentOrganization?.id) {
        throw new Error('لا يوجد موظف مسجل دخول');
      }

      try {
        const session = await startWorkSession(
          currentStaff.id,
          currentStaff.staff_name,
          currentOrganization.id,
          openingCash,
          notes
        );

        setActiveSession(session as POSWorkSession);
        return true;
      } catch (error) {
        console.error('Error starting session:', error);
        throw error;
      }
    },
    [currentStaff, currentOrganization]
  );

  // إيقاف الجلسة مؤقتاً
  const pauseSessionHandler = useCallback(async () => {
    if (!activeSession?.id) {
      throw new Error('لا توجد جلسة نشطة');
    }

    try {
      await pauseWorkSession(activeSession.id);
      await refreshActiveSession();
    } catch (error) {
      console.error('Error pausing session:', error);
      throw error;
    }
  }, [activeSession?.id, refreshActiveSession]);

  // استئناف الجلسة
  const resumeSessionHandler = useCallback(async () => {
    if (!activeSession?.id) {
      throw new Error('لا توجد جلسة متوقفة');
    }

    try {
      await resumeWorkSession(activeSession.id);
      await refreshActiveSession();
    } catch (error) {
      console.error('Error resuming session:', error);
      throw error;
    }
  }, [activeSession?.id, refreshActiveSession]);

  // إغلاق الجلسة
  const closeSessionHandler = useCallback(
    async (closingCash: number, notes?: string): Promise<boolean> => {
      if (!activeSession?.id) {
        throw new Error('لا توجد جلسة نشطة');
      }

      try {
        await closeWorkSession(activeSession.id, closingCash, notes);
        setActiveSession(null);
        return true;
      } catch (error) {
        console.error('Error closing session:', error);
        throw error;
      }
    },
    [activeSession?.id]
  );

  const value: WorkSessionContextType = {
    activeSession,
    isLoading,
    hasActiveSession: activeSession !== null || isAdminMode, // المدير دائماً لديه "جلسة"
    isAdminMode,
    refreshActiveSession,
    updateSessionLocally: updateSession,
    startSession: startSessionHandler,
    pauseSession: pauseSessionHandler,
    resumeSession: resumeSessionHandler,
    closeSession: closeSessionHandler,
  };

  return <WorkSessionContext.Provider value={value}>{children}</WorkSessionContext.Provider>;
};

export const useWorkSession = () => {
  const context = useContext(WorkSessionContext);
  if (context === undefined) {
    // إرجاع قيم افتراضية آمنة بدلاً من رمي خطأ
    // هذا يسمح لـ DesktopTitlebar بالعمل حتى قبل تحميل WorkSessionProvider
    return {
      activeSession: null,
      isLoading: false,
      hasActiveSession: false,
      isAdminMode: false,
      refreshActiveSession: async () => {},
      updateSessionLocally: () => {},
      startSession: async () => false,
      pauseSession: async () => {},
      resumeSession: async () => {},
      closeSession: async () => false,
    };
  }
  return context;
};
