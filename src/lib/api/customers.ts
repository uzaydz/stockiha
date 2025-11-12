import { supabase } from '@/lib/supabase';
import { Customer } from '@/types/customer';
import { inventoryDB } from '@/database/localDb';
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

  try {
    // استخدام RPC المحسنة لجلب العملاء مع الإحصائيات
    const { data: orgCustomers, error } = await supabase
      .rpc('get_customers_optimized' as any, {
        p_organization_id: organizationId,
        p_page: 1,
        p_limit: 1000,
        p_search: null
      });

    if (error) {
      throw error;
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
  const orgArr = Array.isArray(orgCustomers) ? orgCustomers : [];
  const filteredOrgCustomers = orgArr.filter((customer: any) => 
    customer && customer.id !== '00000000-0000-0000-0000-000000000000'
  );
  
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
  
    // مرآة إلى SQLite لاستخدام الأوفلاين
    try {
      for (const c of allCustomers) {
        await inventoryDB.customers.put({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: (c as any).phone || null,
          organization_id: c.organization_id,
          synced: true,
          syncStatus: null,
          pendingOperation: undefined,
          localUpdatedAt: new Date().toISOString(),
          created_at: (c as any).created_at || new Date().toISOString(),
          updated_at: (c as any).updated_at || new Date().toISOString(),
          name_lower: c.name ? String(c.name).toLowerCase() : null,
          email_lower: c.email ? String(c.email).toLowerCase() : null,
          phone_digits: (c as any).phone ? String((c as any).phone).replace(/\D/g, '') : null
        } as any);
      }
    } catch {}

    return allCustomers;
  } catch (onlineErr) {
    // أوفلاين: قراءة من SQLite
    try {
      const rows = await inventoryDB.customers.where({ organization_id: organizationId }).toArray();
      return (rows || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        organization_id: r.organization_id,
        created_at: r.created_at,
        updated_at: r.updated_at
      })) as Customer[];
    } catch {
      return [];
    }
  }
};

// Fetch a single customer by ID
export const getCustomerById = async (id: string): Promise<Customer | null> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    try {
      await inventoryDB.customers.put({
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        organization_id: data.organization_id,
        synced: true,
        localUpdatedAt: new Date().toISOString(),
        created_at: data.created_at,
        updated_at: data.updated_at,
        name_lower: data.name ? String(data.name).toLowerCase() : null,
        email_lower: data.email ? String(data.email).toLowerCase() : null,
        phone_digits: data.phone ? String(data.phone).replace(/\D/g, '') : null
      } as any);
    } catch {}
    return data;
  } catch (onlineErr) {
    try {
      const r: any = await inventoryDB.customers.get(id);
      return r || null;
    } catch {
      return null;
    }
  }
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
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert({ 
        ...customer,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    // مرآة إلى SQLite
    try {
      await inventoryDB.customers.put({
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        organization_id: data.organization_id,
        synced: true,
        localUpdatedAt: new Date().toISOString(),
        created_at: data.created_at,
        updated_at: data.updated_at,
        name_lower: data.name ? String(data.name).toLowerCase() : null,
        email_lower: data.email ? String(data.email).toLowerCase() : null,
        phone_digits: data.phone ? String(data.phone).replace(/\D/g, '') : null
      } as any);
    } catch {}
    return data;
  } catch (error) {
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
    
    // أوفلاين: إنشاء محلياً في SQLite وإضافته لصف المزامنة
    try {
      const id = (globalThis.crypto && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const now = new Date().toISOString();
      await inventoryDB.customers.put({
        id,
        name: customer.name,
        email: customer.email || null,
        phone: customer.phone || null,
        organization_id: customer.organization_id,
        synced: false,
        syncStatus: 'pending',
        pendingOperation: 'create',
        localUpdatedAt: now,
        created_at: now,
        updated_at: now,
        name_lower: customer.name ? String(customer.name).toLowerCase() : null,
        email_lower: customer.email ? String(customer.email).toLowerCase() : null,
        phone_digits: customer.phone ? String(customer.phone).replace(/\D/g, '') : null
      } as any);
      await inventoryDB.syncQueue.put({
        id: id + ':customer:create',
        objectType: 'customer',
        objectId: id,
        operation: 'create',
        data: customer as any,
        attempts: 0,
        createdAt: now,
        updatedAt: now,
        priority: 2
      } as any);
      return { id, ...customer, created_at: now, updated_at: now } as Customer;
    } catch (e) {
      throw new Error(`فشل في إنشاء العميل: ${error.message}`);
    }
  }
  
};

// Update an existing customer
export const updateCustomer = async (id: string, updates: Partial<Omit<Customer, 'id' | 'created_at'>>): Promise<Customer> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update({ 
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    try {
      await inventoryDB.customers.put({ ...data } as any);
    } catch {}
    return data;
  } catch (err: any) {
    // أوفلاين: تحديث محلياً وإضافة إلى صف المزامنة
    const now = new Date().toISOString();
    try {
      await inventoryDB.customers.update(id, { ...updates, updated_at: now } as any);
      await inventoryDB.syncQueue.put({
        id: id + ':customer:update:' + now,
        objectType: 'customer',
        objectId: id,
        operation: 'update',
        data: updates as any,
        attempts: 0,
        createdAt: now,
        updatedAt: now,
        priority: 2
      } as any);
      const local = await inventoryDB.customers.get(id) as any;
      return local as Customer;
    } catch {
      throw new Error(err?.message || 'فشل تحديث العميل');
    }
  }
};

// Delete a customer
export const deleteCustomer = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    if (error) throw error;
    try { await inventoryDB.customers.delete(id); } catch {}
  } catch (err) {
    // أوفلاين: علّم السجل للحذف وأضفه إلى صف المزامنة
    const now = new Date().toISOString();
    try {
      await inventoryDB.customers.update(id, { pendingOperation: 'delete', updated_at: now } as any);
      await inventoryDB.syncQueue.put({
        id: id + ':customer:delete',
        objectType: 'customer',
        objectId: id,
        operation: 'delete',
        data: {},
        attempts: 0,
        createdAt: now,
        updatedAt: now,
        priority: 2
      } as any);
    } catch {}
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
  
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    // مرآة نتائج البحث إلى SQLite (تحديثات فقط)
    try {
      for (const c of data || []) {
        await inventoryDB.customers.put({ ...c } as any);
      }
    } catch {}
    return data || [];
  } catch (err) {
    // أوفلاين: بحث محلي في SQLite
    try {
      const rows = await inventoryDB.customers.where({ organization_id: organizationId }).toArray();
      const q = (query || '').toLowerCase();
      return (rows || []).filter((r: any) =>
        (r.name && String(r.name).toLowerCase().includes(q)) ||
        (r.email && String(r.email).toLowerCase().includes(q)) ||
        (r.phone && String(r.phone).toLowerCase().includes(q))
      ) as Customer[];
    } catch {
      return [];
    }
  }
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
