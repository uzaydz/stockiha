/**
 * localWorkSessionService - خدمة جلسات العمل المحلية
 *
 * ⚡ تم التحديث لاستخدام PowerSync بالكامل
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - PowerSync: المزامنة التلقائية مع Supabase
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalWorkSession } from '@/database/localDb';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { workSessionService } from '@/services/workSessionService';
import { isAppOnline } from '@/utils/networkStatus';

// Re-export types
export type { LocalWorkSession } from '@/database/localDb';

// فحص بيئة Electron
const isElectronEnv = (): boolean => {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.electronAPI || w.__ELECTRON__ || w.electron?.isElectron);
};

const getOrgId = (): string => {
  return (
    localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id') ||
    ''
  );
};

/**
 * دالة مساعدة لقراءة جلسة واحدة
 */
const getSessionById = async (sessionId: string, organizationId: string): Promise<LocalWorkSession | null> => {
  const rawSession = await powerSyncService.get<any>(
    'SELECT * FROM staff_work_sessions WHERE id = ?',
    [sessionId]
  );

  // ⚡ CRITICAL FIX: تحويل staff_id/staff_name إلى employee_id/employee_name للواجهة
  if (rawSession) {
    return {
      ...rawSession,
      employee_id: rawSession.staff_id || rawSession.employee_id,
      employee_name: rawSession.staff_name || rawSession.employee_name,
    } as LocalWorkSession;
  }
  
  return null;
};

/**
 * دالة مساعدة لتحديث جلسة
 */
const updateSession = async (sessionId: string, organizationId: string, updates: Partial<LocalWorkSession>): Promise<void> => {
  // ⚡ CRITICAL FIX: تحويل employee_id/employee_name إلى staff_id/staff_name للجدول
  const updatesForDB: any = { ...updates };
  if (updatesForDB.employee_id !== undefined) {
    updatesForDB.staff_id = updatesForDB.employee_id;
    delete updatesForDB.employee_id;
  }
  if (updatesForDB.employee_name !== undefined) {
    updatesForDB.staff_name = updatesForDB.employee_name;
    delete updatesForDB.employee_name;
  }
  // ⚡ CRITICAL FIX: إزالة الحقول غير الموجودة في PowerSync schema
  delete updatesForDB.local_updated_at;
  delete updatesForDB.synced;
  delete updatesForDB.sync_status;
  delete updatesForDB.pending_operation;

  // ⚡ استخدام PowerSync مباشرة - مع tx.execute بدلاً من db.execute
  await powerSyncService.transaction(async (tx) => {
    const keys = Object.keys(updatesForDB).filter(k => k !== 'id' && k !== 'created_at');
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => updatesForDB[k]);

    await tx.execute(
      `UPDATE staff_work_sessions SET ${setClause}, updated_at = ? WHERE id = ?`,
      [...values, new Date().toISOString(), sessionId]
    );
  });
};

/**
 * جلب الجلسة النشطة (أوفلاين أولاً، ثم أونلاين)
 */
export const getActiveWorkSession = async (staffId: string, organizationId: string): Promise<LocalWorkSession | null> => {
  try {
    console.log('[LocalWorkSession] 🔍 جلب الجلسة النشطة للموظف:', staffId);

    // البحث في القاعدة المحلية أولاً باستخدام PowerSync
    if (!powerSyncService.db) {
      console.warn('[localWorkSessionService] PowerSync DB not initialized');
      return [];
    }
    const localSessions = await powerSyncService.query<any>({
      sql: "SELECT * FROM staff_work_sessions WHERE staff_id = ? AND status = 'active' AND organization_id = ? LIMIT 1",
      params: [staffId, organizationId]
    });
    
    console.log('[LocalWorkSession] 📊 القراءة من PowerSync، النتائج:', localSessions.length);

    if (localSessions.length > 0) {
      console.log('[LocalWorkSession] ✅ تم العثور على جلسة نشطة محلياً:', localSessions[0].id);
      // ⚡ CRITICAL FIX: تحويل staff_id/staff_name إلى employee_id/employee_name للواجهة
      const session: any = localSessions[0];
      return {
        ...session,
        employee_id: session.staff_id || session.employee_id || '',
        employee_name: session.staff_name || session.employee_name,
      } as LocalWorkSession;
    }

    console.log('[LocalWorkSession] ⚠️ لم يتم العثور على جلسة نشطة محلياً');

    // إذا كنا أونلاين، جلب من السيرفر
    if (isAppOnline()) {
      try {
        const result = await workSessionService.getActiveSession(staffId);
        if (result.success && result.has_active_session && result.session) {
          // حفظ في القاعدة المحلية
          const now = new Date().toISOString();
          const sessionDataFromServer: any = result.session;
          const localSession: LocalWorkSession = {
            ...result.session,
            employee_id: sessionDataFromServer.staff_id || sessionDataFromServer.employee_id || staffId,
            employee_name: sessionDataFromServer.staff_name || sessionDataFromServer.employee_name || '',
            organization_id: organizationId, // ✅ التأكد من وجود organization_id
            pause_count: result.session.pause_count || 0,
            total_pause_duration: result.session.total_pause_duration || 0,
            created_at: now,
            updated_at: now,
            synced: 1,  // 1 = synced
            sync_status: undefined,
            pending_operation: undefined,
          };

          // ⚡ CRITICAL FIX: تحويل employee_id/employee_name إلى staff_id/staff_name للجدول
          const sessionForDBFromServer: any = { ...localSession };
          if (sessionForDBFromServer.employee_id) {
            sessionForDBFromServer.staff_id = sessionForDBFromServer.employee_id;
            delete sessionForDBFromServer.employee_id;
          }
          if (sessionForDBFromServer.employee_name) {
            sessionForDBFromServer.staff_name = sessionForDBFromServer.employee_name;
            delete sessionForDBFromServer.employee_name;
          }
          // ⚡ CRITICAL FIX: إزالة الحقول غير الموجودة في PowerSync schema
          delete sessionForDBFromServer.local_updated_at;
          delete sessionForDBFromServer.synced;
          delete sessionForDBFromServer.sync_status;
          delete sessionForDBFromServer.pending_operation;

          // ⚡ استخدام PowerSync مباشرة للحفظ من Supabase - مع tx.execute
          await powerSyncService.transaction(async (tx) => {
            const keys = Object.keys(sessionForDBFromServer).filter(k => k !== 'id');
            const values = keys.map(k => sessionForDBFromServer[k]);
            const placeholders = keys.map(() => '?').join(', ');

            // Try UPDATE first, then INSERT if no rows affected
            const updateKeys = keys.filter(k => k !== 'created_at' && k !== 'updated_at');
            const updateSet = updateKeys.map(k => `${k} = ?`).join(', ');
            const updateValues = updateKeys.map(k => sessionForDBFromServer[k]);

            const updateResult = await tx.execute(
              `UPDATE staff_work_sessions SET ${updateSet}, updated_at = ? WHERE id = ?`,
              [...updateValues, sessionForDBFromServer.updated_at || now, sessionForDBFromServer.id]
            );

            // If no rows updated, INSERT
            if (!updateResult || (Array.isArray(updateResult) && updateResult.length === 0)) {
              await tx.execute(
                `INSERT INTO staff_work_sessions (id, ${keys.join(', ')}, created_at, updated_at) VALUES (?, ${placeholders}, ?, ?)`,
                [sessionForDBFromServer.id, ...values, sessionForDBFromServer.created_at || now, sessionForDBFromServer.updated_at || now]
              );
            }
          });

          console.log('[LocalWorkSession] ✅ تم حفظ الجلسة من السيرفر:', localSession.id);
          // ⚡ CRITICAL FIX: تحويل staff_id/staff_name إلى employee_id/employee_name للواجهة
          const sessionData: any = localSession;
          return {
            ...localSession,
            employee_id: sessionData.staff_id || sessionData.employee_id || '',
            employee_name: sessionData.staff_name || sessionData.employee_name,
          } as LocalWorkSession;
        }
      } catch (error) {
        console.warn('⚠️ فشل جلب الجلسة من السيرفر، استخدام البيانات المحلية:', error instanceof Error ? error.message : error);
      }
    }

    return null;
  } catch (error) {
    console.error('❌ خطأ في getActiveWorkSession:', error);
    return null;
  }
};

/**
 * بدء جلسة جديدة
 */
export const startWorkSession = async (
  staffId: string,
  staffName: string,
  organizationId: string,
  openingCash: number,
  notes?: string
): Promise<LocalWorkSession> => {
  const now = new Date().toISOString();
  const sessionId = uuidv4();

  const session: LocalWorkSession = {
    id: sessionId,
    organization_id: organizationId,
    employee_id: staffId, // ⚡ الواجهة تستخدم employee_id
    employee_name: staffName, // ⚡ الواجهة تستخدم employee_name
    opening_cash: openingCash,
    closing_cash: null,
    expected_cash: null,
    cash_difference: null,
    total_sales: 0,
    total_orders: 0,
    cash_sales: 0,
    card_sales: 0,
    started_at: now,
    ended_at: null,
    paused_at: null,
    resumed_at: null,
    pause_count: 0,
    total_pause_duration: 0,
    status: 'active',
    opening_notes: notes || null,
    closing_notes: null,
    created_at: now,
    updated_at: now,
    // ⚡ حقول المزامنة الموحدة (synced, sync_status, pending_operation, local_updated_at)
    synced: 0,  // 0 = not synced, 1 = synced
    sync_status: 'pending',
    pending_operation: 'INSERT',
    local_updated_at: now,
  };

  // ⚡ CRITICAL FIX: تحويل employee_id/employee_name إلى staff_id/staff_name للجدول
  // الجدول يستخدم staff_id و staff_name، لكن الواجهة تستخدم employee_id و employee_name
  const sessionForDB: any = {
    ...session,
    staff_id: staffId,
    staff_name: staffName,
  };
  // إزالة employee_id و employee_name من البيانات المرسلة للجدول
  delete sessionForDB.employee_id;
  delete sessionForDB.employee_name;
  // ⚡ CRITICAL FIX: إزالة الحقول غير الموجودة في PowerSync schema
  delete sessionForDB.local_updated_at;
  delete sessionForDB.synced;
  delete sessionForDB.sync_status;
  delete sessionForDB.pending_operation;

  // ⚡ استخدام PowerSync مباشرة - مع tx.execute
  await powerSyncService.transaction(async (tx) => {
    const keys = Object.keys(sessionForDB).filter(k => k !== 'id');
    const values = keys.map(k => sessionForDB[k]);
    const placeholders = keys.map(() => '?').join(', ');

    await tx.execute(
      `INSERT INTO staff_work_sessions (id, ${keys.join(', ')}, created_at, updated_at) VALUES (?, ${placeholders}, ?, ?)`,
      [sessionId, ...values, now, now]
    );
  });
  
  console.log(`[LocalWorkSession] ✅ Created session ${sessionId} via PowerSync (will sync to Supabase)`);

  return session;
};

/**
 * تحديث الجلسة محلياً (عند إضافة طلب)
 */
export const updateWorkSessionLocally = async (
  sessionId: string,
  updates: {
    total_sales?: number;
    total_orders?: number;
    cash_sales?: number;
    card_sales?: number;
  }
): Promise<void> => {
  try {
    const orgId = getOrgId();
    const session = await getSessionById(sessionId, orgId);
    if (!session) {
      console.warn('⚠️ الجلسة غير موجودة:', sessionId);
      return;
    }

    const now = new Date().toISOString();
    await updateSession(sessionId, orgId, {
      total_sales: updates.total_sales ?? session.total_sales,
      total_orders: updates.total_orders ?? session.total_orders,
      cash_sales: updates.cash_sales ?? session.cash_sales,
      card_sales: updates.card_sales ?? session.card_sales,
      updated_at: now,
      // ⚡ حقول المزامنة الموحدة
      synced: 0,  // 0 = not synced, 1 = synced
      sync_status: 'pending',
      pending_operation: 'UPDATE',
      local_updated_at: now,
    });

    console.log(`[LocalWorkSession] ⚡ Updated session ${sessionId}`);
  } catch (error) {
    console.error('❌ خطأ في updateWorkSessionLocally:', error);
  }
};

/**
 * إغلاق الجلسة
 */
export const closeWorkSession = async (
  sessionId: string,
  closingCash: number,
  notes?: string
): Promise<{ success: boolean; expected_cash?: number; difference?: number }> => {
  try {
    const orgId = getOrgId();
    const session = await getSessionById(sessionId, orgId);
    if (!session) {
      throw new Error('الجلسة غير موجودة');
    }

    const expectedCash = session.opening_cash + session.cash_sales;
    const difference = closingCash - expectedCash;
    const now = new Date().toISOString();

    await updateSession(sessionId, orgId, {
      closing_cash: closingCash,
      expected_cash: expectedCash,
      cash_difference: difference,
      closing_notes: notes || null,
      status: 'closed',
      ended_at: now,
      updated_at: now,
      // ⚡ حقول المزامنة الموحدة
      synced: 0,  // 0 = not synced, 1 = synced
      sync_status: 'pending',
      pending_operation: 'UPDATE',
      local_updated_at: now,
    });

    console.log(`[LocalWorkSession] ⚡ Closed session ${sessionId}`);

    // ⚡ Local-First: لا نستدعي RPCs هنا - المزامنة ستحدث لاحقاً عبر syncPendingWorkSessions
    console.log('[LocalWorkSession] ⚡ Session closed locally, will sync later via Delta Sync');

    return {
      success: true,
      expected_cash: expectedCash,
      difference,
    };
  } catch (error) {
    console.error('❌ خطأ في closeWorkSession:', error);
    throw error;
  }
};

/**
 * مزامنة الجلسات المعلقة
 */
export const syncPendingWorkSessions = async (): Promise<void> => {
  if (!isAppOnline()) {
    return;
  }

  try {
    const orgId = getOrgId();
    if (!orgId) {
      return;
    }

    // ⚡ CRITICAL FIX: انتظر حتى تهيئة قاعدة البيانات قبل القراءة
    try {
      const { dbInitManager } = await import('@/lib/db/DatabaseInitializationManager');
      
      if (!dbInitManager.isInitialized(orgId)) {
        // محاولة تهيئة قاعدة البيانات (أو انتظار التهيئة الجارية)
        await Promise.race([
          dbInitManager.initialize(orgId, { timeout: 5000 }), // 5 ثواني
          new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 5000); // Timeout احتياطي
          })
        ]);
      }
    } catch (error) {
      // تجاهل الأخطاء - سنحاول المزامنة على أي حال
      console.warn('[LocalWorkSession] ⚠️ Error checking DB readiness in syncPendingWorkSessions:', error);
    }

    // في وضع PowerSync، الجداول لا تحتوي على عمود pending_operation
    // نتأكد من وجود العمود قبل تشغيل مسار المزامنة اليدوي القديم لتجنب أخطاء "no such column"
    let hasPendingColumn = false;
    try {
      if (!powerSyncService.db) {
        console.warn('[localWorkSessionService] PowerSync DB not initialized');
        return [];
      }
      const columns = await powerSyncService.query<{ name: string }>({
        sql: `SELECT name FROM pragma_table_info('staff_work_sessions') 
         WHERE name IN ('pending_operation', '_pending_operation') 
         LIMIT 1`,
        params: []
      });
      hasPendingColumn = Array.isArray(columns) && columns.length > 0;
    } catch (err) {
      // إذا فشل الاستعلام عن الأعمدة، نفترض عدم وجودها لتجنب أخطاء لاحقة
      if (process.env.NODE_ENV === 'development') {
        console.debug('[LocalWorkSession] Could not inspect staff_work_sessions columns:', err);
      }
      hasPendingColumn = false;
    }

    if (!hasPendingColumn) {
      // PowerSync outbox (ps_crud) يدير العمليات المعلقة تلقائياً، لذا نتخطى المسار القديم
      if (process.env.NODE_ENV === 'development') {
        console.log('[LocalWorkSession] Skipping legacy pending_operation sync; column not found (PowerSync handles outbox)');
      }
      return;
    }

    // ⚠️ PowerSync يدير المزامنة تلقائياً عبر ps_crud
    // نستخدم pending_operation للتحقق من الجلسات التي تحتاج مزامنة يدوية
    if (!powerSyncService.db) {
      console.warn('[localWorkSessionService] PowerSync DB not initialized');
      return [];
    }
    const pendingSessions = await powerSyncService.query<LocalWorkSession>({
      sql: 'SELECT * FROM staff_work_sessions WHERE organization_id = ? AND pending_operation IS NOT NULL',
      params: [orgId]
    });

    if (!pendingSessions || !Array.isArray(pendingSessions)) {
      return;
    }

    for (const session of pendingSessions) {
      try {
        if (session.pending_operation === 'INSERT') {
          // ⚡ تحويل employee_id إلى staff_id للتوافق مع RPC
          const staffId = (session as any).employee_id || (session as any).staff_id;
          const result = await workSessionService.startSession({
            staff_id: staffId,
            opening_cash: session.opening_cash,
            opening_notes: session.opening_notes || undefined,
          });

          const isAlreadyActive = (msg?: string) => {
            if (!msg) return false;
            const m = msg.toLowerCase();
            return m.includes('نشطة بالفعل') || m.includes('active');
          };

          if (result.success && result.session_id) {
            await updateSession(session.id, orgId, {
              synced: 1,
              sync_status: undefined,
              pending_operation: undefined
            } as any);
          } else if (!result.success && isAlreadyActive((result as any)?.error)) {
            await updateSession(session.id, orgId, {
              synced: 1,
              sync_status: undefined,
              pending_operation: undefined
            } as any);
          } else if (!result.success) {
            await updateSession(session.id, orgId, {
              sync_status: 'error'
            } as any);
          }
        } else if (session.pending_operation === 'UPDATE') {
          if (session.status === 'closed') {
            const result = await workSessionService.closeSession({
              session_id: session.id,
              closing_cash: session.closing_cash!,
              closing_notes: session.closing_notes || undefined,
            });

            const isAlreadyClosedOrMissing = (msg?: string) => {
              if (!msg) return false;
              const m = msg.toLowerCase();
              return (
                m.includes('مغلقة') ||
                m.includes('غير موجودة') ||
                m.includes('already') ||
                m.includes('not found')
              );
            };

            if (result.success || isAlreadyClosedOrMissing((result as any)?.error)) {
              await updateSession(session.id, orgId, {
                synced: 1,
                sync_status: undefined,
                pending_operation: undefined
              } as any);
            }
          } else {
            // مزامنة تحديث الإحصائيات
            await updateSession(session.id, orgId, {
              synced: 1,
              sync_status: undefined,
              pending_operation: undefined
            } as any);
          }
        }
      } catch (error) {
        console.error('❌ فشل مزامنة الجلسة:', session.id, error);
        await updateSession(session.id, orgId, {
          sync_status: 'error'
        } as any);
      }
    }
  } catch (error) {
    console.error('❌ خطأ في syncPendingWorkSessions:', error);
  }
};

/**
 * جلب جلسات اليوم
 */
export const getTodayWorkSessions = async (organizationId: string, date?: string): Promise<LocalWorkSession[]> => {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    console.log('[LocalWorkSession] 🔍 جلب جلسات اليوم:', targetDate);

    // جلب من القاعدة المحلية باستخدام PowerSync
    if (!powerSyncService.db) {
      console.warn('[localWorkSessionService] PowerSync DB not initialized');
      return [];
    }
    const localSessions = await powerSyncService.query<any>({
      sql: 'SELECT * FROM staff_work_sessions WHERE organization_id = ?',
      params: [organizationId]
    });
    
    console.log('[LocalWorkSession] 📊 القراءة من PowerSync، النتائج:', localSessions.length);

    const todaySessions = localSessions.filter(session => {
      const sessionDate = session.started_at?.split('T')[0];
      return sessionDate === targetDate;
    });

    console.log('[LocalWorkSession] ✅ عدد جلسات اليوم المحلية:', todaySessions.length);

    // إذا كنا أونلاين، جلب من السيرفر وتحديث المحلي
    if (isAppOnline()) {
      try {
        const result = await workSessionService.getTodaySessions(targetDate);
        if (result.success && result.sessions) {
          const now = new Date().toISOString();
          for (const serverSession of result.sessions) {
            const serverSessionData: any = serverSession;
            const localSession: LocalWorkSession = {
              ...serverSession,
              employee_id: serverSessionData.staff_id || serverSessionData.employee_id || '',
              employee_name: serverSessionData.staff_name || serverSessionData.employee_name,
              organization_id: organizationId, // ✅ التأكد من وجود organization_id
              pause_count: serverSession.pause_count || 0,
              total_pause_duration: serverSession.total_pause_duration || 0,
              created_at: now,
              updated_at: now,
              synced: 1,  // 1 = synced
              sync_status: undefined,
              pending_operation: undefined,
            };
            
            // ⚡ CRITICAL FIX: تحويل employee_id/employee_name إلى staff_id/staff_name للجدول
            const sessionForDBFromToday: any = { ...localSession };
            if (sessionForDBFromToday.employee_id) {
              sessionForDBFromToday.staff_id = sessionForDBFromToday.employee_id;
              delete sessionForDBFromToday.employee_id;
            }
            if (sessionForDBFromToday.employee_name) {
              sessionForDBFromToday.staff_name = sessionForDBFromToday.employee_name;
              delete sessionForDBFromToday.employee_name;
            }
            // ⚡ CRITICAL FIX: إزالة الحقول غير الموجودة في PowerSync schema
            delete sessionForDBFromToday.local_updated_at;
            delete sessionForDBFromToday.synced;
            delete sessionForDBFromToday.sync_status;
            delete sessionForDBFromToday.pending_operation;

            // ⚡ استخدام PowerSync مباشرة للحفظ من Supabase - مع tx.execute
            await powerSyncService.transaction(async (tx) => {
              const keys = Object.keys(sessionForDBFromToday).filter(k => k !== 'id');
              const values = keys.map(k => sessionForDBFromToday[k]);
              const placeholders = keys.map(() => '?').join(', ');

              // Try UPDATE first, then INSERT if no rows affected
              const updateKeys = keys.filter(k => k !== 'created_at' && k !== 'updated_at');
              const updateSet = updateKeys.map(k => `${k} = ?`).join(', ');
              const updateValues = updateKeys.map(k => sessionForDBFromToday[k]);

              const updateResult = await tx.execute(
                `UPDATE staff_work_sessions SET ${updateSet}, updated_at = ? WHERE id = ?`,
                [...updateValues, sessionForDBFromToday.updated_at || now, sessionForDBFromToday.id]
              );

              // If no rows updated, INSERT
              if (!updateResult || (Array.isArray(updateResult) && updateResult.length === 0)) {
                await tx.execute(
                  `INSERT INTO staff_work_sessions (id, ${keys.join(', ')}, created_at, updated_at) VALUES (?, ${placeholders}, ?, ?)`,
                  [sessionForDBFromToday.id, ...values, sessionForDBFromToday.created_at || now, sessionForDBFromToday.updated_at || now]
                );
              }
            });
          }
          console.log('[LocalWorkSession] ✅ تم حفظ', result.sessions.length, 'جلسات من السيرفر');
          return localSessions as LocalWorkSession[];
        }
      } catch (error) {
        console.log('⚠️ فشل جلب الجلسات من السيرفر، استخدام البيانات المحلية');
      }
    }

    return todaySessions;
  } catch (error) {
    console.error('❌ خطأ في getTodayWorkSessions:', error);
    return [];
  }
};

/**
 * إيقاف الجلسة مؤقتاً
 */
export const pauseWorkSession = async (sessionId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const orgId = getOrgId();
    const session = await getSessionById(sessionId, orgId);
    if (!session) {
      throw new Error('الجلسة غير موجودة');
    }

    if (session.status !== 'active') {
      throw new Error('الجلسة غير نشطة');
    }

    const now = new Date().toISOString();

    await updateSession(sessionId, orgId, {
      status: 'paused',
      paused_at: now,
      pause_count: session.pause_count + 1,
      updated_at: now,
      // ⚡ حقول المزامنة الموحدة
      synced: 0,  // 0 = not synced, 1 = synced
      sync_status: 'pending',
      pending_operation: 'UPDATE',
      local_updated_at: now,
    });

    console.log(`[LocalWorkSession] ⚡ Paused session ${sessionId}`);

    // ⚡ Local-First: لا نستدعي RPCs هنا - المزامنة ستحدث لاحقاً عبر syncPendingWorkSessions
    console.log('[LocalWorkSession] ⚡ Session paused locally, will sync later via Delta Sync');

    return {
      success: true,
      message: 'تم إيقاف الجلسة مؤقتاً',
    };
  } catch (error) {
    console.error('❌ خطأ في pauseWorkSession:', error);
    throw error;
  }
};

/**
 * استئناف الجلسة
 */
export const resumeWorkSession = async (sessionId: string): Promise<{ success: boolean; message?: string; pause_duration?: number }> => {
  try {
    const orgId = getOrgId();
    const session = await getSessionById(sessionId, orgId);
    if (!session) {
      throw new Error('الجلسة غير موجودة');
    }

    if (session.status !== 'paused') {
      throw new Error('الجلسة غير متوقفة');
    }

    const now = new Date().toISOString();
    const pauseDuration = session.paused_at
      ? (new Date(now).getTime() - new Date(session.paused_at).getTime()) / 1000
      : 0;

    await updateSession(sessionId, orgId, {
      status: 'active',
      resumed_at: now,
      total_pause_duration: session.total_pause_duration + pauseDuration,
      updated_at: now,
      // ⚡ حقول المزامنة الموحدة
      synced: 0,  // 0 = not synced, 1 = synced
      sync_status: 'pending',
      pending_operation: 'UPDATE',
      local_updated_at: now,
    });

    console.log(`[LocalWorkSession] ⚡ Resumed session ${sessionId}`);

    // ⚡ Local-First: لا نستدعي RPCs هنا - المزامنة ستحدث لاحقاً عبر syncPendingWorkSessions
    console.log('[LocalWorkSession] ⚡ Session resumed locally, will sync later via Delta Sync');

    return {
      success: true,
      message: 'تم استئناف الجلسة',
      pause_duration: pauseDuration,
    };
  } catch (error) {
    console.error('❌ خطأ في resumeWorkSession:', error);
    throw error;
  }
};

/**
 * جلب الجلسة النشطة أو المتوقفة
 * ⚡ CRITICAL FIX: إضافة retry logic للانتظار حتى تهيئة قاعدة البيانات
 */
export const getActiveOrPausedSession = async (staffId: string, organizationId: string): Promise<LocalWorkSession | null> => {
  // ⚡ CRITICAL FIX: انتظر حتى تهيئة قاعدة البيانات
  const waitForDB = async (): Promise<boolean> => {
    try {
      const { dbInitManager } = await import('@/lib/db/DatabaseInitializationManager');
      
      // فحص مباشر
      if (dbInitManager.isInitialized(organizationId)) {
        return true;
      }
      
      // ⚡ CRITICAL FIX v2: استخدام initialize() بدلاً من الانتظار فقط
      const startTime = Date.now();
      
      try {
        // محاولة تهيئة قاعدة البيانات (أو انتظار التهيئة الجارية)
        await Promise.race([
          dbInitManager.initialize(organizationId, { timeout: 8000 }), // 8 ثواني
          new Promise<void>((resolve) => {
            // Timeout احتياطي بعد 7 ثواني
            setTimeout(() => {
              console.warn('[LocalWorkSession] ⚠️ Timeout waiting for DB initialization');
              resolve();
            }, 7000);
          })
        ]);
        
        const waitTime = Date.now() - startTime;
        if (dbInitManager.isInitialized(organizationId)) {
          console.log(`[LocalWorkSession] ✅ Database ready after ${waitTime}ms`);
          return true;
        } else {
          console.warn(`[LocalWorkSession] ⚠️ Database initialization incomplete after ${waitTime}ms`);
          return false;
        }
      } catch (error) {
        console.warn('[LocalWorkSession] ⚠️ Error initializing DB:', error);
        return false;
      }
    } catch (error) {
      console.warn('[LocalWorkSession] ⚠️ Error checking DB readiness:', error);
      return false;
    }
  };

  // ⚡ Retry logic: محاولة حتى 3 مرات مع انتظار بين المحاولات
  let retries = 3;
  let lastError: Error | null = null;
  
  while (retries > 0) {
    try {
      console.log('[LocalWorkSession] 🔍 جلب الجلسة النشطة أو المتوقفة للموظف:', staffId, `(محاولة ${4 - retries}/3)`);

      // PowerSync لا يحتاج تهيئة صريحة - يتم تهيئته تلقائياً

      // البحث في القاعدة المحلية أولاً باستخدام PowerSync
      if (!powerSyncService.db) {
      console.warn('[localWorkSessionService] PowerSync DB not initialized');
      return [];
    }
    const localSessions = await powerSyncService.query<any>({
        sql: "SELECT * FROM staff_work_sessions WHERE staff_id = ? AND (status = 'active' OR status = 'paused') AND organization_id = ? LIMIT 1",
        params: [staffId, organizationId]
      });
      
      console.log('[LocalWorkSession] 📊 القراءة من PowerSync، النتائج:', localSessions.length);

      if (localSessions.length > 0) {
        console.log('[LocalWorkSession] ✅ تم العثور على جلسة محلياً:', localSessions[0].id, 'الحالة:', localSessions[0].status);
        return localSessions[0];
      }

      console.log('[LocalWorkSession] ⚠️ لم يتم العثور على جلسة محلياً');

      // إذا كنا أونلاين، جلب من السيرفر
      if (isAppOnline()) {
        try {
          const result = await workSessionService.getActiveOrPausedSession(staffId);
          if (result.success && result.has_session && result.session) {
            const now = new Date().toISOString();
            const resultSessionData: any = result.session;
            const localSession: LocalWorkSession = {
              ...result.session,
              employee_id: resultSessionData.staff_id || resultSessionData.employee_id || '',
              employee_name: resultSessionData.staff_name || resultSessionData.employee_name,
              organization_id: organizationId, // ✅ التأكد من وجود organization_id
              pause_count: result.session.pause_count || 0,
              total_pause_duration: result.session.total_pause_duration || 0,
              created_at: now,
              updated_at: now,
              synced: 1,  // 1 = synced
              sync_status: undefined,
              pending_operation: undefined,
            };
            
            // ⚡ CRITICAL FIX: تحويل employee_id/employee_name إلى staff_id/staff_name للجدول
            const sessionForDBFromActive: any = { ...localSession };
            if (sessionForDBFromActive.employee_id) {
              sessionForDBFromActive.staff_id = sessionForDBFromActive.employee_id;
              delete sessionForDBFromActive.employee_id;
            }
            if (sessionForDBFromActive.employee_name) {
              sessionForDBFromActive.staff_name = sessionForDBFromActive.employee_name;
              delete sessionForDBFromActive.employee_name;
            }
            // ⚡ CRITICAL FIX: إزالة الحقول غير الموجودة في PowerSync schema
            delete sessionForDBFromActive.local_updated_at;
            delete sessionForDBFromActive.synced;
            delete sessionForDBFromActive.sync_status;
            delete sessionForDBFromActive.pending_operation;

            // ⚡ استخدام PowerSync مباشرة للحفظ من Supabase - مع tx.execute
            await powerSyncService.transaction(async (tx) => {
              const keys = Object.keys(sessionForDBFromActive).filter(k => k !== 'id');
              const values = keys.map(k => sessionForDBFromActive[k]);
              const placeholders = keys.map(() => '?').join(', ');

              // Try UPDATE first, then INSERT if no rows affected
              const updateKeys = keys.filter(k => k !== 'created_at' && k !== 'updated_at');
              const updateSet = updateKeys.map(k => `${k} = ?`).join(', ');
              const updateValues = updateKeys.map(k => sessionForDBFromActive[k]);

              const updateResult = await tx.execute(
                `UPDATE staff_work_sessions SET ${updateSet}, updated_at = ? WHERE id = ?`,
                [...updateValues, sessionForDBFromActive.updated_at || now, sessionForDBFromActive.id]
              );

              // If no rows updated, INSERT
              if (!updateResult || (Array.isArray(updateResult) && updateResult.length === 0)) {
                await tx.execute(
                  `INSERT INTO staff_work_sessions (id, ${keys.join(', ')}, created_at, updated_at) VALUES (?, ${placeholders}, ?, ?)`,
                  [sessionForDBFromActive.id, ...values, sessionForDBFromActive.created_at || now, sessionForDBFromActive.updated_at || now]
                );
              }
            });

            console.log('[LocalWorkSession] ✅ تم حفظ الجلسة من السيرفر:', localSession.id);
            return localSession;
          }
        } catch (error) {
          console.warn('⚠️ فشل جلب الجلسة من السيرفر، استخدام البيانات المحلية:', error instanceof Error ? error.message : error);
        }
      }

      // نجحت القراءة (حتى لو لم توجد جلسة)
      return null;
      
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // ⚡ CRITICAL FIX: إذا كانت المشكلة هي عدم تهيئة DB، أعد المحاولة
      if (error?.message?.includes('not initialized') || 
          error?.message?.includes('not ready') ||
          error?.message?.includes('Database not initialized')) {
        if (retries > 1) {
          console.log(`[LocalWorkSession] ⚠️ Database not ready (${error.message}), retrying in 500ms... (${retries - 1} attempts left)`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
      }
      
      // خطأ آخر أو نفدت المحاولات - أخرجه
      console.error('[LocalWorkSession] ❌ خطأ في getActiveOrPausedSession:', lastError);
      return null;
    }
  }
  
  // فشل بعد كل المحاولات
  console.warn('[LocalWorkSession] ⚠️ Failed to fetch session after all retries:', lastError);
  return null;
};

/**
 * إغلاق الجلسات القديمة تلقائياً (أقدم من 24 ساعة)
 * يتم استدعاؤها دورياً لمنع تراكم جلسات نشطة قديمة
 * ⚡ CRITICAL FIX: إضافة انتظار حتى تهيئة قاعدة البيانات
 */
export const closeOldActiveSessions = async (organizationId: string): Promise<number> => {
  // ⚡ CRITICAL FIX: انتظر حتى تهيئة قاعدة البيانات
  try {
    const { dbInitManager } = await import('@/lib/db/DatabaseInitializationManager');
    
    if (!dbInitManager.isInitialized(organizationId)) {
      // انتظر حتى التهيئة (حد أقصى 3 ثواني)
      const startTime = Date.now();
      const timeoutMs = 3000;
      const checkInterval = 100;
      
      const dbReady = await new Promise<boolean>((resolve) => {
        const checkReady = () => {
          if (Date.now() - startTime > timeoutMs) {
            console.warn('[LocalWorkSession] ⚠️ Timeout waiting for DB initialization in closeOldActiveSessions');
            resolve(false);
            return;
          }
          
          if (dbInitManager.isInitialized(organizationId)) {
            resolve(true);
            return;
          }
          
          setTimeout(checkReady, checkInterval);
        };
        
        checkReady();
      });
      
      if (!dbReady) {
        console.log('[LocalWorkSession] ⏸️ Database not ready, skipping closeOldActiveSessions');
        return 0;
      }
    }
  } catch (error) {
    console.warn('[LocalWorkSession] ⚠️ Error checking DB readiness in closeOldActiveSessions:', error);
    return 0;
  }

  try {
    console.log('[LocalWorkSession] 🔍 فحص الجلسات القديمة...');
    
    // جلب جميع الجلسات النشطة
    let activeSessions: LocalWorkSession[] = [];
    
    // ⚡ استخدام PowerSync مباشرة
    if (!powerSyncService.db) {
      console.warn('[localWorkSessionService] PowerSync DB not initialized');
      return [];
    }
    activeSessions = await powerSyncService.query<any>({
      sql: "SELECT * FROM staff_work_sessions WHERE status = 'active' AND organization_id = ?",
      params: [organizationId]
    });
    
    if (!activeSessions || activeSessions.length === 0) {
      console.log('[LocalWorkSession] ✅ لا توجد جلسات نشطة قديمة');
      return 0;
    }
    
    // حساب الحد الزمني (24 ساعة = 86400000 ملي ثانية)
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 ساعة
    let closedCount = 0;
    
    for (const session of activeSessions) {
      try {
        const sessionStart = new Date(session.started_at).getTime();
        const age = now - sessionStart;
        const ageHours = age / (1000 * 60 * 60);
        
        // إذا كانت الجلسة أقدم من 24 ساعة
        if (age > maxAge) {
          console.log(`[LocalWorkSession] ⚠️ جلسة قديمة جداً (${ageHours.toFixed(1)} ساعة):`, session.id);
          
          // إغلاق الجلسة تلقائياً
          const closeTime = new Date().toISOString();
          const expectedCash = session.opening_cash + (session.cash_sales || 0);
          
          await updateSession(session.id, organizationId, {
            status: 'closed',
            ended_at: closeTime,
            closing_cash: expectedCash, // نفترض أن النقد الفعلي = المتوقع
            expected_cash: expectedCash,
            cash_difference: 0,
            closing_notes: `إغلاق تلقائي - الجلسة كانت نشطة لمدة ${ageHours.toFixed(1)} ساعة`,
            updated_at: closeTime,
            synced: 0,  // 0 = not synced, 1 = synced
            sync_status: 'pending',
            pending_operation: 'UPDATE',
            local_updated_at: new Date().toISOString(),
          });
          
          closedCount++;
          console.log(`[LocalWorkSession] ✅ تم إغلاق الجلسة القديمة:`, session.id);
        }
      } catch (error) {
        console.error(`[LocalWorkSession] ❌ فشل إغلاق الجلسة ${session.id}:`, error);
      }
    }
    
    if (closedCount > 0) {
      console.log(`[LocalWorkSession] ✅ تم إغلاق ${closedCount} جلسة قديمة`);
    }
    
    return closedCount;
  } catch (error) {
    console.error('[LocalWorkSession] ❌ خطأ في closeOldActiveSessions:', error);
    return 0;
  }
};

// =====================
// حفظ البيانات من السيرفر
// =====================

export const saveRemoteWorkSessions = async (sessions: any[]): Promise<void> => {
  if (!sessions || sessions.length === 0) return;

  const now = new Date().toISOString();
  const orgId = getOrgId();

  for (const session of sessions) {
    const sessionData: any = session;
    const mappedSession: LocalWorkSession = {
      id: session.id,
      organization_id: session.organization_id,
      employee_id: sessionData.staff_id || sessionData.employee_id || '',
      employee_name: sessionData.staff_name || sessionData.employee_name,
      opening_cash: session.opening_cash || 0,
      closing_cash: session.closing_cash,
      expected_cash: session.expected_cash,
      cash_difference: session.cash_difference,
      total_sales: session.total_sales || 0,
      total_orders: session.total_orders || 0,
      cash_sales: session.cash_sales || 0,
      card_sales: session.card_sales || 0,
      started_at: session.started_at || now,
      ended_at: session.ended_at,
      paused_at: session.paused_at,
      resumed_at: session.resumed_at,
      pause_count: session.pause_count || 0,
      total_pause_duration: session.total_pause_duration || 0,
      status: session.status || 'active',
      opening_notes: session.opening_notes,
      closing_notes: session.closing_notes,
      created_at: session.created_at || now,
      updated_at: session.updated_at || now,
      synced: 1,  // 1 = synced
      sync_status: undefined,
      pending_operation: undefined,
    };

    // ⚡ CRITICAL FIX: تحويل employee_id/employee_name إلى staff_id/staff_name للجدول
    const mappedSessionForDBFinal: any = { ...mappedSession };
    if (mappedSessionForDBFinal.employee_id) {
      mappedSessionForDBFinal.staff_id = mappedSessionForDBFinal.employee_id;
      delete mappedSessionForDBFinal.employee_id;
    }
    if (mappedSessionForDBFinal.employee_name) {
      mappedSessionForDBFinal.staff_name = mappedSessionForDBFinal.employee_name;
      delete mappedSessionForDBFinal.employee_name;
    }
    // ⚡ CRITICAL FIX: إزالة الحقول غير الموجودة في PowerSync schema
    delete mappedSessionForDBFinal.local_updated_at;
    delete mappedSessionForDBFinal.synced;
    delete mappedSessionForDBFinal.sync_status;
    delete mappedSessionForDBFinal.pending_operation;

    // ⚡ استخدام PowerSync مباشرة للحفظ من Supabase - مع tx.execute
    await powerSyncService.transaction(async (tx) => {
      const keys = Object.keys(mappedSessionForDBFinal).filter(k => k !== 'id');
      const values = keys.map(k => mappedSessionForDBFinal[k]);
      const placeholders = keys.map(() => '?').join(', ');

      // Try UPDATE first, then INSERT if no rows affected
      const updateKeys = keys.filter(k => k !== 'created_at' && k !== 'updated_at');
      const updateSet = updateKeys.map(k => `${k} = ?`).join(', ');
      const updateValues = updateKeys.map(k => mappedSessionForDBFinal[k]);

      const updateResult = await tx.execute(
        `UPDATE staff_work_sessions SET ${updateSet}, updated_at = ? WHERE id = ?`,
        [...updateValues, mappedSessionForDBFinal.updated_at || now, mappedSessionForDBFinal.id]
      );

      // If no rows updated, INSERT
      if (!updateResult || (Array.isArray(updateResult) && updateResult.length === 0)) {
        await tx.execute(
          `INSERT INTO staff_work_sessions (id, ${keys.join(', ')}, created_at, updated_at) VALUES (?, ${placeholders}, ?, ?)`,
          [mappedSessionForDBFinal.id, ...values, mappedSessionForDBFinal.created_at || now, mappedSessionForDBFinal.updated_at || now]
        );
      }
    });
  }

  console.log(`[LocalWorkSession] ⚡ Saved ${sessions.length} remote work sessions`);
};
