import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface NavbarThemeToggleProps {
  variant?: 'default' | 'minimal' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export function NavbarThemeToggle({
  variant = 'default',
  size = 'md',
  className
}: NavbarThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // تجنب الوميض أثناء التحميل الأولي
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "relative overflow-hidden rounded-lg",
          size === 'sm' && 'w-8 h-8',
          size === 'md' && 'w-9 h-9',
          size === 'lg' && 'w-10 h-10',
          className
        )}
        disabled
      >
        <div className="w-4 h-4 bg-muted rounded" />
      </Button>
    );
  }

  const toggleTheme = async () => {
    if (isToggling) return; // منع النقرات المتعددة
    
    setIsToggling(true);
    
    try {
      console.log('🌓 [NavbarThemeToggle] بدء تبديل الثيم من:', theme);
      
      const newTheme = theme === "dark" ? "light" : "dark";
      console.log('🌓 [NavbarThemeToggle] الثيم الجديد:', newTheme);
      
      // تطبيق الثيم الجديد
      setTheme(newTheme);
      
      // التحقق من تطبيق الثيم بعد فترة قصيرة
      setTimeout(() => {
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        console.log('🌓 [NavbarThemeToggle] الثيم المطبق فعلياً:', currentTheme);
        
        if (currentTheme !== newTheme) {
          console.warn('⚠️ [NavbarThemeToggle] فشل في تطبيق الثيم! محاولة إعادة التطبيق...');
          
          // محاولة إعادة تطبيق الثيم يدوياً
          const root = document.documentElement;
          const body = document.body;
          
          root.classList.remove('light', 'dark');
          body.classList.remove('light', 'dark');
          
          root.classList.add(newTheme);
          body.classList.add(newTheme);
          
          root.setAttribute('data-theme', newTheme);
          body.setAttribute('data-theme', newTheme);
          
          root.style.colorScheme = newTheme;
          body.style.colorScheme = newTheme;
          
          console.log('✅ [NavbarThemeToggle] تم تطبيق الثيم يدوياً');
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ [NavbarThemeToggle] خطأ في تبديل الثيم:', error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Button
      variant={variant === 'minimal' ? 'ghost' : variant === 'ghost' ? 'ghost' : 'outline'}
      size="icon"
      onClick={toggleTheme}
      disabled={isToggling}
      title={theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
      className={cn(
        "relative overflow-hidden rounded-lg",
        "transition-colors duration-200",
        size === 'sm' && 'w-8 h-8',
        size === 'md' && 'w-9 h-9',
        size === 'lg' && 'w-10 h-10',
        variant === 'minimal' && 'hover:bg-accent border-0',
        variant === 'ghost' && 'hover:bg-accent',
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isToggling && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* أيقونة الشمس */}
      <Sun 
        className={cn(
          "absolute transition-all duration-200",
          size === 'sm' && 'h-4 w-4',
          size === 'md' && 'h-[1.2rem] w-[1.2rem]',
          size === 'lg' && 'h-5 w-5',
          theme === 'dark' 
            ? 'rotate-90 scale-0 opacity-0' 
            : 'rotate-0 scale-100 opacity-100'
        )}
      />
      
      {/* أيقونة القمر */}
      <Moon 
        className={cn(
          "absolute transition-all duration-200",
          size === 'sm' && 'h-4 w-4',
          size === 'md' && 'h-[1.2rem] w-[1.2rem]',
          size === 'lg' && 'h-5 w-5',
          theme === 'dark' 
            ? 'rotate-0 scale-100 opacity-100' 
            : '-rotate-90 scale-0 opacity-0'
        )}
      />
      
      <span className="sr-only">
        {theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
      </span>
    </Button>
  );
}
