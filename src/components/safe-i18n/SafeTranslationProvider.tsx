import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Context آمن للترجمة مع fallbacks
interface SafeTranslationContextType {
  t: (key: string, fallback?: string) => string;
  language: string;
  isReady: boolean;
}

const SafeTranslationContext = createContext<SafeTranslationContextType>({
  t: (key: string, fallback?: string) => fallback || key,
  language: 'ar',
  isReady: false
});

interface SafeTranslationProviderProps {
  children: React.ReactNode;
}

/**
 * ⚡ مزود آمن للترجمة يمنع React Error #310
 *
 * تحسينات v2:
 * - إزالة timeout الطويل - i18n مهيأ بشكل متزامن الآن
 * - الجاهزية الفورية عند وجود i18n.isInitialized
 * - استقرار hooks ومنع re-renders غير ضرورية
 */
export const SafeTranslationProvider: React.FC<SafeTranslationProviderProps> = ({ children }) => {
  const { t: originalT, i18n } = useTranslation();

  // ⚡ تحسين: تهيئة الحالة بناءً على i18n الحالي (synchronous)
  const [isReady, setIsReady] = useState(() => {
    // i18n يجب أن يكون مهيأ بالفعل لأن الترجمات مُضمّنة
    return !!(i18n && i18n.isInitialized);
  });

  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return i18n?.language || 'ar';
  });

  useEffect(() => {
    // ✅ التحقق من صحة i18n instance
    const isValidI18n = i18n &&
                        typeof i18n === 'object' &&
                        typeof i18n.on === 'function' &&
                        typeof i18n.off === 'function';

    if (!isValidI18n) {
      // console.warn('⚠️ [SafeTranslationProvider] i18n instance غير صحيح، استخدام fallback');
      setIsReady(true);
      setCurrentLanguage('ar');
      return;
    }

    // ⚡ تحسين: i18n يجب أن يكون جاهز فوراً (الترجمات مُضمّنة)
    if (i18n.isInitialized) {
      if (!isReady) setIsReady(true);
      if (i18n.language && i18n.language !== currentLanguage) {
        setCurrentLanguage(i18n.language);
      }
    }

    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng || 'ar');
      if (!isReady) setIsReady(true);
    };

    const handleInitialized = () => {
      setIsReady(true);
      setCurrentLanguage(i18n.language || 'ar');
    };

    try {
      i18n.on('languageChanged', handleLanguageChange);
      i18n.on('initialized', handleInitialized);
    } catch (error) {
      // console.warn('⚠️ [SafeTranslationProvider] خطأ في تسجيل مستمعي الأحداث:', error);
    }

    // ⚡ تحسين: timeout قصير جداً (10ms) فقط كشبكة أمان
    // في الحالة الطبيعية، i18n سيكون جاهز قبل هذا
    const safetyTimeout = setTimeout(() => {
      if (!isReady) {
        setIsReady(true);
        setCurrentLanguage(i18n.language || 'ar');
      }
    }, 10);

    return () => {
      clearTimeout(safetyTimeout);
      try {
        i18n.off('languageChanged', handleLanguageChange);
        i18n.off('initialized', handleInitialized);
      } catch {
        // تجاهل
      }
    };
  }, [i18n, isReady, currentLanguage]);

  // دالة ترجمة آمنة مع fallbacks
  const safeT = useMemo(() => {
    return (key: string, fallback?: string): string => {
      try {
        if (!isReady || !originalT) {
          return fallback || key;
        }
        
        const result = originalT(key);
        
        // إذا كانت النتيجة هي نفس المفتاح، فهذا يعني عدم وجود ترجمة
        if (result === key && fallback) {
          return fallback;
        }
        
        return result || fallback || key;
      } catch (error) {
        console.warn('⚠️ [SafeTranslationProvider] خطأ في الترجمة:', { key, fallback, error });
        return fallback || key;
      }
    };
  }, [originalT, isReady]);

  // قيمة المزود
  const contextValue = useMemo<SafeTranslationContextType>(() => ({
    t: safeT,
    language: currentLanguage,
    isReady
  }), [safeT, currentLanguage, isReady]);

  return (
    <SafeTranslationContext.Provider value={contextValue}>
      {children}
    </SafeTranslationContext.Provider>
  );
};

/**
 * Hook آمن لاستخدام الترجمة
 * - يضمن عدم حدوث React Error #310
 * - يوفر fallbacks تلقائية
 */
export const useSafeTranslation = () => {
  const context = useContext(SafeTranslationContext);
  
  if (!context) {
    // Fallback في حالة عدم وجود provider
    console.warn('⚠️ [useSafeTranslation] تم استدعاء Hook خارج SafeTranslationProvider');
    return {
      t: (key: string, fallback?: string) => fallback || key,
      language: 'ar',
      isReady: false
    };
  }
  
  return context;
};

/**
 * مكون مساعد لعرض النصوص المترجمة بشكل آمن
 */
interface SafeTextProps {
  tKey: string;
  fallback?: string;
  className?: string;
  children?: never; // منع وضع children مع tKey
}

export const SafeText: React.FC<SafeTextProps> = ({ tKey, fallback, className }) => {
  const { t } = useSafeTranslation();
  
  const text = t(tKey, fallback);
  
  return <span className={className}>{text}</span>;
};

export default SafeTranslationProvider;
