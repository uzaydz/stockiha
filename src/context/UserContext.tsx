import React, { createContext, useContext, ReactNode, useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

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

// مزود سياق المستخدم - محسن للتنسيق مع AuthContext
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // استخدام سياق المصادقة
  const { user: authUser, isLoading: authLoading, userProfile, organization, dataLoadingComplete } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);

  // الحصول على معرف المنظمة من AuthContext - محسن للاستجابة السريعة
  useEffect(() => {
    // إذا لم يكن هناك مستخدم مصادق، نظف organizationId
    if (!authUser?.id) {
      setOrganizationId(null);
      setOrgLoading(false);
      return;
    }

    // إذا كانت المؤسسة متاحة في AuthContext، استخدمها فوراً
    if (organization?.id) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [UserContext] استخدام organizationId من AuthContext فوراً:', organization.id);
      }
      setOrganizationId(organization.id);
      setOrgLoading(false);
      // تحديث window object للاستخدام من قبل دوال أخرى
      (window as any).__USER_CONTEXT_ORG__ = organization.id;
      return;
    }

    // إذا كانت البيانات جاهزة لكن المؤسسة غير متاحة، لا تحتاج للتحميل الاحتياطي
    if (dataLoadingComplete && !organization?.id) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ [UserContext] البيانات جاهزة لكن المؤسسة غير متاحة');
      }
      setOrganizationId(null);
      setOrgLoading(false);
      return;
    }

    // إذا لم تكن البيانات جاهزة بعد، انتظر
    if (!dataLoadingComplete) {
      setOrgLoading(true);
      if (process.env.NODE_ENV === 'development') {
        console.log('⏳ [UserContext] انتظار جاهزية البيانات من AuthContext...');
      }
      return;
    }

    // لا نحتاج للتحميل الاحتياطي - AuthContext سيقوم بذلك
    setOrganizationId(null);
    setOrgLoading(false);
  }, [authUser?.id, organization?.id, dataLoadingComplete]);

  // تجميع بيانات المستخدم
  const userData: UserData | null = authUser ? {
    id: authUser.id,
    name: userProfile?.name || authUser.user_metadata?.name,
    email: authUser.email,
    role: userProfile?.role || authUser.user_metadata?.role || 'user',
    organizationId: organizationId
  } : null;

  // تشخيص محسن - عرض المعلومات المهمة فقط
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [UserContext] authUser:', authUser?.id);
      console.log('🔍 [UserContext] organizationId:', organizationId);
      console.log('🔍 [UserContext] userData:', userData);
    }
  }, [authUser?.id, organizationId, userData]);

  // حالة التحميل مجمعة
  const isLoading = authLoading || orgLoading;

  // قيمة السياق
  const value = {
    user: userData,
    isLoading,
    organizationId: organizationId
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
