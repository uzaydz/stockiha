(function () {
  try {
    var base = document.getElementById('app-base');
    if (!base) return;

    var isElectron =
      (typeof window !== 'undefined' && window.electronAPI != null) ||
      (typeof navigator !== 'undefined' && String(navigator.userAgent || '').includes('Electron'));

    var isHttp = location.protocol === 'http:' || location.protocol === 'https:';

    // Web: use absolute paths so deep routes like /tenant/signup work.
    // Desktop (Electron/file/custom protocol): keep relative paths (./).
    if (isHttp && !isElectron) {
      base.setAttribute('href', '/');
    }
  } catch (e) {
    // ignore
  }
})();

