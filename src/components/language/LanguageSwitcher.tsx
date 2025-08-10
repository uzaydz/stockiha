import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useOptimizedClickHandler } from "@/lib/performance-utils";

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
  variant?: 'dropdown' | 'inline' | 'compact';
  showText?: boolean;
  size?: 'sm' | 'default' | 'lg';
  align?: 'start' | 'center' | 'end';
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  variant = 'dropdown',
  showText = true,
  size = 'default',
  align = 'end'
}) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  
  // تحديث اتجاه الصفحة عند تغيير اللغة
  useEffect(() => {
    const currentLang = languages.find(lang => lang.code === i18n.language);
    if (currentLang) {
      document.documentElement.dir = currentLang.direction;
      document.documentElement.lang = i18n.language;
      
      // إضافة/إزالة فئة CSS للدعم الإضافي للاتجاه
      if (currentLang.direction === 'rtl') {
        document.body.classList.add('rtl');
        document.body.classList.remove('ltr');
      } else {
        document.body.classList.add('ltr');
        document.body.classList.remove('rtl');
      }
    }
  }, [i18n.language]);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  const handleLanguageChange = (languageCode: string) => {
    const selectedLanguage = languages.find(lang => lang.code === languageCode);
    if (selectedLanguage) {
      i18n.changeLanguage(languageCode);
      setIsOpen(false);
      
      // حفظ اللغة المختارة في localStorage مع timestamp للتفضيل اليدوي
      localStorage.setItem('i18nextLng', languageCode);
      localStorage.setItem('i18nextLng_timestamp', Date.now().toString());

      // إضافة تأثير نجاح للتغيير
      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in window.navigator) {
        window.navigator.vibrate(50);
      }
    }
  };

  // الحصول على أحجام المكونات
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          button: 'h-8 px-2 text-xs',
          text: 'text-xs',
          icon: 'h-3 w-3',
          flag: 'text-sm'
        };
      case 'lg':
        return {
          button: 'h-12 px-4 text-base',
          text: 'text-base',
          icon: 'h-5 w-5',
          flag: 'text-xl'
        };
      default:
        return {
          button: 'h-9 px-3 text-sm',
          text: 'text-sm',
          icon: 'h-4 w-4',
          flag: 'text-base'
        };
    }
  };

  const sizeClasses = getSizeClasses();
  
  // الحصول على نص "الحالية" بناءً على اللغة المختارة
  const getCurrentLabel = () => {
    switch (currentLanguage.code) {
      case 'ar':
        return 'الحالية';
      case 'fr':
        return 'Actuelle';
      default:
        return 'Current';
    }
  };

  // إضافة مؤشر للغة الافتراضية
  const getLanguageLabel = (language: Language) => {
    const isDefault = language.code === 'ar';
    const isCurrent = language.code === currentLanguage.code;
    
    if (isCurrent && isDefault) {
      return `${getCurrentLabel()} • افتراضية`;
    } else if (isCurrent) {
      return getCurrentLabel();
    } else if (isDefault) {
      return 'افتراضية';
    }
    return null;
  };
  
  // النمط المدمج (Inline)
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {languages.map((language) => (
          <Button
            key={language.code}
            variant={currentLanguage.code === language.code ? 'default' : 'ghost'}
            size={size}
            onClick={() => handleLanguageChange(language.code)}
            className={cn(
              'relative transition-all duration-200 hover:scale-105',
              currentLanguage.code === language.code && 'ring-2 ring-primary/20 shadow-md',
              language.code === 'ar' && currentLanguage.code !== language.code && 'border-primary/30'
            )}
          >
            <span className={cn('mr-2', sizeClasses.flag)}>{language.flag}</span>
            {showText && (
              <span className={sizeClasses.text}>{language.nativeName}</span>
            )}
            {currentLanguage.code === language.code && (
              <div className="absolute -top-1 -right-1">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              </div>
            )}
            {language.code === 'ar' && currentLanguage.code !== language.code && (
              <div className="absolute -top-1 -left-1">
                <div className="h-2 w-2 bg-blue-500 rounded-full" />
              </div>
            )}
          </Button>
        ))}
      </div>
    );
  }

  // النمط المضغوط (Compact)
  if (variant === 'compact') {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={size}
            className={cn(
              'border-border/40 hover:border-border transition-all duration-200',
              'hover:shadow-sm dark:hover:shadow-primary/5',
              'hover:scale-105 active:scale-95',
              sizeClasses.button,
              className
            )}
          >
            <span className={cn('mr-1', sizeClasses.flag)}>{currentLanguage.flag}</span>
            <ChevronDown className={cn('transition-transform duration-200', 
              isOpen && 'rotate-180',
              sizeClasses.icon
            )} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align={align}
          className="w-40 shadow-lg border-border/40 animate-in slide-in-from-top-2"
        >
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={cn(
                'cursor-pointer transition-colors duration-200',
                'focus:bg-accent/50 hover:bg-accent/30',
                currentLanguage.code === language.code && 'bg-accent/20',
                language.code === 'ar' && 'border-l-2 border-primary/40'
              )}
            >
              <span className="mr-3 text-lg">{language.flag}</span>
              <span className="flex-1 font-medium">{language.nativeName}</span>
              {currentLanguage.code === language.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  // النمط الافتراضي (Dropdown)
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={cn(
            'group border-border/40 hover:border-border transition-all duration-200',
            'hover:shadow-sm dark:hover:shadow-primary/5',
            'focus:ring-2 focus:ring-primary/20 focus:border-primary/30',
            'hover:scale-105 active:scale-95',
            sizeClasses.button,
            className
          )}
        >
          <Globe className={cn('mr-2 text-muted-foreground group-hover:text-foreground transition-colors',
            sizeClasses.icon
          )} />
          <span className={cn('mr-1', sizeClasses.flag)}>{currentLanguage.flag}</span>
          {showText && (
            <span className={cn('mr-2 font-medium', sizeClasses.text)}>
              {currentLanguage.nativeName}
            </span>
          )}
          <ChevronDown className={cn(
            'text-muted-foreground group-hover:text-foreground transition-all duration-200',
            isOpen && 'rotate-180',
            sizeClasses.icon
          )} />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align={align}
        className="w-56 shadow-lg border-border/40 bg-background/95 backdrop-blur-sm animate-in slide-in-from-top-2"
        sideOffset={4}
      >
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={cn(
              'cursor-pointer transition-colors duration-200 p-3',
              'focus:bg-accent/50 hover:bg-accent/30',
              'active:bg-accent/60',
              currentLanguage.code === language.code && 'bg-accent/20',
              language.code === 'ar' && 'border-l-2 border-primary/40'
            )}
          >
            <div className="flex items-center w-full">
              <span className="mr-3 text-xl">{language.flag}</span>
              <div className="flex flex-col items-start flex-1">
                <span className="font-medium text-foreground">{language.nativeName}</span>
                <span className="text-xs text-muted-foreground">{language.name}</span>
              </div>
              {(currentLanguage.code === language.code || language.code === 'ar') && (
                <div className="flex items-center gap-1">
                  {getLanguageLabel(language) && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {getLanguageLabel(language)}
                    </Badge>
                  )}
                  {currentLanguage.code === language.code && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
