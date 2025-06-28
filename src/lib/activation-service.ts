import { supabase } from './supabase';
import { generateActivationCode, generateMultipleActivationCodes, isValidActivationCodeFormat } from './code-generator';
import {
  ActivationCode,
  ActivationCodeBatch,
  ActivationCodeStatus,
  CreateActivationCodeBatchDto,
  CreateActivationCodeDto,
  UpdateActivationCodeDto,
  ActivateSubscriptionDto
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
          created_by: (await supabase.auth.getUser()).data.user?.id
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
          created_by: user?.id
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
   * @param data بيانات التفعيل
   * @returns نتيجة عملية التفعيل
   */
  async activateSubscription(data: ActivateSubscriptionDto): Promise<{
    success: boolean;
    message: string;
    subscription_id?: string;
    subscription_end_date?: string;
  }> {
    try {
      // التحقق من وجود المؤسسة - دعم كلا التنسيقين للتوافق
      const organizationId = data.organizationId || data.organization_id;
      const activationCode = data.activationCode || data.activation_code;

      if (!organizationId) {
        return {
          success: false,
          message: "معرّف المؤسسة غير متوفر، يرجى تسجيل الدخول مرة أخرى"
        };
      }

      if (!activationCode) {
        return {
          success: false,
          message: "كود التفعيل مطلوب"
        };
      }

      // التحقق من تنسيق الكود
      if (!isValidActivationCodeFormat(activationCode)) {
        return {
          success: false,
          message: 'كود التفعيل غير صالح'
        };
      }

      // استدعاء الدالة المحسنة لتفعيل الاشتراك
      const { data: result, error } = await supabase.rpc(
        'activate_subscription' as any,
        {
          p_activation_code: activationCode,
          p_organization_id: organizationId
        }
      );
      
      if (error) {
        return {
          success: false,
          message: error.message || 'حدث خطأ أثناء تفعيل الاشتراك'
        };
      }

      const activationResult = result[0];
      
      if (activationResult?.success) {
        // إذا نجح التفعيل، قم بتحديث الكاش
        try {
          // حذف الكاش القديم
          const cacheKey = `subscription_${organizationId}`;
          localStorage.removeItem(cacheKey);
          
          // تحديث البيانات في الكونتكست
          if (typeof window !== 'undefined' && window.location) {
            // إعادة تحميل الصفحة لضمان تحديث جميع البيانات
            window.location.reload();
          }
        } catch (cacheError) {
        }
      }

      return {
        success: activationResult.success,
        message: activationResult.message,
        subscription_id: activationResult.subscription_id,
        subscription_end_date: activationResult.subscription_end_date
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'حدث خطأ أثناء تفعيل الاشتراك'
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
      
      // تطبيق الصفحات
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      // ترتيب النتائج
      query = query.order('created_at', { ascending: false });
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return {
        codes: data as ActivationCode[],
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
      
      // تطبيق الصفحات
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      // ترتيب النتائج
      query = query.order('created_at', { ascending: false });
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // جلب إحصائيات كل دفعة
      const batchesWithStats = await Promise.all(
        data.map(async (batch) => {
          const { data: stats, error: statsError } = await supabase.rpc(
            'get_activation_code_batch_statistics',
            { p_batch_id: batch.id }
          );
          
          if (statsError) throw statsError;
          
          return {
            id: batch.id,
            name: batch.name,
            plan_id: batch.plan_id,
            plan_name: batch.subscription_plans.name,
            billing_cycle: (batch.billing_cycle || 'yearly') as 'monthly' | 'yearly',
            total_codes: stats[0].total_codes,
            used_codes: stats[0].used_codes,
            active_codes: stats[0].active_codes,
            expired_codes: stats[0].expired_codes,
            revoked_codes: stats[0].revoked_codes,
            created_at: batch.created_at,
            created_by: batch.created_by,
            notes: batch.notes
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
          expires_at: data.expires_at
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
        plan: data.subscription_plans
      };
    } catch (error) {
      return {
        isValid: false,
        message: 'حدث خطأ أثناء التحقق من كود التفعيل'
      };
    }
  }
};
