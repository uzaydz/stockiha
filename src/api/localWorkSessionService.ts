/**
 * localWorkSessionService - خدمة جلسات العمل المحلية
 *
 * ⚡ تم التحديث لاستخدام Tauri SQL مباشرة + Delta Sync كـ fallback
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - يدعم الأوفلاين والأونلاين معاً
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalWorkSession } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { workSessionService } from '@/services/workSessionService';
import { isAppOnline } from '@/utils/networkStatus';
import { tauriQuery, tauriUpsert } from '@/lib/db/tauriSqlClient';

// Re-export types
export type { LocalWorkSession } from '@/database/localDb';

// فحص بيئة Tauri
const isTauriEnv = (): boolean => {
  try {
    // @ts-ignore
    if ((import.meta as any).env?.TAURI) return true;
  } catch {}
  if (typeof window === 'undefined') return false;
  const w: any = window as any;
  if (typeof w.__TAURI_IPC__ === 'function') return true;
  if (!!w.__TAURI__) return true;
  if (typeof w.isTauri === 'boolean' && w.isTauri) return true;
  return false;
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
  if (window.electronAPI?.db) {
    const result = await window.electronAPI.db.queryOne('SELECT * FROM work_sessions WHERE id = ?', [sessionId]);
    return result.data || null;
  } else if (isTauriEnv()) {
    const result = await tauriQuery(organizationId, 'SELECT * FROM work_sessions WHERE id = ?', [sessionId]);
    return result.data?.[0] || null;
  } else {
    return await deltaWriteService.get<LocalWorkSession>('work_sessions', sessionId);
  }
};

/**
 * دالة مساعدة لتحديث جلسة
 */
const updateSession = async (sessionId: string, organizationId: string, updates: Partial<LocalWorkSession>): Promise<void> => {
  if (window.electronAPI?.db) {
    // في Electron، نحتاج لقراءة السجل كاملاً أولاً ثم عمل upsert
    const session = await getSessionById(sessionId, organizationId);
    if (session) {
      await window.electronAPI.db.upsert('work_sessions', { ...session, ...updates });
    }
  } else if (isTauriEnv()) {
    // في Tauri، نستخدم UPDATE مباشرة
    const columns = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const sql = `UPDATE work_sessions SET ${setClause} WHERE id = ?`;
    await tauriQuery(organizationId, sql, [...values, sessionId]);
  } else {
    await deltaWriteService.update('work_sessions', sessionId, updates);
  }
};

/**
 * جلب الجلسة النشطة (أوفلاين أولاً، ثم أونلاين)
 */
export const getActiveWorkSession = async (staffId: string, organizationId: string): Promise<LocalWorkSession | null> => {
  try {
    console.log('[LocalWorkSession] 🔍 جلب الجلسة النشطة للموظف:', staffId);

    // البحث في القاعدة المحلية أولاً
    let localSessions: LocalWorkSession[] = [];

    if (window.electronAPI?.db) {
      // Electron
      const result = await window.electronAPI.db.query(
        "SELECT * FROM work_sessions WHERE staff_id = ? AND status = 'active' AND organization_id = ? LIMIT 1",
        [staffId, organizationId]
      );
      localSessions = result.data || [];
      console.log('[LocalWorkSession] 📊 القراءة من Electron SQLite، النتائج:', localSessions.length);
    } else if (isTauriEnv()) {
      // ⚡ استخدام Tauri SQL مباشرة
      console.log('[LocalWorkSession] 🔄 جاري القراءة من Tauri SQLite...');
      const result = await tauriQuery(
        organizationId,
        "SELECT * FROM work_sessions WHERE staff_id = ? AND status = 'active' AND organization_id = ? LIMIT 1",
        [staffId, organizationId]
      );
      console.log('[LocalWorkSession] 📊 نتيجة الاستعلام من Tauri:', {
        success: result.success,
        count: result.data?.length,
        error: result.error
      });
      localSessions = result.data || [];
    } else {
      // ⚡ استخدام Delta Sync كـ fallback
      console.log('[LocalWorkSession] 📊 القراءة من Delta Sync');
      localSessions = await deltaWriteService.getAll<LocalWorkSession>('work_sessions', organizationId, {
        where: "staff_id = ? AND status = 'active'",
        params: [staffId],
        limit: 1
      });
    }

    if (localSessions.length > 0) {
      console.log('[LocalWorkSession] ✅ تم العثور على جلسة نشطة محلياً:', localSessions[0].id);
      return localSessions[0];
    }

    console.log('[LocalWorkSession] ⚠️ لم يتم العثور على جلسة نشطة محلياً');

    // إذا كنا أونلاين، جلب من السيرفر
    if (isAppOnline()) {
      try {
        const result = await workSessionService.getActiveSession(staffId);
        if (result.success && result.has_active_session && result.session) {
          // حفظ في القاعدة المحلية
          const now = new Date().toISOString();
          const localSession: LocalWorkSession = {
            ...result.session,
            organization_id: organizationId, // ✅ التأكد من وجود organization_id
            pause_count: result.session.pause_count || 0,
            total_pause_duration: result.session.total_pause_duration || 0,
            created_at: now,
            updated_at: now,
            synced: true,
            syncStatus: undefined,
            pendingOperation: undefined,
          };

          if (window.electronAPI?.db) {
            await window.electronAPI.db.upsert('work_sessions', localSession);
          } else if (isTauriEnv()) {
            await tauriUpsert(organizationId, 'work_sessions', localSession);
          } else {
            await deltaWriteService.saveFromServer('work_sessions', localSession);
          }

          console.log('[LocalWorkSession] ✅ تم حفظ الجلسة من السيرفر:', localSession.id);
          return localSession;
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
    staff_id: staffId,
    staff_name: staffName,
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
    synced: false,
    syncStatus: 'pending',
    pendingOperation: 'create',
  };

  // ⚡ حفظ محلياً
  if (window.electronAPI?.db) {
    // Electron
    await window.electronAPI.db.upsert('work_sessions', session);
    console.log(`[LocalWorkSession] ⚡ Created session ${sessionId} via Electron SQLite`);
  } else if (isTauriEnv()) {
    // ⚡ استخدام Tauri SQL مباشرة
    const result = await tauriUpsert(organizationId, 'work_sessions', session);
    if (!result.success) {
      throw new Error(`Failed to create work session: ${result.error}`);
    }
    console.log(`[LocalWorkSession] ⚡ Created session ${sessionId} via Tauri SQLite`);
  } else {
    // ⚡ استخدام Delta Sync كـ fallback
    const result = await deltaWriteService.create('work_sessions', session, organizationId);
    if (!result.success) {
      throw new Error(`Failed to create work session: ${result.error}`);
    }
    console.log(`[LocalWorkSession] ⚡ Created session ${sessionId} via Delta Sync`);
  }

  // محاولة الحفظ على السيرفر إذا كنا أونلاين
  if (isAppOnline()) {
    try {
      const serverResult = await workSessionService.startSession({
        staff_id: staffId,
        opening_cash: openingCash,
        opening_notes: notes,
      });

      const isAlreadyActive = (msg?: string) => {
        if (!msg) return false;
        const m = msg.toLowerCase();
        return m.includes('نشطة بالفعل') || m.includes('active');
      };

      if (serverResult.success && serverResult.session_id) {
        // تحديث الجلسة المحلية بالـ ID من السيرفر
        await updateSession(sessionId, organizationId, {
          id: serverResult.session_id,
          synced: true,
          syncStatus: undefined,
          pendingOperation: undefined
        });
        session.id = serverResult.session_id;
        session.synced = true;
      } else if (!serverResult.success && isAlreadyActive((serverResult as any)?.error)) {
        await updateSession(sessionId, organizationId, {
          synced: true,
          syncStatus: undefined,
          pendingOperation: undefined
        });
        session.synced = true;
      }
    } catch (error) {
      console.log('⚠️ فشل حفظ الجلسة على السيرفر، ستتم المزامنة لاحقاً');
    }
  }

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

    await updateSession(sessionId, orgId, {
      total_sales: updates.total_sales ?? session.total_sales,
      total_orders: updates.total_orders ?? session.total_orders,
      cash_sales: updates.cash_sales ?? session.cash_sales,
      card_sales: updates.card_sales ?? session.card_sales,
      updated_at: new Date().toISOString(),
      synced: false,
      syncStatus: 'pending',
      pendingOperation: 'update',
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
      synced: false,
      syncStatus: 'pending',
      pendingOperation: 'update',
    });

    console.log(`[LocalWorkSession] ⚡ Closed session ${sessionId}`);

    // محاولة الإغلاق على السيرفر إذا كنا أونلاين
    if (isAppOnline()) {
      try {
        const serverResult = await workSessionService.closeSession({
          session_id: sessionId,
          closing_cash: closingCash,
          closing_notes: notes,
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

        if (serverResult.success || isAlreadyClosedOrMissing((serverResult as any)?.error)) {
          await updateSession(sessionId, orgId, {
            synced: true,
            syncStatus: undefined,
            pendingOperation: undefined
          });
        }
      } catch (error) {
        console.log('⚠️ فشل إغلاق الجلسة على السيرفر، ستتم المزامنة لاحقاً');
      }
    }

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

    const pendingSessions = await deltaWriteService.getAll<LocalWorkSession>('work_sessions', orgId, {
      where: 'synced = 0'
    });

    if (!pendingSessions || !Array.isArray(pendingSessions)) {
      return;
    }

    for (const session of pendingSessions) {
      try {
        if (session.pendingOperation === 'create') {
          const result = await workSessionService.startSession({
            staff_id: session.staff_id,
            opening_cash: session.opening_cash,
            opening_notes: session.opening_notes || undefined,
          });

          const isAlreadyActive = (msg?: string) => {
            if (!msg) return false;
            const m = msg.toLowerCase();
            return m.includes('نشطة بالفعل') || m.includes('active');
          };

          if (result.success && result.session_id) {
            await deltaWriteService.update('work_sessions', session.id, {
              synced: true,
              syncStatus: undefined,
              pendingOperation: undefined
            });
          } else if (!result.success && isAlreadyActive((result as any)?.error)) {
            await deltaWriteService.update('work_sessions', session.id, {
              synced: true,
              syncStatus: undefined,
              pendingOperation: undefined
            });
          } else if (!result.success) {
            await deltaWriteService.update('work_sessions', session.id, {
              syncStatus: 'error'
            });
          }
        } else if (session.pendingOperation === 'update') {
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
              await deltaWriteService.update('work_sessions', session.id, {
                synced: true,
                syncStatus: undefined,
                pendingOperation: undefined
              });
            }
          } else {
            // مزامنة تحديث الإحصائيات
            await deltaWriteService.update('work_sessions', session.id, {
              synced: true,
              syncStatus: undefined,
              pendingOperation: undefined
            });
          }
        }
      } catch (error) {
        console.error('❌ فشل مزامنة الجلسة:', session.id, error);
        await deltaWriteService.update('work_sessions', session.id, {
          syncStatus: 'error'
        });
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

    // جلب من القاعدة المحلية
    let localSessions: LocalWorkSession[] = [];

    if (window.electronAPI?.db) {
      // Electron
      const result = await window.electronAPI.db.query(
        'SELECT * FROM work_sessions WHERE organization_id = ?',
        [organizationId]
      );
      localSessions = result.data || [];
      console.log('[LocalWorkSession] 📊 القراءة من Electron SQLite، النتائج:', localSessions.length);
    } else if (isTauriEnv()) {
      // ⚡ استخدام Tauri SQL مباشرة
      console.log('[LocalWorkSession] 🔄 جاري القراءة من Tauri SQLite...');
      const result = await tauriQuery(
        organizationId,
        'SELECT * FROM work_sessions WHERE organization_id = ?',
        [organizationId]
      );
      console.log('[LocalWorkSession] 📊 نتيجة الاستعلام من Tauri:', {
        success: result.success,
        count: result.data?.length,
        error: result.error
      });
      localSessions = result.data || [];
    } else {
      // ⚡ استخدام Delta Sync كـ fallback
      console.log('[LocalWorkSession] 📊 القراءة من Delta Sync');
      localSessions = await deltaWriteService.getAll<LocalWorkSession>('work_sessions', organizationId);
    }

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
            const localSession: LocalWorkSession = {
              ...serverSession,
              organization_id: organizationId, // ✅ التأكد من وجود organization_id
              pause_count: serverSession.pause_count || 0,
              total_pause_duration: serverSession.total_pause_duration || 0,
              created_at: now,
              updated_at: now,
              synced: true,
              syncStatus: undefined,
              pendingOperation: undefined,
            };

            if (window.electronAPI?.db) {
              await window.electronAPI.db.upsert('work_sessions', localSession);
            } else if (isTauriEnv()) {
              await tauriUpsert(organizationId, 'work_sessions', localSession);
            } else {
              await deltaWriteService.saveFromServer('work_sessions', localSession);
            }
          }
          console.log('[LocalWorkSession] ✅ تم حفظ', result.sessions.length, 'جلسات من السيرفر');
          return result.sessions as LocalWorkSession[];
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
      synced: false,
      syncStatus: 'pending',
      pendingOperation: 'update',
    });

    console.log(`[LocalWorkSession] ⚡ Paused session ${sessionId}`);

    // محاولة الإيقاف على السيرفر إذا كنا أونلاين
    if (isAppOnline()) {
      try {
        const result = await workSessionService.pauseSession(sessionId);
        if (result.success) {
          await updateSession(sessionId, orgId, {
            synced: true,
            syncStatus: undefined,
            pendingOperation: undefined
          });
        }
      } catch (error) {
        console.log('⚠️ فشل إيقاف الجلسة على السيرفر، ستتم المزامنة لاحقاً');
      }
    }

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
      synced: false,
      syncStatus: 'pending',
      pendingOperation: 'update',
    });

    console.log(`[LocalWorkSession] ⚡ Resumed session ${sessionId}`);

    // محاولة الاستئناف على السيرفر إذا كنا أونلاين
    if (isAppOnline()) {
      try {
        const result = await workSessionService.resumeSession(sessionId);
        if (result.success) {
          await updateSession(sessionId, orgId, {
            synced: true,
            syncStatus: undefined,
            pendingOperation: undefined
          });
        }
      } catch (error) {
        console.log('⚠️ فشل استئناف الجلسة على السيرفر، ستتم المزامنة لاحقاً');
      }
    }

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
 */
export const getActiveOrPausedSession = async (staffId: string, organizationId: string): Promise<LocalWorkSession | null> => {
  try {
    console.log('[LocalWorkSession] 🔍 جلب الجلسة النشطة أو المتوقفة للموظف:', staffId);

    // البحث في القاعدة المحلية أولاً
    let localSessions: LocalWorkSession[] = [];

    if (window.electronAPI?.db) {
      // Electron
      const result = await window.electronAPI.db.query(
        "SELECT * FROM work_sessions WHERE staff_id = ? AND (status = 'active' OR status = 'paused') AND organization_id = ? LIMIT 1",
        [staffId, organizationId]
      );
      localSessions = result.data || [];
      console.log('[LocalWorkSession] 📊 القراءة من Electron SQLite، النتائج:', localSessions.length);
    } else if (isTauriEnv()) {
      // ⚡ استخدام Tauri SQL مباشرة
      console.log('[LocalWorkSession] 🔄 جاري القراءة من Tauri SQLite...');
      const result = await tauriQuery(
        organizationId,
        "SELECT * FROM work_sessions WHERE staff_id = ? AND (status = 'active' OR status = 'paused') AND organization_id = ? LIMIT 1",
        [staffId, organizationId]
      );
      console.log('[LocalWorkSession] 📊 نتيجة الاستعلام من Tauri:', {
        success: result.success,
        count: result.data?.length,
        error: result.error
      });
      localSessions = result.data || [];
    } else {
      // ⚡ استخدام Delta Sync كـ fallback
      console.log('[LocalWorkSession] 📊 القراءة من Delta Sync');
      localSessions = await deltaWriteService.getAll<LocalWorkSession>('work_sessions', organizationId, {
        where: "staff_id = ? AND (status = 'active' OR status = 'paused')",
        params: [staffId],
        limit: 1
      });
    }

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
          const localSession: LocalWorkSession = {
            ...result.session,
            organization_id: organizationId, // ✅ التأكد من وجود organization_id
            pause_count: result.session.pause_count || 0,
            total_pause_duration: result.session.total_pause_duration || 0,
            created_at: now,
            updated_at: now,
            synced: true,
            syncStatus: undefined,
            pendingOperation: undefined,
          };

          if (window.electronAPI?.db) {
            await window.electronAPI.db.upsert('work_sessions', localSession);
          } else if (isTauriEnv()) {
            console.log('[LocalWorkSession] 🔍 قبل الحفظ في Tauri:', {
              sessionId: localSession.id,
              organizationId: localSession.organization_id,
              staffId: localSession.staff_id,
              status: localSession.status,
              synced: localSession.synced,
              syncedType: typeof localSession.synced
            });
            const upsertResult = await tauriUpsert(organizationId, 'work_sessions', localSession);
            console.log('[LocalWorkSession] 📝 نتيجة الحفظ في Tauri:', upsertResult);
          } else {
            await deltaWriteService.saveFromServer('work_sessions', localSession);
          }

          console.log('[LocalWorkSession] ✅ تم حفظ الجلسة من السيرفر:', localSession.id);
          return localSession;
        }
      } catch (error) {
        console.warn('⚠️ فشل جلب الجلسة من السيرفر، استخدام البيانات المحلية:', error instanceof Error ? error.message : error);
      }
    }

    return null;
  } catch (error) {
    console.error('❌ خطأ في getActiveOrPausedSession:', error);
    return null;
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
    const mappedSession: LocalWorkSession = {
      id: session.id,
      organization_id: session.organization_id,
      staff_id: session.staff_id,
      staff_name: session.staff_name,
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
      synced: true,
      syncStatus: undefined,
      pendingOperation: undefined,
    };

    if (window.electronAPI?.db) {
      await window.electronAPI.db.upsert('work_sessions', mappedSession);
    } else if (isTauriEnv()) {
      const orgId = getOrgId();
      await tauriUpsert(orgId, 'work_sessions', mappedSession);
    } else {
      await deltaWriteService.saveFromServer('work_sessions', mappedSession);
    }
  }

  console.log(`[LocalWorkSession] ⚡ Saved ${sessions.length} remote work sessions`);
};
