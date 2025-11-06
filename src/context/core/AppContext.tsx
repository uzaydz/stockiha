/**
 * AppContext - Context محسن يدمج Auth + Theme + App State
 *
 * يدمج هذا الـ Context:
 * - AuthContext (المصادقة)
 * - ThemeContext (الثيم)
 * - AppInitializationContext (حالة التطبيق)
 *
 * التحسينات:
 * - استخدام useReducer بدلاً من useState المتعددة
 * - React.memo للمكونات
 * - useMemo/useCallback للأداء
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useEffect,
  ReactNode
} from 'react';

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

export type Theme = 'light' | 'dark' | 'system';

export interface AppState {
  // Auth State
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;

  // Theme State
  theme: Theme;
  effectiveTheme: 'light' | 'dark'; // actual theme after system preference

  // App State
  isInitialized: boolean;
  appVersion: string;
  isOnline: boolean;
  lastSync: Date | null;
}

export type AppAction =
  | { type: 'AUTH_LOADING' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'SET_EFFECTIVE_THEME'; payload: 'light' | 'dark' }
  | { type: 'APP_INITIALIZED'; payload: string }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'UPDATE_SYNC_TIME'; payload: Date };

export interface AppContextType {
  state: AppState;

  // Auth Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Theme Actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // App Actions
  markInitialized: () => void;
  updateSyncTime: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isAuthLoading: false,
  authError: null,
  theme: 'system',
  effectiveTheme: 'light',
  isInitialized: false,
  appVersion: '1.0.0',
  isOnline: navigator.onLine,
  lastSync: null,
};

// ============================================================================
// Reducer
// ============================================================================

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'AUTH_LOADING':
      return {
        ...state,
        isAuthLoading: true,
        authError: null,
      };

    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isAuthLoading: false,
        authError: null,
      };

    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isAuthLoading: false,
        authError: action.payload,
      };

    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isAuthLoading: false,
        authError: null,
      };

    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      };

    case 'SET_EFFECTIVE_THEME':
      return {
        ...state,
        effectiveTheme: action.payload,
      };

    case 'APP_INITIALIZED':
      return {
        ...state,
        isInitialized: true,
        appVersion: action.payload,
      };

    case 'SET_ONLINE_STATUS':
      return {
        ...state,
        isOnline: action.payload,
      };

    case 'UPDATE_SYNC_TIME':
      return {
        ...state,
        lastSync: action.payload,
      };

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = React.memo(function AppProvider({
  children
}: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // ========================================================================
  // Theme Management
  // ========================================================================

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateEffectiveTheme = () => {
      if (state.theme === 'system') {
        dispatch({
          type: 'SET_EFFECTIVE_THEME',
          payload: mediaQuery.matches ? 'dark' : 'light',
        });
      } else {
        dispatch({
          type: 'SET_EFFECTIVE_THEME',
          payload: state.theme,
        });
      }
    };

    updateEffectiveTheme();
    mediaQuery.addEventListener('change', updateEffectiveTheme);

    return () => mediaQuery.removeEventListener('change', updateEffectiveTheme);
  }, [state.theme]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(state.effectiveTheme);
  }, [state.effectiveTheme]);

  // ========================================================================
  // Online Status Management
  // ========================================================================

  useEffect(() => {
    const handleOnline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
    const handleOffline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ========================================================================
  // Auth Actions
  // ========================================================================

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'AUTH_LOADING' });

    try {
      // TODO: Replace with actual auth logic
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('فشل تسجيل الدخول');
      }

      const user = await response.json();
      dispatch({ type: 'AUTH_SUCCESS', payload: user });

      // Store token in localStorage
      localStorage.setItem('auth_token', user.token);
    } catch (error) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: error instanceof Error ? error.message : 'حدث خطأ'
      });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // TODO: Replace with actual logout logic
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'AUTH_LOGOUT' });
      localStorage.removeItem('auth_token');
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    dispatch({ type: 'AUTH_LOADING' });

    try {
      // TODO: Replace with actual refresh logic
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('فشل تحديث بيانات المستخدم');
      }

      const user = await response.json();
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error) {
      dispatch({ type: 'AUTH_LOGOUT' });
      localStorage.removeItem('auth_token');
    }
  }, []);

  // ========================================================================
  // Theme Actions
  // ========================================================================

  const setTheme = useCallback((theme: Theme) => {
    dispatch({ type: 'SET_THEME', payload: theme });
    localStorage.setItem('theme', theme);
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = state.effectiveTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [state.effectiveTheme, setTheme]);

  // ========================================================================
  // App Actions
  // ========================================================================

  const markInitialized = useCallback(() => {
    const version = import.meta.env.VITE_APP_VERSION || '1.0.0';
    dispatch({ type: 'APP_INITIALIZED', payload: version });
  }, []);

  const updateSyncTime = useCallback(() => {
    dispatch({ type: 'UPDATE_SYNC_TIME', payload: new Date() });
  }, []);

  // ========================================================================
  // Initialize App
  // ========================================================================

  useEffect(() => {
    const initializeApp = async () => {
      // Load saved theme
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme) {
        dispatch({ type: 'SET_THEME', payload: savedTheme });
      }

      // Try to restore session
      await refreshUser();

      // Mark as initialized
      markInitialized();
    };

    initializeApp();
  }, [refreshUser, markInitialized]);

  // ========================================================================
  // Context Value (memoized)
  // ========================================================================

  const value = useMemo<AppContextType>(
    () => ({
      state,
      login,
      logout,
      refreshUser,
      setTheme,
      toggleTheme,
      markInitialized,
      updateSyncTime,
    }),
    [
      state,
      login,
      logout,
      refreshUser,
      setTheme,
      toggleTheme,
      markInitialized,
      updateSyncTime,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
});

// ============================================================================
// Hook
// ============================================================================

export function useApp(): AppContextType {
  const context = useContext(AppContext);

  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }

  return context;
}

// ============================================================================
// Selectors (for performance)
// ============================================================================

export function useAuth() {
  const { state, login, logout, refreshUser } = useApp();

  return useMemo(
    () => ({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isAuthLoading,
      error: state.authError,
      login,
      logout,
      refreshUser,
    }),
    [state.user, state.isAuthenticated, state.isAuthLoading, state.authError, login, logout, refreshUser]
  );
}

export function useTheme() {
  const { state, setTheme, toggleTheme } = useApp();

  return useMemo(
    () => ({
      theme: state.theme,
      effectiveTheme: state.effectiveTheme,
      setTheme,
      toggleTheme,
    }),
    [state.theme, state.effectiveTheme, setTheme, toggleTheme]
  );
}

export function useAppStatus() {
  const { state } = useApp();

  return useMemo(
    () => ({
      isInitialized: state.isInitialized,
      appVersion: state.appVersion,
      isOnline: state.isOnline,
      lastSync: state.lastSync,
    }),
    [state.isInitialized, state.appVersion, state.isOnline, state.lastSync]
  );
}
