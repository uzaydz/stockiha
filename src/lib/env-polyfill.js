/**
 * Polyfill específico para env.mjs de Vite
 * Este archivo proporciona los objetos necesarios para que env.mjs de Vite funcione correctamente en Electron
 */

// Asegurarse de que process.env esté disponible
if (typeof process === 'undefined') {
  // eslint-disable-next-line no-global-assign
  window.process = { env: {} };
} else if (!process.env) {
  process.env = {};
}

// Exportar la función para inicializar el entorno
export function initEnvPolyfill() {
  // Asegurarse de que estos objetos estén disponibles globalmente
  if (typeof window !== 'undefined') {
    // Asignar process al objeto window para que env.mjs pueda acceder a él
    window.process = window.process || { env: {} };
    globalThis.process = globalThis.process || window.process;
    
    
  }
}

// Ejecutar la inicialización inmediatamente
initEnvPolyfill();

// Exportar para uso en otros módulos
export default { initEnvPolyfill }; 