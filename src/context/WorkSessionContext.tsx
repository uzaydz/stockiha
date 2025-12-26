import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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
import { toast } from 'sonner';

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
const workSessionInitInFlight = new Map<string, Promise<void>>();
const workSessionLastInit = new Map<string, number>();
const WORKSESSION_INIT_DEDUPE_MS = 2000;

export const WorkSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentStaff, isAdminMode } = useStaffSession();
  const { currentOrganization } = useTenant();
  const [activeSession, setActiveSession] = useState<POSWorkSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ⚡ قفل لمنع العمليات المتزامنة
  const isOperatingRef = useRef(false);
  const lastOperationRef = useRef<string | null>(null);

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

    // ⚡ CRITICAL FIX: انتظر حتى تهيئة قاعدة البيانات قبل جلب الجلسة
    try {
      const { dbInitManager } = await import('@/lib/db/DatabaseInitializationManager');
      
      // محاولة تهيئة قاعدة البيانات (أو انتظار التهيئة الجارية) مع fallback أخف
      if (!dbInitManager.isInitialized(currentOrganization.id)) {
        const startTime = Date.now();

        try {
          await Promise.race([
            dbInitManager.initialize(currentOrganization.id, { timeout: 8000 }), // قللنا المهلة
            new Promise<void>((resolve) => {
              // Timeout احتياطي بعد 6 ثوانٍ لبدء جلب الجلسة بدلاً من الانتظار الطويل
              setTimeout(resolve, 6000);
            })
          ]);

          const waitTime = Date.now() - startTime;
          if (dbInitManager.isInitialized(currentOrganization.id)) {
            console.log(`[WorkSessionContext] ✅ Database ready after ${waitTime}ms`);
          } else if (process.env.NODE_ENV === 'development') {
            console.log(`[WorkSessionContext] ℹ️ Proceeding with session fetch (DB init may still be running: ${waitTime}ms)`);
          }
        } catch (error) {
          if (error instanceof Error && !error.message.includes('timeout')) {
            console.warn('[WorkSessionContext] ⚠️ Error initializing DB:', error);
          }
          // نتابع على أي حال
        }
      }
    } catch (error) {
      // تجاهل الأخطاء في فحص التهيئة - سنحاول جلب الجلسة على أي حال
      console.warn('[WorkSessionContext] ⚠️ Error checking DB readiness:', error);
    }

    setIsLoading(true);
    try {
      // جلب الجلسة النشطة أو المتوقفة
      const session = await getActiveOrPausedSession(currentStaff.id, currentOrganization.id);
      setActiveSession(session as POSWorkSession | null);
    } catch (error) {
      // ⚡ CRITICAL FIX: لا نعرض خطأ إذا كانت المشكلة هي عدم تهيئة DB
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('not initialized') && !errorMessage.includes('not ready')) {
        console.error('[WorkSessionContext] ❌ Error fetching active session:', error);
      }
      setActiveSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentStaff?.id, currentOrganization?.id, isAdminMode]);

  // جلب الجلسة عند تغيير الموظف أو المؤسسة
  useEffect(() => {
    // ⚡ CRITICAL FIX: تأخير بسيط للتأكد من أن organizationId تم تعيينه
    const timeoutId = setTimeout(() => {
      refreshActiveSession();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [refreshActiveSession]);

  // ⚡ مزامنة الجلسات المعلقة وإغلاق الجلسات القديمة - تم تحسين الـ interval
  // 5 دقائق بدلاً من 30 ثانية لتقليل الضغط على قاعدة البيانات
  useEffect(() => {
    if (!currentOrganization?.id) return;

    const orgId = currentOrganization.id;
    const lastInit = workSessionLastInit.get(orgId) || 0;
    if (Date.now() - lastInit < WORKSESSION_INIT_DEDUPE_MS) {
      return;
    }

    const existing = workSessionInitInFlight.get(orgId);
    if (existing) {
      return;
    }

    // ⚡ CRITICAL FIX: انتظر حتى تهيئة قاعدة البيانات قبل أي عملية
    const waitForDBAndRun = async () => {
      try {
        const { dbInitManager } = await import('@/lib/db/DatabaseInitializationManager');
        
        if (!dbInitManager.isInitialized(currentOrganization.id)) {
          const startTime = Date.now();

          try {
            await Promise.race([
              dbInitManager.initialize(currentOrganization.id, { timeout: 8000 }), // قللنا المهلة
              new Promise<void>((resolve) => {
                setTimeout(resolve, 6000);
              })
            ]);

            const waitTime = Date.now() - startTime;
            if (dbInitManager.isInitialized(currentOrganization.id)) {
              console.log(`[WorkSessionContext] ✅ Database ready for sync after ${waitTime}ms`);
            }
          } catch (error) {
            if (error instanceof Error && !error.message.includes('timeout')) {
              console.warn('[WorkSessionContext] ⚠️ Error initializing DB for sync:', error);
            }
          }
        }
      } catch (error) {
        console.warn('[WorkSessionContext] ⚠️ Error checking DB readiness:', error);
      }

      // الآن قاعدة البيانات جاهزة (أو انتهى timeout) - نفذ العمليات

      // ⚡ CRITICAL FIX: تنظيف sync_outbox من العمليات الفاشلة قبل المزامنة
      import('@/scripts/cleanupWorkSessionsOutbox').then(({ cleanupWorkSessionsOutbox }) => {
        cleanupWorkSessionsOutbox(currentOrganization.id).then(result => {
          if (result.success && (result.removed > 0 || result.recreated > 0)) {
            console.log(`[WorkSession] ✅ تنظيف outbox: حذف ${result.removed}، إعادة إنشاء ${result.recreated}`);
          }
        }).catch(error => {
          console.warn('[WorkSession] ⚠️ خطأ في تنظيف outbox:', error);
        });
      }).catch(error => {
        console.warn('[WorkSession] ⚠️ فشل تحميل cleanupWorkSessionsOutbox:', error);
      });

      // مزامنة فورية عند البدء
      syncPendingWorkSessions().catch(error => {
        if (!error?.message?.includes('Database not initialized') &&
            !error?.message?.includes('not ready')) {
          console.error('[WorkSession] Initial sync error:', error);
        }
      });

      // ⚡ فحص وإغلاق الجلسات القديمة عند البدء
      import('@/api/localWorkSessionService').then(({ closeOldActiveSessions }) => {
        closeOldActiveSessions(currentOrganization.id).catch(error => {
          if (!error?.message?.includes('Database not initialized') && 
              !error?.message?.includes('not ready')) {
            console.error('[WorkSession] Close old sessions error:', error);
          }
        });
      });
    };

    const run = waitForDBAndRun();
    workSessionInitInFlight.set(orgId, run);
    workSessionLastInit.set(orgId, Date.now());
    run.finally(() => {
      workSessionInitInFlight.delete(orgId);
    });

    // ⚡ تقليل الـ interval من 30 ثانية إلى 5 دقائق
    // هذا يوفر ~2,700 استدعاء يومياً لقاعدة البيانات
    const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 دقائق

    const syncInterval = setInterval(() => {
      syncPendingWorkSessions().catch(error => {
        if (!error?.message?.includes('Database not initialized') && 
            !error?.message?.includes('not ready')) {
          console.error('[WorkSession] Sync error:', error);
        }
      });
      
      // فحص الجلسات القديمة مرة كل 5 دقائق أيضاً
      import('@/api/localWorkSessionService').then(({ closeOldActiveSessions }) => {
        closeOldActiveSessions(currentOrganization.id).catch(error => {
          if (!error?.message?.includes('Database not initialized') && 
              !error?.message?.includes('not ready')) {
            console.error('[WorkSession] Close old sessions error:', error);
          }
        });
      });
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(syncInterval);
  }, [currentOrganization?.id]);

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

  // بدء جلسة جديدة - مع حماية من التكرار
  const startSessionHandler = useCallback(
    async (openingCash: number, notes?: string): Promise<boolean> => {
      // ⚡ منع العمليات المتزامنة
      if (isOperatingRef.current) {
        console.warn('[WorkSession] ⚠️ عملية جارية بالفعل، تم تجاهل الطلب');
        return false;
      }

      if (!currentStaff?.id || !currentOrganization?.id) {
        throw new Error('لا يوجد موظف مسجل دخول');
      }

      // ⚡ التحقق من وجود جلسة نشطة
      if (activeSession) {
        console.warn('[WorkSession] ⚠️ يوجد جلسة نشطة بالفعل');
        toast.warning('يوجد جلسة نشطة بالفعل');
        return false;
      }

      isOperatingRef.current = true;
      lastOperationRef.current = 'start';
      setIsLoading(true);

      try {
        console.log('[WorkSession] 🚀 بدء جلسة جديدة...');
        const session = await startWorkSession(
          currentStaff.id,
          currentStaff.staff_name,
          currentOrganization.id,
          openingCash,
          notes
        );

        setActiveSession(session as POSWorkSession);
        console.log('[WorkSession] ✅ تم بدء الجلسة:', session.id);
        return true;
      } catch (error) {
        console.error('[WorkSession] ❌ خطأ في بدء الجلسة:', error);
        throw error;
      } finally {
        isOperatingRef.current = false;
        setIsLoading(false);
      }
    },
    [currentStaff, currentOrganization, activeSession]
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
