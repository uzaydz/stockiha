/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly VITE_DOMAIN_PROXY: string;
    readonly VITE_API_URL: string;
    readonly VITE_DEPLOYMENT_PLATFORM: string;
    readonly VITE_CLOUDFLARE_API_TOKEN: string;
    readonly VITE_CLOUDFLARE_ZONE_ID: string;
    readonly VITE_CLOUDFLARE_PROJECT_NAME: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly [key: string]: string | undefined;
  };
  readonly url: string;
}

declare var __dirname: string;
declare var process: {
  env: {
    NODE_ENV: string;
    [key: string]: string | undefined;
  };
  cwd: () => string;
  type: string;
};

declare global {
  interface Window {
    URL: typeof URL;
  }
}

export {};
