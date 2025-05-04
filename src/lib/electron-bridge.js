/**
 * جسر الاتصال مع Electron
 * يوفر واجهة موحدة للوصول إلى وظائف Electron أو محاكاتها في المتصفح
 */

console.log('Inicializando puente de Electron');

/**
 * التحقق مما إذا كان التطبيق يعمل في بيئة Electron
 */
export const isElectron = () => {
  return typeof window !== 'undefined' && Boolean(window.electronAPI);
};

/**
 * محاكاة وظيفة invoke عندما لا تكون Electron متاحة
 */
export const invoke = async (channel, ...args) => {
  if (isElectron() && window.electronAPI.invoke) {
    return window.electronAPI.invoke(channel, ...args);
  }
  
  // محاكاة الوظائف الأساسية للاختبار والتطوير
  console.log(`[ElectronMock] محاكاة استدعاء ${channel}`, args);
  
  // محاكاة نتائج بناءً على القناة
  switch (channel) {
    case 'db:init':
      return { success: true };
    case 'db:pending-changes':
      return { success: true, count: 0 };
    case 'sync:start':
      return { success: true };
    case 'offline:check-connection':
      return true;
    default:
      return { success: false, error: 'القناة غير مدعومة في المحاكاة' };
  }
};

/**
 * محاكاة وظيفة send عندما لا تكون Electron متاحة
 */
export const send = (channel, ...args) => {
  if (isElectron() && window.electronAPI.send) {
    window.electronAPI.send(channel, ...args);
    return;
  }
  
  // محاكاة الوظائف الأساسية للاختبار والتطوير
  console.log(`[ElectronMock] محاكاة إرسال ${channel}`, args);
};

/**
 * محاكاة وظيفة on عندما لا تكون Electron متاحة
 */
export const on = (channel, callback) => {
  if (isElectron() && window.electronAPI) {
    // للأسف، لا يمكننا الوصول إلى on مباشرة، لكن يمكننا استخدام واجهات الاستماع المتاحة
    if (channel === 'sync:update' && window.electronAPI.sync && window.electronAPI.sync.onUpdate) {
      return window.electronAPI.sync.onUpdate(callback);
    }
    
    console.warn(`[ElectronBridge] القناة ${channel} غير مدعومة للاستماع`);
    return () => {}; // وظيفة تنظيف فارغة
  }
  
  console.log(`[ElectronMock] محاكاة الاستماع إلى ${channel}`);
  return () => {}; // وظيفة تنظيف فارغة
};

// تصدير واجهة موحدة
const electronBridge = {
  isElectron,
  invoke,
  send,
  on
};

console.log('Puente de Electron inicializado correctamente');

export default electronBridge; 