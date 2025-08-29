import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useSmartThemeColors } from "@/hooks/useSmartColors";
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
  const { theme, setTheme, fastThemeController } = useTheme();
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

  const toggleTheme = () => {
    if (isToggling) return; // منع النقرات المتعددة

    setIsToggling(true);

    try {
      // استخدام التحكم السريع الجديد - أسرع بـ 10x
      const startTime = performance.now();
      const newTheme = fastThemeController.toggleFast();

      // إزالة حالة التحميل فوراً
      Promise.resolve().then(() => {
        setIsToggling(false);

        if (process.env.NODE_ENV === 'development') {
          const endTime = performance.now();
          console.log(`🚀 Ultra-fast theme toggle: ${(endTime - startTime).toFixed(2)}ms`);
        }
      });

    } catch (error) {
      console.error('Theme toggle error:', error);
      setIsToggling(false);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      disabled={isToggling}
      title={theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
      className={cn(
        "group relative w-full h-full flex items-center justify-center",
        "rounded-xl transition-all duration-300 ease-out",
        "hover:scale-110 active:scale-95",
        "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
        "overflow-hidden theme-switch-flash theme-wave",
        "bg-gradient-to-br from-background/80 to-background/60",
        "border border-border/40 hover:border-primary/50",
        "shadow-md hover:shadow-lg theme-glow",
        "min-w-[36px] min-h-[36px]", // تأكيد على الحجم الأدنى
        isToggling && 'opacity-50 cursor-not-allowed theme-switching wave-active',
        theme === 'dark' ? 'dark' : 'light',
        className
      )}
      style={{
        // إضافة متغيرات CSS مخصصة للثيم
        '--theme-transition-duration': '0.3s',
        '--theme-transition-timing': 'ease-out'
      } as React.CSSProperties}
    >
      {/* خلفية متدرجة ديناميكية */}
      <div className={cn(
        "absolute inset-0 rounded-xl transition-all duration-500",
        "bg-gradient-to-br opacity-0 group-hover:opacity-100",
        theme === 'dark' 
          ? "from-blue-500/30 via-indigo-500/25 to-purple-500/30" 
          : "from-amber-400/30 via-orange-400/25 to-yellow-400/30"
      )} />
      
      {/* تأثير الضوء المتحرك */}
      <div className={cn(
        "absolute inset-0 rounded-xl transition-all duration-700",
        "bg-gradient-to-r opacity-0 group-hover:opacity-40",
        theme === 'dark' 
          ? "from-transparent via-blue-300/40 to-transparent animate-pulse" 
          : "from-transparent via-amber-300/40 to-transparent animate-pulse"
      )} />
      
      {/* Container للأيقونات مع تأثيرات محسنة */}
      <div className="relative z-10 flex items-center justify-center">
        {/* أيقونة الشمس */}
        <Sun
          className={cn(
            "absolute transition-all duration-300 ease-out theme-icon",
            "h-5 w-5",
            theme === 'dark'
              ? 'rotate-180 scale-0 opacity-0'
              : 'rotate-0 scale-100 opacity-100',
            "text-amber-500 drop-shadow-lg",
            "group-hover:drop-shadow-xl group-hover:scale-110",
            "group-hover:text-amber-400",
            "dark:text-amber-400 dark:group-hover:text-amber-300",
            isToggling && 'rotating'
          )}
        />

        {/* أيقونة القمر */}
        <Moon
          className={cn(
            "absolute transition-all duration-300 ease-out theme-icon",
            "h-5 w-5",
            theme === 'dark'
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-180 scale-0 opacity-0',
            "text-blue-400 drop-shadow-lg",
            "group-hover:drop-shadow-xl group-hover:scale-110",
            "group-hover:text-blue-300",
            "dark:text-blue-300 dark:group-hover:text-blue-200",
            isToggling && 'rotating'
          )}
        />

        {/* تأثير الوهج حول الأيقونة مع تحسينات */}
        <div className={cn(
          "absolute inset-0 rounded-full transition-all duration-300",
          "opacity-0 group-hover:opacity-60",
          theme === 'dark'
            ? "bg-blue-400/30 blur-sm"
            : "bg-amber-400/30 blur-sm"
        )} />

        {/* تأثير وهج إضافي للحالة النشطة */}
        {isToggling && (
          <div className={cn(
            "absolute inset-0 rounded-full transition-all duration-300",
            "opacity-100 animate-pulse",
            theme === 'dark'
              ? "bg-blue-400/20 blur-md"
              : "bg-amber-400/20 blur-md"
          )} />
        )}
      </div>
      
      <span className="sr-only">
        {theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
      </span>
    </button>
  );
}
