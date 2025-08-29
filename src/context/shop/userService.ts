import { supabase } from '@/lib/supabase';
import { User } from '../../types';
import { mapSupabaseUserToUser } from './mappers';
import { v4 as uuidv4 } from 'uuid';
import { getOrganizationId } from './utils';
import { createLocalCustomer } from '@/api/localCustomerService';

// وظيفة تسجيل الدخول
export const login = async (email: string, password: string): Promise<{ success: boolean; user: User | null }> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return { success: false, user: null };
    }
    
    if (data.user) {
      // جلب بيانات المستخدم من جدول المستخدمين
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      if (userError) {
        return { success: true, user: null };
      } else if (userData) {
        return { success: true, user: mapSupabaseUserToUser(userData) };
      }
    }
    
    return { success: false, user: null };
  } catch (error) {
    return { success: false, user: null };
  }
};

// وظيفة تسجيل الخروج
export const logout = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};

// وظيفة إنشاء عميل جديد
export const createCustomer = async (customerData: { name: string; email?: string; phone?: string }): Promise<User | null> => {
  try {

    // إنشاء معرف فريد للعميل
    const customerId = uuidv4();
    
    // البيانات الأساسية للعميل
    const customerEmail = customerData.email || `customer_${Date.now()}@example.com`;
    
    // الحصول على معرف المؤسسة الحالية - محسن مع بدائل
    let organizationId = await getOrganizationId();

    if (!organizationId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ [userService] فشل في الحصول على معرف المؤسسة، محاولة البدائل...');
      }

      // محاولة أولى: البحث عن المستخدم في جدول users
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData, error } = await supabase
            .from('users')
            .select('organization_id')
            .eq('auth_user_id', user.id)
            .single();

          if (!error && userData?.organization_id) {
            organizationId = userData.organization_id;
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ [userService] تم العثور على معرف المؤسسة من جدول users:', organizationId);
            }
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ [userService] فشل في البحث في جدول users:', error);
        }
      }

      // إذا لم نجد المؤسسة، نبحث في التخزين المحلي
      if (!organizationId) {
        const storedOrgId = localStorage.getItem('bazaar_organization_id');
        if (storedOrgId) {
          organizationId = storedOrgId;
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ [userService] استخدام معرف المؤسسة من التخزين المحلي:', organizationId);
          }
        }
      }

      // إذا لم نجد المؤسسة بعد، نبحث عن أول مؤسسة في قاعدة البيانات
      if (!organizationId) {
        try {
          const { data: orgs, error } = await supabase
            .from('organizations')
            .select('id')
            .limit(1);

          if (!error && orgs && orgs.length > 0) {
            organizationId = orgs[0].id;
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ [userService] استخدام أول مؤسسة كبديل:', organizationId);
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ [userService] فشل في البحث عن أول مؤسسة:', error);
          }
        }
      }

      // إذا لم نجد المؤسسة حتى الآن، نرمي خطأ
      if (!organizationId) {
        throw new Error('لم يتم العثور على المؤسسة. يرجى التأكد من أن لديك مؤسسة مرتبطة بحسابك أو الاتصال بالدعم.');
      }
    }
    
    // استخدام آلية المزامنة: أولاً، تحقق من الاتصال بالإنترنت
    const isOnline = window.navigator.onLine;
    
    if (!isOnline) {

      // استخدام createLocalCustomer بدلاً من الإضافة المباشرة
      try {
        const localCustomer = await createLocalCustomer({
          name: customerData.name,
          email: customerEmail,
          phone: customerData.phone,
          organization_id: organizationId
        });
        
        // تحويل العميل المحلي إلى نوع User
        const newLocalUser: User = {
          id: localCustomer.id,
          name: localCustomer.name,
          email: localCustomer.email,
          phone: localCustomer.phone,
          role: 'customer',
          isActive: true,
          createdAt: new Date(localCustomer.created_at),
          updatedAt: new Date(localCustomer.updated_at),
          organization_id: localCustomer.organization_id
        };
        
        return newLocalUser;
      } catch (error) {
        throw error;
      }
    }
    
    try {
      // محاولة إضافة العميل عبر Supabase العادي
      // ملاحظة: هذا يتطلب أن يكون المستخدم لديه صلاحيات لإضافة عملاء
      const { data: customerRecord, error: customerError } = await supabase
        .from('customers')
        .insert({
          id: customerId,
          name: customerData.name,
          email: customerEmail,
          phone: customerData.phone || null,
          organization_id: organizationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (customerError) {
        // إذا فشلت الإضافة، نضيف العميل محلياً ونضيفه إلى طابور المزامنة
        console.log('فشل في إضافة العميل عبر Supabase، إضافة محلية:', customerError);

        const localCustomer = await createLocalCustomer({
          name: customerData.name,
          email: customerEmail,
          phone: customerData.phone,
          organization_id: organizationId
        });
        
        // تحويل العميل المحلي إلى نوع User
        const newLocalUser: User = {
          id: localCustomer.id,
          name: localCustomer.name,
          email: localCustomer.email,
          phone: localCustomer.phone,
          role: 'customer',
          isActive: true,
          createdAt: new Date(localCustomer.created_at),
          updatedAt: new Date(localCustomer.updated_at),
          organization_id: localCustomer.organization_id
        };
        
        return newLocalUser;
      }
      
      // تم إضافة العميل إلى جدول customers بنجاح
      const newCustomerFromCustomersTable: User = {
        id: customerRecord.id,
        name: customerRecord.name,
        email: customerRecord.email,
        phone: customerRecord.phone || undefined,
        role: 'customer',
        isActive: true,
        createdAt: new Date(customerRecord.created_at),
        updatedAt: new Date(customerRecord.updated_at),
        organization_id: organizationId
      };
      
      // تخزين البيانات في التخزين المحلي لاستخدامها بعد تحديث الصفحة
      const storedUsers = JSON.parse(localStorage.getItem('bazaar_users') || '[]');
      localStorage.setItem('bazaar_users', JSON.stringify([
        ...storedUsers.filter((u: any) => u.id !== newCustomerFromCustomersTable.id),
        newCustomerFromCustomersTable
      ]));

      return newCustomerFromCustomersTable;
    } catch (error) {
      throw new Error('فشل في إنشاء حساب العميل');
    }
  } catch (error) {
    throw error;
  }
};
