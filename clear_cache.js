// ===== تنظيف الكاش والبيانات المحفوظة =====
// شغل هذا الكود في console المتصفح (F12 > Console)

// 1. حذف localStorage
try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('subscription') || 
            key.includes('organization') || 
            key.includes('auth') ||
            key.includes('tenant') ||
            key.includes('user')) {
            keysToRemove.push(key);
        }
    }
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });
    
} catch (error) {
}

// 2. حذف sessionStorage
try {
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key.includes('subscription') || 
            key.includes('organization') || 
            key.includes('auth') ||
            key.includes('tenant') ||
            key.includes('user')) {
            sessionKeysToRemove.push(key);
        }
    }
    
    sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
    });
    
} catch (error) {
}

// 3. إعادة تحميل الصفحة
setTimeout(() => {
    window.location.reload(true); // إعادة تحميل قوية
}, 1000);
