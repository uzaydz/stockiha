import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

// وظيفة للتحقق من اتصال قاعدة البيانات
export const checkDatabaseConnection = async (): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> => {
  console.log('Checking database connection...');
  try {
    // التحقق من الاتصال بإستخدام استعلام بسيط
    const { data, error } = await supabase.from('debug_logs').select('id').limit(1);
    
    // إذا لم تكن جداول التصحيح موجودة بعد
    if (error && error.code === '42P01') { // relation does not exist
      console.log('Debug logs table does not exist yet. Checking connection with another table...');
      // استخدام جدول آخر موجود
      const { data: usersData, error: usersError } = await supabase.from('users').select('id').limit(1);
      
      if (usersError) {
        console.error('Database connection error (fallback check):', usersError);
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
      console.error('Database connection error:', error);
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
    console.error('Unexpected error checking database connection:', error);
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
  console.log(`Checking organization access for user ${userId} to org ${organizationId}...`);
  try {
    // التحقق من وجود المؤسسة
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();
    
    if (orgError) {
      console.error('Error fetching organization:', orgError);
      return {
        success: false,
        hasAccess: false,
        error: orgError.message,
        details: orgError
      };
    }
    
    if (!orgData) {
      console.log('Organization not found');
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
      console.error('Error fetching user:', userError);
      return {
        success: false,
        hasAccess: false,
        error: userError.message,
        details: userError
      };
    }
    
    // التحقق من تطابق معرف المؤسسة
    const hasAccess = userData.organization_id === organizationId;
    console.log(`User ${userId} access to organization ${organizationId}: ${hasAccess ? 'GRANTED' : 'DENIED'}`);
    
    // تسجيل محاولة الوصول في جدول السجلات
    try {
      await supabaseAdmin.rpc('log_dashboard_access', {
        p_user_id: userId,
        p_organization_id: organizationId,
        p_details: {
          hasAccess,
          userRole: userData.role,
          timestamp: new Date()
        }
      });
    } catch (logError) {
      console.error('Error logging access attempt:', logError);
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
    console.error('Unexpected error checking organization access:', error);
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
  console.log(`Testing user data retrieval for user ${userId}...`);
  try {
    // جلب بيانات المستخدم
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData.user) {
      console.log('No authenticated user found');
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
      console.error('Error fetching user data:', userError);
      return {
        success: false,
        error: userError.message
      };
    }
    
    if (!userData) {
      console.log('User not found in users table');
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
    console.error('Unexpected error testing user data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}; 