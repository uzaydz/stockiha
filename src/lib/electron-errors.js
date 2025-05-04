/**
 * Manejador de errores específicos para Electron
 * Este archivo proporciona funciones para capturar y manejar errores comunes
 * que pueden ocurrir en un entorno Electron, especialmente con Supabase
 */

// Lista de errores conocidos de Supabase en Electron
const KNOWN_ERRORS = [
  {
    pattern: /Cannot read properties of undefined \(reading 'prototype'\)/,
    solution: "Error de Node.js Node-Fetch en Electron. Asegúrate de que el preload está configurado correctamente.",
    code: "ELECTRON_NODE_FETCH_ERROR"
  },
  {
    pattern: /uncaught exception: ReferenceError: Buffer is not defined/,
    solution: "Falta el polyfill de Buffer. Asegúrate de que Buffer está disponible globalmente.",
    code: "ELECTRON_BUFFER_ERROR"
  },
  {
    pattern: /process is not defined/,
    solution: "Falta el polyfill de process. Asegúrate de que process está disponible globalmente.",
    code: "ELECTRON_PROCESS_ERROR"
  }
];

/**
 * Captura y procesa errores específicos de Electron
 * @param {Error} error - El error capturado
 * @returns {Object} Información procesada del error
 */
export const processElectronError = (error) => {
  const errorMsg = error?.message || String(error);
  
  // Buscar si es un error conocido
  for (const knownError of KNOWN_ERRORS) {
    if (knownError.pattern.test(errorMsg)) {
      console.error(`[ElectronError] ${knownError.code}: ${errorMsg}`);
      console.info(`[ElectronError] Posible solución: ${knownError.solution}`);
      
      return {
        isKnownError: true,
        originalError: error,
        code: knownError.code,
        solution: knownError.solution,
        message: errorMsg
      };
    }
  }
  
  // Error desconocido
  return {
    isKnownError: false,
    originalError: error,
    code: "ELECTRON_UNKNOWN_ERROR",
    solution: "Error desconocido en entorno Electron",
    message: errorMsg
  };
};

/**
 * Registra un manejador global de errores para la aplicación
 */
export const registerGlobalErrorHandler = () => {
  if (typeof window !== 'undefined') {
    // Manejador de errores no capturados
    window.addEventListener('error', (event) => {
      const processedError = processElectronError(event.error);
      
      if (processedError.isKnownError) {
        // Mostrar al usuario una interfaz amigable si es necesario
        if (window.electronAPI) {
          window.electronAPI.logError(`[${processedError.code}] ${processedError.message}`);
        }
      }
    });
    
    // Manejador de promesas rechazadas
    window.addEventListener('unhandledrejection', (event) => {
      const processedError = processElectronError(event.reason);
      
      if (processedError.isKnownError) {
        // Mostrar al usuario una interfaz amigable si es necesario
        if (window.electronAPI) {
          window.electronAPI.logError(`[${processedError.code}] ${processedError.message}`);
        }
      }
    });
    
    console.log('[ElectronErrors] Manejadores de errores registrados');
  }
};

export default {
  processElectronError,
  registerGlobalErrorHandler
}; 