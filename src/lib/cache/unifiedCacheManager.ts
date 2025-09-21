export type CacheType = 'api' | 'ui' | 'user' | 'static' | 'session' | 'persistent';

export interface CacheEntry<T = unknown> {
  data: T;
  type: CacheType;
  createdAt: number;
  lastAccessed: number;
  expiresAt: number | null;
  size: number;
}

const DEFAULT_TTL: Record<CacheType, number> = {
  api: 5 * 60 * 1000,
  ui: 30 * 60 * 1000,
  user: 60 * 60 * 1000,
  static: 24 * 60 * 60 * 1000,
  session: 24 * 60 * 60 * 1000,
  persistent: 7 * 24 * 60 * 60 * 1000
};

const LOCAL_PREFIX = 'ucm:';
const SESSION_PREFIX = 'ucm-session:';
const isBrowser = typeof window !== 'undefined';

class UnifiedCacheManager {
  private static instance: UnifiedCacheManager;
  private memoryCache = new Map<string, CacheEntry>();
  private maxEntries = 200;

  private constructor() {
    this.restoreStoredEntries();
  }

  static getInstance(): UnifiedCacheManager {
    if (!UnifiedCacheManager.instance) {
      UnifiedCacheManager.instance = new UnifiedCacheManager();
    }
    return UnifiedCacheManager.instance;
  }

  static set<T>(key: string, data: T, type: CacheType = 'api', ttl?: number): void {
    UnifiedCacheManager.getInstance().set(key, data, type, ttl);
  }

  static get<T>(key: string): T | null {
    return UnifiedCacheManager.getInstance().get<T>(key);
  }

  static delete(key: string): boolean {
    return UnifiedCacheManager.getInstance().delete(key);
  }

  static clearByType(type: CacheType): void {
    UnifiedCacheManager.getInstance().clearByType(type);
  }

  static clearAll(): void {
    UnifiedCacheManager.getInstance().clearAll();
  }

  static getStats() {
    return UnifiedCacheManager.getInstance().getStats();
  }

  set<T>(key: string, data: T, type: CacheType = 'api', ttl?: number): void {
    const now = Date.now();
    const resolvedTtl = this.resolveTtl(type, ttl);
    const entry: CacheEntry<T> = {
      data,
      type,
      createdAt: now,
      lastAccessed: now,
      expiresAt: resolvedTtl > 0 ? now + resolvedTtl : null,
      size: this.estimateSize(data)
    };

    this.memoryCache.set(key, entry);
    this.persistEntry(key, entry);
    this.enforceSizeLimit();
  }

  get<T>(key: string): T | null {
    let entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      entry = this.tryLoadFromStorage<T>(key);
      if (entry) {
        this.memoryCache.set(key, entry);
      }
    }

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.delete(key);
      return null;
    }

    entry.lastAccessed = Date.now();
    return entry.data;
  }

  delete(key: string): boolean {
    const hadEntry = this.memoryCache.delete(key);
    this.removeStoredEntry(key);
    return hadEntry;
  }

  clearByType(type: CacheType): void {
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.type === type) {
        this.delete(key);
      }
    }

    if (isBrowser) {
      if (type === 'session') {
        this.clearStorage(window.sessionStorage, SESSION_PREFIX);
      } else if (type === 'user' || type === 'static' || type === 'persistent') {
        this.clearStorage(window.localStorage, LOCAL_PREFIX, type);
      }
    }
  }

  clearAll(): void {
    this.memoryCache.clear();
    if (isBrowser) {
      this.clearStorage(window.localStorage, LOCAL_PREFIX);
      this.clearStorage(window.sessionStorage, SESSION_PREFIX);
    }
  }

  getStats() {
    this.cleanupExpiredEntries();

    const typeCounts: Record<CacheType, number> = {
      api: 0,
      ui: 0,
      user: 0,
      static: 0,
      session: 0,
      persistent: 0
    };

    let estimatedMemorySize = 0;
    for (const entry of this.memoryCache.values()) {
      typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1;
      estimatedMemorySize += entry.size;
    }

    return {
      memory: {
        entries: this.memoryCache.size,
        types: typeCounts,
        estimatedSize: estimatedMemorySize
      },
      storage: isBrowser
        ? {
            localStorage: this.collectStorageStats(window.localStorage, LOCAL_PREFIX),
            sessionStorage: this.collectStorageStats(window.sessionStorage, SESSION_PREFIX)
          }
        : { localStorage: { entries: 0, estimatedSize: 0 }, sessionStorage: { entries: 0, estimatedSize: 0 } },
      reactQuery: { enabled: false },
      serviceWorker: null
    };
  }

  // --------- Helpers ---------

  private resolveTtl(type: CacheType, ttl?: number): number {
    if (typeof ttl === 'number') {
      return ttl;
    }
    return DEFAULT_TTL[type] ?? DEFAULT_TTL.api;
  }

  private isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt;
  }

  private estimateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  private enforceSizeLimit(): void {
    if (this.memoryCache.size <= this.maxEntries) {
      return;
    }

    const entries = Array.from(this.memoryCache.entries());
    entries.sort((a, b) => (a[1].lastAccessed ?? a[1].createdAt) - (b[1].lastAccessed ?? b[1].createdAt));

    const targetSize = Math.floor(this.maxEntries * 0.8);
    for (let i = 0; i < entries.length && this.memoryCache.size > targetSize; i++) {
      const [key] = entries[i];
      this.delete(key);
    }
  }

  private cleanupExpiredEntries(): void {
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.delete(key);
      }
    }
  }

  private persistEntry(key: string, entry: CacheEntry): void {
    if (!isBrowser) {
      return;
    }

    if (entry.type === 'session') {
      this.writeToStorage(window.sessionStorage, SESSION_PREFIX + key, entry);
    } else if (entry.type === 'user' || entry.type === 'static' || entry.type === 'persistent') {
      this.writeToStorage(window.localStorage, LOCAL_PREFIX + key, entry);
    } else {
      this.removeStoredEntry(key);
    }
  }

  private tryLoadFromStorage<T>(key: string): CacheEntry<T> | undefined {
    if (!isBrowser) {
      return undefined;
    }

    const localEntry = this.readFromStorage<T>(window.localStorage, LOCAL_PREFIX + key);
    if (localEntry) {
      return localEntry;
    }

    const sessionEntry = this.readFromStorage<T>(window.sessionStorage, SESSION_PREFIX + key);
    if (sessionEntry) {
      return sessionEntry;
    }

    return undefined;
  }

  private removeStoredEntry(key: string): void {
    if (!isBrowser) {
      return;
    }

    try {
      window.localStorage.removeItem(LOCAL_PREFIX + key);
    } catch {
      // ignore
    }

    try {
      window.sessionStorage.removeItem(SESSION_PREFIX + key);
    } catch {
      // ignore
    }
  }

  private writeToStorage(storage: Storage, key: string, entry: CacheEntry): void {
    try {
      storage.setItem(key, JSON.stringify(entry));
    } catch {
      // ignore storage failures
    }
  }

  private readFromStorage<T>(storage: Storage, key: string): CacheEntry<T> | undefined {
    try {
      const raw = storage.getItem(key);
      if (!raw) {
        return undefined;
      }

      const entry = JSON.parse(raw) as CacheEntry<T>;
      if (this.isExpired(entry)) {
        storage.removeItem(key);
        return undefined;
      }

      entry.lastAccessed = Date.now();
      return entry;
    } catch {
      storage.removeItem(key);
      return undefined;
    }
  }

  private collectStorageStats(storage: Storage, prefix: string) {
    try {
      let entries = 0;
      let estimatedSize = 0;

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key || !key.startsWith(prefix)) {
          continue;
        }

        entries += 1;
        const raw = storage.getItem(key);
        if (raw) {
          estimatedSize += raw.length;
        }
      }

      return { entries, estimatedSize };
    } catch {
      return { entries: 0, estimatedSize: 0 };
    }
  }

  private clearStorage(storage: Storage, prefix: string, type?: CacheType): void {
    try {
      const keysToDelete: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        if (type) {
          const raw = storage.getItem(key);
          if (!raw) {
            continue;
          }

          try {
            const entry = JSON.parse(raw) as CacheEntry;
            if (entry.type === type) {
              storage.removeItem(key);
            }
          } catch {
            storage.removeItem(key);
          }
        } else {
          storage.removeItem(key);
        }
      }
    } catch {
      // ignore storage failures
    }
  }

  private restoreStoredEntries(): void {
    if (!isBrowser) {
      return;
    }

    const localEntries = this.restoreFromStorage(window.localStorage, LOCAL_PREFIX);
    const sessionEntries = this.restoreFromStorage(window.sessionStorage, SESSION_PREFIX);

    for (const [key, entry] of [...localEntries, ...sessionEntries]) {
      if (!this.isExpired(entry)) {
        this.memoryCache.set(key, entry);
      } else {
        this.removeStoredEntry(key);
      }
    }
  }

  private restoreFromStorage(storage: Storage, prefix: string): Array<[string, CacheEntry]> {
    const restored: Array<[string, CacheEntry]> = [];

    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key || !key.startsWith(prefix)) {
          continue;
        }

        const originalKey = key.replace(prefix, '');
        const entry = this.readFromStorage(storage, key);
        if (entry) {
          restored.push([originalKey, entry]);
        }
      }
    } catch {
      // ignore storage failures
    }

    return restored;
  }
}

if (isBrowser) {
  (window as any).UnifiedCache = UnifiedCacheManager;
}

export default UnifiedCacheManager;
