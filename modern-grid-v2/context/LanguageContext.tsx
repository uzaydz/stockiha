import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

type Language = 'en' | 'ar' | 'fr';
type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [direction, setDirection] = useState<Direction>('ltr');

  useEffect(() => {
    const savedLang = localStorage.getItem('asray-lang') as Language;
    if (savedLang && ['en', 'ar', 'fr'].includes(savedLang)) {
      setLanguage(savedLang);
      setDirection(savedLang === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', savedLang);
      document.documentElement.setAttribute('dir', savedLang === 'ar' ? 'rtl' : 'ltr');
    }
  }, []);

  const toggleLanguage = () => {
    // Cycle: EN -> AR -> FR -> EN
    let newLang: Language = 'en';
    if (language === 'en') newLang = 'ar';
    else if (language === 'ar') newLang = 'fr';
    else newLang = 'en';

    const newDir = newLang === 'ar' ? 'rtl' : 'ltr';

    setLanguage(newLang);
    setDirection(newDir);
    localStorage.setItem('asray-lang', newLang);

    document.documentElement.setAttribute('lang', newLang);
    document.documentElement.setAttribute('dir', newDir);
  };

  const t = (key: string): string => {
    // Split key by dot to access nested objects (e.g., 'nav.shop')
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        // Fallback to English if translation missing
        let fallbackValue: any = translations['en'];
        for (const fbK of keys) {
          if (fallbackValue && fallbackValue[fbK]) {
            fallbackValue = fallbackValue[fbK];
          } else {
            return key;
          }
        }
        return fallbackValue || key;
      }
    }

    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};