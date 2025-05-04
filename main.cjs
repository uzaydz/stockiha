// Archivo principal para iniciar Electron
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { isElectronReady } = require('./electron-init.cjs');

// Verificar que estemos en el directorio correcto
const checkWorkingDirectory = () => {
  console.log('Directorio de trabajo actual:', process.cwd());
  console.log('Directorio de la aplicación:', app.getAppPath());
  
  // Verificar archivos esenciales
  const requiredFiles = [
    'electron.cjs',
    'preload.cjs',
    'dist/index.html',
    'package.json'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(process.cwd(), file)));
  
  if (missingFiles.length > 0) {
    console.error('Archivos esenciales faltantes:', missingFiles);
    return false;
  }
  
  return true;
};

// Iniciar la aplicación Electron
const startElectronApp = async () => {
  try {
    // Verificar entorno
    if (!checkWorkingDirectory()) {
      console.error('Error: El entorno de trabajo no es válido');
      app.quit();
      return;
    }

    // Verificar que el entorno Electron esté listo
    const ready = await isElectronReady();
    if (!ready) {
      console.error('Error: El entorno Electron no está listo');
      app.quit();
      return;
    }

    // Cargar la configuración principal de Electron
    require('./electron.cjs');
    
    console.log('¡Aplicación Electron iniciada correctamente!');
  } catch (error) {
    console.error('Error al iniciar la aplicación Electron:', error);
    app.quit();
  }
};

// Iniciar cuando Electron esté listo
app.whenReady().then(startElectronApp);

// Salir cuando todas las ventanas se cierren (excepto en macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// En macOS, recrear la ventana cuando se haga clic en el icono del dock
app.on('activate', () => {
  // El archivo electron.cjs se encarga de esto, no hacemos nada aquí
}); 