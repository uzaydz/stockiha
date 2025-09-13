import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import * as path from "path";

// إعدادات تطوير مبسطة لحل مشاكل WebSocket
export default defineConfig({
  base: '/',
  server: {
    host: "localhost", // استخدام localhost فقط في التطوير
    port: 8080,
    
    // إعدادات HMR مبسطة
    hmr: {
      overlay: false,
      port: 24678, // منفذ مختلف للـ WebSocket
      host: "localhost",
    },
    
    // إعدادات CORS مبسطة
    cors: {
      origin: true,
      credentials: true,
    },
    
    // تعطيل المراقبة المعقدة
    watch: {
      usePolling: false,
      ignored: ['**/node_modules/**', '**/dist/**', '**/backups/**']
    }
  },
  
  plugins: [
    react({
      // إعدادات React مبسطة
      jsxImportSource: 'react'
    }),
  ],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  
  define: {
    'global': 'globalThis',
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  
  build: {
    sourcemap: true,
    minify: false,
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js'
    ],
  },
});
