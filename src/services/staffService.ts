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

// Re-export types for convenience
export type { POSStaffSession, SaveStaffSessionInput, SaveStaffSessionResponse, UpdatePinResponse, DeleteStaffResponse };

/**
 * خدمات إدارة موظفي نقطة البيع
 * ⚡ تدعم الآن العمل الأوفلاين مع Delta Sync
 */
export const staffService = {
  /**
   * جلب جميع الموظفين
   * ⚡ يدعم الأوفلاين: يجلب من SQLite إذا فشل الاتصال
   */
  async getAll(organizationId?: string): Promise<POSStaffSession[]> {
    try {
      // محاولة الجلب من السيرفر أولاً
      const { data, error } = await (supabase as any).rpc('get_pos_staff_sessions', {
        p_organization_id: organizationId || null,
      });

      if (error) {
        console.warn('[staffService] ⚠️ خطأ في جلب الموظفين من السيرفر، محاولة الجلب محلياً:', error);

        // Fallback: الجلب من SQLite
        if (organizationId) {
          console.log('[staffService] 📱 استخدام البيانات المحلية (Offline Mode)');
          const localStaff = await localStaffService.getAll(organizationId);
          return localStaff;
        }

        throw new Error(error.message);
      }

      return (data || []) as POSStaffSession[];
    } catch (error) {
      console.error('[staffService] ❌ خطأ في getAll:', error);

      // Last fallback: محاولة الجلب محلياً
      if (organizationId) {
        try {
          console.log('[staffService] 🔄 محاولة أخيرة: الجلب من SQLite');
          const localStaff = await localStaffService.getAll(organizationId);
          if (localStaff.length > 0) {
            console.log(`[staffService] ✅ تم جلب ${localStaff.length} موظف من SQLite`);
            return localStaff;
          }
        } catch (localError) {
          console.error('[staffService] ❌ فشل الجلب من SQLite:', localError);
        }
      }

      throw error;
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

      // محاولة الحفظ على السيرفر أولاً
      const { data, error } = await (supabase as any).rpc('save_pos_staff_session', {
        p_id: input.id || null,
        p_staff_name: input.staff_name,
        p_pin_code: pinCode,
        p_permissions: input.permissions as any,
        p_is_active: input.is_active,
      });

      if (error) {
        console.warn('[staffService] ⚠️ خطأ في حفظ الموظف على السيرفر، الحفظ محلياً:', error);

        // Fallback: الحفظ محلياً
        if (organizationId) {
          console.log('[staffService] 📱 حفظ محلي (Offline Mode)');

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
   */
  async updatePin(staffId: string, newPin: string): Promise<UpdatePinResponse> {
    try {
      const { data, error } = await (supabase as any).rpc('update_staff_pin', {
        p_staff_id: staffId,
        p_new_pin: newPin.toString(),
      });

      if (error) {
        console.error('Error updating staff PIN:', error);
        throw new Error(error.message);
      }

      // تحديث نسخة الأوفلاين إذا توفرت organization_id للمستخدم الحالي
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: currentUser } = await supabase
            .from('users')
            .select('organization_id')
            .eq('auth_user_id', user.id)
            .maybeSingle();
          if (currentUser?.organization_id) {
            const { updateStaffPinOffline } = await import('@/lib/offline/staffCredentials');
            await updateStaffPinOffline({
              staffId,
              organizationId: currentUser.organization_id,
              newPin: newPin.toString()
            });
          }
        }
      } catch {}

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
      // محاولة الحذف من السيرفر أولاً
      const { data, error } = await (supabase as any).rpc('delete_pos_staff_session', {
        p_staff_id: staffId,
      });

      if (error) {
        console.warn('[staffService] ⚠️ خطأ في حذف الموظف من السيرفر، الحذف محلياً:', error);

        // Fallback: الحذف محلياً
        if (organizationId) {
          console.log('[staffService] 📱 حذف محلي (Offline Mode)');
          const result = await localStaffService.delete(staffId, organizationId);

          if (result.success) {
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
   */
  async toggleActive(staffId: string, isActive: boolean): Promise<SaveStaffSessionResponse> {
    try {
      const { data, error } = await (supabase as any).rpc('save_pos_staff_session', {
        p_id: staffId,
        p_staff_name: null,
        p_pin_code: null,
        p_permissions: null,
        p_is_active: isActive,
      });

      if (error) {
        console.error('Error toggling staff active status:', error);
        throw new Error(error.message);
      }

      return data as SaveStaffSessionResponse;
    } catch (error) {
      console.error('Error in toggleActive:', error);
      throw error;
    }
  },

  /**
   * التحقق من كود PIN وتسجيل دخول الموظف (قديم - للموظفين بدون إيميل)
   * ⚡ يدعم الأوفلاين: يتحقق من PIN محلياً
   */
  async verifyPin(pinCode: string, organizationId?: string): Promise<{ success: boolean; staff?: POSStaffSession; error?: string }> {
    try {
      // محاولة التحقق من السيرفر أولاً
      const { data, error } = await (supabase as any).rpc('verify_staff_pin', {
        p_pin_code: pinCode.toString(),
      });

      if (error) {
        console.warn('[staffService] ⚠️ خطأ في التحقق من PIN من السيرفر، التحقق محلياً:', error);

        // Fallback: التحقق محلياً
        if (organizationId) {
          console.log('[staffService] 📱 التحقق من PIN محلياً (Offline Mode)');
          const result = await localStaffService.verifyPin(pinCode, organizationId);

          if (result.success && result.staff) {
            return {
              success: true,
              staff: result.staff,
            };
          } else {
            return {
              success: false,
              error: result.error || 'كود PIN غير صحيح',
            };
          }
        }

        throw new Error(error.message);
      }

      return data as { success: boolean; staff?: POSStaffSession; error?: string };
    } catch (error) {
      console.error('[staffService] ❌ خطأ في verifyPin:', error);

      // Last fallback: محاولة التحقق محلياً
      if (organizationId) {
        try {
          console.log('[staffService] 🔄 محاولة أخيرة: التحقق من PIN محلياً');
          const result = await localStaffService.verifyPin(pinCode, organizationId);

          if (result.success && result.staff) {
            console.log('[staffService] ✅ تم التحقق من PIN محلياً بنجاح');
            return {
              success: true,
              staff: result.staff,
            };
          } else {
            return {
              success: false,
              error: result.error || 'كود PIN غير صحيح',
            };
          }
        } catch (localError) {
          console.error('[staffService] ❌ فشل التحقق المحلي:', localError);
        }
      }

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
            permissions: input.permissions
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
