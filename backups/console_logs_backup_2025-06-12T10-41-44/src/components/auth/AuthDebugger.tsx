import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAuthPersistence } from '@/hooks/useAuthPersistence';

export const AuthDebugger = () => {
  const { user, session, loading } = useAuth();
  const { wasRecentlyAuthenticated, isAuthenticated, hasValidSavedState } = useAuthPersistence();
  const [isVisible, setIsVisible] = useState(false);
  const [savedStateInfo, setSavedStateInfo] = useState<any>(null);

  // فحص البيانات المحفوظة
  useEffect(() => {
    const checkSavedState = () => {
      try {
        const savedState = localStorage.getItem('bazaar_auth_state');
        if (savedState) {
          const authState = JSON.parse(savedState);
          setSavedStateInfo({
            hasState: true,
            userId: authState.session?.user?.id,
            email: authState.session?.user?.email,
            expiresAt: authState.session?.expires_at,
            timestamp: authState.timestamp
          });
        } else {
          setSavedStateInfo({ hasState: false });
        }
      } catch {
        setSavedStateInfo({ hasState: false, error: true });
      }
    };

    checkSavedState();
    const interval = setInterval(checkSavedState, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <div 
        className="fixed bottom-4 right-4 bg-primary text-primary-foreground p-2 rounded cursor-pointer z-50 text-xs"
        onClick={() => setIsVisible(true)}
      >
        🔍 Debug Auth
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 shadow-lg z-50 max-w-sm text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">🔍 Auth Debug</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div>
          <strong>Current State:</strong>
          <div className="ml-2">
            <div>User: {user ? `${user.email} (${user.id})` : 'None'}</div>
            <div>Session: {session ? '✅' : '❌'}</div>
            <div>Loading: {loading ? '⏳' : '✅'}</div>
          </div>
        </div>
        
        <div>
          <strong>Auth Persistence:</strong>
          <div className="ml-2">
            <div>Is Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
            <div>Was Recently Auth: {wasRecentlyAuthenticated ? '✅' : '❌'}</div>
            <div>Has Valid Saved: {hasValidSavedState ? '✅' : '❌'}</div>
          </div>
        </div>
        
        <div>
          <strong>LocalStorage:</strong>
          <div className="ml-2">
            {savedStateInfo?.hasState ? (
              <>
                <div>User ID: {savedStateInfo.userId?.substring(0, 8)}...</div>
                <div>Email: {savedStateInfo.email}</div>
                <div>Expires: {new Date(savedStateInfo.expiresAt * 1000).toLocaleTimeString()}</div>
              </>
            ) : (
              <div>No saved state</div>
            )}
          </div>
        </div>
        
        <button 
          onClick={() => {
            localStorage.removeItem('bazaar_auth_state');
            window.location.reload();
          }}
          className="w-full bg-destructive text-destructive-foreground p-1 rounded text-xs"
        >
          Clear & Reload
        </button>
      </div>
    </div>
  );
};
