/**
 * WebSocket Polyfill لحل مشكلة استخدام 'ws' في المتصفح
 * يوجه استخدام ws إلى WebSocket الأصلي في المتصفح
 */

// في حالة المتصفح، استخدم WebSocket الأصلي
let WSClass: any;
let WSInstance: any;

if (typeof window !== 'undefined' && window.WebSocket) {
  WSClass = window.WebSocket;
  WSInstance = window.WebSocket;
} else {
  // في حالة Node.js أو البيئات الأخرى، قم بإنشاء mock class
  WSClass = class MockWebSocket {
    constructor() {
      throw new Error('WebSocket is not available in this environment');
    }
  };
  WSInstance = WSClass;
}

// تصدير WebSocket الأصلي كـ default export
export default WSClass;

// تصدير named exports أيضًا للتوافق
export const WebSocket = WSInstance;

// تصدير مُسمى للتوافق مع مكتبات مختلفة
export const ws = WSInstance; 