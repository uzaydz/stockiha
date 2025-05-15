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
    console.log('Employee tables verified');
  } catch (error) {
    console.error('Error ensuring employee tables:', error);
  }
};

// جلب جميع الموظفين
export const getEmployees = async (): Promise<Employee[]> => {
  try {
    // التأكد من وجود جداول الموظفين
    await ensureEmployeeTables();
    
    // تحديث الموظفين الذين ليس لديهم معرف مؤسسة
    await updateEmployeesWithMissingOrganizationId();
    
    console.log('Fetching employees...');
    
    // الحصول على بيانات المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return [];
    }
    
    let organizationId = null;
    
    // الحصول على معرف المؤسسة للمستخدم الحالي
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role, is_org_admin')
      .eq('id', user.id)
      .single();
      
    if (userError) {
      console.error('Error fetching current user organization:', userError);
    }
    
    if (userData && userData.organization_id) {
      organizationId = userData.organization_id;
      console.log(`Using organization ID from user data: ${organizationId}`);
    } else {
      // محاولة استخدام معرف المؤسسة من التخزين المحلي
      const localOrgId = localStorage.getItem('organizationId');
      if (localOrgId) {
        organizationId = localOrgId;
        console.log(`Using organization ID from localStorage: ${organizationId}`);
      } else {
        console.error('No organization ID found for user or in localStorage');
        return [];
      }
    }
    
    console.log(`Fetching employees for organization: ${organizationId}`);
    console.log(`Current user role: ${userData?.role}, is_org_admin: ${userData?.is_org_admin}`);
    
    // استخدام الاستعلام المباشر
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
    
    console.log(`Found ${data?.length || 0} employees`);
    return data || [];
  } catch (err) {
    console.error('Unexpected error in getEmployees:', err);
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
    console.error('Error fetching employee:', error);
    throw new Error(error.message);
  }
  
  return data;
};

// إنشاء موظف جديد
export const createEmployee = async (
  email: string, 
  password: string,
  userData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>
): Promise<Employee> => { 
  console.log('Initiating employee creation via Invite Flow');

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

  console.log(`Attempting employee record creation under organization: ${organizationId}`);

  let createdUserRecord: Employee | null = null;
  let authUserId: string | null = null;

  // 2. Try to create the auth user first
  try {
    console.log(`Attempting to create auth user for: ${email}`);
    
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
      console.error('Error creating auth user:', authError);
      // We'll continue and try to create just the database record
    } else if (authData?.user) {
      console.log(`Successfully created auth user: ${authData.user.id}`);
      authUserId = authData.user.id;
      
      // Sign out immediately after creating the user so admin stays logged in
      await supabase.auth.signOut();
      
      // Sign back in as the admin (important!)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: adminUser.email!,
        password: localStorage.getItem('adminPassword') || '' // Using stored password if available
      });
      
      if (signInError) {
        console.error('Error signing back in as admin:', signInError);
      }
    }
  } catch (error) {
    console.error('Error in auth user creation:', error);
    // Continue with just the database record
  }

  // 3. Create record in public.users via modified RPC (insert only)
  try {
    console.log(`Calling RPC: create_employee_securely (insert only) for email: ${email}`);
    let { data: rpcResult, error: rpcError } = await supabase.rpc(
      'create_employee_securely',
      {
        // Parameters for the modified function (no password)
        employee_email: email,
        employee_password: password,
        employee_name: userData.name,
        p_organization_id: organizationId,
        employee_phone: userData.phone || null,
        employee_permissions: userData.permissions || '{}'
      }
    );

    if (rpcError) {
      console.error('Error calling create_employee_securely (insert only) RPC:', rpcError);
      
      // Handle 404 errors (function not found) by using direct insert as a fallback
      if (rpcError.code === '42883' || rpcError.code === '404') {
        console.log('Falling back to direct user creation method');
        
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
          console.error('Error inserting employee directly:', insertError);
          throw new Error(insertError.message || 'Failed to create employee record directly');
        }
        
        rpcResult = insertedUser;
      } else if (rpcError.message.includes('already exists') || rpcError.code === '23505') {
        if (rpcError.message.includes('is active')) {
          throw new Error('البريد الإلكتروني مستخدم بالفعل لموظف نشط.');
        } else {
          console.warn('User likely exists but was inactive. RPC might have updated the record.');
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
      console.error('RPC create_employee_securely (insert only) did not return a valid record.', rpcResult);
      throw new Error('لم يتم إرجاع بيانات سجل الموظف بعد الإنشاء.');
    }
    createdUserRecord = rpcResult as Employee; 
    console.log('Successfully created/updated employee record in users table:', createdUserRecord);

  } catch (error) { 
    console.error('Error during employee record creation/update:', error);
    throw error; 
  }

  if (!createdUserRecord) {
    throw new Error('Failed to obtain employee record before inviting.');
  }

  // 4. Try to invite the user if we couldn't create them directly
  if (!authUserId) {
    try {
      console.log(`Attempting to invite user by email: ${email}`);
      
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
          console.warn('Admin invite method failed, will create temporary password:', inviteError);
          // Just log but continue - we'll return the user record anyway
        } else {
          console.log(`Successfully sent invitation to ${email}`, inviteData);
        }
      } catch (inviteErr) {
        console.warn('Admin invite method not available:', inviteErr);
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
            console.error('Failed to create auth account via signup:', signupError);
          } else {
            console.log('Created auth account via signup');
            
            // Sign out immediately after creating the user
            await supabase.auth.signOut();
            
            // Sign back in as the admin
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: adminUser.email!,
              password: localStorage.getItem('adminPassword') || '' // Using stored password if available
            });
            
            if (signInError) {
              console.error('Error signing back in as admin:', signInError);
            }
          }
        } catch (signupErr) {
          console.error('Error in final signup attempt:', signupErr);
        }
      }

    } catch (error) {
      console.error('Error during employee invite process:', error);
      console.warn(`Employee record was created with ID ${createdUserRecord.id} but invitation failed.`);
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
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('role', 'employee')
    .select()
    .single();
    
  if (error) {
    console.error('Error updating employee:', error);
    throw new Error(error.message);
  }
  
  return data;
};

// تغيير كلمة مرور الموظف
export const resetEmployeePassword = async (id: string, newPassword: string): Promise<void> => {
  const { error } = await supabase.auth.admin.updateUserById(
    id,
    { password: newPassword }
  );
  
  if (error) {
    console.error('Error resetting employee password:', error);
    throw new Error(error.message);
  }
};

// تغيير حالة نشاط الموظف
export const toggleEmployeeStatus = async (id: string, isActive: boolean): Promise<Employee> => {
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
    console.error('Error toggling employee status:', error);
    throw new Error(error.message);
  }
  
  return data;
};

// حذف موظف
export const deleteEmployee = async (id: string): Promise<void> => {
  // 1. حذف الموظف من جدول users
  const { error: userError } = await supabase
    .from('users')
    .delete()
    .eq('id', id)
    .eq('role', 'employee');
    
  if (userError) {
    console.error('Error deleting employee from users table:', userError);
    throw new Error(userError.message);
  }
  
  // 2. حذف حساب المستخدم من Auth
  const { error: authError } = await supabase.auth.admin.deleteUser(id);
  
  if (authError) {
    console.error('Error deleting employee auth account:', authError);
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
    // تحويل البيانات لتتوافق مع واجهة EmployeeSalary
    const salaryData = {
      employee_id: employeeId,
      amount: data.amount,
      start_date: data.date,
      type: data.type,
      status: data.status,
      notes: data.note
    };
    
    // إضافة الراتب في قاعدة البيانات
    const { data: newSalary, error } = await supabase
      .from('employee_salaries')
      .insert(salaryData)
      .select('*')
      .single();

    if (error) throw error;
    return newSalary;
  } catch (error) {
    console.error('Error adding employee salary:', error);
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
    console.error('Error fetching employee salaries:', error);
    throw new Error(error.message);
  }
  
  return data || [];
};

// إضافة نشاط للموظف
export const addEmployeeActivity = async (activity: Omit<EmployeeActivity, 'id' | 'created_at'>): Promise<EmployeeActivity> => {
  // التحقق من وجود جدول employee_activities، وإنشاءه إذا لم يكن موجودًا
  try {
    await supabase.rpc('create_employee_activities_if_not_exists');
  } catch (error) {
    console.error('Error ensuring employee_activities table:', error);
  }
  
  const { data, error } = await supabase
    .from('employee_activities')
    .insert([{
      employee_id: activity.employee_id,
      action_type: activity.action_type,
      action_details: activity.action_details,
      related_entity: activity.related_entity,
      related_entity_id: activity.related_entity_id,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();
    
  if (error) {
    console.error('Error adding employee activity:', error);
    throw new Error(error.message);
  }
  
  return data;
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
    console.error('Error fetching employee activities:', error);
    throw new Error(error.message);
  }
  
  return data || [];
};

// جلب إحصائيات الموظفين
export const getEmployeeStats = async (): Promise<{
  total: number;
  active: number;
  inactive: number;
}> => {
  try {
    console.log('Fetching employee stats...');
    
    // Obtener información del usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return { total: 0, active: 0, inactive: 0 };
    }
    
    let organizationId = null;
    
    // Obtener el ID de la organización del usuario actual
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role, is_org_admin')
      .eq('id', user.id)
      .single();
      
    if (userError) {
      console.error('Error fetching current user organization:', userError);
    }
    
    if (userData && userData.organization_id) {
      organizationId = userData.organization_id;
      console.log(`Using organization ID from user data: ${organizationId}`);
    } else {
      // محاولة استخدام معرف المؤسسة من التخزين المحلي
      const localOrgId = localStorage.getItem('organizationId');
      if (localOrgId) {
        organizationId = localOrgId;
        console.log(`Using organization ID from localStorage: ${organizationId}`);
      } else {
        console.error('No organization ID found for user or in localStorage');
        return { total: 0, active: 0, inactive: 0 };
      }
    }
    
    console.log(`Fetching employee stats for organization: ${organizationId}`);
    console.log(`Current user role: ${userData?.role}, is_org_admin: ${userData?.is_org_admin}`);
    
    // Consulta directa para estadísticas
    // إجمالي عدد الموظفين
    const { count: total, error: totalError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'employee')
      .eq('organization_id', organizationId);
      
    if (totalError) {
      console.error('Error fetching total employees count:', totalError);
      return { total: 0, active: 0, inactive: 0 };
    }
    
    // عدد الموظفين النشطين
    const { count: active, error: activeError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'employee')
      .eq('organization_id', organizationId)
      .eq('is_active', true);
      
    if (activeError) {
      console.error('Error fetching active employees count:', activeError);
      return { total: 0, active: 0, inactive: 0 };
    }
    
    // عدد الموظفين غير النشطين
    const { count: inactive, error: inactiveError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'employee')
      .eq('organization_id', organizationId)
      .eq('is_active', false);
      
    if (inactiveError) {
      console.error('Error fetching inactive employees count:', inactiveError);
      return { total: 0, active: 0, inactive: 0 };
    }
    
    const stats = {
      total: total || 0,
      active: active || 0,
      inactive: inactive || 0
    };
    
    console.log('Employee stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error fetching employee stats:', error);
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
      console.error('Error fetching employee orders count:', ordersError);
      throw ordersError;
    }
    
    // إجمالي المبيعات
    const { data: salesData, error: salesError } = await supabase
      .from('orders')
      .select('total')
      .eq('employee_id', employeeId);
      
    if (salesError) {
      console.error('Error fetching employee sales total:', salesError);
      throw salesError;
    }
    
    const salesTotal = salesData?.reduce((sum, order) => {
      return sum + (parseFloat(order.total) || 0);
    }, 0) || 0;
    
    // عدد الخدمات التي قدمها الموظف - تصحيح اسم الحقل
    const { count: servicesCount, error: servicesError } = await supabase
      .from('service_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', employeeId);
      
    if (servicesError) {
      console.error('Error fetching employee services count:', servicesError);
      throw servicesError;
    }
    
    return {
      ordersCount: ordersCount || 0,
      salesTotal,
      servicesCount: servicesCount || 0
    };
  } catch (error) {
    console.error('Error fetching employee performance:', error);
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
      console.error('Error getting current user:', error);
      return { error };
    }
    
    if (!user) {
      console.log('No authenticated user found');
      return { status: 'no-user' };
    }
    
    console.log('Current user:', {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata
    });
    
    return {
      status: 'authenticated',
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      }
    };
  } catch (err) {
    console.error('Unexpected error checking user status:', err);
    return { error: err };
  }
};

// تحديث الموظفين الذين ليس لديهم معرف مؤسسة
export const updateEmployeesWithMissingOrganizationId = async (): Promise<void> => {
  try {
    // الحصول على بيانات المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found when updating employees');
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
      console.error('Error fetching current user organization:', userError);
      return;
    }
    
    if (userData && userData.organization_id) {
      organizationId = userData.organization_id;
      console.log(`Using organization ID from user data for updating employees: ${organizationId}`);
    } else {
      // محاولة استخدام معرف المؤسسة من التخزين المحلي
      const localOrgId = localStorage.getItem('organizationId');
      if (localOrgId) {
        organizationId = localOrgId;
        console.log(`Using organization ID from localStorage for updating employees: ${organizationId}`);
      } else {
        console.error('No organization ID found for user or in localStorage');
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
      console.error('Error finding employees without organization ID:', findError);
      return;
    }
    
    if (!employeesWithoutOrg || employeesWithoutOrg.length === 0) {
      console.log('No employees found without organization ID');
      return;
    }
    
    console.log(`Found ${employeesWithoutOrg.length} employees without organization ID`);
    
    // تحديث كل موظف ليتبع المؤسسة الحالية
    for (const employee of employeesWithoutOrg) {
      console.log(`Updating employee ${employee.name} (${employee.id}) with organization ID: ${organizationId}`);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ organization_id: organizationId })
        .eq('id', employee.id);
      
      if (updateError) {
        console.error(`Error updating organization ID for employee ${employee.id}:`, updateError);
      } else {
        console.log(`Successfully updated organization ID for employee ${employee.name}`);
      }
    }
    
    console.log('Finished updating employees with missing organization ID');
  } catch (error) {
    console.error('Error in updateEmployeesWithMissingOrganizationId:', error);
  }
}; 