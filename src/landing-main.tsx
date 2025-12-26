/**
 * 🚀 LANDING PAGE ENTRY - خفيف جداً!
 *
 * هذا الملف مستقل تماماً ولا يحمل:
 * ❌ PowerSync
 * ❌ Supabase
 * ❌ React Query
 * ❌ أي مكتبات ثقيلة
 *
 * ✅ React فقط + CSS
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import LandingApp from './landing/LandingApp';
import './landing/landing.css';

// Remove loading screen
const removeLoader = () => {
  const loader = document.querySelector('.landing-loader');
  if (loader) {
    loader.remove();
  }
};

// Render landing page
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <LandingApp />
    </React.StrictMode>
  );

  // Remove loader after React renders
  setTimeout(removeLoader, 100);
}
