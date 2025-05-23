import { useTheme } from '@/context/ThemeContext';
import { SunIcon, MoonIcon } from '@radix-ui/react-icons';
import { Sun, Moon, SunMoon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface NavbarThemeToggleProps {
  className?: string;
  showTooltip?: boolean;
  variant?: 'default' | 'minimal' | 'icon' | 'enhanced';
}

export function NavbarThemeToggle({ 
  className, 
  showTooltip = true,
  variant = 'enhanced'
}: NavbarThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // التأكد من تحميل المكون قبل إظهار زر التبديل لتجنب الوميض عند التحميل الأولي
  if (!mounted) {
    return <div className="w-9 h-9 rounded-full bg-gradient-to-r from-background/40 to-background/60 animate-pulse"></div>;
  }
  
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setIsChanging(true);
    
    // Use view transitions API if available with enhanced effects
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setTheme(newTheme);
        setTimeout(() => setIsChanging(false), 1200);
      });
    } else {
      setTimeout(() => {
        setTheme(newTheme);
        setTimeout(() => setIsChanging(false), 800);
      }, 200);
    }
  };
  
  let themeToggleButton;
  
  if (variant === 'enhanced') {
    themeToggleButton = (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "h-9 w-9 rounded-full transition-all duration-500 relative overflow-hidden group",
          "bg-gradient-to-br from-background/60 to-background/80 backdrop-blur-md",
          "border border-border/30 shadow-sm hover:shadow-lg",
          "hover:from-primary/10 hover:to-primary/5 hover:border-primary/30",
          "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0",
          className
        )}
      >
        {/* Animated background gradient */}
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700",
          "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
        )} />
        
        {/* Sparkle effects when hovering */}
        {isHovered && (
          <>
            <div className="absolute top-1 right-1 w-1 h-1 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
            <div className="absolute bottom-1 left-1 w-0.5 h-0.5 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-1/2 left-1 w-0.5 h-0.5 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          </>
        )}
        
        <div className="relative w-full h-full flex items-center justify-center z-10">
          {/* Sun icon for light mode */}
          <Sun 
            className={cn(
              "absolute h-5 w-5 transition-all duration-700 transform-gpu",
              theme === 'dark' 
                ? 'rotate-180 scale-0 opacity-0' 
                : 'rotate-0 scale-100 opacity-100',
              "text-amber-500 group-hover:text-amber-400",
              isHovered && theme === 'light' && "animate-spin"
            )}
          />
          
          {/* Moon icon for dark mode */}
          <Moon 
            className={cn(
              "absolute h-5 w-5 transition-all duration-700 transform-gpu",
              theme === 'dark' 
                ? 'rotate-0 scale-100 opacity-100' 
                : '-rotate-180 scale-0 opacity-0',
              "text-slate-400 group-hover:text-slate-300",
              isHovered && theme === 'dark' && "animate-pulse"
            )}
          />
          
          {/* Enhanced ripple effect during theme change */}
          {isChanging && (
            <>
              <div className={cn(
                "absolute inset-0 animate-ping rounded-full",
                theme === 'dark' ? 'bg-slate-400/30' : 'bg-amber-500/30'
              )} />
              <div className={cn(
                "absolute inset-0 animate-pulse rounded-full",
                theme === 'dark' ? 'bg-slate-400/20' : 'bg-amber-500/20'
              )} style={{ animationDelay: '0.2s' }} />
            </>
          )}
        </div>
        
        {/* Subtle glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-500",
          theme === 'dark' 
            ? "shadow-[0_0_20px_rgba(148,163,184,0.3)]" 
            : "shadow-[0_0_20px_rgba(245,158,11,0.3)]"
        )} />
      </Button>
    );
  } else if (variant === 'minimal') {
    themeToggleButton = (
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-full bg-background/60 backdrop-blur-sm hover:bg-primary/10 transition-all duration-300",
          "focus-visible:ring-0 focus-visible:ring-offset-0 relative overflow-hidden",
          className
        )}
        onClick={toggleTheme}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <Sun 
            className={`absolute h-4 w-4 transition-all duration-500 ${
              theme === 'dark' 
                ? 'rotate-0 scale-100 opacity-0' 
                : 'rotate-0 scale-100 opacity-100 text-amber-500'
            }`} 
          />
          <Moon 
            className={`absolute h-4 w-4 transition-all duration-500 ${
              theme === 'dark' 
                ? 'rotate-0 scale-100 opacity-100 text-indigo-400' 
                : 'rotate-90 scale-0 opacity-0'
            }`}
          />
          {isChanging && (
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20"></div>
          )}
        </div>
      </Button>
    );
  } else if (variant === 'icon') {
    themeToggleButton = (
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "rounded-full p-0 h-8 w-8 hover:bg-primary/10 transition-all duration-300",
          className
        )}
        onClick={toggleTheme}
      >
        <div className="relative w-5 h-5 flex items-center justify-center">
          <Sun 
            className={`absolute h-5 w-5 transition-all duration-700 ${
              theme === 'dark' 
                ? 'rotate-90 scale-0 opacity-0' 
                : 'rotate-0 scale-100 opacity-100 text-amber-500'
            }`} 
          />
          <Moon 
            className={`absolute h-5 w-5 transition-all duration-700 ${
              theme === 'dark' 
                ? 'rotate-0 scale-100 opacity-100 text-indigo-400' 
                : '-rotate-90 scale-0 opacity-0'
            }`}
          />
        </div>
      </Button>
    );
  } else {
    // التصميم الافتراضي المحسن
    themeToggleButton = (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className={cn(
          "rounded-full bg-background/40 backdrop-blur-sm border border-border/20 shadow-sm",
          "hover:shadow-md hover:bg-primary/10 transition-all duration-300 relative overflow-hidden group",
          className
        )}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent -z-10"></div>
        
        <div className="relative w-full h-full flex items-center justify-center">
          {theme === 'light' ? (
            <Moon className="h-4.5 w-4.5 transition-all duration-500 hover:rotate-[360deg] z-10" />
          ) : (
            <Sun className="h-4.5 w-4.5 transition-all duration-500 hover:rotate-[360deg] z-10" />
          )}
          
          {isChanging && (
            <div className={`absolute inset-0 animate-ripple rounded-full ${theme === 'dark' ? 'bg-indigo-400/20' : 'bg-amber-500/20'}`}></div>
          )}
        </div>
      </Button>
    );
  }
  
  if (!showTooltip) {
    return themeToggleButton;
  }
  
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          {themeToggleButton}
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="center" 
          className={cn(
            "rounded-xl border-border/40 shadow-lg backdrop-blur-md",
            "bg-gradient-to-br from-background/95 to-background/80"
          )}
        >
          <div className="flex items-center gap-2">
            {theme === 'light' ? (
              <>
                <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>الوضع الداكن</span>
              </>
            ) : (
              <>
                <Sun className="h-3.5 w-3.5 text-muted-foreground" />
                <span>الوضع الفاتح</span>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// إضافة هذه القواعد إلى ملف index.css
// @keyframes ripple {
//   0% {
//     transform: scale(0);
//     opacity: 0.6;
//   }
//   100% {
//     transform: scale(4);
//     opacity: 0;
//   }
// }
// 
// .animate-ripple {
//   animation: ripple 1s ease-out forwards;
// } 