/**
 * CustomersContext - سياق العملاء المحسن
 *
 * التحسينات:
 * - useCallback للأداء
 * - التخزين المحلي للعملاء
 * - دعم المزامنة offline/online
 * - دعم البحث والفلترة
 */

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  ReactNode
} from 'react';
import { User } from '@/types';
import { CustomersState, CustomerData, CustomersContextType } from './types';
import { useTenant } from '@/context/TenantContext';
import * as userService from '../userService';
import { unifiedCustomerService } from '@/services/UnifiedCustomerService';
import { isAppOnline } from '@/utils/networkStatus';
import { supabase } from '@/lib/supabase-unified';

// ============================================================================
// Initial State
// ============================================================================

const initialState: CustomersState = {
  users: [],
  isLoading: false,
  error: null,
};

// ============================================================================
// Context
// ============================================================================

const CustomersContext = createContext<CustomersContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface CustomersProviderProps {
  children: ReactNode;
}

export const CustomersProvider = React.memo(function CustomersProvider({
  children
}: CustomersProviderProps) {
  const [state, setState] = useState<CustomersState>(initialState);
  const tenant = useTenant();

  // ========================================================================
  // Load Users from localStorage
  // ========================================================================

  useEffect(() => {
    try {
      const storedUsers = localStorage.getItem('bazaar_users');
      if (storedUsers) {
        const parsedUsers = JSON.parse(storedUsers);
        setState(prev => ({
          ...prev,
          users: parsedUsers,
        }));
      }
    } catch (error) {
      console.error('Failed to load users from localStorage:', error);
    }
  }, []);

  // ========================================================================
  // Save Users to localStorage
  // ========================================================================

  useEffect(() => {
    try {
      if (state.users.length > 0) {
        localStorage.setItem('bazaar_users', JSON.stringify(state.users));
      }
    } catch (error) {
      console.error('Failed to save users to localStorage:', error);
    }
  }, [state.users]);

  // ========================================================================
  // Customers Actions
  // ========================================================================

  // ⚡ تحويل LocalCustomer إلى User
  const mapLocalCustomerToUser = useCallback((customer: LocalCustomer): User => {
    return {
      id: customer.id,
      name: customer.name || '',
      email: customer.email,
      phone: customer.phone,
      role: 'customer',
      isActive: true,
      createdAt: customer.created_at ? new Date(customer.created_at) : new Date(),
      updatedAt: customer.updated_at ? new Date(customer.updated_at) : new Date(),
      organization_id: customer.organization_id
    };
  }, []);

  const refreshUsers = useCallback(async () => {
    const organizationId = tenant.currentOrganization?.id;
    if (!organizationId) {
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // ⚡ استخدام الخدمة الموحدة Offline-First
      let localCustomers: User[] = [];
      try {
        unifiedCustomerService.setOrganizationId(organizationId);
        const result = await unifiedCustomerService.getCustomers({}, 1, 1000);
        localCustomers = result.data.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email || '',
          phone: c.phone || null,
          organization_id: c.organization_id,
          created_at: c.created_at || '',
          updated_at: c.updated_at || '',
          nif: c.nif ?? null,
          rc: c.rc ?? null,
          nis: c.nis ?? null,
          rib: c.rib ?? null,
          address: c.address ?? null
        } as User));
        console.log(`[CustomersContext] 📦 Loaded ${localCustomers.length} customers from PowerSync`);
      } catch (localError) {
        console.warn('[CustomersContext] ⚠️ Failed to load from PowerSync:', localError);
      }

      // وضع Local-Only: استخدام PowerSync فقط، بدون أي fallback للسيرفر
      setState(prev => ({
        ...prev,
        users: localCustomers,
        isLoading: false,
      }));
      console.log(`[CustomersContext] ✅ Local-only customers: ${localCustomers.length}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في جلب المستخدمين';
      console.error('[CustomersContext] ❌ Error:', errorMessage);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [tenant.currentOrganization?.id, mapLocalCustomerToUser]);

  // ========================================================================
  // ⚡ Auto-refresh on mount and organization change
  // ========================================================================

  const hasInitialized = React.useRef(false);

  useEffect(() => {
    const organizationId = tenant.currentOrganization?.id;
    if (organizationId && !hasInitialized.current) {
      hasInitialized.current = true;
      // ⚡ تأخير قصير للسماح بتهيئة SQLite
      const timer = setTimeout(() => {
        refreshUsers();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [tenant.currentOrganization?.id, refreshUsers]);

  // ⚡ Re-fetch when coming back online
  useEffect(() => {
    const handleOnline = () => {
      console.log('[CustomersContext] 🌐 Back online - refreshing customers');
      refreshUsers();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('delta-sync-complete', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('delta-sync-complete', handleOnline);
    };
  }, [refreshUsers]);

  // ========================================================================
  // Other Actions
  // ========================================================================

  const addUser = useCallback((user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User => {
    const newUser: User = {
      ...user,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setState(prev => ({
      ...prev,
      users: [newUser, ...prev.users],
    }));

    return newUser;
  }, []);

  const updateUser = useCallback((user: User): User => {
    const updatedUser = { ...user, updatedAt: new Date() };

    setState(prev => ({
      ...prev,
      users: prev.users.map(u => (u.id === user.id ? updatedUser : u)),
    }));

    return updatedUser;
  }, []);

  const deleteUser = useCallback((userId: string): void => {
    setState(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== userId),
    }));
  }, []);

  const createCustomer = useCallback(async (customerData: CustomerData): Promise<User> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const newCustomer = await userService.createCustomer(customerData);

      if (!newCustomer) {
        throw new Error('فشل في إنشاء العميل');
      }

      // تحديث الحالة المحلية
      setState(prev => ({
        ...prev,
        users: [newCustomer, ...prev.users.filter(u => u.id !== newCustomer.id)],
        isLoading: false,
      }));

      return newCustomer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في إنشاء العميل';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  // ========================================================================
  // Context Value (memoized)
  // ========================================================================

  const value = useMemo<CustomersContextType>(
    () => ({
      state,
      addUser,
      updateUser,
      deleteUser,
      createCustomer,
      refreshUsers,
    }),
    [
      state,
      addUser,
      updateUser,
      deleteUser,
      createCustomer,
      refreshUsers,
    ]
  );

  return (
    <CustomersContext.Provider value={value}>
      {children}
    </CustomersContext.Provider>
  );
});

// ============================================================================
// Hook
// ============================================================================

export function useCustomers(): CustomersContextType {
  const context = useContext(CustomersContext);

  if (context === undefined) {
    throw new Error('useCustomers must be used within a CustomersProvider');
  }

  return context;
}

// ============================================================================
// Selectors (for performance)
// ============================================================================

/**
 * Hook للحصول على قائمة المستخدمين فقط
 */
export function useUsersList() {
  const { state } = useCustomers();
  return useMemo(() => state.users, [state.users]);
}

/**
 * Hook للحصول على مستخدم بالـ ID
 */
export function useUserById(userId: string) {
  const { state } = useCustomers();
  return useMemo(
    () => state.users.find(u => u.id === userId),
    [state.users, userId]
  );
}

/**
 * Hook للحصول على العملاء فقط (بدون الموظفين)
 */
export function useCustomersList() {
  const { state } = useCustomers();
  return useMemo(
    () => state.users.filter(u => u.role === 'customer'),
    [state.users]
  );
}

/**
 * Hook للحصول على الموظفين فقط
 */
export function useEmployeesList() {
  const { state } = useCustomers();
  return useMemo(
    () => state.users.filter(u => u.role === 'employee' || u.role === 'admin'),
    [state.users]
  );
}

/**
 * Hook للبحث عن مستخدمين
 */
export function useUsersSearch(searchTerm: string) {
  const { state } = useCustomers();
  return useMemo(() => {
    if (!searchTerm) return state.users;

    const term = searchTerm.toLowerCase();
    return state.users.filter(
      u =>
        u.name.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.phone?.toLowerCase().includes(term)
    );
  }, [state.users, searchTerm]);
}

/**
 * Hook للحصول على المستخدمين النشطين فقط
 */
export function useActiveUsers() {
  const { state } = useCustomers();
  return useMemo(
    () => state.users.filter(u => u.isActive),
    [state.users]
  );
}

/**
 * Hook للحصول على حالة التحميل
 */
export function useCustomersLoading() {
  const { state } = useCustomers();
  return useMemo(() => state.isLoading, [state.isLoading]);
}

/**
 * Hook للحصول على الأخطاء
 */
export function useCustomersError() {
  const { state } = useCustomers();
  return useMemo(() => state.error, [state.error]);
}
