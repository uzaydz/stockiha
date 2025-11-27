/* eslint-disable @typescript-eslint/no-explicit-any */

// Lightweight diagnostics console initializer

(function initDiagnostics() {
  if (typeof window === 'undefined') return;
  if ((window as any).__BAZAAR_DIAGNOSTICS_INIT__) return;
  (window as any).__BAZAAR_DIAGNOSTICS_INIT__ = true;

  const stamp = () => new Date().toISOString();
  const safeUA = (() => {
    try { return navigator.userAgent; } catch { return 'unknown'; }
  })();

  const isElectron = safeUA.includes('Electron');
  const env = (import.meta as any)?.env || {};
  const envMode = env.PROD ? 'PROD' : (env.DEV ? 'DEV' : 'UNKNOWN');

  try { console.log(`🩺 [Diagnostics] init ${stamp()} · env=${envMode} · electron=${isElectron}`); } catch {}
  try { console.log('🩺 [Diagnostics] UA:', safeUA); } catch {}
  try { console.log('🩺 [Diagnostics] navigator.onLine:', navigator.onLine); } catch {}

  // Global error traps
  const onError = (ev: ErrorEvent) => {
    try {
      const info = {
        message: ev.message,
        filename: ev.filename,
        lineno: ev.lineno,
        colno: ev.colno,
        error: ev.error ? { name: (ev.error as any)?.name, message: (ev.error as any)?.message, stack: (ev.error as any)?.stack } : null,
        time: stamp()
      };
      console.error('❌ [GlobalError]', info);
    } catch {}
  };
  const onUnhandled = (ev: PromiseRejectionEvent) => {
    try {
      const reason = ev.reason || {};
      const info = {
        reason: typeof reason === 'object' ? { name: reason?.name, message: reason?.message, stack: reason?.stack } : String(reason),
        time: stamp()
      };
      console.error('❌ [UnhandledRejection]', info);
    } catch {}
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandled);

  // Network status
  const onOnline = () => { try { console.log('🌐 [Network] online', { time: stamp(), navigatorOnLine: navigator.onLine }); } catch {} };
  const onOffline = () => { try { console.warn('🌐 [Network] offline', { time: stamp(), navigatorOnLine: navigator.onLine }); } catch {} };
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Hook SmartSyncEngine if available
  try {
    import('@/lib/sync/SmartSyncEngine').then(({ smartSyncEngine }) => {
      try {
        const env = (import.meta as any)?.env || {};
        // يمكننا إضافة مستمعين للأحداث إذا أضفناهم لاحقاً لـ SmartSyncEngine
        // حالياً، SmartSyncEngine يقوم بالـ log بنفسه
        console.log('🩺 [Diagnostics] SmartSyncEngine hooked');
      } catch {}
    }).catch(() => {});
  } catch {}

  // Snapshot helpers
  const dump = async () => {
    const snapshot: any = { time: stamp() };
    try { snapshot.navigatorOnLine = navigator.onLine; } catch { snapshot.navigatorOnLine = 'unknown'; }
    snapshot.env = envMode;
    snapshot.electron = isElectron;
    
    try {
      const { smartSyncEngine } = await import('@/lib/sync/SmartSyncEngine');
      snapshot.smartSync = smartSyncEngine.getStatus();
    } catch {}

    try {
      const mod = await import('@/lib/supabase-unified');
      if (mod?.getSupabaseDiagnostics) {
        snapshot.supabase = mod.getSupabaseDiagnostics();
      }
    } catch {}
    try { console.log('🧾 [Diagnostics.dump]', snapshot); } catch {}
    return snapshot;
  };

  const startSync = async () => {
    try {
      // ⚡ استخدام DeltaSyncEngine الموحد بدلاً من SmartSyncEngine
      const { deltaSyncEngine } = await import('@/lib/sync/delta');
      const status = await deltaSyncEngine.getStatus();
      if (status.isInitialized) {
        await deltaSyncEngine.fullSync();
        console.log('🔁 [Diagnostics] DeltaSyncEngine.fullSync triggered');
      } else {
        console.warn('🔁 [Diagnostics] DeltaSyncEngine not initialized');
      }
      return { triggered: true, status };
    } catch (e) {
      console.error('🔁 [Diagnostics] DeltaSyncEngine error', e);
      throw e;
    }
  };

  (window as any).BazaarDiag = { dump, startSync };
})();
