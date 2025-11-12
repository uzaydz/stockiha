import { supabase } from '@/lib/supabase';
import { 
  Employee, 
  EmployeeFilter, 
  EmployeeStats, 
  EmployeeWithStats, 
  EmployeeSalary,
  EmployeeActivity,
  EmployeePermissions
} from '@/types/employee';
import { inventoryDB } from '@/database/localDb';

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
  }
  
  // استخدام cache إذا كان حديثاً
  if (cachedOrganizationId && (now - lastOrgFetch) < ORG_CACHE_DURATION) {
    if (process.env.NODE_ENV === 'development') {
    }
    return cachedOrganizationId;
  }
  
  try {
    // أولاً، محاولة استخدام معرف المؤسسة من التخزين المحلي (أسرع)
    const localOrgId = localStorage.getItem('organizationId');
    if (localOrgId) {
      if (process.env.NODE_ENV === 'development') {
      }
      cachedOrganizationId = localOrgId;
      lastOrgFetch = now;
      return cachedOrganizationId;
    }
    
    if (process.env.NODE_ENV === 'development') {
    }
    
    // الحصول على بيانات المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
      }
      return null;
    }
    
    // البحث بـ auth_user_id أولاً ثم بـ id
    let userData = null;
    let userError = null;
    
    // محاولة البحث بـ auth_user_id
    try {
      const authResult = await supabase
        .from('users')
        .select('organization_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      
      if (!authResult.error && authResult.data?.organization_id) {
        userData = authResult.data;
      }
    } catch (err) {
      // تجاهل الخطأ والمحاولة التالية
    }
    
    // إذا لم نجد بـ auth_user_id، نحاول بـ id
    if (!userData) {
      try {
        const idResult = await supabase
          .from('users')
          .select('organization_id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        
        if (!idResult.error && idResult.data?.organization_id) {
          userData = idResult.data;
        }
      } catch (err) {
        // تجاهل الخطأ
      }
    }
      
    if (userData?.organization_id) {
      if (process.env.NODE_ENV === 'development') {
      }
      cachedOrganizationId = userData.organization_id;
      lastOrgFetch = now;
      // حفظ في التخزين المحلي للمرات القادمة
      localStorage.setItem('organizationId', userData.organization_id);
      return cachedOrganizationId;
    }
    
    if (process.env.NODE_ENV === 'development') {
    }
    return null;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
    }
    return null;
  }
};

export const getEmployees = async (): Promise<Employee[]> => {
  const now = Date.now();
  performanceStats.employeesRequests++;
  
  if (process.env.NODE_ENV === 'development') {
  }
  
  // بدء تتبع الأداء عند أول استخدام
  startPerformanceTracking();
  
  // استخدام cache إذا كان حديثاً
  if (cachedEmployees && (now - lastEmployeesFetch) < EMPLOYEES_CACHE_DURATION) {
    if (process.env.NODE_ENV === 'development') {
    }
    performanceStats.employeesCacheHits++;
    return cachedEmployees;
  }
  
  // إذا كان هناك طلب جاري، انتظر نتيجته بدلاً من إنشاء طلب جديد
  if (ongoingEmployeesRequest) {
    if (process.env.NODE_ENV === 'development') {
    }
    performanceStats.duplicateRequestsBlocked++;
    return await ongoingEmployeesRequest;
  }
  
  if (process.env.NODE_ENV === 'development') {
  }
  // إنشاء طلب جديد
  ongoingEmployeesRequest = performGetEmployees();
  
  try {
    const result = await ongoingEmployeesRequest;
    
    // حفظ في cache
    cachedEmployees = result;
    lastEmployeesFetch = now;
    
    if (process.env.NODE_ENV === 'development') {
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
    }
    
    // الحصول على معرف المؤسسة (مع cache)
    const organizationId = await getOrganizationId();
    
    if (!organizationId) {
      if (process.env.NODE_ENV === 'development') {
      }
      return [];
    }

    if (process.env.NODE_ENV === 'development') {
    }

    // استخدام الاستعلام المباشر بدون استدعاءات إضافية
    if (process.env.NODE_ENV === 'development') {
    }
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'employee')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (error) {
      return [];
    }

    if (process.env.NODE_ENV === 'development') {
    }

    // إضافة رسالة تشخيص إذا لم يتم العثور على موظفين
    if (!data || data.length === 0) {
      if (process.env.NODE_ENV === 'development') {
      }
    }

    // تحويل البيانات للنوع المطلوب مع معالجة آمنة للأنواع
    if (process.env.NODE_ENV === 'development') {
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
      permissions: user.permissions || {
        accessPOS: false,
        manageOrders: false,
        processPayments: false,
        manageUsers: false,
        viewReports: false,
        manageProducts: false,
        manageServices: false,
        manageEmployees: false,
        viewOrders: false,
        viewPOSOrders: false,
        // إضافة الصلاحيات الجديدة
        viewProducts: false,
        addProducts: false,
        editProducts: false,
        deleteProducts: false,
        manageProductCategories: false,
        manageInventory: false,
        viewInventory: false,
        viewServices: false,
        addServices: false,
        editServices: false,
        deleteServices: false,
        trackServices: false,
        updateOrderStatus: false,
        cancelOrders: false,
        viewCustomers: false,
        manageCustomers: false,
        viewDebts: false,
        recordDebtPayments: false,
        viewCustomerDebtHistory: false,
        viewSuppliers: false,
        manageSuppliers: false,
        managePurchases: false,
        viewEmployees: false,
        viewFinancialReports: false,
        viewSalesReports: false,
        viewInventoryReports: false,
        viewCustomerReports: false,
        exportReports: false,
        viewSettings: false,
        manageProfileSettings: false,
        manageAppearanceSettings: false,
        manageSecuritySettings: false,
        manageNotificationSettings: false,
        manageOrganizationSettings: false,
        manageBillingSettings: false,
        manageIntegrations: false,
        manageAdvancedSettings: false,
        manageFlexi: false,
        manageFlexiAndDigitalCurrency: false,
        sellFlexiAndDigitalCurrency: false,
        viewFlexiAndDigitalCurrencySales: false
      }
    })) as unknown as Employee[];
    
    // تحديث كاش SQLite للاستخدام الأوفلاين
    try {
      for (const e of transformedEmployees) {
        await inventoryDB.employees.put({
          id: e.id,
          auth_user_id: e.user_id,
          name: e.name,
          email: e.email,
          phone: e.phone,
          role: e.role,
          is_active: e.is_active,
          organization_id: e.organization_id,
          permissions: e.permissions || {},
          created_at: e.created_at,
          updated_at: e.updated_at
        } as any);
      }
    } catch {}

    if (process.env.NODE_ENV === 'development') {
    }
    return transformedEmployees;
  } catch (err) {
    // فallback أوفلاين: قراءة الموظفين من SQLite
    try {
      const orgId = localStorage.getItem('organizationId') || localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id');
      if (!orgId) return [];
      const rows = await inventoryDB.employees.where({ organization_id: orgId }).toArray();
      return (rows || []).map((r: any) => ({
        id: r.id,
        user_id: r.auth_user_id || r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        role: (r.role || 'employee') as 'employee' | 'admin',
        is_active: r.is_active !== false,
        last_login: null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        organization_id: r.organization_id,
        permissions: typeof r.permissions === 'object' ? r.permissions : {}
      })) as Employee[];
    } catch {
      return [];
    }
  }
};

// جلب موظف محدد بواسطة المعرف
export const getEmployeeById = async (id: string): Promise<Employee | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('role', 'employee')
      .single();

    if (error) throw error;

    // حفظ/تحديث في SQLite
    try {
      await inventoryDB.employees.put({
        id: data.id,
        auth_user_id: data.auth_user_id || data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        is_active: data.is_active,
        organization_id: data.organization_id,
        permissions: data.permissions || {},
        created_at: data.created_at,
        updated_at: data.updated_at
      } as any);
    } catch {}

    return {
      ...data,
      role: data.role as 'employee' | 'admin',
      permissions: typeof data.permissions === 'object' ? data.permissions : {}
    } as unknown as Employee;
  } catch (onlineErr) {
    // فallback أوفلاين
    try {
      const r: any = await inventoryDB.employees.get(id);
      if (!r) return null;
      return {
        id: r.id,
        user_id: r.auth_user_id || r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        role: (r.role || 'employee') as 'employee' | 'admin',
        is_active: r.is_active !== false,
        last_login: null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        organization_id: r.organization_id,
        permissions: typeof r.permissions === 'object' ? r.permissions : {}
      } as Employee;
    } catch {
      return null;
    }
  }
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
    .maybeSingle();

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

// دالة محسنة لإنشاء الموظفين - تقلل الاستدعاءات والتعقيد
export const createEmployeeOptimized = async (
  email: string,
  password: string,
  userData: Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'user_id'>
): Promise<Employee> => {
  // مسح Cache عند إضافة موظف جديد
  clearEmployeeCache();

  try {
    if (process.env.NODE_ENV === 'development') {
    }

    // الحصول على بيانات المستخدم الحالي
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      throw new Error('المستخدم غير مصادق عليه');
    }

    // الحصول على بيانات المستخدم من جدول users
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('auth_user_id', currentUser.id)
      .single();

    if (userError || !currentUserData) {
      throw new Error('فشل في الحصول على بيانات المستخدم الحالي');
    }

    // التحقق من صلاحيات المستخدم الحالي
    if (!['admin', 'super_admin'].includes(currentUserData.role)) {
      throw new Error('ليس لديك صلاحية لإضافة موظفين');
    }

    // استدعاء الدالة الموحدة مع تمرير معرف المؤسسة
    const { data, error } = await supabase.rpc('create_employee_unified' as any, {
      p_email: email,
      p_password: password,
      p_name: userData.name,
      p_phone: userData.phone || null,
      p_job_title: (userData as any).job_title || null,
      p_permissions: userData.permissions || {},
      p_organization_id: currentUserData.organization_id
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data || !data.success) {
      const errorMsg = data?.error || 'فشل في إنشاء الموظف';
      throw new Error(errorMsg);
    }

    const employee = data.employee;

    if (process.env.NODE_ENV === 'development') {
    }

    // DISABLED: إنشاء مستخدم المصادقة بشكل منفصل لتجنب تسجيل الدخول التلقائي
    // سيتم إنشاء مستخدم المصادقة عبر دعوة بالبريد الإلكتروني أو Admin Panel

    if (process.env.NODE_ENV === 'development') {
    }

    return {
      id: employee.id,
      user_id: employee.user_id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role as 'employee' | 'admin',
      is_active: employee.is_active,
      last_login: null,
      created_at: employee.created_at,
      updated_at: employee.updated_at,
      organization_id: employee.organization_id,
      permissions: employee.permissions || {
        accessPOS: false,
        manageOrders: false,
        processPayments: false,
        manageUsers: false,
        viewReports: false,
        manageProducts: false,
        manageServices: false,
        manageEmployees: false,
        viewOrders: false,
        viewPOSOrders: false
      }
    } as Employee;

  } catch (err) {
    throw err;
  }
};

// إنشاء موظف جديد بصلاحيات كاملة عبر RPC الموحدة
export const createEmployeeWithAllPermissions = async (
  email: string,
  password: string,
  userData: { name: string; phone?: string | null; job_title?: string | null },
  permissions?: EmployeePermissions
): Promise<Employee> => {
  // مسح Cache عند إضافة موظف جديد
  clearEmployeeCache();

  const { data, error } = await supabase.rpc('manage_employee' as any, {
    p_action: 'create',
    p_payload: {
      email,
      password,
      name: userData.name,
      phone: userData.phone || null,
      job_title: userData.job_title || null,
      create_auth: true,
      // تمرير الصلاحيات المحددة إن وُجدت؛ إن لم تُمرر سيمنح RPC جميع الصلاحيات افتراضيًا
      ...(permissions ? { permissions } : {})
    }
  });

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.success !== true || !data.employee) {
    throw new Error((data && (data.error || data.code)) || 'فشل إنشاء الموظف');
  }

  const e = data.employee;
  // تحويل البيانات للنوع المطلوب
  let created: Employee = {
    id: e.id,
    user_id: e.user_id,
    name: e.name,
    email: e.email,
    phone: e.phone,
    role: e.role as 'employee' | 'admin',
    is_active: e.is_active,
    last_login: null,
    created_at: e.created_at,
    updated_at: e.updated_at,
    organization_id: e.organization_id,
    permissions: e.permissions || {}
  } as Employee;

  // إذا لم يتم إنشاء حساب Auth من داخل قاعدة البيانات، نفّذ وظيفة الحافة لربطه دون تغيير جلسة المشرف
  try {
    if (created.user_id === created.id) {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      const { data: fnRes, error: fnErr } = await (supabase.functions as any).invoke('create-auth-employee', {
        body: { email, password, name: userData.name, employee_id: created.id },
        headers: {
          ...authHeader,
        }
      });
      if (!fnErr && fnRes?.auth_user_id) {
        created = { ...created, user_id: fnRes.auth_user_id } as Employee;
      }
    }
  } catch (_) {
    // تجاهل أي خطأ هنا، سنُعيد السجل على أي حال
  }

  return created;
};

// دالة منفصلة لإرسال دعوة للموظف بدون تسجيل دخول تلقائي
export const inviteEmployeeAuth = async (
  employeeId: string,
  email: string,
  name: string
): Promise<{ success: boolean; message: string }> => {
  try {
    if (process.env.NODE_ENV === 'development') {
    }

    // الحصول على بيانات المستخدم الحالي للتأكد من صلاحياته
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'المستخدم غير مصادق عليه'
      };
    }

    // التحقق من صلاحيات المستخدم الحالي
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('auth_user_id', currentUser.id)
      .single();

    if (userError || !currentUserData) {
      return {
        success: false,
        message: 'فشل في التحقق من صلاحيات المستخدم'
      };
    }

    if (!['admin', 'super_admin'].includes(currentUserData.role)) {
      return {
        success: false,
        message: 'ليس لديك صلاحية لإرسال دعوات للموظفين'
      };
    }

    // الحصول على بيانات الموظف
    const { data: employeeData, error: employeeError } = await supabase
      .from('users')
      .select('organization_id, email')
      .eq('id', employeeId)
      .eq('organization_id', currentUserData.organization_id) // التأكد من أن الموظف في نفس المؤسسة
      .single();

    if (employeeError || !employeeData?.organization_id) {
      return {
        success: false,
        message: 'فشل في العثور على الموظف أو ليس لديك صلاحية الوصول إليه'
      };
    }

    // استخدام API endpoint الآمن لإرسال الدعوة
    try {
      const response = await fetch('/api/admin/invite-employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId,
          email,
          name,
          organizationId: employeeData.organization_id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'فشل في إرسال الدعوة'
        };
      }

      if (result.success) {
        // تحديث معرف المصادقة في قاعدة البيانات إذا تم إرجاعه
        if (result.data?.user_id) {
          await supabase
            .from('users')
            .update({ auth_user_id: result.data.user_id })
            .eq('id', employeeId);
        }

        return {
          success: true,
          message: 'تم إرسال دعوة بالبريد الإلكتروني للموظف بنجاح'
        };
      } else {
        return {
          success: false,
          message: result.message || 'فشل في إرسال الدعوة'
        };
      }

    } catch (apiError) {
      return {
        success: false,
        message: `فشل في الاتصال بالخادم: ${apiError.message}. يمكنك إعادة المحاولة لاحقاً.`
      };
    }

  } catch (err) {
    return {
      success: false,
      message: `حدث خطأ غير متوقع: ${err.message}`
    };
  }
};

// تحديث بيانات موظف
export const updateEmployee = async (
  id: string,
  updates: Partial<Omit<Employee, 'id' | 'created_at'>>
): Promise<Employee> => {
  // مسح Cache عند تحديث موظف
  clearEmployeeCache();

  // نمرر permissions بشكل صريح إن وُجدت مع باقي الحقول
  const { permissions, ...otherUpdates } = updates;
  const processedUpdates: Record<string, any> = {
    ...otherUpdates,
    updated_at: new Date().toISOString(),
  };
  if (typeof permissions === 'object') {
    processedUpdates.permissions = permissions;
  }

  // المحاولة الأولى: تحديث مباشر عبر RLS (للمسؤول في نفس المؤسسة)
  const { data, error } = await supabase
    .from('users')
    .update(processedUpdates)
    .eq('id', id)
    .eq('role', 'employee')
    .select()
    .single();

  if (!error && data) {
    return {
      ...data,
      role: data.role as 'employee' | 'admin',
      permissions: typeof data.permissions === 'object' ? data.permissions : {},
    } as unknown as Employee;
  }

  // المحاولة الثانية: استخدام RPC موحد إذا فشل RLS (يتطلب توفر manage_employee في السيرفر)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('manage_employee' as any, {
      p_action: 'upsert',
      p_payload: {
        employee_id: id,
        // عند عدم تمرير البريد/الاسم سيحتفظ الـ RPC بالقيم الحالية
        ...(processedUpdates.name ? { name: processedUpdates.name } : {}),
        ...(processedUpdates.email ? { email: processedUpdates.email } : {}),
        ...(processedUpdates.phone ? { phone: processedUpdates.phone } : {}),
        ...(processedUpdates.permissions ? { permissions: processedUpdates.permissions } : {}),
      },
    });

    if (rpcError) throw rpcError;
    if (!rpcData?.success || !rpcData?.employee) {
      throw new Error(rpcData?.error || 'فشل في تحديث الموظف عبر RPC');
    }

    const e = rpcData.employee;
    return {
      id: e.id,
      user_id: e.user_id,
      name: e.name,
      email: e.email,
      phone: e.phone,
      role: e.role as 'employee' | 'admin',
      is_active: e.is_active,
      last_login: e.last_login ?? null,
      created_at: e.created_at,
      updated_at: e.updated_at,
      organization_id: e.organization_id,
      permissions: e.permissions || {},
    } as Employee;
  } catch (fallbackErr: any) {
    // إن فشل كلا المسارين، أعد الخطأ الأصلي الأكثر وضوحاً إن وجد
    if (error) {
      throw new Error(error.message);
    }
    throw new Error(fallbackErr?.message || 'فشل تحديث الموظف');
  }
};

// تغيير كلمة مرور الموظف
// إعادة تعيين كلمة المرور - آمن عبر Edge Function/ RPC من السيرفر فقط
// ملاحظة: لا يجوز استخدام admin SDK في المتصفح. هذه الدالة تستدعي Function مخصصة على السيرفر.
export const resetEmployeePassword = async (employeeAuthUserId: string, newPassword: string): Promise<void> => {
  if (!employeeAuthUserId) {
    throw new Error('auth_user_id مفقود للموظف');
  }

  // المحاولة الأولى: RPC آمن على قاعدة البيانات (يوصى به مع RLS والتحقق داخل الدالة)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_reset_user_password' as any, {
      p_auth_user_id: employeeAuthUserId,
      p_new_password: newPassword,
    });
    if (rpcError) throw rpcError;
    if (!rpcData || rpcData.success !== true) {
      throw new Error((rpcData && (rpcData.error || rpcData.code)) || 'فشل إعادة تعيين كلمة المرور');
    }
    return;
  } catch (rpcErr: any) {
    // فالباك: Edge Function (إذا كانت مفعلة في بيئة المشروع)
    const { data, error } = await (supabase.functions as any).invoke('admin-reset-user-password', {
      body: { auth_user_id: employeeAuthUserId, new_password: newPassword },
    });
    if (error) {
      throw new Error(error.message || rpcErr?.message || 'فشل في تغيير كلمة المرور');
    }
    if (!data || data.success !== true) {
      throw new Error((data && (data.error || data.code)) || rpcErr?.message || 'فشل إعادة تعيين كلمة المرور');
    }
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
  // استخدام RPC الموحدة لإدارة الموظفين (تحذف من قاعدة البيانات وتحاول حذف حساب Auth إذا كان متاحًا)
  const { data, error } = await supabase.rpc('manage_employee' as any, {
    p_action: 'delete',
    p_payload: { employee_id: id }
  });

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.success !== true) {
    throw new Error((data && (data.error || data.code)) || 'فشل حذف الموظف');
  }
};

// RPC موحد لإنشاء أو حذف موظف من خلال دالة واحدة
export const manageEmployee = async (
  action: 'create' | 'delete',
  payload: Record<string, any>
): Promise<any> => {
  const { data, error } = await supabase.rpc('manage_employee' as any, {
    p_action: action,
    p_payload: payload
  });
  if (error) throw error;
  return data;
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
      return { total: 0, active: 0, inactive: 0 };
    }
    
    const stats = {
      total: totalResult.count || 0,
      active: activeResult.count || 0,
      inactive: inactiveResult.count || 0
    };

    if (process.env.NODE_ENV === 'development') {
    }

    return stats;
  } catch (error) {
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
      .maybeSingle();
      
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

// جلب جميع الموظفين مع إحصائياتهم في استدعاء واحد فقط - دالة محسنة
export const getEmployeesWithStats = async (): Promise<{
  employees: Employee[];
  stats: EmployeeStats;
}> => {
  const now = Date.now();
  
  // بدء تتبع الأداء عند أول استخدام
  startPerformanceTracking();
  
  // تحديث إحصائيات الطلبات
  performanceStats.employeesRequests++;
  performanceStats.statsRequests++;
  
  if (process.env.NODE_ENV === 'development') {
  }
  
  // فحص الـ cache للبيانات المدمجة
  const employeesCacheValid = cachedEmployees && (now - lastEmployeesFetch) < EMPLOYEES_CACHE_DURATION;
  const statsCacheValid = cachedStats && (now - lastStatsFetch) < STATS_CACHE_DURATION;
  
  if (employeesCacheValid && statsCacheValid) {
    if (process.env.NODE_ENV === 'development') {
    }
    performanceStats.employeesCacheHits++;
    performanceStats.statsCacheHits++;
    return {
      employees: cachedEmployees,
      stats: cachedStats
    };
  }
  
  try {
    if (process.env.NODE_ENV === 'development') {
    }
    
    // الحصول على معرف المؤسسة
    const organizationId = await getOrganizationId();
    
    if (!organizationId) {
      if (process.env.NODE_ENV === 'development') {
      }
      return {
        employees: [],
        stats: { total: 0, active: 0, inactive: 0 }
      };
    }
    
    // استدعاء الـ RPC function الجديدة المحسنة
    const { data, error } = await supabase.rpc('get_employees_with_stats' as any, {
      p_organization_id: organizationId
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    if (!data) {
      if (process.env.NODE_ENV === 'development') {
      }
      return {
        employees: [],
        stats: { total: 0, active: 0, inactive: 0 }
      };
    }
    
    // إضافة تشخيص مفصل للبيانات المُسترجعة
    if (process.env.NODE_ENV === 'development') {
    }
    
    // معالجة البيانات المُسترجعة
    const employeesArray = (data as any)?.employees || [];
    const employees = employeesArray.map((emp: any) => ({
      id: emp.id,
      user_id: emp.user_id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      role: emp.role as 'employee' | 'admin',
      is_active: emp.is_active,
      last_login: emp.last_login,
      created_at: emp.created_at,
      updated_at: emp.updated_at,
      organization_id: emp.organization_id,
      permissions: emp.permissions || {
        accessPOS: false,
        manageOrders: false,
        processPayments: false,
        manageUsers: false,
        viewReports: false,
        manageProducts: false,
        manageServices: false,
        manageEmployees: false,
        viewOrders: false,
        viewPOSOrders: false,
        // إضافة الصلاحيات الجديدة
        viewProducts: false,
        addProducts: false,
        editProducts: false,
        deleteProducts: false,
        manageProductCategories: false,
        manageInventory: false,
        viewInventory: false,
        viewServices: false,
        addServices: false,
        editServices: false,
        deleteServices: false,
        trackServices: false,
        updateOrderStatus: false,
        cancelOrders: false,
        viewCustomers: false,
        manageCustomers: false,
        viewDebts: false,
        recordDebtPayments: false,
        viewCustomerDebtHistory: false,
        viewSuppliers: false,
        manageSuppliers: false,
        managePurchases: false,
        viewEmployees: false,
        viewFinancialReports: false,
        viewSalesReports: false,
        viewInventoryReports: false,
        viewCustomerReports: false,
        exportReports: false,
        viewSettings: false,
        manageProfileSettings: false,
        manageAppearanceSettings: false,
        manageSecuritySettings: false,
        manageNotificationSettings: false,
        manageOrganizationSettings: false,
        manageBillingSettings: false,
        manageIntegrations: false,
        manageAdvancedSettings: false,
        manageFlexi: false,
        manageFlexiAndDigitalCurrency: false,
        sellFlexiAndDigitalCurrency: false,
        viewFlexiAndDigitalCurrencySales: false
      }
    })) as Employee[];
    
    const stats = (data as any)?.stats || { total: 0, active: 0, inactive: 0 };
    
    // تحديث الـ cache
    cachedEmployees = employees;
    cachedStats = stats;
    lastEmployeesFetch = now;
    lastStatsFetch = now;
    
    if (process.env.NODE_ENV === 'development') {
    }
    
    return { employees, stats };
    
  } catch (err) {
    return {
      employees: [],
      stats: { total: 0, active: 0, inactive: 0 }
    };
  }
};
