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
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  return (
    <Button
      variant={variant === 'minimal' ? 'ghost' : variant === 'ghost' ? 'ghost' : 'outline'}
      size="icon"
      onClick={toggleTheme}
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
