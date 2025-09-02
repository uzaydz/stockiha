import { supabase } from '@/lib/supabase';
import { Customer } from '@/types/customer';
import { getCurrentUserProfile } from './users';

// Fetch all customers
export const getCustomers = async (): Promise<Customer[]> => {
  // Get current user to filter by created_by
  const currentUser = await getCurrentUserProfile();
  
  // Get the organization ID for filtering
  let organizationId = null;
  
  // Try to get organization ID from current user
  if (currentUser && 'organization_id' in currentUser) {
    organizationId = currentUser.organization_id;
  } else {
    // Try to get from localStorage as fallback
    organizationId = localStorage.getItem('bazaar_organization_id');
  }
  
  if (!organizationId) {
    return [];
  }

  // Get all customers from the organization
  const { data: orgCustomers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(error.message);
  }
  
  // Get customers from users table with role 'customer' - محاولة أولى بـ auth_user_id
  let { data: userCustomers, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'customer')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  
  // إذا فشل، جرب البحث بـ id
  if (userError) {
    const { data: idData, error: idError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'customer')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
      
    if (!idError && idData) {
      userCustomers = idData;
      userError = null;
    }
  }
  
  // Filter out any entries with the problematic ID '00000000-0000-0000-0000-000000000000'
  const filteredOrgCustomers = orgCustomers?.filter(customer => 
    customer.id !== '00000000-0000-0000-0000-000000000000'
  ) || [];
  
  const filteredUserCustomers = userCustomers?.filter(user => 
    user.id !== '00000000-0000-0000-0000-000000000000'
  ) || [];
  
  // Map user customers to customer format and combine with org customers
  const mappedUserCustomers = filteredUserCustomers.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    organization_id: user.organization_id,
    created_at: user.created_at,
    updated_at: user.updated_at
  }));
  
  // Create a map to track IDs we've already included
  const includedIds = new Map();
  const allCustomers = [];
  
  // Add org customers first
  for (const customer of filteredOrgCustomers) {
    includedIds.set(customer.id, true);
    allCustomers.push(customer);
  }
  
  // Then add user customers, but only if we haven't already included this ID
  for (const customer of mappedUserCustomers) {
    if (!includedIds.has(customer.id)) {
      includedIds.set(customer.id, true);
      allCustomers.push(customer);
    }
  }
  
  return allCustomers;
};

// Fetch a single customer by ID
export const getCustomerById = async (id: string): Promise<Customer | null> => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

// Get customer orders count - تحديث لاستخدام البحث عن طريق اسم ومعرف العميل
export const getCustomerOrdersCount = async (customerId: string): Promise<number> => {
  try {
    // فحص طريقة 1: البحث المباشر باستخدام المعرف
    const { count: countById, error: errorById } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId);
      
    if (errorById) {
    }
    
    // فحص طريقة 2: البحث من خلال الملاحظات التي تحتوي على معرف العميل
    const { count: countByNotes, error: errorByNotes } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .ilike('notes', `%${customerId}%`);
      
    if (errorByNotes) {
    }
    
    // الحصول على العميل للبحث عن اسمه في الملاحظات
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('name')
      .eq('id', customerId)
      .single();
      
    if (customerError) {
    }
    
    let countByName = 0;
    if (customer?.name) {
      // فحص طريقة 3: البحث من خلال الملاحظات التي تحتوي على اسم العميل
      const { count: nameCount, error: nameError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .ilike('notes', `%${customer.name}%`);
        
      if (nameError) {
      } else {
        countByName = nameCount || 0;
      }
    }
    
    // إجمالي العدد من جميع الطرق (استبعاد التكرارات غير ممكن هنا بسهولة،
    // لذلك نختار القيمة الأكبر منهما للتقريب)
    const maxCount = Math.max(
      countById || 0,
      countByNotes || 0,
      countByName || 0
    );
    
    return maxCount;
  } catch (error) {
    return 0; // نعيد 0 في حالة حدوث خطأ
  }
};

// Get customer orders total value - تحديث لاستخدام البحث عن طريق اسم ومعرف العميل
export const getCustomerOrdersTotal = async (customerId: string): Promise<number> => {
  try {
    // فحص طريقة 1: البحث المباشر باستخدام المعرف
    const { data: ordersById, error: errorById } = await supabase
      .from('orders')
      .select('total')
      .eq('customer_id', customerId);
      
    if (errorById) {
    }
    
    // فحص طريقة 2: البحث من خلال الملاحظات التي تحتوي على معرف العميل
    const { data: ordersByNotes, error: errorByNotes } = await supabase
      .from('orders')
      .select('total')
      .ilike('notes', `%${customerId}%`);
      
    if (errorByNotes) {
    }
    
    // الحصول على العميل للبحث عن اسمه في الملاحظات
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('name')
      .eq('id', customerId)
      .single();
      
    if (customerError) {
    }
    
    let ordersByName: any[] = [];
    if (customer?.name) {
      // فحص طريقة 3: البحث من خلال الملاحظات التي تحتوي على اسم العميل
      const { data: nameOrders, error: nameError } = await supabase
        .from('orders')
        .select('total')
        .ilike('notes', `%${customer.name}%`);
        
      if (nameError) {
      } else {
        ordersByName = nameOrders || [];
      }
    }
    
    // جمع كل الطلبات في مصفوفة واحدة
    const allOrders = [
      ...(ordersById || []),
      ...(ordersByNotes || []),
      ...(ordersByName || [])
    ];
    
    // حساب المجموع (مع احتمالية وجود تكرارات)
    const total = allOrders.reduce((sum, order) => {
      return sum + (parseFloat(order.total) || 0);
    }, 0);
    
    return total;
  } catch (error) {
    return 0; // نعيد 0 في حالة حدوث خطأ
  }
};

// Create a new customer with conflict handling
export const createCustomer = async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> => {
  // أولاً: البحث عن عميل موجود بنفس الهاتف والمؤسسة
  if (customer.phone) {
    const { data: existingCustomer, error: searchError } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', customer.phone)
      .eq('organization_id', customer.organization_id)
      .single();
      
    if (!searchError && existingCustomer) {
      // تحديث العميل الموجود بالبيانات الجديدة
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({
          name: customer.name,
          email: customer.email || existingCustomer.email,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCustomer.id)
        .select()
        .single();
        
      if (!updateError && updatedCustomer) {
        return updatedCustomer;
      }
    }
  }
  
  // ثانياً: محاولة إنشاء عميل جديد
  const { data, error } = await supabase
    .from('customers')
    .insert({ 
      ...customer,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
    
  if (error) {
    // إذا كان الخطأ بسبب تكرار (409 Conflict) رغم الفحص المسبق
    if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
      // محاولة أخيرة للبحث والتحديث
      if (customer.phone) {
        const { data: lastResortCustomer, error: lastSearchError } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', customer.phone)
          .eq('organization_id', customer.organization_id)
          .single();
          
        if (!lastSearchError && lastResortCustomer) {
          const { data: finalUpdatedCustomer, error: finalUpdateError } = await supabase
            .from('customers')
            .update({
              name: customer.name,
              email: customer.email || lastResortCustomer.email,
              updated_at: new Date().toISOString()
            })
            .eq('id', lastResortCustomer.id)
            .select()
            .single();
            
          if (!finalUpdateError && finalUpdatedCustomer) {
            return finalUpdatedCustomer;
          }
        }
      }
    }
    
    throw new Error(`فشل في إنشاء العميل: ${error.message}`);
  }
  
  return data;
};

// Update an existing customer
export const updateCustomer = async (id: string, updates: Partial<Omit<Customer, 'id' | 'created_at'>>): Promise<Customer> => {
  const { data, error } = await supabase
    .from('customers')
    .update({ 
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

// Delete a customer
export const deleteCustomer = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);
    
  if (error) {
    throw new Error(error.message);
  }
};

// Search customers
export const searchCustomers = async (query: string): Promise<Customer[]> => {
  // Get current user to filter by created_by
  const currentUser = await getCurrentUserProfile();
  
  // Get the organization ID for filtering
  let organizationId = null;
  
  // Try to get organization ID from current user
  if (currentUser && 'organization_id' in currentUser) {
    organizationId = currentUser.organization_id;
  } else {
    // Try to get from localStorage as fallback
    organizationId = localStorage.getItem('bazaar_organization_id');
  }
  
  if (!organizationId) {
    return [];
  }
  
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('organization_id', organizationId)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
    .order('created_at', { ascending: false });
    
  if (error) {
    throw new Error(error.message);
  }
  
  return data || [];
};

// Get customer statistics
export const getCustomerStats = async (): Promise<{ 
  total: number; 
  newLast30Days: number;
  activeLast30Days: number;
}> => {
  try {
    // Get current user to filter by created_by
    const currentUser = await getCurrentUserProfile();
    
    // Get the organization ID for filtering
    let organizationId = null;
    
    // Try to get organization ID from current user
    if (currentUser && 'organization_id' in currentUser) {
      organizationId = currentUser.organization_id;
    } else {
      // Try to get from localStorage as fallback
      organizationId = localStorage.getItem('bazaar_organization_id');
    }
    
    if (!organizationId) {
      return {
        total: 0,
        newLast30Days: 0,
        activeLast30Days: 0
      };
    }
    
    // Total customers from customers table
    const { count: customersCount, error: customersError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .not('id', 'eq', '00000000-0000-0000-0000-000000000000');

    if (customersError) {
    }

    // Total customers from users table with role='customer'
    const { count: usersCount, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')
      .eq('organization_id', organizationId)
      .not('id', 'eq', '00000000-0000-0000-0000-000000000000');

    if (usersError) {
    }

    // Combined total (this may include some duplicates if a customer exists in both tables)
    const total = (customersCount || 0) + (usersCount || 0);

    // New customers in last 30 days - from both sources
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoString = thirtyDaysAgo.toISOString();
    
    const { count: newCustomersCount, error: newCustomersError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', thirtyDaysAgoString)
      .not('id', 'eq', '00000000-0000-0000-0000-000000000000');

    if (newCustomersError) {
    }

    const { count: newUsersCount, error: newUsersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')
      .eq('organization_id', organizationId)
      .gte('created_at', thirtyDaysAgoString)
      .not('id', 'eq', '00000000-0000-0000-0000-000000000000');

    if (newUsersError) {
    }

    const newLast30Days = (newCustomersCount || 0) + (newUsersCount || 0);

    // Active customers (made orders) in last 30 days
    // Primero, obtener todos los customer_id que tienen pedidos en los últimos 30 días
    const { data: activeCustomerIds, error: activeError } = await supabase
      .from('orders')
      .select('customer_id')
      .eq('organization_id', organizationId)
      .gte('created_at', thirtyDaysAgoString)
      .not('customer_id', 'is', null)
      .not('customer_id', 'eq', '00000000-0000-0000-0000-000000000000');

    if (activeError) {
    }

    // Luego, verificar cuáles de estos ID corresponden a clientes reales en users o customers
    let validActiveCustomers = 0;
    
    if (activeCustomerIds && activeCustomerIds.length > 0) {
      // Extraer los IDs únicos
      const uniqueCustomerIds = [...new Set(activeCustomerIds.map(order => order.customer_id))];
      
      // Verificar cuántos de estos existen en users con role='customer'
      for (const customerId of uniqueCustomerIds) {
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('id', customerId)
          .eq('role', 'customer')
          .eq('organization_id', organizationId);
        
        if (!error && count && count > 0) {
          validActiveCustomers++;
          continue; // Si ya lo encontramos en users, no necesitamos buscar en customers
        }
        
        // Verificar en la tabla customers si no se encontró en users
        const { count: customerCount, error: customerError } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('id', customerId)
          .eq('organization_id', organizationId);
        
        if (!customerError && customerCount && customerCount > 0) {
          validActiveCustomers++;
        }
      }
    }

    return {
      total,
      newLast30Days,
      activeLast30Days: validActiveCustomers
    };
  } catch (error) {
    return {
      total: 0,
      newLast30Days: 0,
      activeLast30Days: 0
    };
  }
};
