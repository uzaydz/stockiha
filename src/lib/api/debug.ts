import { supabase } from '@/lib/supabase';

// وظيفة للتحقق من اتصال قاعدة البيانات
export const checkDatabaseConnection = async (): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> => {
  
  try {
    // التحقق من الاتصال بإستخدام استعلام بسيط
    const { data, error } = await supabase.from('debug_logs').select('id').limit(1);
    
    // إذا لم تكن جداول التصحيح موجودة بعد
    if (error && error.code === '42P01') { // relation does not exist
      
      // استخدام جدول آخر موجود
      const { data: usersData, error: usersError } = await supabase.from('users').select('id').limit(1);
      
      if (usersError) {
        return {
          success: false,
          error: usersError.message,
          details: usersError
        };
      }
      
      return {
        success: true,
        details: { message: 'Database connection successful (via users table)', timestamp: new Date() }
      };
    }
    
    if (error) {
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
    
    return {
      success: true,
      details: { message: 'Database connection successful', timestamp: new Date() }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
};

// وظيفة للتحقق من وصول المستخدم إلى المؤسسة
export const checkOrganizationAccess = async (
  userId: string,
  organizationId: string
): Promise<{
  success: boolean;
  hasAccess: boolean;
  error?: string;
  details?: any;
}> => {
  
  try {
    // التحقق من وجود المؤسسة
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();
    
    if (orgError) {
      return {
        success: false,
        hasAccess: false,
        error: orgError.message,
        details: orgError
      };
    }
    
    if (!orgData) {
      
      return {
        success: true,
        hasAccess: false,
        details: { message: 'Organization not found' }
      };
    }
    
    // التحقق من وجود سجل المستخدم وارتباطه بالمؤسسة
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('id', userId)
      .single();
    
    if (userError) {
      return {
        success: false,
        hasAccess: false,
        error: userError.message,
        details: userError
      };
    }
    
    // التحقق من تطابق معرف المؤسسة
    const hasAccess = userData.organization_id === organizationId;

    // تسجيل محاولة الوصول في جدول السجلات
    try {
      await supabase.rpc('log_dashboard_access', {
        user_id: userId,
        organization_id: organizationId,
        access_type: 'dashboard',
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        ip_address: 'client-side',
        success: true
      });
    } catch (logError) {
      // استمر حتى في حالة فشل التسجيل
    }
    
    return {
      success: true,
      hasAccess,
      details: {
        user: { id: userData.id, role: userData.role },
        organization: { id: orgData.id, name: orgData.name }
      }
    };
  } catch (error) {
    return {
      success: false,
      hasAccess: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
};

// وظيفة لاختبار جلب بيانات المستخدم
export const testUserData = async (userId: string): Promise<{
  success: boolean;
  userData?: any;
  error?: string;
}> => {
  
  try {
    // جلب بيانات المستخدم
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData.user) {
      
      return {
        success: false,
        error: 'No authenticated user found'
      };
    }
    
    // جلب البيانات من جدول المستخدمين
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (userError) {
      return {
        success: false,
        error: userError.message
      };
    }
    
    if (!userData) {
      
      return {
        success: false,
        error: 'User not found in users table'
      };
    }
    
    return {
      success: true,
      userData
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
