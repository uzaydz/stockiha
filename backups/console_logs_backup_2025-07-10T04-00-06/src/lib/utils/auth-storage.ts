import { Session } from '@supabase/supabase-js';

// مفاتيح التخزين المحلي
const AUTH_KEYS = {
  AUTH_STATE: 'bazaar_auth_state',
  USER_PROFILE: 'current_user_profile',
  ORGANIZATION: 'current_organization',
  ORGANIZATION_ID: 'bazaar_organization_id',
} as const;

// واجهة لحالة المصادقة المحفوظة
interface SavedAuthState {
  session: Session | null;
  user: any | null;
  timestamp: number;
}

// واجهة لبيانات المستخدم المحفوظة
interface SavedUserData {
  userProfile: any | null;
  organization: any | null;
  organizationId: string | null;
}

// إضافة دالة console مخصصة لـ localStorage
const storageDebugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`💾 [LocalStorage] ${message}`, data ? data : '');
  }
};

/**
 * حفظ حالة المصادقة في التخزين المحلي
 */
export const saveAuthToStorage = (session: Session, user: any): void => {
  storageDebugLog('=== حفظ حالة المصادقة في localStorage ===', {
    userId: user?.id,
    userEmail: user?.email,
    sessionId: session?.access_token?.substring(0, 20) + '...',
    expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
    timestamp: new Date().toISOString()
  });

  try {
    const authState: SavedAuthState = {
      session,
      user,
      timestamp: Date.now(),
    };

    localStorage.setItem(AUTH_KEYS.AUTH_STATE, JSON.stringify(authState));
    storageDebugLog('✅ تم حفظ حالة المصادقة بنجاح');
    
    // حفظ معرف المؤسسة إذا كان متاحاً
    if (user?.user_metadata?.organization_id) {
      localStorage.setItem('bazaar_organization_id', user.user_metadata.organization_id);
      storageDebugLog('تم حفظ معرف المؤسسة من user_metadata:', user.user_metadata.organization_id);
    }
    
  } catch (error) {
    storageDebugLog('❌ خطأ في حفظ حالة المصادقة:', error);
  }
};

/**
 * تحميل حالة المصادقة من التخزين المحلي
 */
export const loadAuthFromStorage = (): { session: Session | null; user: any | null } => {
  storageDebugLog('=== تحميل حالة المصادقة من localStorage ===');

  try {
    const savedState = localStorage.getItem(AUTH_KEYS.AUTH_STATE);
    
    if (!savedState) {
      storageDebugLog('❌ لا توجد حالة مصادقة محفوظة');
      return { session: null, user: null };
    }

    const authState: SavedAuthState = JSON.parse(savedState);
    
    storageDebugLog('تم العثور على حالة مصادقة محفوظة:', {
      userId: authState.user?.id,
      userEmail: authState.user?.email,
      sessionId: authState.session?.access_token?.substring(0, 20) + '...',
      savedAt: new Date(authState.timestamp).toISOString(),
      age: Date.now() - authState.timestamp
    });
    
    // التحقق من انتهاء صلاحية البيانات المحفوظة (24 ساعة)
    const maxAge = 24 * 60 * 60 * 1000; // 24 ساعة
    if (Date.now() - authState.timestamp > maxAge) {
      storageDebugLog('⚠️ انتهت صلاحية البيانات المحفوظة (أكثر من 24 ساعة)');
      localStorage.removeItem(AUTH_KEYS.AUTH_STATE);
      return { session: null, user: null };
    }

    // التحقق من انتهاء صلاحية الجلسة
    if (authState.session?.expires_at) {
      const expirationTime = authState.session.expires_at * 1000;
      if (Date.now() >= expirationTime) {
        storageDebugLog('⚠️ انتهت صلاحية الجلسة');
        localStorage.removeItem(AUTH_KEYS.AUTH_STATE);
        return { session: null, user: null };
      } else {
        storageDebugLog('✅ الجلسة ما زالت صالحة:', {
          expiresAt: new Date(expirationTime).toISOString(),
          timeLeft: expirationTime - Date.now()
        });
      }
    }

    storageDebugLog('✅ تم تحميل حالة المصادقة بنجاح');
    return {
      session: authState.session,
      user: authState.user,
    };
  } catch (error) {
    storageDebugLog('❌ خطأ في تحميل حالة المصادقة:', error);
    localStorage.removeItem(AUTH_KEYS.AUTH_STATE);
    return { session: null, user: null };
  }
};

/**
 * مسح حالة المصادقة من التخزين المحلي
 */
export const clearAuthFromStorage = (): void => {
  storageDebugLog('=== مسح حالة المصادقة من localStorage ===');

  try {
    // مسح جميع البيانات المتعلقة بالمصادقة
    const keysToRemove = [
      AUTH_KEYS.AUTH_STATE,
      'current_user_profile',
      'current_organization',
      'bazaar_organization_id',
      'bazaar_current_subdomain',
      'user_authenticated',
      'last_auth_check'
    ];

    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        storageDebugLog(`تم مسح: ${key}`);
      }
    });

    storageDebugLog('✅ تم مسح جميع بيانات المصادقة');
  } catch (error) {
    storageDebugLog('❌ خطأ في مسح بيانات المصادقة:', error);
  }
};

/**
 * حفظ بيانات المستخدم والمؤسسة في التخزين المحلي
 */
export const saveUserDataToStorage = (userProfile: any, organization: any, organizationId?: string): void => {
  storageDebugLog('=== حفظ بيانات المستخدم والمؤسسة ===', {
    userId: userProfile?.id,
    userFullName: userProfile?.full_name,
    orgId: organization?.id || organizationId,
    orgName: organization?.name,
    orgSubdomain: organization?.subdomain,
    timestamp: new Date().toISOString()
  });

  try {
    if (userProfile) {
      localStorage.setItem('current_user_profile', JSON.stringify(userProfile));
      storageDebugLog('✅ تم حفظ ملف المستخدم');
    }

    if (organization) {
      localStorage.setItem('current_organization', JSON.stringify(organization));
      storageDebugLog('✅ تم حفظ بيانات المؤسسة');
      
      // حفظ معرف المؤسسة بشكل منفصل
      localStorage.setItem('bazaar_organization_id', organization.id);
      storageDebugLog('تم حفظ معرف المؤسسة:', organization.id);
      
      // حفظ النطاق الفرعي إذا كان متاحاً
      if (organization.subdomain) {
        localStorage.setItem('bazaar_current_subdomain', organization.subdomain);
        storageDebugLog('تم حفظ النطاق الفرعي:', organization.subdomain);
      }
    } else if (organizationId) {
      localStorage.setItem('bazaar_organization_id', organizationId);
      storageDebugLog('تم حفظ معرف المؤسسة فقط:', organizationId);
    }

  } catch (error) {
    storageDebugLog('❌ خطأ في حفظ بيانات المستخدم:', error);
  }
};

/**
 * تحميل بيانات المستخدم والمؤسسة من التخزين المحلي
 */
export const loadUserDataFromStorage = (): { userProfile: any; organization: any } => {
  storageDebugLog('=== تحميل بيانات المستخدم والمؤسسة ===');

  try {
    let userProfile = null;
    let organization = null;

    // تحميل ملف المستخدم
    const savedProfile = localStorage.getItem('current_user_profile');
    if (savedProfile) {
      userProfile = JSON.parse(savedProfile);
      storageDebugLog('✅ تم تحميل ملف المستخدم:', {
        userId: userProfile.id,
        fullName: userProfile.full_name,
        organizationId: userProfile.organization_id
      });
    } else {
      storageDebugLog('❌ لا يوجد ملف مستخدم محفوظ');
    }

    // تحميل بيانات المؤسسة
    const savedOrg = localStorage.getItem('current_organization');
    if (savedOrg) {
      organization = JSON.parse(savedOrg);
      storageDebugLog('✅ تم تحميل بيانات المؤسسة:', {
        orgId: organization.id,
        orgName: organization.name,
        orgSubdomain: organization.subdomain
      });
    } else {
      storageDebugLog('❌ لا توجد بيانات مؤسسة محفوظة');
    }

    // التحقق من معرف المؤسسة المحفوظ بشكل منفصل
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    if (storedOrgId) {
      storageDebugLog('معرف المؤسسة المحفوظ بشكل منفصل:', storedOrgId);
    }

    return { userProfile, organization };
  } catch (error) {
    storageDebugLog('❌ خطأ في تحميل بيانات المستخدم:', error);
    return { userProfile: null, organization: null };
  }
};

/**
 * مسح جميع بيانات المصادقة من التخزين المحلي
 */
export const clearAuthStorage = (): void => {
  try {
    Object.values(AUTH_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
  }
};

/**
 * التحقق من صحة البيانات المحفوظة
 */
export const validateStoredData = (): boolean => {
  try {
    const { session, user } = loadAuthFromStorage();
    const { userProfile } = loadUserDataFromStorage();
    
    // إذا كان لدينا session وuser، فالبيانات صحيحة
    if (session && user) {
      return true;
    }
    
    // إذا لم يكن لدينا session لكن لدينا profile، قد تكون البيانات قديمة
    if (!session && !user && userProfile) {
      clearAuthStorage();
      return false;
    }
    
    return false;
  } catch (error) {
    return false;
  }
};
