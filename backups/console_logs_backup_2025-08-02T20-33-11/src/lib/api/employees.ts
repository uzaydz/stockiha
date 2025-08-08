import { supabase } from '@/lib/supabase';
import { 
  Employee, 
  EmployeeFilter, 
  EmployeeStats, 
  EmployeeWithStats, 
  EmployeeSalary,
  EmployeeActivity 
} from '@/types/employee';

// التأكد من وجود جداول الموظفين
export const ensureEmployeeTables = async (): Promise<void> => {
  try {
    // التأكد من وجود جدول employee_salaries
    await supabase.rpc('create_employee_salaries_if_not_exists');
    // التأكد من وجود جدول employee_activities
    await supabase.rpc('create_employee_activities_if_not_exists');
    
  } catch (error) {
  }
};

// جلب جميع الموظفين
// Cache للمؤسسة لتجنب استدعاءات متعددة
let cachedOrganizationId: string | null = null;
let lastOrgFetch = 0;
const ORG_CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

// Cache للموظفين لمنع الطلبات المكررة
let cachedEmployees: Employee[] | null = null;
let lastEmployeesFetch = 0;
const EMPLOYEES_CACHE_DURATION = 30 * 1000; // 30 ثانية

// Cache للإحصائيات لمنع الطلبات المكررة
let cachedStats: { total: number; active: number; inactive: number } | null = null;
let lastStatsFetch = 0;
const STATS_CACHE_DURATION = 30 * 1000; // 30 ثانية

// آلية منع الطلبات المتزامنة المكررة
let ongoingEmployeesRequest: Promise<Employee[]> | null = null;
let ongoingStatsRequest: Promise<{ total: number; active: number; inactive: number }> | null = null;

// إحصائيات الأداء
let performanceStats = {
  employeesRequests: 0,
  employeesCacheHits: 0,
  statsRequests: 0,
  statsCacheHits: 0,
  duplicateRequestsBlocked: 0
};

// دالة لطباعة إحصائيات الأداء
const logPerformanceStats = () => {
  if (process.env.NODE_ENV === 'development') {
    // طباعة الإحصائيات فقط إذا كان هناك نشاط فعلي
    if (performanceStats.employeesRequests > 0 || performanceStats.statsRequests > 0) {
    }
  }
};

// متغير لضمان تشغيل setInterval مرة واحدة فقط
let performanceStatsInterval: NodeJS.Timeout | null = null;

// دالة لبدء تتبع الأداء عند الحاجة
const startPerformanceTracking = () => {
  if (process.env.NODE_ENV === 'development' && !performanceStatsInterval) {
    performanceStatsInterval = setInterval(logPerformanceStats, 30000);
  }
};

// دالة لمسح Cache عند الحاجة
export const clearEmployeeCache = () => {
  cachedEmployees = null;
  cachedStats = null;
  lastEmployeesFetch = 0;
  lastStatsFetch = 0;
};

// دالة محسنة للحصول على معرف المؤسسة
const getOrganizationId = async (): Promise<string | null> => {
  const now = Date.now();
  
  if (process.env.NODE_ENV === 'development') {
    console.log('getOrganizationId called');
  }
  
  // استخدام cache إذا كان حديثاً
  if (cachedOrganizationId && (now - lastOrgFetch) < ORG_CACHE_DURATION) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Using cached organization ID:', cachedOrganizationId);
    }
    return cachedOrganizationId;
  }
  
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Getting current user...');
    }
    // الحصول على بيانات المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No user found');
      }
      return null;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Getting user organization ID...');
    }
    // الحصول على معرف المؤسسة للمستخدم الحالي
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();
      
    if (!userError && userData?.organization_id) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Found organization ID from database:', userData.organization_id);
      }
      cachedOrganizationId = userData.organization_id;
      lastOrgFetch = now;
      return cachedOrganizationId;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Trying local storage...');
    }
    // محاولة استخدام معرف المؤسسة من التخزين المحلي
    const localOrgId = localStorage.getItem('organizationId');
    if (localOrgId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Found organization ID from localStorage:', localOrgId);
      }
      cachedOrganizationId = localOrgId;
      lastOrgFetch = now;
      return cachedOrganizationId;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('No organization ID found');
    }
    return null;
  } catch (err) {
    console.error('Error in getOrganizationId:', err);
    return null;
  }
};

export const getEmployees = async (): Promise<Employee[]> => {
  const now = Date.now();
  performanceStats.employeesRequests++;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('getEmployees called');
  }
  
  // بدء تتبع الأداء عند أول استخدام
  startPerformanceTracking();
  
  // استخدام cache إذا كان حديثاً
  if (cachedEmployees && (now - lastEmployeesFetch) < EMPLOYEES_CACHE_DURATION) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Using cached employees');
    }
    performanceStats.employeesCacheHits++;
    return cachedEmployees;
  }
  
  // إذا كان هناك طلب جاري، انتظر نتيجته بدلاً من إنشاء طلب جديد
  if (ongoingEmployeesRequest) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Waiting for ongoing request');
    }
    performanceStats.duplicateRequestsBlocked++;
    return await ongoingEmployeesRequest;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Creating new employees request');
  }
  // إنشاء طلب جديد
  ongoingEmployeesRequest = performGetEmployees();
  
  try {
    const result = await ongoingEmployeesRequest;
    
    // حفظ في cache
    cachedEmployees = result;
    lastEmployeesFetch = now;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('getEmployees completed successfully');
    }
    return result;
  } finally {
    // تنظيف الطلب الجاري
    ongoingEmployeesRequest = null;
  }
};

// الدالة الفعلية لجلب الموظفين
const performGetEmployees = async (): Promise<Employee[]> => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('performGetEmployees started');
    }
    
    // الحصول على معرف المؤسسة (مع cache)
    const organizationId = await getOrganizationId();
    
    if (!organizationId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No organization ID found');
      }
      return [];
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Fetching employees for organization:', organizationId);
    }

    // استخدام الاستعلام المباشر بدون استدعاءات إضافية
    if (process.env.NODE_ENV === 'development') {
      console.log('Executing database query...');
    }
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'employee')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching employees:', error);
      return [];
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Employees found:', data?.length || 0);
    }

    // إضافة رسالة تشخيص إذا لم يتم العثور على موظفين
    if (!data || data.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No employees found for organization:', organizationId);
      }
    }

    // تحويل البيانات للنوع المطلوب مع معالجة آمنة للأنواع
    if (process.env.NODE_ENV === 'development') {
      console.log('Transforming employee data...');
    }
    const transformedEmployees = (data || []).map(user => ({
      id: user.id,
      user_id: user.auth_user_id || user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role as 'employee' | 'admin',
      is_active: user.is_active,
      last_login: null, // حقل غير موجود في قاعدة البيانات
      created_at: user.created_at,
      updated_at: user.updated_at,
      organization_id: user.organization_id,
      permissions: {
        accessPOS: false,
        manageOrders: false,
        processPayments: false,
        manageUsers: false,
        viewReports: false,
        manageProducts: false,
        manageServices: false,
        manageEmployees: false,
        viewOrders: false
      }
    })) as unknown as Employee[];
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Employee transformation completed');
    }
    return transformedEmployees;
  } catch (err) {
    console.error('Error in performGetEmployees:', err);
    return [];
  }
};

// جلب موظف محدد بواسطة المعرف
export const getEmployeeById = async (id: string): Promise<Employee | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .eq('role', 'employee')
    .single();
    
  if (error) {
    throw new Error(error.message);
  }
  
  // تحويل البيانات للنوع المطلوب
  return {
    ...data,
    role: data.role as 'employee' | 'admin',
    permissions: typeof data.permissions === 'object' ? data.permissions : {}
  } as unknown as Employee;
};

// إنشاء موظف جديد
export const createEmployee = async (
  email: string, 
  password: string,
  userData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>
): Promise<Employee> => {
  // مسح Cache عند إضافة موظف جديد
  clearEmployeeCache(); 

  // 1. Get Admin's Org ID (same logic as before)
  const { data: { user: adminUser } } = await supabase.auth.getUser();
  if (!adminUser) throw new Error('User not authenticated');

  let organizationId: string | null = null;
  const { data: adminUserData, error: userError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', adminUser.id)
    .single();

  if (userError) console.warn('Error fetching current user organization:', userError);

  if (adminUserData?.organization_id) {
    organizationId = adminUserData.organization_id;
  } else {
    organizationId = localStorage.getItem('organizationId');
  }
  if (!organizationId) throw new Error('No organization ID found to associate employee with.');

  let createdUserRecord: Employee | null = null;
  let authUserId: string | null = null;

  // 2. Try to create the auth user first
  try {

    // Try direct signup method first
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: userData.name,
          role: 'employee'
        }
      }
    });
    
    if (authError) {
      // We'll continue and try to create just the database record
    } else if (authData?.user) {
      
      authUserId = authData.user.id;
      
      // Sign out immediately after creating the user so admin stays logged in
      await supabase.auth.signOut();
      
      // Sign back in as the admin (important!)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: adminUser.email!,
        password: localStorage.getItem('adminPassword') || '' // Using stored password if available
      });
      
      if (signInError) {
      }
    }
  } catch (error) {
    // Continue with just the database record
  }

  // 3. Create record in public.users via modified RPC (insert only)
  try {
    
    let { data: rpcResult, error: rpcError } = await supabase.rpc(
      'create_employee_securely',
      {
        // Parameters for the modified function (no password)
        employee_email: email,
        employee_password: password,
        employee_name: userData.name,
        p_organization_id: organizationId,
        employee_phone: userData.phone || null,
        employee_permissions: '{}'
      }
    );

    if (rpcError) {
      
      // Handle 404 errors (function not found) by using direct insert as a fallback
      if (rpcError.code === '42883' || rpcError.code === '404') {

        // Use auth user ID if available, otherwise generate a new one
        const userId = authUserId || crypto.randomUUID();
        
        // Insert directly into the users table
        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: email,
            name: userData.name,
            phone: userData.phone || null,
            role: 'employee',
            permissions: userData.permissions || {},
            is_active: true,
            organization_id: organizationId,
            auth_user_id: authUserId // Store reference to auth user if created
          })
          .select()
          .single();
          
        if (insertError) {
          throw new Error(insertError.message || 'Failed to create employee record directly');
        }
        
        rpcResult = insertedUser;
      } else if (rpcError.message.includes('already exists') || rpcError.code === '23505') {
        if (rpcError.message.includes('is active')) {
          throw new Error('البريد الإلكتروني مستخدم بالفعل لموظف نشط.');
        } else {
          const { data: existingRecord, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
          if (fetchError || !existingRecord) {
            throw new Error('فشل في استرداد سجل الموظف الموجود بعد محاولة التحديث.');
          }
          rpcResult = existingRecord; // Reassign rpcResult here
        }
      } else {
        throw new Error(rpcError.message || 'فشل في إنشاء سجل الموظف الأولي.');
      }
    }

    if (!rpcResult || typeof rpcResult !== 'object') { 
      throw new Error('لم يتم إرجاع بيانات سجل الموظف بعد الإنشاء.');
    }
    
    // تحويل البيانات للنوع المطلوب
    createdUserRecord = {
      ...rpcResult,
      role: (rpcResult as any).role as 'employee' | 'admin',
      permissions: typeof (rpcResult as any).permissions === 'object' 
        ? (rpcResult as any).permissions 
        : {}
    } as Employee;

  } catch (error) { 
    throw error; 
  }

  if (!createdUserRecord) {
    throw new Error('Failed to obtain employee record before inviting.');
  }

  // 4. Try to invite the user if we couldn't create them directly
  if (!authUserId) {
    try {

      try {
        // Try the admin invite method first
        const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
          email,
          {
            data: { 
              name: userData.name, 
              role: 'employee'
            }
          }
        );

        if (inviteError) {
          // Just log but continue - we'll return the user record anyway
        } else {
          
        }
      } catch (inviteErr) {
        // Try one more method - direct sign up
        try {
          const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
              data: {
                name: userData.name,
                role: 'employee'
              }
            }
          });
          
          if (signupError) {
          } else {

            // Sign out immediately after creating the user
            await supabase.auth.signOut();
            
            // Sign back in as the admin
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: adminUser.email!,
              password: localStorage.getItem('adminPassword') || '' // Using stored password if available
            });
            
            if (signInError) {
            }
          }
        } catch (signupErr) {
        }
      }

    } catch (error) {
    }
  }

  // Return the user record regardless of invitation status
  return { ...createdUserRecord, is_active: true } as Employee;
};

// تحديث بيانات موظف
export const updateEmployee = async (
  id: string, 
  updates: Partial<Omit<Employee, 'id' | 'created_at'>>
): Promise<Employee> => {
  // مسح Cache عند تحديث موظف
  clearEmployeeCache();
  // إزالة permissions من التحديثات لتجنب تعارض الأنواع
  const { permissions, ...otherUpdates } = updates;
  const processedUpdates = {
    ...otherUpdates,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('users')
    .update(processedUpdates)
    .eq('id', id)
    .eq('role', 'employee')
    .select()
    .single();
    
  if (error) {
    throw new Error(error.message);
  }
  
  // تحويل البيانات للنوع المطلوب
  return {
    ...data,
    role: data.role as 'employee' | 'admin',
    permissions: typeof data.permissions === 'object' ? data.permissions : {}
  } as unknown as Employee;
};

// تغيير كلمة مرور الموظف
export const resetEmployeePassword = async (id: string, newPassword: string): Promise<void> => {
  const { error } = await supabase.auth.admin.updateUserById(
    id,
    { password: newPassword }
  );
  
  if (error) {
    throw new Error(error.message);
  }
};

// تغيير حالة نشاط الموظف
export const toggleEmployeeStatus = async (id: string, isActive: boolean): Promise<Employee> => {
  // مسح Cache عند تغيير حالة الموظف
  clearEmployeeCache();
  const { data, error } = await supabase
    .from('users')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('role', 'employee')
    .select()
    .single();
    
  if (error) {
    throw new Error(error.message);
  }
  
  // تحويل البيانات للنوع المطلوب
  return {
    ...data,
    role: data.role as 'employee' | 'admin',
    permissions: typeof data.permissions === 'object' ? data.permissions : {}
  } as unknown as Employee;
};

// حذف موظف
export const deleteEmployee = async (id: string): Promise<void> => {
  // مسح Cache عند حذف موظف
  clearEmployeeCache();
  // 1. حذف الموظف من جدول users
  const { error: userError } = await supabase
    .from('users')
    .delete()
    .eq('id', id)
    .eq('role', 'employee');
    
  if (userError) {
    throw new Error(userError.message);
  }
  
  // 2. حذف حساب المستخدم من Auth
  const { error: authError } = await supabase.auth.admin.deleteUser(id);
  
  if (authError) {
    throw new Error(authError.message);
  }
};

/**
 * إضافة راتب للموظف
 */
export const addEmployeeSalary = async (
  employeeId: string,
  data: {
    amount: number;
    type: 'monthly' | 'commission' | 'bonus' | 'other';
    date: string;
    status: 'pending' | 'paid' | 'cancelled';
    note: string | null;
  }
): Promise<EmployeeSalary> => {
  try {
    // الحصول على معرف المؤسسة
    const organizationId = await getOrganizationId();
    if (!organizationId) {
      throw new Error('No organization ID found');
    }

    // تحويل البيانات لتتوافق مع واجهة EmployeeSalary
    const salaryData = {
      employee_id: employeeId,
      amount: data.amount,
      start_date: data.date,
      type: data.type,
      status: data.status,
      notes: data.note,
      organization_id: organizationId
    };
    
    // إضافة الراتب في قاعدة البيانات
    const { data: newSalary, error } = await supabase
      .from('employee_salaries')
      .insert(salaryData)
      .select('*')
      .single();

    if (error) throw error;
    
    // تحويل البيانات للنوع المطلوب
    return {
      ...newSalary,
      type: newSalary.type as 'monthly' | 'commission' | 'bonus' | 'other',
      status: newSalary.status as 'pending' | 'paid' | 'cancelled'
    } as EmployeeSalary;
  } catch (error) {
    throw error;
  }
};

// جلب رواتب الموظف
export const getEmployeeSalaries = async (employeeId: string): Promise<EmployeeSalary[]> => {
  const { data, error } = await supabase
    .from('employee_salaries')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
    
  if (error) {
    throw new Error(error.message);
  }
  
  // تحويل البيانات للنوع المطلوب
  return (data || []).map(salary => ({
    ...salary,
    type: salary.type as 'monthly' | 'commission' | 'bonus' | 'other',
    status: salary.status as 'pending' | 'paid' | 'cancelled'
  })) as EmployeeSalary[];
};

// إضافة نشاط للموظف
export const addEmployeeActivity = async (activity: Omit<EmployeeActivity, 'id' | 'created_at'>): Promise<EmployeeActivity> => {
  // التحقق من وجود جدول employee_activities، وإنشاءه إذا لم يكن موجودًا
  try {
    await supabase.rpc('create_employee_activities_if_not_exists');
  } catch (error) {
  }
  
  // الحصول على معرف المؤسسة
  const organizationId = await getOrganizationId();
  if (!organizationId) {
    throw new Error('No organization ID found');
  }
  
  const { data, error } = await supabase
    .from('employee_activities')
    .insert([{
      employee_id: activity.employee_id,
      action_type: activity.action_type,
      action_details: activity.action_details,
      related_entity: activity.related_entity,
      related_entity_id: activity.related_entity_id,
      organization_id: organizationId,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();
    
  if (error) {
    throw new Error(error.message);
  }
  
  // تحويل البيانات للنوع المطلوب
  return {
    ...data,
    action_type: data.action_type as 'login' | 'logout' | 'order_created' | 'service_assigned' | 'product_updated' | 'other',
    related_entity: data.related_entity as 'order' | 'service' | 'product' | 'customer' | 'other'
  } as EmployeeActivity;
};

// جلب نشاطات الموظف
export const getEmployeeActivities = async (employeeId: string, limit = 20): Promise<EmployeeActivity[]> => {
  const { data, error } = await supabase
    .from('employee_activities')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  if (error) {
    throw new Error(error.message);
  }
  
  // تحويل البيانات للنوع المطلوب
  return (data || []).map(activity => ({
    ...activity,
    action_type: activity.action_type as 'login' | 'logout' | 'order_created' | 'service_assigned' | 'product_updated' | 'other',
    related_entity: activity.related_entity as 'order' | 'service' | 'product' | 'customer' | 'other'
  })) as EmployeeActivity[];
};

// جلب إحصائيات الموظفين
export const getEmployeeStats = async (): Promise<{
  total: number;
  active: number;
  inactive: number;
}> => {
  const now = Date.now();
  performanceStats.statsRequests++;
  
  // بدء تتبع الأداء عند أول استخدام
  startPerformanceTracking();
  
  // استخدام cache إذا كان حديثاً
  if (cachedStats && (now - lastStatsFetch) < STATS_CACHE_DURATION) {
    performanceStats.statsCacheHits++;
    return cachedStats;
  }
  
  // إذا كان هناك طلب جاري، انتظر نتيجته بدلاً من إنشاء طلب جديد
  if (ongoingStatsRequest) {
    return await ongoingStatsRequest;
  }
  
  // إنشاء طلب جديد
  ongoingStatsRequest = performGetEmployeeStats();
  
  try {
    const result = await ongoingStatsRequest;
    
    // حفظ في cache
    cachedStats = result;
    lastStatsFetch = now;
    
    return result;
  } finally {
    // تنظيف الطلب الجاري
    ongoingStatsRequest = null;
  }
};

// الدالة الفعلية لجلب الإحصائيات
const performGetEmployeeStats = async (): Promise<{
  total: number;
  active: number;
  inactive: number;
}> => {
  try {
    
    // الحصول على معرف المؤسسة (مع cache)
    const organizationId = await getOrganizationId();
    
    if (!organizationId) {
      return { total: 0, active: 0, inactive: 0 };
    }

    // تشغيل جميع الاستعلامات بالتوازي لتحسين الأداء
    const [totalResult, activeResult, inactiveResult] = await Promise.all([
      // إجمالي عدد الموظفين
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'employee')
        .eq('organization_id', organizationId),
      
      // عدد الموظفين النشطين
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'employee')
        .eq('organization_id', organizationId)
        .eq('is_active', true),
      
      // عدد الموظفين غير النشطين
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'employee')
        .eq('organization_id', organizationId)
        .eq('is_active', false)
    ]);
    
    if (totalResult.error || activeResult.error || inactiveResult.error) {
      console.error('Error fetching employee stats:', { totalResult: totalResult.error, activeResult: activeResult.error, inactiveResult: inactiveResult.error });
      return { total: 0, active: 0, inactive: 0 };
    }
    
    const stats = {
      total: totalResult.count || 0,
      active: activeResult.count || 0,
      inactive: inactiveResult.count || 0
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('Employee stats calculated:', stats);
    }

    return stats;
  } catch (error) {
    console.error('Error in performGetEmployeeStats:', error);
    return {
      total: 0,
      active: 0,
      inactive: 0
    };
  }
};

// جلب احصائيات أداء الموظف
export const getEmployeePerformance = async (employeeId: string): Promise<{
  ordersCount: number;
  salesTotal: number;
  servicesCount: number;
}> => {
  try {
    // عدد الطلبات التي قام بها الموظف
    const { count: ordersCount, error: ordersError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId);
      
    if (ordersError) {
      throw ordersError;
    }
    
    // إجمالي المبيعات
    const { data: salesData, error: salesError } = await supabase
      .from('orders')
      .select('total')
      .eq('employee_id', employeeId);
      
    if (salesError) {
      throw salesError;
    }
    
    const salesTotal = salesData?.reduce((sum, order) => {
      // تحويل القيمة إلى نص أولاً ثم إلى رقم
      const totalValue = typeof order.total === 'string' ? order.total : String(order.total || 0);
      return sum + (parseFloat(totalValue) || 0);
    }, 0) || 0;
    
    // عدد الخدمات التي قدمها الموظف - تصحيح اسم الحقل
    const { count: servicesCount, error: servicesError } = await supabase
      .from('service_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', employeeId);
      
    if (servicesError) {
      throw servicesError;
    }
    
    return {
      ordersCount: ordersCount || 0,
      salesTotal,
      servicesCount: servicesCount || 0
    };
  } catch (error) {
    return {
      ordersCount: 0,
      salesTotal: 0,
      servicesCount: 0
    };
  }
};

// وظيفة جديدة للتشخيص - تتحقق من حالة المستخدم الحالي
export const checkCurrentUserStatus = async (): Promise<any> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      return { error };
    }
    
    if (!user) {
      
      return { status: 'no-user' };
    }

    return {
      status: 'authenticated',
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      }
    };
  } catch (err) {
    return { error: err };
  }
};

// تحديث الموظفين الذين ليس لديهم معرف مؤسسة
export const updateEmployeesWithMissingOrganizationId = async (): Promise<void> => {
  try {
    // الحصول على بيانات المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return;
    }
    
    let organizationId = null;
    
    // الحصول على معرف المؤسسة
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();
      
    if (userError) {
      return;
    }
    
    if (userData && userData.organization_id) {
      organizationId = userData.organization_id;
      
    } else {
      // محاولة استخدام معرف المؤسسة من التخزين المحلي
      const localOrgId = localStorage.getItem('organizationId');
      if (localOrgId) {
        organizationId = localOrgId;
        
      } else {
        return;
      }
    }
    
    // البحث عن الموظفين الذين ليس لديهم معرف مؤسسة
    const { data: employeesWithoutOrg, error: findError } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'employee')
      .is('organization_id', null);
    
    if (findError) {
      return;
    }
    
    if (!employeesWithoutOrg || employeesWithoutOrg.length === 0) {
      
      return;
    }

    // تحديث كل موظف ليتبع المؤسسة الحالية
    for (const employee of employeesWithoutOrg) {

      const { error: updateError } = await supabase
        .from('users')
        .update({ organization_id: organizationId })
        .eq('id', employee.id);
      
      if (updateError) {
      } else {
        
      }
    }

  } catch (error) {
  }
};
