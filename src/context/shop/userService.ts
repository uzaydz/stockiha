import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
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
      console.error('Login error:', error);
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
        console.error('Error fetching user data:', userError);
        return { success: true, user: null };
      } else if (userData) {
        return { success: true, user: mapSupabaseUserToUser(userData) };
      }
    }
    
    return { success: false, user: null };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, user: null };
  }
};

// وظيفة تسجيل الخروج
export const logout = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Logout error:', error);
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
    
    // الحصول على معرف المؤسسة الحالية
    const organizationId = await getOrganizationId();
    
    if (!organizationId) {
      console.error('لا يمكن إنشاء العميل: لم يتم العثور على معرف المؤسسة');
      throw new Error('لم يتم العثور على المؤسسة');
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
        console.error("خطأ في إنشاء العميل محلياً:", error);
        throw error;
      }
    }
    
    try {
      // محاولة إضافة العميل عبر ال API
      const { data: customerRecord, error: customerError } = await supabaseAdmin
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
        console.error('فشل إضافة العميل إلى جدول customers:', customerError);
        
        // إذا فشلت الإضافة، نضيف العميل محلياً ونضيفه إلى طابور المزامنة
        
        
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
      console.error('خطأ في عملية إنشاء العميل:', error);
      throw new Error('فشل في إنشاء حساب العميل');
    }
  } catch (error) {
    console.error('خطأ عام في إنشاء العميل:', error);
    throw error;
  }
}; 