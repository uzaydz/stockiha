import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // تجنب الوميض أثناء التحميل الأولي
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative overflow-hidden w-9 h-9 rounded-lg"
        disabled
      >
        <div className="w-4 h-4 bg-muted rounded" />
      </Button>
    );
  }

  const toggleTheme = async () => {
    try {
      
      const newTheme = theme === "dark" ? "light" : "dark";
      
      // تطبيق الثيم الجديد
      setTheme(newTheme);
      
      // التحقق من تطبيق الثيم بعد فترة قصيرة
      setTimeout(() => {
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        
        if (currentTheme !== newTheme) {
          
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
          
        }
      }, 100);
      
    } catch (error) {
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title={theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
      className={cn(
        "relative overflow-hidden w-9 h-9 rounded-lg",
        "transition-colors duration-200",
        "hover:bg-accent",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      )}
    >
      {/* أيقونة الشمس */}
      <Sun 
        className={cn(
          "absolute h-[1.2rem] w-[1.2rem] transition-all duration-200",
          theme === 'dark' 
            ? 'rotate-90 scale-0 opacity-0' 
            : 'rotate-0 scale-100 opacity-100'
        )}
      />
      
      {/* أيقونة القمر */}
      <Moon 
        className={cn(
          "absolute h-[1.2rem] w-[1.2rem] transition-all duration-200",
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
