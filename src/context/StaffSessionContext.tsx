import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { POSStaffSession, StaffPermissions } from '@/types/staff';
import { checkPermissionWithAliases } from '@/lib/utils/permission-normalizer';

interface StaffSessionContextType {
  /** الموظف الحالي */
  currentStaff: POSStaffSession | null;
  /** هل في وضع المدير؟ */
  isAdminMode: boolean;
  /** تعيين جلسة الموظف */
  setStaffSession: (staff: POSStaffSession | null) => void;
  /** تفعيل/إلغاء وضع المدير */
  setAdminMode: (isAdmin: boolean) => void;
  /** مسح الجلسة بالكامل */
  clearSession: () => void;
  /** التحقق من صلاحية واحدة */
  hasPermission: (permission: string) => boolean;
  /** التحقق من أي صلاحية من القائمة */
  hasAnyPermission: (permissions: string[]) => boolean;
  /** التحقق من جميع الصلاحيات */
  hasAllPermissions: (permissions: string[]) => boolean;
  /** وقت آخر تسجيل دخول */
  lastLoginTime: Date | null;
  /** مدة الجلسة بالدقائق */
  sessionDuration: number;
  /** هل الجلسة نشطة؟ */
  isSessionActive: boolean;
  /** تحديث وقت آخر نشاط */
  updateActivity: () => void;
}

const StaffSessionContext = createContext<StaffSessionContextType | undefined>(undefined);

const STORAGE_KEY = 'staff_session';
const ADMIN_MODE_KEY = 'admin_mode';
const LAST_LOGIN_KEY = 'staff_last_login';
const LAST_ACTIVITY_KEY = 'staff_last_activity';
const SESSION_TIMEOUT_MINUTES = 480; // 8 ساعات

/**
 * ⚡ جلب organization_id من مصادر متعددة
 */
const getOrganizationIdFromStorage = (): string | undefined => {
  // المصادر المحتملة لـ organization_id
  const sources = [
    'currentOrganizationId',
    'bazaar_organization_id',
    'organization_id',
    'orgId'
  ];

  for (const key of sources) {
    const value = localStorage.getItem(key);
    if (value && value !== 'undefined' && value !== 'null') {
      return value;
    }
  }

  // محاولة من offline_auth_user
  try {
    const offlineUser = localStorage.getItem('offline_auth_user');
    if (offlineUser) {
      const parsed = JSON.parse(offlineUser);
      if (parsed.organization_id) {
        return parsed.organization_id;
      }
    }
  } catch {
    // تجاهل
  }

  return undefined;
};

export const StaffSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStaff, setCurrentStaffState] = useState<POSStaffSession | null>(() => {
    // استرجاع الجلسة من localStorage عند التحميل
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      if (parsed) {
        // ⚡ إصلاح: جلب organization_id إذا كان مفقوداً
        const organizationId = parsed.organization_id || getOrganizationIdFromStorage();

        // ✅ التأكد من وجود صلاحية accessPOS عند التحميل
        const existingPerms = (parsed.permissions || {}) as Record<string, boolean | undefined>;
        const staffWithPOSAccess = {
          ...parsed,
          organization_id: organizationId, // ⚡ إضافة organization_id
          permissions: {
            ...existingPerms,
            // ✅ صلاحيات افتراضية إذا لم تكن معرّفة
            accessPOS: existingPerms.accessPOS ?? existingPerms.canAccessPOS ?? true,
            canViewProducts: existingPerms.canViewProducts ?? true,
            canViewPosOrders: existingPerms.canViewPosOrders ?? true,
            canAccessPosDashboard: existingPerms.canAccessPosDashboard ?? true,
            canAccessPosAdvanced: existingPerms.canAccessPosAdvanced ?? true,
          }
        };
        console.log('[StaffSession] 📦 تم تحميل جلسة الموظف من localStorage:', {
          staff_name: staffWithPOSAccess.staff_name,
          id: staffWithPOSAccess.id,
          organization_id: staffWithPOSAccess.organization_id,
          hasPermissions: !!staffWithPOSAccess.permissions,
          permissionKeys: Object.keys(staffWithPOSAccess.permissions),
          hasAccessPOS: staffWithPOSAccess.permissions?.accessPOS,
        });
        return staffWithPOSAccess;
      }
      return null;
    } catch (err) {
      console.error('[StaffSession] ❌ فشل تحميل جلسة الموظف:', err);
      return null;
    }
  });

  const [isAdminMode, setIsAdminModeState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(ADMIN_MODE_KEY);
      const isAdmin = stored === 'true';
      if (isAdmin) {
        console.log('[StaffSession] 🔐 وضع المدير مفعّل من localStorage');
      }
      return isAdmin;
    } catch {
      return false;
    }
  });

  const [lastLoginTime, setLastLoginTime] = useState<Date | null>(() => {
    try {
      const stored = localStorage.getItem(LAST_LOGIN_KEY);
      return stored ? new Date(stored) : null;
    } catch {
      return null;
    }
  });

  const [lastActivityTime, setLastActivityTime] = useState<Date>(() => {
    try {
      const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
      return stored ? new Date(stored) : new Date();
    } catch {
      return new Date();
    }
  });

  // حساب مدة الجلسة
  const sessionDuration = useMemo(() => {
    if (!lastLoginTime) return 0;
    return Math.floor((Date.now() - lastLoginTime.getTime()) / (1000 * 60));
  }, [lastLoginTime]);

  // التحقق من نشاط الجلسة
  const isSessionActive = useMemo(() => {
    if (!currentStaff && !isAdminMode) return false;
    const inactiveMinutes = Math.floor((Date.now() - lastActivityTime.getTime()) / (1000 * 60));
    return inactiveMinutes < SESSION_TIMEOUT_MINUTES;
  }, [currentStaff, isAdminMode, lastActivityTime]);

  // تحديث وقت آخر نشاط
  const updateActivity = useCallback(() => {
    const now = new Date();
    setLastActivityTime(now);
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toISOString());
  }, []);

  // حفظ الجلسة في localStorage
  const setStaffSession = useCallback((staff: POSStaffSession | null) => {
    if (staff) {
      // ✅ الصلاحيات الافتراضية للموظفين (لا يمكن إلغاؤها)
      // الترتيب: صلاحيات الموظف أولاً، ثم الصلاحيات الافتراضية التي لم يتم تعريفها
      const existingPerms = (staff.permissions || {}) as Record<string, boolean | undefined>;
      const staffWithPOSAccess = {
        ...staff,
        permissions: {
          ...existingPerms,
          // ✅ صلاحيات افتراضية إذا لم تكن معرّفة صراحةً
          accessPOS: existingPerms.accessPOS ?? existingPerms.canAccessPOS ?? true,
          canViewProducts: existingPerms.canViewProducts ?? true,
          canViewPosOrders: existingPerms.canViewPosOrders ?? true,
          canAccessPosDashboard: existingPerms.canAccessPosDashboard ?? true,
          canAccessPosAdvanced: existingPerms.canAccessPosAdvanced ?? true,
        } as StaffPermissions
      };
      
      setCurrentStaffState(staffWithPOSAccess);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(staffWithPOSAccess));
      const now = new Date();
      setLastLoginTime(now);
      setLastActivityTime(now);
      localStorage.setItem(LAST_LOGIN_KEY, now.toISOString());
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toISOString());
      console.log('[StaffSession] ✅ تم تسجيل دخول الموظف:', {
        name: staffWithPOSAccess.staff_name,
        id: staffWithPOSAccess.id,
        organization_id: staffWithPOSAccess.organization_id,
        permissionKeys: Object.keys(staffWithPOSAccess.permissions),
        hasAccessPOS: staffWithPOSAccess.permissions.canAccessPOS,
      });
    } else {
      setCurrentStaffState(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LAST_LOGIN_KEY);
      console.log('[StaffSession] 🚪 تم مسح جلسة الموظف');
    }
  }, []);

  // ضبط وضع الأدمن
  const setAdminMode = useCallback((isAdmin: boolean) => {
    setIsAdminModeState(isAdmin);
    localStorage.setItem(ADMIN_MODE_KEY, isAdmin.toString());
    if (isAdmin) {
      const now = new Date();
      setLastLoginTime(now);
      setLastActivityTime(now);
      localStorage.setItem(LAST_LOGIN_KEY, now.toISOString());
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toISOString());
      console.log('[StaffSession] 🔐 تم تفعيل وضع المدير');
    } else {
      console.log('[StaffSession] 🔓 تم إلغاء وضع المدير');
    }
  }, []);

  // مسح الجلسة
  const clearSession = useCallback(() => {
    setCurrentStaffState(null);
    setIsAdminModeState(false);
    setLastLoginTime(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ADMIN_MODE_KEY);
    localStorage.removeItem(LAST_LOGIN_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    console.log('[StaffSession] 🧹 تم مسح الجلسة بالكامل');
  }, []);

  // التحقق من صلاحية معينة (مع دعم الأسماء البديلة)
  const hasPermission = useCallback(
    (permission: string): boolean => {
      // إذا كان في وضع الأدمن، لديه جميع الصلاحيات
      if (isAdminMode) return true;
      
      // إذا لم يكن هناك موظف مسجل دخول، لا صلاحيات
      if (!currentStaff?.permissions) return false;

      // استخدام دالة التحقق الموحدة مع دعم الأسماء البديلة
      return checkPermissionWithAliases(permission, currentStaff.permissions as Record<string, boolean>);
    },
    [currentStaff, isAdminMode]
  );

  // التحقق من أي صلاحية من القائمة
  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (isAdminMode) return true;
      if (!permissions.length) return true;
      return permissions.some(p => hasPermission(p));
    },
    [isAdminMode, hasPermission]
  );

  // التحقق من جميع الصلاحيات
  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      if (isAdminMode) return true;
      if (!permissions.length) return true;
      return permissions.every(p => hasPermission(p));
    },
    [isAdminMode, hasPermission]
  );

  // مراقبة النشاط وإنهاء الجلسة عند عدم النشاط
  useEffect(() => {
    if (!isSessionActive && (currentStaff || isAdminMode)) {
      console.log('[StaffSession] ⏰ انتهت الجلسة بسبب عدم النشاط');
      // لا نمسح الجلسة تلقائياً، فقط نسجل التحذير
    }
  }, [isSessionActive, currentStaff, isAdminMode]);

  // تحديث النشاط عند أي تفاعل
  useEffect(() => {
    const handleActivity = () => updateActivity();
    
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    
    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [updateActivity]);

  const value: StaffSessionContextType = useMemo(() => ({
    currentStaff,
    isAdminMode,
    setStaffSession,
    setAdminMode,
    clearSession,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    lastLoginTime,
    sessionDuration,
    isSessionActive,
    updateActivity,
  }), [
    currentStaff,
    isAdminMode,
    setStaffSession,
    setAdminMode,
    clearSession,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    lastLoginTime,
    sessionDuration,
    isSessionActive,
    updateActivity,
  ]);

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

/**
 * Hook مختصر للتحقق من صلاحية الموظف
 */
export const useStaffPermission = (permission: string): boolean => {
  const { hasPermission } = useStaffSession();
  return hasPermission(permission);
};
