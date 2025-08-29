import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';

// نوع بيانات المستخدم
interface UserData {
  id: string | undefined;
  name: string | undefined;
  email: string | undefined;
  role: string | undefined;
  organizationId: string | null;
}

// نوع سياق المستخدم
interface UserContextType {
  user: UserData | null;
  isLoading: boolean;
  organizationId: string | null;
}

// إنشاء سياق المستخدم
const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  organizationId: null
});

// مزود سياق المستخدم
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // استخدام سياق المصادقة
  const { user: authUser, isLoading: authLoading, userProfile } = useAuth();
  
  // محاولة استخدام سياق المؤسسة مع معالجة الحالة التي لا يوجد فيها TenantProvider
  let currentOrganization: { id?: string } | null = null;
  let tenantLoading = false;

  try {
    const tenantContext = useTenant();
    currentOrganization = tenantContext.currentOrganization;
    tenantLoading = tenantContext.isLoading;
  } catch (error) {
    // إذا لم يكن TenantProvider موجوداً، نستخدم قيم افتراضية
    currentOrganization = null;
    tenantLoading = false;
  }

  // تجميع بيانات المستخدم من مصادر مختلفة
  const userData: UserData | null = authUser ? {
    id: authUser.id,
    name: userProfile?.name || authUser.user_metadata?.name,
    email: authUser.email,
    role: userProfile?.role || authUser.user_metadata?.role || 'user',
    organizationId: currentOrganization?.id || null
  } : null;

  // حالة التحميل مجمعة
  const isLoading = authLoading || tenantLoading;

  // قيمة السياق
  const value = {
    user: userData,
    isLoading,
    organizationId: currentOrganization?.id || null
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// مرجع للوصول إلى سياق المستخدم
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('يجب استخدام useUser داخل UserProvider');
  }
  return context;
};

export default UserContext;
