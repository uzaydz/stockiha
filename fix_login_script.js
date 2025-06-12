/**
 * Script لإصلاح مشاكل تسجيل الدخول
 * يمكن تشغيله من console المتصفح
 */

// دالة إصلاح المستخدم الحالي
async function fixCurrentUserLoginIssue() {
  try {
    
    // استيراد الدالة المطلوبة
    const { quickFixCurrentUser } = await import('./src/lib/api/fix-login-issues.ts');
    
    // تطبيق الإصلاح
    const result = await quickFixCurrentUser();
    
    if (result) {
    } else {
    }
    
    return result;
  } catch (error) {
    return false;
  }
}

// دالة إصلاح مستخدم محدد
async function fixSpecificUser(email) {
  try {
    
    const { fixUserAuthId } = await import('./src/lib/api/fix-login-issues.ts');
    
    const result = await fixUserAuthId(email);
    
    if (result.success) {
    } else {
    }
    
    return result;
  } catch (error) {
    return { success: false, message: 'خطأ في التطبيق' };
  }
}

// دالة إصلاح جميع المستخدمين (للمديرين)
async function fixAllUsers() {
  try {
    
    const { fixAllUsersAuthId } = await import('./src/lib/api/fix-login-issues.ts');
    
    const result = await fixAllUsersAuthId();

    if (result.errors.length > 0) {
    }
    
    return result;
  } catch (error) {
    return { success: false, fixed_count: 0, errors: [error.message] };
  }
}

// إصلاح سريع (يمكن استدعاؤه مباشرة)
function quickFix() {
  fixCurrentUserLoginIssue();
}

// تصدير الدوال للاستخدام
window.fixLoginIssue = {
  current: fixCurrentUserLoginIssue,
  user: fixSpecificUser,
  all: fixAllUsers,
  quick: quickFix
};

// تشغيل تلقائي إذا كان هناك خطأ 406
if (window.location.search.includes('fix=true')) {
  quickFix();
}
