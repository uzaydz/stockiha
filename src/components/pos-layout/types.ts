export interface POSLayoutState {
  isRefreshing?: boolean;
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
  executionTime?: number;
}

export type RefreshHandler = (() => void | Promise<void>) | null;

export interface POSSharedLayoutControls {
  useStandaloneLayout?: boolean;
  onRegisterRefresh?: (handler: RefreshHandler) => void;
  onLayoutStateChange?: (state: POSLayoutState) => void;
}
