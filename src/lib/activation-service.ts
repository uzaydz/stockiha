import { supabase } from './supabase';
import { generateActivationCode, generateMultipleActivationCodes, isValidActivationCodeFormat } from './code-generator';
import { subscriptionCache } from './subscription-cache';
import { rateLimiter } from './security/rateLimiter';
import { subscriptionAudit } from './security/subscriptionAudit';
import {
  ActivationCode,
  ActivationCodeBatch,
  ActivationCodeStatus,
  CreateActivationCodeBatchDto,
  CreateActivationCodeDto,
  UpdateActivationCodeDto,
  ActivateSubscriptionDto,
  ActivateSubscriptionResult,
  CourseAccess,
  CoursesAccessType
} from '@/types/activation';

/**
 * خدمة للتعامل مع أكواد التفعيل
 */
export const ActivationService = {
  /**
   * إنشاء كود تفعيل جديد
   * @param data بيانات كود التفعيل الجديد
   * @returns الكود الجديد أو خطأ
   */
  async createActivationCode(data: CreateActivationCodeDto): Promise<ActivationCode> {
    try {
      // توليد كود تفعيل عشوائي
      const code = generateActivationCode();
      
      // إضافة الكود إلى قاعدة البيانات
      const { data: newCode, error } = await supabase
        .from('activation_codes')
        .insert({
          code,
          plan_id: data.plan_id,
          status: ActivationCodeStatus.ACTIVE,
          billing_cycle: data.billing_cycle || 'yearly', // افتراضي هو سنوي
          expires_at: data.expires_at,
          batch_id: data.batch_id,
          notes: data.notes,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          // الحقول الجديدة للدورات مدى الحياة
          lifetime_courses_access: data.lifetime_courses_access || false,
          courses_access_type: data.courses_access_type || CoursesAccessType.STANDARD,
          accessible_courses: data.accessible_courses || []
        })
        .select('*')
        .single();
      
      if (error) throw error;
      
      return newCode as ActivationCode;
    } catch (error) {
      throw error;
    }
  },

  /**
   * إنشاء مجموعة من أكواد التفعيل
   * @param data بيانات دفعة أكواد التفعيل
   * @returns معرف الدفعة وعدد الأكواد التي تم إنشاؤها
   */
  async createActivationCodeBatch(data: CreateActivationCodeBatchDto): Promise<{ batchId: string; codesCount: number }> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      // إنشاء دفعة جديدة
      const { data: batch, error: batchError } = await supabase
        .from('activation_code_batches')
        .insert({
          name: data.name,
          plan_id: data.plan_id,
          count: data.count,
          billing_cycle: data.billing_cycle || 'yearly', // افتراضي هو سنوي
          expires_at: data.expires_at,
          notes: data.notes,
          created_by: user?.id,
          // الحقول الجديدة للدورات مدى الحياة
          lifetime_courses_access: data.lifetime_courses_access || false,
          courses_access_type: data.courses_access_type || CoursesAccessType.STANDARD
        })
        .select('id')
        .single();
      
      if (batchError) throw batchError;
      
      // استدعاء وظيفة SQL لإنشاء الأكواد
      const { data: result, error: functionError } = await supabase.rpc(
        'create_activation_codes',
        {
          p_batch_id: batch.id,
          p_plan_id: data.plan_id,
          p_count: data.count,
          p_billing_cycle: data.billing_cycle || 'yearly', // افتراضي هو سنوي
          p_expires_at: data.expires_at,
          p_created_by: user?.id,
          p_notes: data.notes
        }
      );
      
      if (functionError) throw functionError;
      
      return {
        batchId: batch.id,
        codesCount: data.count
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * تفعيل اشتراك باستخدام كود التفعيل
   * 🔒 محدث: مع Rate Limiting وسجلات التدقيق
   * @param data بيانات التفعيل
   * @returns نتيجة عملية التفعيل
   */
  async activateSubscription(data: ActivateSubscriptionDto): Promise<ActivateSubscriptionResult> {
    // التحقق من وجود المؤسسة - دعم كلا التنسيقين للتوافق
    const organizationId = data.organizationId || data.organization_id;
    const activationCode = data.activationCode || data.activation_code;

    // 🔒 التحقق من Rate Limiting قبل أي عملية
    const rateLimitCheck = rateLimiter.check(organizationId || 'unknown', 'activation');
    if (!rateLimitCheck.allowed) {
      await subscriptionAudit.log('ACTIVATION_FAILED', organizationId || 'unknown', {
        reason: 'rate_limited',
        retryAfter: rateLimitCheck.retryAfter
      }, { severity: 'warning' });

      return {
        success: false,
        message: rateLimitCheck.message || 'تم تجاوز الحد الأقصى للمحاولات. يرجى المحاولة لاحقاً.',
        courses_access_granted: false
      };
    }

    try {
      if (!organizationId) {
        return {
          success: false,
          message: "معرّف المؤسسة غير متوفر، يرجى تسجيل الدخول مرة أخرى",
          courses_access_granted: false
        };
      }

      if (!activationCode) {
        rateLimiter.record(organizationId, 'activation', false);
        return {
          success: false,
          message: "كود التفعيل مطلوب",
          courses_access_granted: false
        };
      }

      // 📝 تسجيل محاولة التفعيل
      await subscriptionAudit.logActivationAttempt(organizationId, activationCode);

      // التحقق من تنسيق الكود
      if (!isValidActivationCodeFormat(activationCode)) {
        rateLimiter.record(organizationId, 'activation', false);
        await subscriptionAudit.logActivationFailed(organizationId, 'invalid_format', activationCode);
        return {
          success: false,
          message: 'كود التفعيل غير صالح',
          courses_access_granted: false
        };
      }

      // استدعاء الدالة المحسنة لتفعيل الاشتراك مع الدورات
      const { data: result, error } = await supabase.rpc(
        'activate_subscription_with_courses' as any,
        {
          p_activation_code: activationCode,
          p_organization_id: organizationId
        }
      );

      if (error) {
        rateLimiter.record(organizationId, 'activation', false);
        await subscriptionAudit.logActivationFailed(organizationId, error.message, activationCode);
        return {
          success: false,
          message: error.message || 'حدث خطأ أثناء تفعيل الاشتراك',
          courses_access_granted: false
        };
      }

      const activationResult = result[0];

      if (activationResult?.success) {
        // ✅ تسجيل نجاح التفعيل
        rateLimiter.recordSuccess(organizationId, 'activation');
        await subscriptionAudit.logActivationSuccess(
          organizationId,
          activationResult.plan_name || 'غير محدد',
          activationResult.days_granted || 365
        );

        // إذا نجح التفعيل، قم بتحديث البيانات في الواجهة
        try {
          // حذف جميع أنواع التخزين المؤقت للاشتراك
          try {
            subscriptionCache.clearCache(organizationId);
          } catch (_) {
            // في حال فشل تنظيف الكاش الداخلي، نحاول على الأقل حذف localStorage
            const cacheKey = `subscription_${organizationId}`;
            localStorage.removeItem(cacheKey);
          }

          // تحديث البيانات في الواجهة
          if (typeof window !== 'undefined') {
            // إرسال حدث لتحديث البيانات في السياقات
            window.dispatchEvent(new CustomEvent('subscriptionActivated', {
              detail: {
                success: true,
                organizationId,
                message: 'تم تفعيل الاشتراك بنجاح',
                subscriptionId: activationResult.subscription_id ?? null
              }
            }));
          }

        } catch (cacheError) {
          // إذا فشل التحديث، قم بإعادة تحميل الصفحة كحل بديل
          if (typeof window !== 'undefined' && window.location) {
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        }
      } else {
        // ❌ فشل التفعيل
        rateLimiter.record(organizationId, 'activation', false);
        await subscriptionAudit.logActivationFailed(
          organizationId,
          activationResult?.message || 'unknown_error',
          activationCode
        );
      }

      return {
        success: activationResult.success,
        message: activationResult.message,
        subscription_id: activationResult.subscription_id,
        subscription_end_date: activationResult.subscription_end_date,
        courses_access_granted: activationResult.courses_access_granted || false
      };
    } catch (error: any) {
      rateLimiter.record(organizationId || 'unknown', 'activation', false);
      await subscriptionAudit.log('ERROR', organizationId || 'unknown', {
        error: error.message,
        source: 'activateSubscription'
      }, { severity: 'error' });

      return {
        success: false,
        message: error.message || 'حدث خطأ أثناء تفعيل الاشتراك',
        courses_access_granted: false
      };
    }
  },

  /**
   * الحصول على قائمة بأكواد التفعيل
   * @param options خيارات الاستعلام
   * @returns قائمة أكواد التفعيل
   */
  async getActivationCodes(options: {
    batchId?: string;
    status?: ActivationCodeStatus;
    planId?: string;
    lifetimeCoursesAccess?: boolean;
    coursesAccessType?: CoursesAccessType;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    codes: ActivationCode[];
    total: number;
  }> {
    try {
      let query = supabase.from('activation_codes').select('*', { count: 'exact' });
      
      // تطبيق الفلترة
      if (options.batchId) {
        query = query.eq('batch_id', options.batchId);
      }
      
      if (options.status) {
        query = query.eq('status', options.status);
      }
      
      if (options.planId) {
        query = query.eq('plan_id', options.planId);
      }
      
      // فلترة جديدة للدورات مدى الحياة
      if (options.lifetimeCoursesAccess !== undefined) {
        query = query.eq('lifetime_courses_access', options.lifetimeCoursesAccess);
      }
      
      if (options.coursesAccessType) {
        query = query.eq('courses_access_type', options.coursesAccessType);
      }
      
      // تطبيق الصفحات
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      // ترتيب النتائج
      query = query.order('created_at', { ascending: false });
      
      const { data, error, count } = await (query as any);
      
      if (error) throw error;
      
      return {
        codes: (data || []) as ActivationCode[],
        total: count || 0
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * الحصول على تفاصيل كود تفعيل
   * @param codeId معرف الكود
   * @returns تفاصيل الكود
   */
  async getActivationCodeById(codeId: string): Promise<ActivationCode> {
    try {
      const { data, error } = await supabase
        .from('activation_codes')
        .select(`
          *,
          subscription_plans:plan_id (
            id,
            name,
            description,
            price,
            billing_period
          ),
          organizations:organization_id (
            id,
            name,
            email
          )
        `)
        .eq('id', codeId)
        .single();
      
      if (error) throw error;
      
      return data as any;
    } catch (error) {
      throw error;
    }
  },

  /**
   * الحصول على قائمة بدفعات أكواد التفعيل
   * @param options خيارات الاستعلام
   * @returns قائمة دفعات أكواد التفعيل
   */
  async getActivationCodeBatches(options: {
    planId?: string;
    lifetimeCoursesAccess?: boolean;
    coursesAccessType?: CoursesAccessType;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    batches: ActivationCodeBatch[];
    total: number;
  }> {
    try {
      let query = supabase
        .from('activation_code_batches')
        .select(`
          *,
          subscription_plans:plan_id (
            id,
            name
          )
        `, { count: 'exact' });
      
      // تطبيق الفلترة
      if (options.planId) {
        query = query.eq('plan_id', options.planId);
      }
      
      // فلترة جديدة للدورات مدى الحياة
      if (options.lifetimeCoursesAccess !== undefined) {
        query = query.eq('lifetime_courses_access', options.lifetimeCoursesAccess);
      }
      
      if (options.coursesAccessType) {
        query = query.eq('courses_access_type', options.coursesAccessType);
      }
      
      // تطبيق الصفحات
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      // ترتيب النتائج
      query = query.order('created_at', { ascending: false });
      
      const { data, error, count } = await (query as any);
      
      if (error) throw error;
      
      // جلب إحصائيات كل دفعة
      const batchesWithStats = await Promise.all(
        (data || []).map(async (batch: any) => {
          const { data: stats, error: statsError } = await supabase.rpc(
            'get_activation_code_batch_statistics',
            { p_batch_id: batch.id }
          );
          
          if (statsError) throw statsError;
          
          return {
            id: batch.id,
            name: batch.name,
            plan_id: batch.plan_id,
            plan_name: batch.subscription_plans?.name || 'غير محدد',
            billing_cycle: (batch.billing_cycle || 'yearly') as 'monthly' | 'yearly',
            total_codes: stats?.[0]?.total_codes || 0,
            used_codes: stats?.[0]?.used_codes || 0,
            active_codes: stats?.[0]?.active_codes || 0,
            expired_codes: stats?.[0]?.expired_codes || 0,
            revoked_codes: stats?.[0]?.revoked_codes || 0,
            created_at: batch.created_at,
            created_by: batch.created_by,
            notes: batch.notes,
            // الحقول الجديدة للدورات مدى الحياة
            lifetime_courses_access: batch.lifetime_courses_access || false,
            courses_access_type: batch.courses_access_type || CoursesAccessType.STANDARD
          };
        })
      );
      
      return {
        batches: batchesWithStats,
        total: count || 0
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * تعديل حالة كود تفعيل
   * @param codeId معرف الكود
   * @param data بيانات التحديث
   * @returns الكود بعد التحديث
   */
  async updateActivationCode(codeId: string, data: UpdateActivationCodeDto): Promise<ActivationCode> {
    try {
      const { data: updatedCode, error } = await supabase
        .from('activation_codes')
        .update({
          status: data.status,
          notes: data.notes,
          expires_at: data.expires_at,
          // الحقول الجديدة للدورات مدى الحياة
          lifetime_courses_access: data.lifetime_courses_access,
          courses_access_type: data.courses_access_type,
          accessible_courses: data.accessible_courses
        })
        .eq('id', codeId)
        .select()
        .single();
      
      if (error) throw error;
      
      return updatedCode as ActivationCode;
    } catch (error) {
      throw error;
    }
  },

  /**
   * فحص صحة كود التفعيل (بدون تفعيله)
   * @param code كود التفعيل
   * @returns معلومات صحة الكود
   */
  async verifyActivationCode(code: string): Promise<{
    isValid: boolean;
    message: string;
    plan?: any;
    lifetimeCoursesAccess?: boolean;
    coursesAccessType?: CoursesAccessType;
  }> {
    try {
      // التحقق من تنسيق الكود
      if (!isValidActivationCodeFormat(code)) {
        return {
          isValid: false,
          message: 'كود التفعيل غير صالح التنسيق'
        };
      }

      // البحث عن الكود في قاعدة البيانات
      const { data, error } = await supabase
        .from('activation_codes')
        .select(`
          *,
          subscription_plans:plan_id (
            id,
            name,
            description,
            price,
            billing_period
          )
        `)
        .eq('code', code)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return {
            isValid: false,
            message: 'كود التفعيل غير موجود'
          };
        }
        throw error;
      }
      
      // التحقق من حالة الكود
      if (data.status !== ActivationCodeStatus.ACTIVE) {
        return {
          isValid: false,
          message: `كود التفعيل ${data.status === ActivationCodeStatus.USED ? 'مستخدم بالفعل' : 'غير نشط أو تم إلغاؤه'}`
        };
      }
      
      // التحقق من تاريخ انتهاء الكود
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return {
          isValid: false,
          message: 'كود التفعيل منتهي الصلاحية'
        };
      }
      
      return {
        isValid: true,
        message: 'كود التفعيل صالح',
        plan: data.subscription_plans,
        lifetimeCoursesAccess: (data as any).lifetime_courses_access || false,
        coursesAccessType: (data as any).courses_access_type || CoursesAccessType.STANDARD
      };
    } catch (error) {
      return {
        isValid: false,
        message: 'حدث خطأ أثناء التحقق من كود التفعيل'
      };
    }
  },

  /**
   * الحصول على الوصول للدورات لمؤسسة معينة
   * @param organizationId معرف المؤسسة
   * @returns قائمة الوصول للدورات
   */
  async getOrganizationCoursesAccess(organizationId: string): Promise<CourseAccess[]> {
    try {
      const { data, error } = await supabase.rpc(
        'get_organization_courses_access' as any,
        { p_organization_id: organizationId }
      );
      
      if (error) throw error;
      
      return data as CourseAccess[];
    } catch (error) {
      throw error;
    }
  }
};
