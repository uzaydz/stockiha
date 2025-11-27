/**
 * ⚡ Staff Sync Service - نظام Delta Sync الموحد
 *
 * تم تبسيط هذا الملف - المزامنة للسيرفر تحدث تلقائياً عبر BatchSender
 * هذا الملف مسؤول عن جلب بيانات الموظفين من Supabase وحفظها محلياً
 */

import { supabase } from '@/lib/supabase-unified';
import { localStaffService } from './localStaffService';
import type { POSStaffSession } from '@/types/staff';

/**
 * ⚡ مزامنة الموظفين المعلقين
 * ملاحظة: BatchSender يتعامل مع هذا تلقائياً
 */
export const syncPendingStaff = async (): Promise<{ success: number; failed: number }> => {
  console.log('[syncPendingStaff] ⚡ Delta Sync - المزامنة تلقائية عبر BatchSender');
  return { success: 0, failed: 0 };
};

/**
 * ⚡ جلب الموظفين من السيرفر وحفظهم محلياً
 */
export const syncStaffFromServer = async (organizationId: string): Promise<number> => {
  try {
    console.log('[syncStaffFromServer] ⚡ جلب الموظفين من السيرفر...');

    // جلب بيانات الموظفين من Supabase باستخدام RPC
    const { data: staffSessions, error: staffError } = await (supabase as any).rpc('get_pos_staff_sessions', {
      p_organization_id: organizationId,
    });

    if (staffError) {
      console.error('[syncStaffFromServer] ❌ خطأ في جلب الموظفين:', staffError);
      throw staffError;
    }

    if (!staffSessions || staffSessions.length === 0) {
      console.log('[syncStaffFromServer] ℹ️ لا يوجد موظفون للمزامنة');
      return 0;
    }

    let savedCount = 0;

    // حفظ كل موظف محلياً
    for (const staff of staffSessions as POSStaffSession[]) {
      try {
        const result = await localStaffService.upsert(staff, organizationId, {
          markSynced: true, // تم جلبه من السيرفر
        });

        if (result.success) {
          savedCount++;
        } else {
          console.error(`[syncStaffFromServer] ❌ فشل حفظ الموظف ${staff.id}:`, result.error);
        }
      } catch (error) {
        console.error(`[syncStaffFromServer] ❌ خطأ في حفظ الموظف ${staff.id}:`, error);
      }
    }

    console.log(`[syncStaffFromServer] ✅ تم حفظ ${savedCount} موظف من أصل ${staffSessions.length}`);
    return savedCount;
  } catch (error) {
    console.error('[syncStaffFromServer] ❌ خطأ في المزامنة:', error);
    return 0;
  }
};

/**
 * ⚡ مزامنة موظف واحد من السيرفر
 */
export const syncSingleStaffFromServer = async (
  staffId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`[syncSingleStaffFromServer] ⚡ جلب الموظف ${staffId}...`);

    // جلب بيانات الموظف
    const { data: staff, error } = await supabase
      .from('pos_staff_sessions')
      .select('*')
      .eq('id', staffId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      console.error('[syncSingleStaffFromServer] ❌ خطأ في جلب الموظف:', error);
      return { success: false, error: error.message };
    }

    if (!staff) {
      return { success: false, error: 'الموظف غير موجود' };
    }

    // حفظ محلياً
    const result = await localStaffService.upsert(staff as POSStaffSession, organizationId, {
      markSynced: true,
    });

    if (result.success) {
      console.log(`[syncSingleStaffFromServer] ✅ تم حفظ الموظف ${staffId}`);
      return { success: true };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error('[syncSingleStaffFromServer] ❌ خطأ:', error);
    return { success: false, error: error.message || 'حدث خطأ غير متوقع' };
  }
};

/**
 * ⚡ مزامنة بيانات الصلاحيات من user_permissions
 */
export const syncStaffPermissionsFromServer = async (organizationId: string): Promise<number> => {
  try {
    console.log('[syncStaffPermissionsFromServer] ⚡ جلب صلاحيات الموظفين...');

    // جلب صلاحيات المستخدمين من جدول user_permissions
    const { data: permissions, error } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('role', 'staff'); // فقط الموظفين

    if (error) {
      console.error('[syncStaffPermissionsFromServer] ❌ خطأ في جلب الصلاحيات:', error);
      throw error;
    }

    if (!permissions || permissions.length === 0) {
      console.log('[syncStaffPermissionsFromServer] ℹ️ لا توجد صلاحيات للمزامنة');
      return 0;
    }

    let updatedCount = 0;

    // تحديث صلاحيات كل موظف
    for (const perm of permissions) {
      try {
        // البحث عن الموظف بواسطة user_id
        const staffList = await localStaffService.getAll(organizationId);
        const staff = staffList.find((s) => s.user_id === perm.user_id);

        if (staff) {
          // تحديث الصلاحيات
          const result = await localStaffService.updatePermissions(
            staff.id,
            perm.permissions || {},
            organizationId
          );

          if (result.success) {
            updatedCount++;
          }
        }
      } catch (error) {
        console.error(`[syncStaffPermissionsFromServer] ❌ خطأ في تحديث صلاحيات ${perm.user_id}:`, error);
      }
    }

    console.log(`[syncStaffPermissionsFromServer] ✅ تم تحديث صلاحيات ${updatedCount} موظف`);
    return updatedCount;
  } catch (error) {
    console.error('[syncStaffPermissionsFromServer] ❌ خطأ:', error);
    return 0;
  }
};

/**
 * ⚡ حفظ موظف تم جلبه من السيرفر (بدون إضافته للـ Outbox)
 * يُستخدم داخلياً بواسطة Delta Sync Engine
 */
export const saveRemoteStaff = async (
  staff: POSStaffSession,
  organizationId: string
): Promise<{ success: boolean; error?: string }> => {
  return await localStaffService.upsert(staff, organizationId, {
    markSynced: true,
  });
};

/**
 * ⚡ مزامنة كاملة للموظفين (جلب من السيرفر + رفع التغييرات)
 */
export const fullStaffSync = async (organizationId: string): Promise<{
  success: boolean;
  downloaded: number;
  uploaded: number;
  error?: string;
}> => {
  try {
    console.log('[fullStaffSync] ⚡ بدء المزامنة الكاملة للموظفين...');

    // 1. جلب من السيرفر
    const downloaded = await syncStaffFromServer(organizationId);

    // 2. جلب الصلاحيات
    const permissionsUpdated = await syncStaffPermissionsFromServer(organizationId);

    console.log(`[fullStaffSync] ✅ تم تنزيل ${downloaded} موظف وتحديث ${permissionsUpdated} صلاحية`);

    // 3. رفع التغييرات المحلية (يتم تلقائياً عبر BatchSender)
    const unsynced = await localStaffService.getUnsynced(organizationId);
    console.log(`[fullStaffSync] 📤 ${unsynced.length} موظف في انتظار الرفع (سيتم عبر BatchSender)`);

    return {
      success: true,
      downloaded: downloaded,
      uploaded: 0, // BatchSender سيتعامل معها
    };
  } catch (error: any) {
    console.error('[fullStaffSync] ❌ خطأ في المزامنة الكاملة:', error);
    return {
      success: false,
      downloaded: 0,
      uploaded: 0,
      error: error.message || 'حدث خطأ غير متوقع',
    };
  }
};

// Aliases للتوافق مع الأسماء المختلفة
export const fetchStaffFromServer = syncStaffFromServer;
export const fetchStaffPermissionsFromServer = syncStaffPermissionsFromServer;
