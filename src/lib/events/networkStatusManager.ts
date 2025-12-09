/**
 * NetworkStatusManager ensures we only attach global online/offline listeners once
 * and share status updates through subscribers and the central event manager.
 * 
 * ⚡ محسّن لـ Tauri: يستخدم ConnectionState بدلاً من navigator.onLine
 */

import { dispatchAppEvent } from './eventManager';

// ⚡ ConnectionState removed - using navigator.onLine and event listeners instead
let connectionStateModule: any = null;

export interface NetworkStatus {
  isOnline: boolean;
  timestamp: number;
}

type NetworkStatusListener = (status: NetworkStatus) => void;

class NetworkStatusManager {
  private listeners = new Set<NetworkStatusListener>();
  private isInitialized = false;
  private status: NetworkStatus = {
    // ⚡ البدء بـ true وانتظار ConnectionState للتحديث
    isOnline: true,
    timestamp: Date.now()
  };

  private notify(status: NetworkStatus) {
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[NetworkStatusManager] listener error', error);
        }
      }
    }
  }

  private handleStatusChange = () => {
    // ⚡ استخدام ConnectionState إذا كان متاحاً
    let isOnline = true;
    if (connectionStateModule?.connectionState) {
      isOnline = connectionStateModule.connectionState.isOnline();
    } else if (typeof navigator !== 'undefined') {
      // Fallback لـ navigator.onLine
      isOnline = navigator.onLine;
    }
    
    this.status = {
      isOnline,
      timestamp: Date.now()
    };

    dispatchAppEvent('network:status-changed', this.status, {
      dedupeKey: 'network:status',
      dedupeWindowMs: 0,
      disableDedupe: true
    });

    this.notify(this.status);
  };

  private ensureInitialized() {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    // ⚡ الاستماع لـ connection-state-change بدلاً من online/offline
    window.addEventListener('connection-state-change', (e: any) => {
      if (e.detail) {
        this.setStatus(e.detail.isOnline);
      }
    });
    
    // Fallback: الاستماع لـ online/offline أيضاً
    window.addEventListener('online', this.handleStatusChange);
    window.addEventListener('offline', this.handleStatusChange);
    this.isInitialized = true;
  }

  // تحديث الحالة برمجياً وبثّها لكل المستمعين
  setStatus(isOnline: boolean) {
    const next: NetworkStatus = { isOnline, timestamp: Date.now() };
    // تجاهل التحديث إذا لم تتغير الحالة لتقليل الضجيج
    if (this.status.isOnline === next.isOnline) {
      this.status = next; // تحديث الطابع الزمني فقط
      return;
    }
    this.status = next;
    dispatchAppEvent('network:status-changed', this.status, {
      dedupeKey: 'network:status',
      dedupeWindowMs: 0,
      disableDedupe: true
    });
    this.notify(this.status);
  }

  subscribe(listener: NetworkStatusListener): () => void {
    this.ensureInitialized();
    this.listeners.add(listener);

    // Send current status immediately.
    listener(this.status);

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && this.isInitialized) {
        window.removeEventListener('online', this.handleStatusChange);
        window.removeEventListener('offline', this.handleStatusChange);
        this.isInitialized = false;
      }
    };
  }

  getStatus(): NetworkStatus {
    this.ensureInitialized();
    return this.status;
  }
}

export const networkStatusManager = new NetworkStatusManager();
