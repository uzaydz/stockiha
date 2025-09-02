import { supabase } from './supabase';

/**
 * خدمة تحديث بيانات الاشتراك في الواجهة
 * لحل مشكلة الكاش بعد تفعيل الاشتراك
 */
export class SubscriptionRefreshService {
  
  /**
   * تحديث بيانات المؤسسة الأساسية
   */
  static async refreshOrganizationData(organizationId: string) {
    try {
      const { data, error } = await supabase.rpc('refresh_organization_data', {
        p_organization_id: organizationId
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * تحديث جميع بيانات الاشتراك والدورات
   */
  static async refreshSubscriptionData(organizationId: string) {
    try {
      const { data, error } = await supabase.rpc('refresh_subscription_data', {
        p_organization_id: organizationId
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * تحديث البيانات في جميع السياقات
   */
  static async refreshAllData(organizationId: string) {
    try {
      // تحديث بيانات الاشتراك
      const subscriptionData = await this.refreshSubscriptionData(organizationId);
      
      // تحديث بيانات المؤسسة
      const organizationData = await this.refreshOrganizationData(organizationId);

      return {
        subscription: subscriptionData,
        organization: organizationData,
        success: true
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * إعادة تحميل البيانات من Supabase مباشرة
   */
  static async forceRefreshFromDatabase(organizationId: string) {
    try {
      // جلب بيانات المؤسسة المحدثة
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      // جلب بيانات الاشتراك النشط
      const { data: subData, error: subError } = await supabase
        .from('organization_subscriptions')
        .select(`
          *,
          subscription_plans (
            name,
            code,
            features
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single();

      if (subError && subError.code !== 'PGRST116') {
        // PGRST116 يعني عدم وجود نتائج (طبيعي إذا لم يكن هناك اشتراك)
        throw subError;
      }

      // جلب عدد الدورات المتاحة
      const { data: courseData, error: courseError } = await supabase
        .from('organization_course_access')
        .select('course_id')
        .eq('organization_id', organizationId)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (courseError) throw courseError;

      return {
        organization: orgData,
        subscription: subData || null,
        coursesAccess: {
          totalCourses: courseData?.length || 0,
          hasLifetimeAccess: subData?.lifetime_courses_access || false
        },
        success: true
      };
    } catch (error) {
      throw error;
    }
  }
}

/**
 * Hook لتحديث البيانات في الواجهة
 */
export const useSubscriptionRefresh = () => {
  const refreshData = async (organizationId: string) => {
    try {
      const result = await SubscriptionRefreshService.refreshAllData(organizationId);
      
      // إرسال حدث لتحديث البيانات في السياقات
      window.dispatchEvent(new CustomEvent('subscriptionDataRefreshed', {
        detail: result
      }));

      return result;
    } catch (error) {
      throw error;
    }
  };

  const forceRefresh = async (organizationId: string) => {
    try {
      const result = await SubscriptionRefreshService.forceRefreshFromDatabase(organizationId);
      
      // إرسال حدث لتحديث البيانات في السياقات
      window.dispatchEvent(new CustomEvent('subscriptionDataForceRefreshed', {
        detail: result
      }));

      return result;
    } catch (error) {
      throw error;
    }
  };

  return {
    refreshData,
    forceRefresh
  };
};
