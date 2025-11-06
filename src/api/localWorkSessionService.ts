import { v4 as uuidv4 } from 'uuid';
import { inventoryDB, type LocalWorkSession } from '@/database/localDb';
import { workSessionService } from '@/services/workSessionService';
import { isAppOnline } from '@/utils/networkStatus';

/**
 * خدمة إدارة جلسات العمل - تدعم الأوفلاين والأونلاين
 */

// جلب الجلسة النشطة (أوفلاين أولاً، ثم أونلاين)
export const getActiveWorkSession = async (staffId: string, organizationId: string): Promise<LocalWorkSession | null> => {
  try {
    // البحث في القاعدة المحلية أولاً
    const localSession = await inventoryDB.workSessions
      .where({ staff_id: staffId, status: 'active' })
      .first();

    if (localSession) {
      return localSession;
    }

    // إذا كنا أونلاين، جلب من السيرفر
    if (isAppOnline()) {
      try {
        const result = await workSessionService.getActiveSession(staffId);
        if (result.success && result.has_active_session && result.session) {
          // حفظ في القاعدة المحلية
          const now = new Date().toISOString();
          const localSession: LocalWorkSession = {
            ...result.session,
            pause_count: result.session.pause_count || 0,
            total_pause_duration: result.session.total_pause_duration || 0,
            created_at: now,
            updated_at: now,
            synced: true,
            syncStatus: undefined,
            pendingOperation: undefined,
          };
          await inventoryDB.workSessions.put(localSession);
          return localSession;
        }
      } catch (error) {
        console.warn('⚠️ فشل جلب الجلسة من السيرفر، استخدام البيانات المحلية:', error instanceof Error ? error.message : error);
        // لا مشكلة، سنستخدم البيانات المحلية
      }
    }

    return null;
  } catch (error) {
    console.error('❌ خطأ في getActiveWorkSession:', error);
    return null;
  }
};

// بدء جلسة جديدة
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

  // حفظ محلياً
  await inventoryDB.workSessions.put(session);

  // محاولة الحفظ على السيرفر إذا كنا أونلاين
  if (isAppOnline()) {
    try {
      const result = await workSessionService.startSession({
        staff_id: staffId,
        opening_cash: openingCash,
        opening_notes: notes,
      });

      const isAlreadyActive = (msg?: string) => {
        if (!msg) return false;
        const m = msg.toLowerCase();
        return m.includes('نشطة بالفعل') || m.includes('active');
      };

      if (result.success && result.session_id) {
        // تحديث الجلسة المحلية بالـ ID من السيرفر
        session.id = result.session_id;
        session.synced = true;
        session.syncStatus = undefined;
        session.pendingOperation = undefined;
        await inventoryDB.workSessions.put(session);
      } else if (!result.success && isAlreadyActive((result as any)?.error)) {
        // اعتبرها متزامنة لأن السيرفر لديه جلسة نشطة بالفعل
        session.synced = true;
        session.syncStatus = undefined;
        session.pendingOperation = undefined;
        (session as any).extra_fields = {
          ...(session as any).extra_fields,
          _sync_resolution: 'server_win_already_active'
        };
        await inventoryDB.workSessions.put(session);
      }
    } catch (error) {
      console.log('⚠️ فشل حفظ الجلسة على السيرفر، ستتم المزامنة لاحقاً');
    }
  }

  return session;
};

// تحديث الجلسة محلياً (عند إضافة طلب)
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
    const session = await inventoryDB.workSessions.get(sessionId);
    if (!session) {
      console.warn('⚠️ الجلسة غير موجودة:', sessionId);
      return;
    }

    const updatedSession: LocalWorkSession = {
      ...session,
      total_sales: updates.total_sales ?? session.total_sales,
      total_orders: updates.total_orders ?? session.total_orders,
      cash_sales: updates.cash_sales ?? session.cash_sales,
      card_sales: updates.card_sales ?? session.card_sales,
      updated_at: new Date().toISOString(),
      synced: false,
      syncStatus: 'pending',
      pendingOperation: 'update',
    };

    await inventoryDB.workSessions.put(updatedSession);
  } catch (error) {
    console.error('❌ خطأ في updateWorkSessionLocally:', error);
  }
};

// إغلاق الجلسة
export const closeWorkSession = async (
  sessionId: string,
  closingCash: number,
  notes?: string
): Promise<{ success: boolean; expected_cash?: number; difference?: number }> => {
  try {
    const session = await inventoryDB.workSessions.get(sessionId);
    if (!session) {
      throw new Error('الجلسة غير موجودة');
    }

    const expectedCash = session.opening_cash + session.cash_sales;
    const difference = closingCash - expectedCash;

    const updatedSession: LocalWorkSession = {
      ...session,
      closing_cash: closingCash,
      expected_cash: expectedCash,
      cash_difference: difference,
      closing_notes: notes || null,
      status: 'closed',
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced: false,
      syncStatus: 'pending',
      pendingOperation: 'update',
    };

    await inventoryDB.workSessions.put(updatedSession);

    // محاولة الإغلاق على السيرفر إذا كنا أونلاين
    if (isAppOnline()) {
      try {
        const result = await workSessionService.closeSession({
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

        if (result.success) {
          updatedSession.synced = true;
          updatedSession.syncStatus = undefined;
          updatedSession.pendingOperation = undefined;
          await inventoryDB.workSessions.put(updatedSession);
        } else if (isAlreadyClosedOrMissing((result as any)?.error)) {
          // اعتبرها مزامنة ناجحة لأن السيرفر يعتبرها مغلقة/غير موجودة
          updatedSession.synced = true;
          updatedSession.syncStatus = undefined;
          updatedSession.pendingOperation = undefined;
          // وسم قرار المزامنة للمراجعة
          (updatedSession as any).extra_fields = {
            ...(updatedSession as any).extra_fields,
            _sync_resolution: 'server_win_already_closed'
          };
          await inventoryDB.workSessions.put(updatedSession);
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

// مزامنة الجلسات المعلقة
export const syncPendingWorkSessions = async (): Promise<void> => {
  if (!isAppOnline()) {
    return;
  }

  try {
    // التحقق من جاهزية القاعدة قبل المزامنة
    const orgId = localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id');
    if (!orgId) {
      return; // لا يوجد org ID بعد، انتظر الجلسة القادمة
    }

    const pendingSessions = await inventoryDB.workSessions
      .filter(session => session.synced === false)
      .toArray();

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
            session.id = result.session_id;
            session.synced = true;
            session.syncStatus = undefined;
            session.pendingOperation = undefined;
            await inventoryDB.workSessions.put(session);
          } else if (!result.success && isAlreadyActive((result as any)?.error)) {
            // السيرفر لديه جلسة نشطة بالفعل - لا تعاود المحاولة
            session.synced = true;
            session.syncStatus = undefined;
            session.pendingOperation = undefined;
            (session as any).extra_fields = {
              ...(session as any).extra_fields,
              _sync_resolution: 'server_win_already_active'
            };
            await inventoryDB.workSessions.put(session);
          } else if (!result.success) {
            // علّم كخطأ لمرة واحدة ولا تعاود بلا نهاية
            session.syncStatus = 'error';
            await inventoryDB.workSessions.put(session);
          }
        } else if (session.pendingOperation === 'update') {
          // مزامنة التحديثات (إحصائيات أو إغلاق)
          if (session.status === 'closed') {
            // مزامنة الإغلاق
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

            if (result.success) {
              session.synced = true;
              session.syncStatus = undefined;
              session.pendingOperation = undefined;
              await inventoryDB.workSessions.put(session);
            } else if (isAlreadyClosedOrMissing((result as any)?.error)) {
              // السيرفر يعتبر الجلسة مغلقة/غير موجودة: نعتبرها محسومة محلياً
              session.synced = true;
              session.syncStatus = undefined;
              session.pendingOperation = undefined;
              (session as any).extra_fields = {
                ...(session as any).extra_fields,
                _sync_resolution: 'server_win_already_closed'
              };
              await inventoryDB.workSessions.put(session);
            }
          } else {
            // مزامنة تحديث الإحصائيات (سيتم عبر trigger في السيرفر)
            // فقط نحدث الحالة المحلية
            session.synced = true;
            session.syncStatus = undefined;
            session.pendingOperation = undefined;
            await inventoryDB.workSessions.put(session);
          }
        }
      } catch (error) {
        console.error('❌ فشل مزامنة الجلسة:', session.id, error);
        session.syncStatus = 'error';
        await inventoryDB.workSessions.put(session);
      }
    }
  } catch (error) {
    console.error('❌ خطأ في syncPendingWorkSessions:', error);
  }
};

// جلب جلسات اليوم
export const getTodayWorkSessions = async (organizationId: string, date?: string): Promise<LocalWorkSession[]> => {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // جلب من القاعدة المحلية
    const localSessions = await inventoryDB.workSessions
      .where('organization_id')
      .equals(organizationId)
      .toArray();

    const todaySessions = localSessions.filter(session => {
      const sessionDate = session.started_at.split('T')[0];
      return sessionDate === targetDate;
    });

    // إذا كنا أونلاين، جلب من السيرفر وتحديث المحلي
    if (isAppOnline()) {
      try {
        const result = await workSessionService.getTodaySessions(targetDate);
        if (result.success && result.sessions) {
          // تحديث القاعدة المحلية
          const now = new Date().toISOString();
          for (const serverSession of result.sessions) {
            const localSession: LocalWorkSession = {
              ...serverSession,
              pause_count: serverSession.pause_count || 0,
              total_pause_duration: serverSession.total_pause_duration || 0,
              created_at: now,
              updated_at: now,
              synced: true,
              syncStatus: undefined,
              pendingOperation: undefined,
            };
            await inventoryDB.workSessions.put(localSession);
          }
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

// إيقاف الجلسة مؤقتاً
export const pauseWorkSession = async (sessionId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const session = await inventoryDB.workSessions.get(sessionId);
    if (!session) {
      throw new Error('الجلسة غير موجودة');
    }

    if (session.status !== 'active') {
      throw new Error('الجلسة غير نشطة');
    }

    const now = new Date().toISOString();
    const updatedSession: LocalWorkSession = {
      ...session,
      status: 'paused',
      paused_at: now,
      pause_count: session.pause_count + 1,
      updated_at: now,
      synced: false,
      syncStatus: 'pending',
      pendingOperation: 'update',
    };

    await inventoryDB.workSessions.put(updatedSession);

    // محاولة الإيقاف على السيرفر إذا كنا أونلاين
    if (isAppOnline()) {
      try {
        const result = await workSessionService.pauseSession(sessionId);
        if (result.success) {
          updatedSession.synced = true;
          updatedSession.syncStatus = undefined;
          updatedSession.pendingOperation = undefined;
          await inventoryDB.workSessions.put(updatedSession);
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

// استئناف الجلسة
export const resumeWorkSession = async (sessionId: string): Promise<{ success: boolean; message?: string; pause_duration?: number }> => {
  try {
    const session = await inventoryDB.workSessions.get(sessionId);
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

    const updatedSession: LocalWorkSession = {
      ...session,
      status: 'active',
      resumed_at: now,
      total_pause_duration: session.total_pause_duration + pauseDuration,
      updated_at: now,
      synced: false,
      syncStatus: 'pending',
      pendingOperation: 'update',
    };

    await inventoryDB.workSessions.put(updatedSession);

    // محاولة الاستئناف على السيرفر إذا كنا أونلاين
    if (isAppOnline()) {
      try {
        const result = await workSessionService.resumeSession(sessionId);
        if (result.success) {
          updatedSession.synced = true;
          updatedSession.syncStatus = undefined;
          updatedSession.pendingOperation = undefined;
          await inventoryDB.workSessions.put(updatedSession);
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

// جلب الجلسة النشطة أو المتوقفة
export const getActiveOrPausedSession = async (staffId: string, organizationId: string): Promise<LocalWorkSession | null> => {
  try {
    // البحث في القاعدة المحلية أولاً
    const localSession = await inventoryDB.workSessions
      .where('staff_id')
      .equals(staffId)
      .filter(s => s.status === 'active' || s.status === 'paused')
      .first();

    if (localSession) {
      return localSession;
    }

    // إذا كنا أونلاين، جلب من السيرفر
    if (isAppOnline()) {
      try {
        const result = await workSessionService.getActiveOrPausedSession(staffId);
        if (result.success && result.has_session && result.session) {
          // حفظ في القاعدة المحلية
          const now = new Date().toISOString();
          const localSession: LocalWorkSession = {
            ...result.session,
            pause_count: result.session.pause_count || 0,
            total_pause_duration: result.session.total_pause_duration || 0,
            created_at: now,
            updated_at: now,
            synced: true,
            syncStatus: undefined,
            pendingOperation: undefined,
          };
          await inventoryDB.workSessions.put(localSession);
          return localSession;
        }
      } catch (error) {
        console.warn('⚠️ فشل جلب الجلسة من السيرفر، استخدام البيانات المحلية:', error instanceof Error ? error.message : error);
        // لا مشكلة، سنستخدم البيانات المحلية
      }
    }

    return null;
  } catch (error) {
    console.error('❌ خطأ في getActiveOrPausedSession:', error);
    return null;
  }
};
