// Script para inicializar la aplicación Electron
const fs = require('fs');
const path = require('path');

/**
 * Esta función verifica y modifica el entorno para asegurar la compatibilidad con Electron
 */
function initializeElectronApp() {
  console.log('Inicializando entorno Electron...');
  
  try {
    // Comprobar si dist/index.html existe
    const indexPath = path.join(__dirname, 'dist/index.html');
    if (!fs.existsSync(indexPath)) {
      console.error('No se encontró el archivo index.html en dist/');
      return false;
    }
    
    // Detectar archivos JavaScript principales
    const distPath = path.join(__dirname, 'dist');
    const assetsPath = path.join(distPath, 'assets');
    
    if (!fs.existsSync(assetsPath)) {
      console.error('No se encontró el directorio assets/');
      return false;
    }
    
    console.log('Verificando subdirectorios en assets:');
    const subdirs = fs.readdirSync(assetsPath);
    let jsFilesFound = false;
    
    for (const subdir of subdirs) {
      const subdirPath = path.join(assetsPath, subdir);
      
      // Verificar si es un directorio
      if (fs.statSync(subdirPath).isDirectory()) {
        console.log(`Verificando subdirectorio: ${subdir}`);
        const files = fs.readdirSync(subdirPath);
        
        // Buscar archivos JS
        const jsFiles = files.filter(file => file.endsWith('.js'));
        if (jsFiles.length > 0) {
          console.log(`Encontrados ${jsFiles.length} archivos JavaScript en ${subdir}:`);
          jsFiles.forEach(file => console.log(` - ${file}`));
          jsFilesFound = true;
        }
      }
    }
    
    if (!jsFilesFound) {
      console.error('No se encontraron archivos JavaScript en los subdirectorios de assets');
      return false;
    }
    
    // Todo correcto
    console.log('Verificación completada. El entorno Electron está listo.');
    return true;
  } catch (error) {
    console.error('Error al inicializar la aplicación Electron:', error);
    return false;
  }
}

// Exportar como promesa para poder usarlo de forma asíncrona
module.exports = {
  isElectronReady: () => Promise.resolve(initializeElectronApp())
}; 