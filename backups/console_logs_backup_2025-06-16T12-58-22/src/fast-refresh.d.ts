/// <reference types="react" />

// إعدادات Fast Refresh للـ contexts والـ hooks
declare module '@vitejs/plugin-react-swc' {
  interface Options {
    fastRefresh?: boolean;
  }
}

// إضافة دعم Fast Refresh للـ contexts
declare global {
  interface Window {
    $RefreshReg$: (type: any, id: string) => void;
    $RefreshSig$: () => (type: any) => any;
  }
}

export {};
