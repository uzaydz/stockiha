/**
 * Tipos para la integración con Electron
 */

export interface ElectronAPI {
  isElectron: boolean;
  setTitle: (title: string) => void;
  logError: (error: string | Error) => void;
  reloadApp: () => void;
  getCurrentPath: () => string;
  getSystemInfo: () => {
    platform: string;
    arch: string;
    versions: Record<string, string>;
    env: string;
  };
  routing: {
    cleanPath: (path: string) => string;
    getBasePath: () => string;
    isElectronPath: (path: string) => boolean;
  };
  db: {
    init: () => Promise<boolean>;
    close: () => Promise<boolean>;
    execute: (sql: string, params?: any[]) => Promise<any>;
    insert: (table: string, data: Record<string, any>) => Promise<any>;
    update: (table: string, id: string | number, data: Record<string, any>) => Promise<any>;
    remove: (table: string, id: string | number) => Promise<boolean>;
    query: (table: string, options?: Record<string, any>) => Promise<any[]>;
    pendingChanges: () => Promise<number>;
  };
  sync: {
    start: () => Promise<boolean>;
    fromServer: (table: string, options?: Record<string, any>) => Promise<any>;
    full: (tables: string[]) => Promise<Record<string, any>>;
    onUpdate: (callback: (data: any) => void) => () => void;
  };
  offline: {
    checkConnection: () => Promise<boolean>;
    saveData: (key: string, data: any) => Promise<any>;
    loadData: (key: string) => Promise<any>;
    deleteData: (key: string) => Promise<any>;
    syncData: () => Promise<any>;
  };
  getUserDataPath: () => string;
  
  // واجهات جديدة لتوفير وصول مباشر
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  send: (channel: string, ...args: any[]) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    __ELECTRON_APP__?: boolean;
    __BASE_PATH__?: string;
    __ELECTRON_LOADED__?: boolean;
    global?: {
      process: any;
      Buffer: any;
      FormData: any;
    };
  }
}

// Tipos para modules importados desde Node.js
declare module 'stream' {
  export class Readable {
    constructor();
    static from(iterable: Iterable<any>): Readable;
    pipe<T>(destination: T): T;
    on(event: string, listener: (...args: any[]) => void): this;
  }
  
  export class PassThrough {
    constructor();
    pipe<T>(destination: T): T;
    on(event: string, listener: (...args: any[]) => void): this;
  }
  
  export function pipeline(...args: any[]): any;
}

declare module 'http' {
  export const STATUS_CODES: Record<string, string>;
}

declare module 'url' {
  export class URL {
    constructor(url: string, base?: string | URL);
    protocol: string;
    hostname: string;
    host: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
    searchParams: URLSearchParams;
    toString(): string;
  }
  
  export function parse(url: string): {
    protocol: string | null;
    hostname: string | null;
    port: string | null;
    pathname: string | null;
    search: string | null;
    hash: string | null;
    auth: string | null;
    host: string | null;
    query: Record<string, string> | null;
  };
  
  export function format(urlObj: URL | Record<string, any>): string;
}
