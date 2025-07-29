/**
 * أداة لإعادة تعيين حالة التحميل عند حدوث مشاكل
 */

// إعادة تعيين حالة التحميل في localStorage
export const resetLoadingState = () => {
  console.log('🔄 إعادة تعيين حالة التحميل...');
  
  // مسح أي بيانات تحميل محفوظة
  const keysToRemove = [
    'bazaar_loading_state',
    'bazaar_app_loading',
    'bazaar_store_loading',
    'bazaar_unified_loading'
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // إرسال حدث لإعادة تعيين حالة التحميل
  window.dispatchEvent(new CustomEvent('resetLoadingState'));
};

// إعادة تعيين مؤشر التحميل المركزي
export const forceHideGlobalLoader = () => {
  console.log('🚨 إجبار إخفاء مؤشر التحميل المركزي');
  
  // البحث عن عنصر مؤشر التحميل وإخفاؤه
  const loaderElements = document.querySelectorAll('[data-testid="unified-loader"], .unified-loader, .loading-overlay');
  loaderElements.forEach(element => {
    if (element instanceof HTMLElement) {
      element.style.display = 'none';
    }
  });
  
  // إرسال حدث لإخفاء المؤشر
  window.dispatchEvent(new CustomEvent('forceHideLoader'));
};

// إعادة تحميل الصفحة مع تنظيف الحالة
export const resetAndReload = () => {
  console.log('🔄 إعادة تحميل الصفحة مع تنظيف الحالة...');
  
  resetLoadingState();
  
  // تأخير قصير ثم إعادة تحميل
  setTimeout(() => {
    window.location.reload();
  }, 100);
};

// إضافة زر إعادة التعيين للمطورين في وضع التطوير
export const addResetButton = () => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const existingButton = document.getElementById('loading-reset-button');
  if (existingButton) return;
  
  const button = document.createElement('button');
  button.id = 'loading-reset-button';
  button.innerHTML = '🔄 إعادة تعيين التحميل';
  button.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
    background: #ff4444;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    font-family: 'Tajawal', sans-serif;
  `;
  
  button.onclick = () => {
    if (confirm('هل تريد إعادة تعيين حالة التحميل؟')) {
      resetAndReload();
    }
  };
  
  document.body.appendChild(button);
};

// تشغيل الأداة في وضع التطوير
if (process.env.NODE_ENV === 'development') {
  // إضافة الزر بعد تحميل الصفحة
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addResetButton);
  } else {
    addResetButton();
  }
  
  // إضافة listener للحدث المخصص
  window.addEventListener('resetLoadingState', () => {
    console.log('📢 تم استقبال حدث إعادة تعيين التحميل');
  });
  
  window.addEventListener('forceHideLoader', () => {
    console.log('📢 تم استقبال حدث إخفاء المؤشر');
  });
} 