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

/**
 * حفظ حالة المصادقة في التخزين المحلي
 */
export const saveAuthToStorage = (session: Session | null, user: any | null): void => {
  try {
    if (session && user) {
      const authState: SavedAuthState = {
        session,
        user,
        timestamp: Date.now(),
      };
      localStorage.setItem(AUTH_KEYS.AUTH_STATE, JSON.stringify(authState));
      console.log('💾 Auth state saved to storage');
    } else {
      localStorage.removeItem(AUTH_KEYS.AUTH_STATE);
      console.log('🗑️ Auth state removed from storage');
    }
  } catch (error) {
    console.error('❌ Error saving auth state:', error);
  }
};

/**
 * تحميل حالة المصادقة من التخزين المحلي
 */
export const loadAuthFromStorage = (): { session: Session | null; user: any | null } => {
  try {
    const savedState = localStorage.getItem(AUTH_KEYS.AUTH_STATE);
    
    if (!savedState) {
      return { session: null, user: null };
    }

    const authState: SavedAuthState = JSON.parse(savedState);
    
    // التحقق من انتهاء صلاحية البيانات المحفوظة (24 ساعة)
    const maxAge = 24 * 60 * 60 * 1000; // 24 ساعة
    if (Date.now() - authState.timestamp > maxAge) {
      console.log('⏰ Saved auth state expired, removing');
      localStorage.removeItem(AUTH_KEYS.AUTH_STATE);
      return { session: null, user: null };
    }

    // التحقق من انتهاء صلاحية الجلسة
    if (authState.session?.expires_at) {
      const expirationTime = authState.session.expires_at * 1000;
      if (Date.now() >= expirationTime) {
        console.log('🔓 Session expired, removing auth state');
        localStorage.removeItem(AUTH_KEYS.AUTH_STATE);
        return { session: null, user: null };
      }
    }

    console.log('📋 Auth state loaded from storage');
    return {
      session: authState.session,
      user: authState.user,
    };
  } catch (error) {
    console.error('❌ Error loading auth state:', error);
    localStorage.removeItem(AUTH_KEYS.AUTH_STATE);
    return { session: null, user: null };
  }
};

/**
 * حفظ بيانات المستخدم في التخزين المحلي
 */
export const saveUserDataToStorage = (
  userProfile: any | null,
  organization: any | null,
  organizationId: string | null
): void => {
  try {
    if (userProfile) {
      localStorage.setItem(AUTH_KEYS.USER_PROFILE, JSON.stringify(userProfile));
    } else {
      localStorage.removeItem(AUTH_KEYS.USER_PROFILE);
    }

    if (organization) {
      localStorage.setItem(AUTH_KEYS.ORGANIZATION, JSON.stringify(organization));
    } else {
      localStorage.removeItem(AUTH_KEYS.ORGANIZATION);
    }

    if (organizationId) {
      localStorage.setItem(AUTH_KEYS.ORGANIZATION_ID, organizationId);
    } else {
      localStorage.removeItem(AUTH_KEYS.ORGANIZATION_ID);
    }

    console.log('👤 User data saved to storage');
  } catch (error) {
    console.error('❌ Error saving user data:', error);
  }
};

/**
 * تحميل بيانات المستخدم من التخزين المحلي
 */
export const loadUserDataFromStorage = (): SavedUserData => {
  try {
    const userProfile = (() => {
      try {
        const saved = localStorage.getItem(AUTH_KEYS.USER_PROFILE);
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    })();

    const organization = (() => {
      try {
        const saved = localStorage.getItem(AUTH_KEYS.ORGANIZATION);
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    })();

    const organizationId = localStorage.getItem(AUTH_KEYS.ORGANIZATION_ID);

    console.log('📂 User data loaded from storage:', {
      hasProfile: !!userProfile,
      hasOrganization: !!organization,
      organizationId,
    });

    return {
      userProfile,
      organization,
      organizationId,
    };
  } catch (error) {
    console.error('❌ Error loading user data:', error);
    return {
      userProfile: null,
      organization: null,
      organizationId: null,
    };
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
    console.log('🧹 All auth data cleared from storage');
  } catch (error) {
    console.error('❌ Error clearing auth storage:', error);
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
      console.log('⚠️ Found orphaned user data without session, cleaning up...');
      clearAuthStorage();
      return false;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error validating stored data:', error);
    return false;
  }
}; 