/**
 * Configuración especial de Supabase para Electron
 * Este archivo proporciona polyfills y configuraciones necesarias para 
 * que Supabase funcione correctamente en un entorno Electron
 */

// Verificar si estamos en un entorno Electron
export const isElectron = () => {
  return window && window.electronAPI && window.electronAPI.isElectron;
};

// Inicializar el entorno para Supabase en Electron
export const initSupabaseForElectron = () => {
  if (!isElectron()) {
    return; // Solo aplicar en Electron
  }

  // Asegurar que los objetos globales estén disponibles
  if (!window.global) {
    return;
  }

  // Aplicar polyfills y shims
  try {
    // Asegurar que estos objetos estén disponibles globalmente
    window.Buffer = window.Buffer || window.global.Buffer;
    window.process = window.process || window.global.process;
    
    // Algunos módulos usan directamente globalThis
    globalThis.Buffer = window.Buffer;
    globalThis.process = window.process;

  } catch (error) {
  }
};

// Exportar configuración
export default {
  isElectron,
  initSupabaseForElectron
};
