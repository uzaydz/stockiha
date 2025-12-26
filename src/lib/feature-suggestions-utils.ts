/**
 * دوال مساعدة لنظام اقتراحات الميزات
 */

/**
 * تحويل الأرقام الإنجليزية إلى عربية
 */
export function toArabicNumbers(str: string): string {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[0-9]/g, (digit) => arabicNumbers[parseInt(digit)]);
}

/**
 * تنسيق التاريخ بالتقويم الهجري والأرقام العربية
 */
export function formatHijriDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  try {
    // تنسيق التاريخ الهجري
    const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);

    // تحويل الأرقام إلى عربية
    return toArabicNumbers(hijriDate);
  } catch (error) {
    // في حالة الخطأ، نستخدم التنسيق العادي
    return toArabicNumbers(dateObj.toLocaleDateString('ar-SA'));
  }
}

/**
 * تنسيق التاريخ والوقت بالهجري
 */
export function formatHijriDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  try {
    const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);

    return toArabicNumbers(hijriDate);
  } catch (error) {
    return toArabicNumbers(dateObj.toLocaleString('ar-SA'));
  }
}

/**
 * تنسيق اسم المستخدم لعرضه
 * إذا كان الاسم يبدو أنه إيميل، نعرض فقط الجزء قبل @
 */
export function formatUserName(userName: string): string {
  if (!userName) return 'مستخدم';

  // إذا كان يحتوي على @، نفترض أنه إيميل
  if (userName.includes('@')) {
    const parts = userName.split('@');
    const username = parts[0];

    // إذا كان الجزء قبل @ يبدو كاسم متجر (يحتوي على مسافات أو أحرف عربية)
    if (/[\u0600-\u06FF\s]/.test(username)) {
      return username;
    }

    // وإلا نعرضه كـ "متجر: اسم_المستخدم"
    return `متجر: ${username}`;
  }

  return userName;
}

/**
 * الحصول على الأحرف الأولى من الاسم للأفاتار
 */
export function getInitials(userName: string): string {
  const formatted = formatUserName(userName);

  // إذا كان يبدأ بـ "متجر:"، نأخذ الحرف الأول من الكلمة التالية
  if (formatted.startsWith('متجر:')) {
    const parts = formatted.split(':');
    if (parts[1]) {
      return parts[1].trim()[0].toUpperCase();
    }
  }

  // وإلا نأخذ الحرف الأول
  return formatted[0].toUpperCase();
}
