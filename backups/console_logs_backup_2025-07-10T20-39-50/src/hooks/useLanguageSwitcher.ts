import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
}

const languages: Language[] = [
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    direction: 'rtl'
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    direction: 'ltr'
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    direction: 'ltr'
  }
];

export const useLanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // الحصول على اللغة الحالية
  const currentLanguage = useMemo(() => 
    languages.find(lang => lang.code === i18n.language) || languages[0],
    [i18n.language]
  );

  // تحديث اتجاه الصفحة عند تغيير اللغة
  useEffect(() => {
    const updateDocumentDirection = async () => {
      const currentLang = languages.find(lang => lang.code === i18n.language);
      if (currentLang) {
        // تحديث اتجاه المستند
        document.documentElement.dir = currentLang.direction;
        document.documentElement.lang = i18n.language;
        
        // تحديث فئات CSS للجسم
        if (currentLang.direction === 'rtl') {
          document.body.classList.add('rtl');
          document.body.classList.remove('ltr');
        } else {
          document.body.classList.add('ltr');
          document.body.classList.remove('rtl');
        }

        // حفظ اللغة في localStorage
        try {
          localStorage.setItem('preferred-language', i18n.language);
        } catch (error) {
        }

        // تحديث meta tags للتحسين SEO
        const htmlLang = document.querySelector('html');
        if (htmlLang) {
          htmlLang.setAttribute('lang', i18n.language);
        }

        // إرسال حدث تخصيص لإشعار المكونات الأخرى
        window.dispatchEvent(new CustomEvent('languageChanged', {
          detail: { language: currentLang }
        }));
      }
    };

    updateDocumentDirection();
  }, [i18n.language]);

  // تغيير اللغة مع معالجة الأخطاء
  const changeLanguage = useCallback(async (languageCode: string) => {
    const selectedLanguage = languages.find(lang => lang.code === languageCode);
    if (!selectedLanguage) {
      return;
    }

    setIsLoading(true);
    
    try {
      await i18n.changeLanguage(languageCode);
      setIsOpen(false);
      
      // تأثير نجاح للتغيير (haptic feedback)
      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in window.navigator) {
        window.navigator.vibrate(50);
      }

      // إشعار نجاح التغيير
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`تم تغيير اللغة إلى ${selectedLanguage.nativeName}`, {
          icon: selectedLanguage.flag,
          silent: true,
          tag: 'language-change'
        });
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [i18n]);

  // تبديل حالة القائمة
  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // إغلاق القائمة
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  // الحصول على نص "الحالية" بناءً على اللغة المختارة
  const getCurrentLabel = useCallback(() => {
    switch (currentLanguage.code) {
      case 'ar':
        return 'الحالية';
      case 'fr':
        return 'Actuelle';
      default:
        return 'Current';
    }
  }, [currentLanguage.code]);

  // تحميل اللغة المفضلة من localStorage عند البدء
  useEffect(() => {
    const loadPreferredLanguage = async () => {
      try {
        const savedLanguage = localStorage.getItem('preferred-language');
        if (savedLanguage && savedLanguage !== i18n.language) {
          const languageExists = languages.some(lang => lang.code === savedLanguage);
          if (languageExists) {
            await changeLanguage(savedLanguage);
          }
        }
      } catch (error) {
      }
    };

    loadPreferredLanguage();
  }, []);

  // تنظيف الأحداث عند إلغاء التحميل
  useEffect(() => {
    const handleBeforeUnload = () => {
      // حفظ اللغة الحالية قبل إغلاق الصفحة
      try {
        localStorage.setItem('preferred-language', i18n.language);
      } catch (error) {
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [i18n.language]);

  return {
    languages,
    currentLanguage,
    isOpen,
    isLoading,
    changeLanguage,
    toggleDropdown,
    closeDropdown,
    getCurrentLabel
  };
};

export default useLanguageSwitcher;
