import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { POSStaffSession } from '@/types/staff';

interface StaffSessionContextType {
  currentStaff: POSStaffSession | null;
  isAdminMode: boolean;
  setStaffSession: (staff: POSStaffSession | null) => void;
  setAdminMode: (isAdmin: boolean) => void;
  clearSession: () => void;
  hasPermission: (permission: keyof POSStaffSession['permissions']) => boolean;
}

const StaffSessionContext = createContext<StaffSessionContextType | undefined>(undefined);

const STORAGE_KEY = 'staff_session';
const ADMIN_MODE_KEY = 'admin_mode';

export const StaffSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStaff, setCurrentStaffState] = useState<POSStaffSession | null>(() => {
    // استرجاع الجلسة من localStorage عند التحميل
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isAdminMode, setIsAdminModeState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(ADMIN_MODE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  // حفظ الجلسة في localStorage
  const setStaffSession = useCallback((staff: POSStaffSession | null) => {
    setCurrentStaffState(staff);
    if (staff) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(staff));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // ضبط وضع الأدمن
  const setAdminMode = useCallback((isAdmin: boolean) => {
    setIsAdminModeState(isAdmin);
    localStorage.setItem(ADMIN_MODE_KEY, isAdmin.toString());
  }, []);

  // مسح الجلسة
  const clearSession = useCallback(() => {
    setCurrentStaffState(null);
    setIsAdminModeState(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ADMIN_MODE_KEY);
  }, []);

  // التحقق من صلاحية معينة
  const hasPermission = useCallback(
    (permission: keyof POSStaffSession['permissions']): boolean => {
      // إذا كان في وضع الأدمن، لديه جميع الصلاحيات
      if (isAdminMode) return true;
      
      // إذا لم يكن هناك موظف مسجل دخول، لا صلاحيات
      if (!currentStaff) return false;

      // التحقق من الصلاحية المحددة
      return Boolean(currentStaff.permissions?.[permission]);
    },
    [currentStaff, isAdminMode]
  );

  const value: StaffSessionContextType = {
    currentStaff,
    isAdminMode,
    setStaffSession,
    setAdminMode,
    clearSession,
    hasPermission,
  };

  return (
    <StaffSessionContext.Provider value={value}>
      {children}
    </StaffSessionContext.Provider>
  );
};

export const useStaffSession = () => {
  const context = useContext(StaffSessionContext);
  if (context === undefined) {
    throw new Error('useStaffSession must be used within a StaffSessionProvider');
  }
  return context;
};
