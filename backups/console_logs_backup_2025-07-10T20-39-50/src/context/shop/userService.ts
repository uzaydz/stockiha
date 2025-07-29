import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { User } from '../../types';
import { mapSupabaseUserToUser } from './mappers';
import { v4 as uuidv4 } from 'uuid';
import { getOrganizationId } from './utils';
import { createLocalCustomer } from '@/api/localCustomerService';
import { GentleLogoutCleaner } from '@/lib/utils/gentle-logout-cleaner';

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

// تنظيف شامل لجميع البيانات المحفوظة
const clearAllStorageData = (): void => {
  try {
    // قائمة شاملة بجميع مفاتيح localStorage المستخدمة في التطبيق
    const storageKeys = [
      // Auth & Session
      'bazaar_auth_state',
      'bazaar_auth_singleton_cache',
      'authSessionExists',
      'authSessionLastUpdated',
      'current_user_profile',
      'current_organization',
      'is_super_admin',
      'super_admin_session',
      
      // Organization & Tenant
      'bazaar_organization_id',
      'bazaar_current_subdomain',
      'currentOrganizationId',
      'organization_id',
      
      // Theme & UI
      'theme',
      'theme-preference',
      'bazaar_org_theme',
      'darkMode',
      'sidebarCollapsed',
      
      // Language & i18n
      'i18nextLng',
      'i18nextLng_timestamp',
      'selectedLanguage',
      'preferred-language',
      
      // App Data & Cache
      'bazaar_app_init_data',
      'BAZAAR_APP_STATE_TIMESTAMP',
      'last_auth_check',
      'last_init_time',
      
      // Product & Form Drafts
      'product-form-progress',
      
      // Notifications & Settings
      'abandoned_orders_provinces',
      'abandoned_orders_municipalities',
      'abandoned_orders_cache_expiry',
      
      // POS & Sales
      'pos-cart-data',
      'pos-customer-data',
      'flexi-sales-data',
      
      // Other App Data
      'subscription_cache',
      'inventory_cache',
      'reports_cache'
    ];
    
    // حذف المفاتيح المحددة
    storageKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`تعذر حذف ${key}:`, error);
      }
    });
    
    // حذف المفاتيح التي تحتوي على patterns معينة
    const patterns = [
      'org_theme_',
      'org-language-',
      'org-language-timestamp-',
      'organization:',
      'tenant:subdomain:',
      'product-draft-',
      'product-form-draft-',
      'notification-settings-',
      'language_update_',
      'subscription_cache_'
    ];
    
    // البحث في جميع مفاتيح localStorage وحذف ما يطابق الpatterns
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      patterns.forEach(pattern => {
        if (key.includes(pattern)) {
          try {
            localStorage.removeItem(key);
          } catch (error) {
            console.warn(`تعذر حذف ${key}:`, error);
          }
        }
      });
    });
    
    // تنظيف شامل لـ sessionStorage
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('تعذر تنظيف sessionStorage:', error);
    }
    
    // تنظيف IndexedDB إذا كان متاحاً (Supabase Cache)
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      try {
        // حذف قاعدة بيانات Supabase المؤقتة
        indexedDB.deleteDatabase('supabase-cache');
        indexedDB.deleteDatabase('supabase-auth');
      } catch (error) {
        console.warn('تعذر تنظيف IndexedDB:', error);
      }
    }
    
    console.log('✅ تم تنظيف جميع البيانات المحفوظة بنجاح');
  } catch (error) {
    console.error('❌ خطأ في تنظيف البيانات المحفوظة:', error);
  }
};

// وظيفة تسجيل الخروج مع النظام الشامل الجديد
export const logout = async (): Promise<boolean> => {
  try {
    console.log('🚪 بدء تسجيل الخروج من userService...');
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.warn('⚠️ خطأ في تسجيل الخروج من Supabase:', error.message);
      // حتى لو فشل تسجيل الخروج، نكمل التنظيف المحلي
    }
    
    // تنظيف لطيف وآمن لجميع البيانات
    await GentleLogoutCleaner.performGentleLogout({
      redirectUrl: '/login',
      skipNavigation: true,
      showLoading: false,
      clearCache: true
    });
    
    return true;
  } catch (error) {
    console.error('❌ خطأ شامل في تسجيل الخروج:', error);
    
    // في حالة الفشل، استخدم التنظيف الطارئ
    GentleLogoutCleaner.emergencyCleanup();
    
    // إعادة تحميل فورية
    setTimeout(() => {
      window.location.reload();
    }, 200);
    
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
      throw new Error('فشل في إنشاء حساب العميل');
    }
  } catch (error) {
    throw error;
  }
};
