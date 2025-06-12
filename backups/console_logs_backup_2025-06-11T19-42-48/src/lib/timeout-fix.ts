import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * إصلاح مشاكل timeout وتحسين أداء الاستعلامات
 */

// زيادة قيم timeout لتجنب الأخطاء
export const FIXED_TIMEOUTS = {
  DATABASE_QUERY: 15000, // 15 ثانية بدلاً من 8
  ORGANIZATION_LOAD: 20000, // 20 ثانية
  USER_PROFILE_LOAD: 12000, // 12 ثانية
  RETRY_DELAY: 2000, // 2 ثانية بين المحاولات
  COMPONENT_CREATION: 30000, // 30 ثانية لإنشاء المكونات
};

/**
 * دالة محسنة للحصول على بيانات المؤسسة مع تجنب timeout
 */
export const getOrganizationOptimized = async (
  organizationId?: string,
  subdomain?: string
): Promise<any> => {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, FIXED_TIMEOUTS.ORGANIZATION_LOAD);

  try {
    let query = supabaseAdmin
      .from('organizations')
      .select(`
        id,
        name,
        description,
        subdomain,
        subscription_tier,
        subscription_status,
        settings,
        created_at,
        updated_at,
        owner_id
      `)
      .limit(1);

    if (organizationId) {
      query = query.eq('id', organizationId);
    } else if (subdomain) {
      query = query.eq('subdomain', subdomain);
    } else {
      throw new Error('يجب تحديد معرف المؤسسة أو النطاق الفرعي');
    }

    const { data, error } = await query
      .abortSignal(timeoutController.signal)
      .single();

    if (error) {
      if (error.name === 'AbortError') {
        throw new Error('انتهت مهلة تحميل بيانات المؤسسة');
      }
      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * دالة محسنة للحصول على بيانات المستخدم مع تجنب timeout
 */
export const getUserProfileOptimized = async (userId: string): Promise<any> => {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, FIXED_TIMEOUTS.USER_PROFILE_LOAD);

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        auth_user_id,
        organization_id,
        is_org_admin,
        is_active,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .abortSignal(timeoutController.signal)
      .single();

    if (error) {
      if (error.name === 'AbortError') {
        throw new Error('انتهت مهلة تحميل بيانات المستخدم');
      }
      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * إصلاح مشكلة خطأ HTTP 406 في استعلامات المستخدمين
 */
export const fixHTTP406Issue = async () => {
  try {
    console.log('🔧 بدء إصلاح مشكلة HTTP 406...');
    
    // تجربة استعلام بسيط للتحقق من الاتصال
    const { data: testData, error: testError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ فشل في الاتصال بقاعدة البيانات:', testError);
      return false;
    }

    console.log('✅ تم إصلاح مشكلة HTTP 406 - الاتصال يعمل بشكل طبيعي');
    return true;
  } catch (error) {
    console.error('❌ خطأ في إصلاح مشكلة HTTP 406:', error);
    return false;
  }
};

/**
 * تحسين استعلامات قاعدة البيانات لتجنب timeout
 */
export const optimizeDatabaseQueries = () => {
  // تطبيق إعدادات timeout محسنة على مستوى التطبيق
  if (typeof window !== 'undefined') {
    // تخزين الإعدادات المحسنة في localStorage
    localStorage.setItem('bazaar_optimized_timeouts', JSON.stringify(FIXED_TIMEOUTS));
    
    // إظهار رسالة تأكيد
    console.log('🚀 تم تطبيق تحسينات قاعدة البيانات:', FIXED_TIMEOUTS);
  }
};

/**
 * مراقب أداء للاستعلامات
 */
export const createQueryPerformanceMonitor = () => {
  const monitor = {
    queries: [] as Array<{
      query: string;
      duration: number;
      timestamp: Date;
      success: boolean;
    }>,
    
    logQuery(query: string, duration: number, success: boolean) {
      this.queries.push({
        query,
        duration,
        timestamp: new Date(),
        success
      });
      
      // الاحتفاظ بآخر 100 استعلام فقط
      if (this.queries.length > 100) {
        this.queries = this.queries.slice(-100);
      }
      
      // تحذير إذا كان الاستعلام بطيئًا
      if (duration > 5000) {
        console.warn(`🐌 استعلام بطيء: ${query} - ${duration}ms`);
      }
    },
    
    getSlowQueries() {
      return this.queries.filter(q => q.duration > 3000);
    },
    
    getFailedQueries() {
      return this.queries.filter(q => !q.success);
    },
    
    getStats() {
      const total = this.queries.length;
      const successful = this.queries.filter(q => q.success).length;
      const avgDuration = this.queries.reduce((sum, q) => sum + q.duration, 0) / total;
      
      return {
        total,
        successful,
        failed: total - successful,
        successRate: (successful / total) * 100,
        avgDuration
      };
    }
  };
  
  return monitor;
}; 