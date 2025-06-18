import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

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

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'dropdown' | 'inline';
  showText?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  variant = 'dropdown',
  showText = true
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  
  const handleLanguageChange = (languageCode: string) => {
    const selectedLanguage = languages.find(lang => lang.code === languageCode);
    if (selectedLanguage) {
      i18n.changeLanguage(languageCode);
      
      // تحديث اتجاه الصفحة
      document.documentElement.dir = selectedLanguage.direction;
      document.documentElement.lang = languageCode;
      
      // حفظ في localStorage
      localStorage.setItem('selectedLanguage', languageCode);
      
      setIsOpen(false);
    }
  };
  
  if (variant === 'inline') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              currentLanguage.code === language.code
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <span className="mr-1">{language.flag}</span>
            {showText && language.nativeName}
          </button>
        ))}
      </div>
    );
  }
  
  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <GlobeAltIcon className="w-4 h-4 mr-2" />
        <span className="mr-1">{currentLanguage.flag}</span>
        {showText && (
          <span className="mr-2">{currentLanguage.nativeName}</span>
        )}
        <ChevronDownIcon className="w-4 h-4 ml-2" />
      </button>
      
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="absolute right-0 z-50 w-56 mt-2 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="py-1">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`flex items-center w-full px-4 py-2 text-sm transition-colors ${
                    currentLanguage.code === language.code
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-3 text-lg">{language.flag}</span>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{language.nativeName}</span>
                    <span className="text-xs text-gray-500">{language.name}</span>
                  </div>
                  {currentLanguage.code === language.code && (
                    <div className="mr-auto ml-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher; 