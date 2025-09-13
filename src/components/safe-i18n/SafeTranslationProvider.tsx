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
 * مزود آمن للترجمة يمنع React Error #310
 * - يضمن استقرار hooks
 * - يوفر fallbacks آمنة
 * - يتعامل مع حالات التحميل
 */
export const SafeTranslationProvider: React.FC<SafeTranslationProviderProps> = ({ children }) => {
  // ✅ Hook calls في أعلى المكون دائماً
  const { t: originalT, i18n } = useTranslation();
  const [isReady, setIsReady] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('ar');

  // تتبع حالة الجاهزية
  useEffect(() => {
    // ✅ التحقق من صحة i18n instance قبل استخدامه
    const isValidI18n = i18n && 
                        typeof i18n === 'object' && 
                        typeof i18n.on === 'function' && 
                        typeof i18n.off === 'function';

    if (!isValidI18n) {
      console.warn('⚠️ [SafeTranslationProvider] i18n instance غير صحيح، استخدام fallback');
      setIsReady(true); // ✅ تمكين المكوّن بدلاً من حجبه
      setCurrentLanguage('ar');
      return;
    }

    if (i18n.isInitialized) {
      setIsReady(true);
      setCurrentLanguage(i18n.language || 'ar');
    }
    
    // 🔍 Debug: حالة التهيئة
    try {
      console.log('🌐 [SafeTranslationProvider] i18n state', {
        isInitialized: i18n.isInitialized,
        language: i18n.language,
        isReady
      });
    } catch {}

    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng || 'ar');
    };

    const handleInitialized = () => {
      setIsReady(true);
      setCurrentLanguage(i18n.language || 'ar');
    };

    try {
      i18n.on('languageChanged', handleLanguageChange);
      i18n.on('initialized', handleInitialized);
    } catch (error) {
      console.warn('⚠️ [SafeTranslationProvider] خطأ في تسجيل مستمعي الأحداث:', error);
    }

    return () => {
      try {
        i18n.off('languageChanged', handleLanguageChange);
        i18n.off('initialized', handleInitialized);
      } catch (error) {
        console.warn('⚠️ [SafeTranslationProvider] خطأ في إزالة مستمعي الأحداث:', error);
      }
    };
  }, [i18n]);

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
