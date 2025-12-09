/**
 * Desktop API Types
 * TypeScript definitions for Electron APIs
 */

// ============================================================================
// Platform Types
// ============================================================================

export type Platform = 'darwin' | 'win32' | 'linux' | 'web';
export type AppType = 'electron' | 'web';

export interface PlatformInfo {
  isElectron: boolean;
  isWeb: boolean;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
  platform: Platform;
  appType: AppType;
}

// ============================================================================
// Database Types
// ============================================================================

export interface DatabaseResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  changes?: number;
}

export interface QueryParams {
  [key: string]: unknown;
}

export interface DatabaseAPI {
  initialize(organizationId: string): Promise<DatabaseResult>;
  query<T = unknown>(sql: string, params?: QueryParams): Promise<DatabaseResult<T[]>>;
  queryOne<T = unknown>(sql: string, params?: QueryParams): Promise<DatabaseResult<T | null>>;
  execute(sql: string, params?: QueryParams): Promise<DatabaseResult<{ changes: number }>>;
  upsert(tableName: string, data: Record<string, unknown>): Promise<DatabaseResult>;
  delete(tableName: string, id: string): Promise<DatabaseResult>;
  close(): Promise<void>;
}

// ============================================================================
// Window Types
// ============================================================================

export interface WindowAPI {
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  close(): Promise<void>;
  hide(): Promise<void>;
  show(): Promise<void>;
  fullscreen(enable: boolean): Promise<void>;
  toggleDevTools(): Promise<void>;
}

// ============================================================================
// Updater Types
// ============================================================================

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

export interface DownloadProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdaterState {
  status: UpdateStatus;
  updateInfo?: UpdateInfo;
  downloadProgress?: DownloadProgress;
  error?: string;
}

export interface UpdaterAPI {
  checkForUpdates(): Promise<void>;
  downloadUpdate(): Promise<void>;
  quitAndInstall(): Promise<void>;
  getVersion(): Promise<string>;
  onCheckingForUpdate(callback: () => void): () => void;
  onUpdateAvailable(callback: (info: UpdateInfo) => void): () => void;
  onUpdateNotAvailable(callback: (info: UpdateInfo) => void): () => void;
  onUpdateError(callback: (error: string) => void): () => void;
  onDownloadProgress(callback: (progress: DownloadProgress) => void): () => void;
  onUpdateDownloaded(callback: (info: UpdateInfo) => void): () => void;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  silent?: boolean;
}

export interface NotificationAPI {
  show(options: NotificationOptions): Promise<boolean>;
}

// ============================================================================
// Dialog Types
// ============================================================================

export interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  title?: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

export interface DialogAPI {
  showMessage(options: MessageBoxOptions): Promise<{ response: number }>;
  showSaveDialog(options: SaveDialogOptions): Promise<{ canceled: boolean; filePath?: string }>;
  showOpenDialog(options: OpenDialogOptions): Promise<{ canceled: boolean; filePaths: string[] }>;
}

// ============================================================================
// Storage Types
// ============================================================================

export interface StorageAPI {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

// ============================================================================
// Session Types
// ============================================================================

export interface SessionAPI {
  getOrCreateKey(): Promise<string>;
  clearKey(): Promise<boolean>;
}

// ============================================================================
// App Types
// ============================================================================

export interface AppAPI {
  getVersion(): Promise<string>;
  getName(): Promise<string>;
  getSystemInfo(): Promise<Record<string, unknown>>;
  quit(): Promise<void>;
  platform: Platform;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
}

// ============================================================================
// Full Electron API Type
// ============================================================================

export interface ElectronAPI {
  app: AppAPI;
  window: WindowAPI;
  dialog: DialogAPI;
  notification: NotificationAPI;
  storage: StorageAPI;
  session: SessionAPI;
  updater: UpdaterAPI;
  db: {
    initialize(organizationId: string): Promise<DatabaseResult>;
    query(sql: string, params?: QueryParams): Promise<DatabaseResult>;
    queryOne(sql: string, params?: QueryParams): Promise<DatabaseResult>;
    execute(sql: string, params?: QueryParams): Promise<DatabaseResult>;
    upsert(tableName: string, data: Record<string, unknown>): Promise<DatabaseResult>;
    delete(tableName: string, id: string): Promise<DatabaseResult>;
    logConflict(entry: Record<string, unknown>): Promise<DatabaseResult>;
    getConflictHistory(entityType: string, entityId: string): Promise<DatabaseResult>;
  };
  license: {
    setAnchor(organizationId: string | null, serverNowMs: number): Promise<void>;
    getSecureNow(organizationId: string | null): Promise<number>;
  };
  file: {
    saveAs(filename: string, data: unknown): Promise<{ success: boolean; filePath?: string }>;
    exportPDF(options: Record<string, unknown>): Promise<{ success: boolean }>;
    exportExcel(options: Record<string, unknown>): Promise<{ success: boolean }>;
  };
  utils: {
    isOnline(): boolean;
    onOnlineStatusChange(callback: (online: boolean) => void): () => void;
  };
}

// ============================================================================
// Window Global Declaration
// ============================================================================

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
