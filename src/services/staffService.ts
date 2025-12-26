import { supabase } from '@/lib/supabase';
import type {
  POSStaffSession,
  SaveStaffSessionInput,
  SaveStaffSessionResponse,
  UpdatePinResponse,
  DeleteStaffResponse,
  VerifyStaffLoginResponse,
  CreateStaffWithAuthInput,
} from '@/types/staff';
import { localStaffService } from '@/api/localStaffService';
import { isAppOnline } from '@/utils/networkStatus';

// Re-export types for convenience
export type { POSStaffSession, SaveStaffSessionInput, SaveStaffSessionResponse, UpdatePinResponse, DeleteStaffResponse };

/**
 * خدمات إدارة موظفي نقطة البيع
 * ⚡ تدعم الآن العمل الأوفلاين مع Delta Sync
 */
export const staffService = {
  /**
   * جلب جميع الموظفين
   * ⚡ يدعم الأوفلاين: يجلب من SQLite مباشرة إذا كنا أوفلاين
   */
  async getAll(organizationId?: string): Promise<POSStaffSession[]> {
    // ⚡ فحص حالة الاتصال - استخدام navigator.onLine مباشرة (أكثر موثوقية)
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const isNetworkOffline = isOffline || !isAppOnline();

    // ⚡ محاولة الحصول على organizationId من مصادر بديلة إذا لم يتم تمريره
    let effectiveOrgId = organizationId;
    if (!effectiveOrgId) {
      // محاولة من window globals
      effectiveOrgId = (window as any).__CURRENT_ORG_ID__ ||
                       (window as any).__AUTH_CONTEXT_ORG__?.id ||
                       (window as any).__TENANT_CONTEXT_ORG__?.id;

      // محاولة من localStorage
      if (!effectiveOrgId) {
        try {
          const authSnapshot = localStorage.getItem('bazaar_auth_offline_snapshot');
          if (authSnapshot) {
            const parsed = JSON.parse(authSnapshot);
            effectiveOrgId = parsed.organizationId || parsed.organization_id;
          }
        } catch (e) {
          // تجاهل الأخطاء
        }
      }
    }

    console.log('[staffService] 🔄 getAll called:', {
      organizationId: organizationId || '(undefined)',
      effectiveOrgId: effectiveOrgId || '(undefined)',
      'navigator.onLine': typeof navigator !== 'undefined' ? navigator.onLine : 'N/A',
      isOffline,
      isNetworkOffline
    });

    // إذا كنا أوفلاين ولا يوجد organizationId، نرجع مصفوفة فارغة
    if (isNetworkOffline && !effectiveOrgId) {
      console.log('[staffService] 📴 Offline mode بدون organizationId - إرجاع مصفوفة فارغة');
      return [];
    }

    // إذا كنا أوفلاين مع organizationId، نجلب من SQLite مباشرة
    if (isNetworkOffline && effectiveOrgId) {
      console.log('[staffService] 📴 Offline mode - جلب الموظفين من SQLite مباشرة');
      try {
        const localStaff = await localStaffService.getAll(effectiveOrgId);
        console.log(`[staffService] ✅ تم جلب ${localStaff.length} موظف من SQLite (offline)`);
        return localStaff;
      } catch (localError) {
        console.error('[staffService] ❌ فشل الجلب من SQLite:', localError);
        return [];
      }
    }

    try {
      // ⚡ Offline-First: الجلب من PowerSync أولاً
      if (effectiveOrgId) {
        try {
          const localStaff = await localStaffService.getAll(effectiveOrgId);
          console.log(`[staffService] ✅ تم جلب ${localStaff.length} موظف من PowerSync (Offline-First)`);

          // ⚡ PowerSync يجلب البيانات من السيرفر تلقائياً عبر sync-rules
          // لا حاجة لجلب البيانات يدوياً من السيرفر - هذا يسبب uploads غير ضرورية!

          return localStaff;
        } catch (localError) {
          console.error('[staffService] ❌ فشل الجلب من PowerSync:', localError);
        }
      }

      // Fallback: محاولة الجلب من السيرفر مباشرة (إذا فشل PowerSync)
      if (!isNetworkOffline && isAppOnline() && effectiveOrgId) {
        try {
          const { data, error } = await (supabase as any).rpc('get_pos_staff_sessions', {
            p_organization_id: effectiveOrgId,
          });

          if (!error && data) {
            // ⚡ إرجاع البيانات مباشرة بدون upsert
            // PowerSync سيجلب البيانات تلقائياً عبر sync-rules
            console.log(`[staffService] ✅ تم جلب ${data.length} موظف من السيرفر (Fallback)`);
            return (data || []) as POSStaffSession[];
          }
        } catch (serverError) {
          console.warn('[staffService] ⚠️ فشل الجلب من السيرفر:', serverError);
        }
      }

      // إرجاع مصفوفة فارغة
      return [];
    } catch (error) {
      console.error('[staffService] ❌ خطأ في getAll:', error);
      return [];
    }
  },

  /**
   * حفظ أو تعديل موظف
   * ⚡ يدعم الأوفلاين: يحفظ محلياً ويضيف للـ Outbox
   */
  async save(input: SaveStaffSessionInput, organizationId?: string): Promise<SaveStaffSessionResponse> {
    try {
      // التحقق من البيانات قبل الإرسال
      const pinCode = input.pin_code && input.pin_code.toString().trim() !== '' ? input.pin_code.toString() : null;

      console.log('🔍 [staffService] إرسال البيانات:', {
        p_id: input.id || null,
        p_staff_name: input.staff_name,
        p_pin_code: pinCode,
        p_permissions: input.permissions,
        p_is_active: input.is_active,
      });

      // ⚡ Offline-First: الحفظ محلياً أولاً
      if (organizationId) {
        // تحويل SaveStaffSessionInput إلى POSStaffSession
        const staffData: POSStaffSession = {
          id: input.id || crypto.randomUUID(),
          staff_name: input.staff_name,
          permissions: input.permissions,
          is_active: input.is_active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          has_pin: !!pinCode,
        };

        // حفظ محلياً
        const localResult = await localStaffService.upsert(staffData, organizationId);

        // حفظ PIN إذا وُجد
        if (pinCode && localResult.success) {
          await localStaffService.savePin(staffData.id, pinCode, organizationId);
        }

        if (localResult.success) {
          // محاولة المزامنة مع السيرفر في الخلفية (إذا كان متصلاً)
          if (isAppOnline() && !isNetworkOffline) {
            try {
              const { data, error } = await (supabase as any).rpc('save_pos_staff_session', {
                p_id: input.id || null,
                p_staff_name: input.staff_name,
                p_pin_code: pinCode,
                p_permissions: input.permissions as any,
                p_is_active: input.is_active,
              });

              if (!error && data) {
                console.log('[staffService] ✅ تمت المزامنة مع السيرفر');
                return data as SaveStaffSessionResponse;
              }
            } catch (syncError) {
              console.warn('[staffService] ⚠️ فشل المزامنة مع السيرفر:', syncError);
            }
          }

          return {
            success: true,
            action: input.id ? 'updated' : 'created',
            staff_id: staffData.id,
            message: 'تم الحفظ محلياً - سيتم المزامنة لاحقاً',
          };
        } else {
          return {
            success: false,
            error: localResult.error || 'فشل الحفظ المحلي',
          };
        }
      }

      // Fallback: محاولة الحفظ على السيرفر مباشرة (إذا لم يكن هناك organizationId)
      const { data, error } = await (supabase as any).rpc('save_pos_staff_session', {
        p_id: input.id || null,
        p_staff_name: input.staff_name,
        p_pin_code: pinCode,
        p_permissions: input.permissions as any,
        p_is_active: input.is_active,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as SaveStaffSessionResponse;
    } catch (error) {
      console.error('[staffService] ❌ خطأ في save:', error);

      // Last fallback: محاولة الحفظ محلياً
      if (organizationId) {
        try {
          console.log('[staffService] 🔄 محاولة أخيرة: الحفظ محلياً');

          const pinCode = input.pin_code && input.pin_code.toString().trim() !== '' ? input.pin_code.toString() : null;

          const staffData: POSStaffSession = {
            id: input.id || crypto.randomUUID(),
            staff_name: input.staff_name,
            permissions: input.permissions,
            is_active: input.is_active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            has_pin: !!pinCode,
          };

          const localResult = await localStaffService.upsert(staffData, organizationId);

          if (pinCode && localResult.success) {
            await localStaffService.savePin(staffData.id, pinCode, organizationId);
          }

          if (localResult.success) {
            console.log('[staffService] ✅ تم الحفظ محلياً بنجاح');
            return {
              success: true,
              action: input.id ? 'updated' : 'created',
              staff_id: staffData.id,
              message: 'تم الحفظ محلياً - سيتم المزامنة لاحقاً',
            };
          }
        } catch (localError) {
          console.error('[staffService] ❌ فشل الحفظ المحلي:', localError);
        }
      }

      throw error;
    }
  },

  /**
   * تحديث كود PIN
   * ⚡ Offline-First: يحفظ محلياً أولاً
   */
  async updatePin(staffId: string, newPin: string, organizationId?: string): Promise<UpdatePinResponse> {
    try {
      // ⚡ الحصول على organizationId إذا لم يُمرر
      let effectiveOrgId = organizationId;
      if (!effectiveOrgId) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: currentUser } = await supabase
              .from('users')
              .select('organization_id')
              .eq('auth_user_id', user.id)
              .maybeSingle();
            effectiveOrgId = currentUser?.organization_id;
          }
        } catch {}
      }

      // ⚡ Offline-First: حفظ PIN محلياً أولاً
      if (effectiveOrgId) {
        const result = await localStaffService.savePin(staffId, newPin.toString(), effectiveOrgId);
        
        if (result.success) {
          // محاولة المزامنة مع السيرفر في الخلفية (إذا كان متصلاً)
          if (isAppOnline() && !isNetworkOffline) {
            try {
              const { data, error } = await (supabase as any).rpc('update_staff_pin', {
                p_staff_id: staffId,
                p_new_pin: newPin.toString(),
              });

              if (!error && data) {
                console.log('[staffService] ✅ تمت مزامنة PIN مع السيرفر');
                return data as UpdatePinResponse;
              }
            } catch (syncError) {
              console.warn('[staffService] ⚠️ فشل مزامنة PIN مع السيرفر:', syncError);
            }
          }

          return {
            success: true,
            message: 'تم تحديث PIN محلياً - سيتم المزامنة لاحقاً',
          } as UpdatePinResponse;
        } else {
          throw new Error(result.error || 'فشل تحديث PIN محلياً');
        }
      }

      // Fallback: محاولة التحديث على السيرفر مباشرة
      const { data, error } = await (supabase as any).rpc('update_staff_pin', {
        p_staff_id: staffId,
        p_new_pin: newPin.toString(),
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as UpdatePinResponse;
    } catch (error) {
      console.error('Error in updatePin:', error);
      throw error;
    }
  },

  /**
   * حذف موظف
   * ⚡ يدعم الأوفلاين: يحذف محلياً ويضيف للـ Outbox
   */
  async delete(staffId: string, organizationId?: string): Promise<DeleteStaffResponse> {
    try {
      // ⚡ Offline-First: الحذف محلياً أولاً
      if (organizationId) {
        const result = await localStaffService.delete(staffId, organizationId);

        if (result.success) {
          // محاولة المزامنة مع السيرفر في الخلفية (إذا كان متصلاً)
          if (isAppOnline() && !isNetworkOffline) {
            try {
              const { data, error } = await (supabase as any).rpc('delete_pos_staff_session', {
                p_staff_id: staffId,
              });

              if (!error && data) {
                console.log('[staffService] ✅ تمت المزامنة مع السيرفر');
                return data as DeleteStaffResponse;
              }
            } catch (syncError) {
              console.warn('[staffService] ⚠️ فشل المزامنة مع السيرفر:', syncError);
            }
          }

          return {
            success: true,
            message: 'تم الحذف محلياً - سيتم المزامنة لاحقاً',
          };
        } else {
          return {
            success: false,
            error: result.error || 'فشل الحذف المحلي',
          };
        }
      }

      // Fallback: محاولة الحذف من السيرفر مباشرة
      const { data, error } = await (supabase as any).rpc('delete_pos_staff_session', {
        p_staff_id: staffId,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as DeleteStaffResponse;
    } catch (error) {
      console.error('[staffService] ❌ خطأ في delete:', error);

      // Last fallback: محاولة الحذف محلياً
      if (organizationId) {
        try {
          console.log('[staffService] 🔄 محاولة أخيرة: الحذف محلياً');
          const result = await localStaffService.delete(staffId, organizationId);

          if (result.success) {
            console.log('[staffService] ✅ تم الحذف محلياً بنجاح');
            return {
              success: true,
              message: 'تم الحذف محلياً - سيتم المزامنة لاحقاً',
            };
          }
        } catch (localError) {
          console.error('[staffService] ❌ فشل الحذف المحلي:', localError);
        }
      }

      throw error;
    }
  },

  /**
   * تبديل حالة التفعيل
   * ⚡ Offline-First: يحفظ محلياً أولاً
   */
  async toggleActive(staffId: string, isActive: boolean, organizationId?: string): Promise<SaveStaffSessionResponse> {
    try {
      // ⚡ Offline-First: التحديث محلياً أولاً
      if (organizationId) {
        const result = await localStaffService.toggleActive(staffId, isActive, organizationId);

        if (result.success) {
          // محاولة المزامنة مع السيرفر في الخلفية (إذا كان متصلاً)
          if (isAppOnline() && !isNetworkOffline) {
            try {
              const { data, error } = await (supabase as any).rpc('save_pos_staff_session', {
                p_id: staffId,
                p_staff_name: null,
                p_pin_code: null,
                p_permissions: null,
                p_is_active: isActive,
              });

              if (!error && data) {
                console.log('[staffService] ✅ تمت مزامنة toggleActive مع السيرفر');
                return data as SaveStaffSessionResponse;
              }
            } catch (syncError) {
              console.warn('[staffService] ⚠️ فشل المزامنة مع السيرفر:', syncError);
            }
          }

          return {
            success: true,
            action: 'updated',
            staff_id: staffId,
            message: 'تم التحديث محلياً - سيتم المزامنة لاحقاً',
          } as SaveStaffSessionResponse;
        } else {
          throw new Error(result.error || 'فشل التحديث المحلي');
        }
      }

      // Fallback: محاولة التحديث على السيرفر مباشرة
      const { data, error } = await (supabase as any).rpc('save_pos_staff_session', {
        p_id: staffId,
        p_staff_name: null,
        p_pin_code: null,
        p_permissions: null,
        p_is_active: isActive,
      });

      if (error) {
        console.warn('[staffService] ⚠️ خطأ في تبديل حالة التفعيل من السيرفر، التحديث محلياً:', error);

        // Fallback: التحديث محلياً
        if (organizationId) {
          console.log('[staffService] 📱 تبديل الحالة محلياً (Offline Mode)');
          const result = await localStaffService.toggleActive(staffId, isActive, organizationId);

          if (result.success) {
            return {
              success: true,
              action: 'updated',
              staff_id: staffId,
              message: 'تم تحديث الحالة محلياً - سيتم المزامنة لاحقاً',
            };
          } else {
            return {
              success: false,
              error: result.error || 'فشل تحديث الحالة محلياً',
            };
          }
        }

        throw new Error(error.message);
      }

      // ⚡ تحديث النسخة المحلية عند النجاح
      if (organizationId) {
        try {
          await localStaffService.toggleActive(staffId, isActive, organizationId);
          console.log('[staffService] 💾 تم تحديث الحالة محلياً أيضاً');
        } catch (localError) {
          console.warn('[staffService] ⚠️ فشل تحديث الحالة محلياً:', localError);
        }
      }

      return data as SaveStaffSessionResponse;
    } catch (error) {
      console.error('[staffService] ❌ خطأ في toggleActive:', error);

      // Last fallback: محاولة التحديث محلياً
      if (organizationId) {
        try {
          console.log('[staffService] 🔄 محاولة أخيرة: التحديث محلياً');
          const result = await localStaffService.toggleActive(staffId, isActive, organizationId);

          if (result.success) {
            console.log('[staffService] ✅ تم تحديث الحالة محلياً بنجاح');
            return {
              success: true,
              action: 'updated',
              staff_id: staffId,
              message: 'تم تحديث الحالة محلياً - سيتم المزامنة لاحقاً',
            };
          }
        } catch (localError) {
          console.error('[staffService] ❌ فشل التحديث المحلي:', localError);
        }
      }

      throw error;
    }
  },

  /**
   * التحقق من كود PIN وتسجيل دخول الموظف (قديم - للموظفين بدون إيميل)
   * ⚡ Offline-First: يتحقق من PIN محلياً أولاً
   * 🔧 تم تحسين الـ logging للتشخيص
   */
  async verifyPin(pinCode: string, organizationId?: string): Promise<{ success: boolean; staff?: POSStaffSession; error?: string }> {
    try {
      console.log('%c[staffService] 🔐 ═══ بدء التحقق من PIN ═══', 'color: #673AB7; font-weight: bold');
      console.log('[staffService] 🔑 PIN length:', pinCode?.length || 0);
      console.log('[staffService] 🌐 navigator.onLine:', navigator.onLine);

      // ⚡ الحصول على organizationId إذا لم يُمرر
      let effectiveOrgId = organizationId;
      if (!effectiveOrgId) {
        try {
          effectiveOrgId = (window as any).__CURRENT_ORG_ID__ ||
                           (window as any).__AUTH_CONTEXT_ORG__?.id ||
                           (window as any).__TENANT_CONTEXT_ORG__?.id;

          if (!effectiveOrgId) {
            const authSnapshot = localStorage.getItem('bazaar_auth_offline_snapshot');
            if (authSnapshot) {
              const parsed = JSON.parse(authSnapshot);
              effectiveOrgId = parsed.organizationId || parsed.organization_id;
            }
          }
        } catch {}
      }

      console.log('[staffService] 🏢 Organization ID:', effectiveOrgId || '(غير متوفر)');

      // ⚡ Offline-First: التحقق محلياً أولاً
      if (effectiveOrgId) {
        console.log('[staffService] 📱 محاولة التحقق محلياً (Offline-First)...');
        const result = await localStaffService.verifyPin(pinCode, effectiveOrgId);

        console.log('[staffService] 📊 نتيجة التحقق المحلي:', {
          success: result.success,
          hasStaff: !!result.staff,
          error: result.error,
        });

        if (result.success && result.staff) {
          console.log('%c[staffService] ✅ تم التحقق محلياً بنجاح!', 'color: #4CAF50; font-weight: bold');
          console.log('[staffService] 👤 الموظف:', result.staff.staff_name);

          // محاولة التحقق من السيرفر في الخلفية (للتحقق من صحة PIN)
          // 🔧 FIX: إزالة isNetworkOffline لأنها غير معرفة - isAppOnline() تتحقق من الشبكة بالفعل
          if (isAppOnline() && navigator.onLine) {
            console.log('[staffService] 🌐 محاولة التحقق من السيرفر (في الخلفية)...');
            try {
              const { data, error } = await (supabase as any).rpc('verify_staff_pin', {
                p_pin_code: pinCode.toString(),
              });

              if (!error && data && data.success) {
                console.log('[staffService] ✅ تم التحقق من PIN على السيرفر');
                // تحديث البيانات المحلية إذا كانت مختلفة
                if (data.staff) {
                  await localStaffService.upsert(data.staff, effectiveOrgId);
                }
                return data as { success: boolean; staff?: POSStaffSession; error?: string };
              }
            } catch (syncError) {
              console.warn('[staffService] ⚠️ فشل التحقق من السيرفر (سيستخدم النتيجة المحلية):', syncError);
            }
          }

          return {
            success: true,
            staff: result.staff,
          };
        } else {
          console.log('%c[staffService] ❌ فشل التحقق المحلي', 'color: #f44336; font-weight: bold');
          console.log('[staffService] 📋 سبب الفشل:', result.error);
          return {
            success: false,
            error: result.error || 'كود PIN غير صحيح',
          };
        }
      }

      // Fallback: محاولة التحقق من السيرفر مباشرة
      console.log('[staffService] 🌐 محاولة التحقق من السيرفر مباشرة (لا يوجد organizationId)...');
      const { data, error } = await (supabase as any).rpc('verify_staff_pin', {
        p_pin_code: pinCode.toString(),
      });

      if (error) {
        console.error('[staffService] ❌ خطأ من السيرفر:', error);
        throw new Error(error.message);
      }

      console.log('[staffService] 📊 نتيجة السيرفر:', data);
      return data as { success: boolean; staff?: POSStaffSession; error?: string };
    } catch (error) {
      console.error('[staffService] ❌ خطأ في verifyPin:', error);
      throw error;
    }
  },

  /**
   * إنشاء موظف جديد مع حساب Supabase Auth
   */
  async createStaffWithAuth(input: CreateStaffWithAuthInput): Promise<SaveStaffSessionResponse> {
    try {
      console.log('🔑 [staffService] إنشاء موظف مع حساب Auth:', input.email);

      // 1. الحصول على organization_id للمستخدم الحالي (المدير) قبل إنشاء حساب Auth
      const { data: { user: currentAuthUser } } = await supabase.auth.getUser();
      
      if (!currentAuthUser) {
        console.error('❌ [staffService] لا يوجد مستخدم مسجل دخول');
        return {
          success: false,
          error: 'يجب تسجيل الدخول أولاً',
        };
      }

      const { data: currentUser, error: currentUserError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('auth_user_id', currentAuthUser.id)
        .maybeSingle();

      if (currentUserError || !currentUser?.organization_id) {
        console.error('❌ [staffService] فشل الحصول على organization_id:', currentUserError);
        return {
          success: false,
          error: 'فشل الحصول على معلومات المؤسسة',
        };
      }

      const organizationId = currentUser.organization_id;
      console.log('✅ [staffService] organization_id:', organizationId);

      // حفظ الجلسة الحالية (المدير) قبل إنشاء حساب Auth
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      // 2. إنشاء حساب Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            name: input.staff_name,
            role: 'staff',
          },
        },
      });

      if (authError) {
        console.error('❌ [staffService] خطأ في إنشاء حساب Auth:', authError);
        return {
          success: false,
          error: `فشل إنشاء حساب Auth: ${authError.message}`,
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'فشل إنشاء حساب Auth',
        };
      }

      const authUserId = authData.user.id;
      console.log('✅ [staffService] تم إنشاء حساب Auth:', authUserId);

      // 3. إنشاء سجل في جدول users (مع الصلاحيات)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          email: input.email,
          name: input.staff_name,
          role: 'staff',
          auth_user_id: authUserId,
          organization_id: organizationId, // ✅ استخدام organization_id من المدير
          is_active: input.is_active,
          permissions: input.permissions as any, // ✅ إضافة الصلاحيات
        })
        .select('id, organization_id')
        .single();

      if (userError) {
        console.error('❌ [staffService] خطأ في إنشاء user:', userError);
        // ملاحظة: لا يمكن حذف حساب Auth من Frontend (يحتاج Service Role)
        // يجب حذفه يدوياً من Supabase Dashboard أو عبر Edge Function
        return {
          success: false,
          error: `فشل إنشاء سجل المستخدم: ${userError.message}`,
        };
      }

      console.log('✅ [staffService] تم إنشاء user:', userData.id);

      // 4. إنشاء سجل في pos_staff_sessions باستخدام RPC function
      // (لأن RLS يمنع الموظف الجديد من الكتابة مباشرة)
      const { data: staffResult, error: staffError } = await (supabase as any).rpc(
        'create_staff_session_for_user',
        {
          p_user_id: userData.id,
          p_staff_name: input.staff_name,
          p_pin_code: input.pin_code,
          p_permissions: input.permissions,
          p_is_active: input.is_active,
        }
      );

      const staffData = staffResult ? { id: staffResult.staff_id } : null;

      if (staffError || !staffData) {
        console.error('❌ [staffService] خطأ في إنشاء staff:', staffError);
        // حذف user إذا فشل إنشاء staff
        await supabase.from('users').delete().eq('id', userData.id);
        // ملاحظة: لا يمكن حذف Auth user من Frontend
        return {
          success: false,
          error: `فشل إنشاء سجل الموظف: ${staffError?.message || 'خطأ غير معروف'}`,
        };
      }

      console.log('✅ [staffService] تم إنشاء staff بنجاح:', staffData.id);

      // حفظ PIN للأوفلاين عند الإنشاء الأولي
      try {
        if (input.pin_code && userData.organization_id) {
          const { saveStaffPinOffline } = await import('@/lib/offline/staffCredentials');
          await saveStaffPinOffline({
            staffId: staffData.id,
            organizationId: userData.organization_id,
            staffName: input.staff_name,
            pin: input.pin_code,
            permissions: input.permissions,
            isActive: input.is_active,
          });
        }
      } catch {}

      // استعادة جلسة المدير (لمنع تسجيل دخول الموظف الجديد تلقائياً)
      if (currentSession) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
        console.log('✅ [staffService] تم استعادة جلسة المدير');
      }

      return {
        success: true,
        action: 'created',
        staff_id: staffData.id,
        user_id: userData.id,
        auth_user_id: authUserId,
        message: 'تم إنشاء الموظف بنجاح',
      };
    } catch (error) {
      console.error('❌ [staffService] خطأ في createStaffWithAuth:', error);
      throw error;
    }
  },

  /**
   * تسجيل دخول الموظف (إيميل + كلمة سر + PIN)
   */
  async verifyStaffLogin(pinCode: string): Promise<VerifyStaffLoginResponse> {
    try {
      const { data, error } = await (supabase as any).rpc('verify_staff_login', {
        p_pin_code: pinCode.toString(),
      });

      if (error) {
        console.error('Error verifying staff login:', error);
        throw new Error(error.message);
      }

      return data as VerifyStaffLoginResponse;
    } catch (error) {
      console.error('Error in verifyStaffLogin:', error);
      throw error;
    }
  },

  /**
   * تسجيل دخول بالإيميل وكلمة السر
   */
  async signInWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Error signing in with email:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Error in signInWithEmail:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ أثناء تسجيل الدخول',
      };
    }
  },
};
