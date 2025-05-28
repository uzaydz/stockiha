import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface NavbarThemeToggleProps {
  className?: string;
  showTooltip?: boolean;
  variant?: 'default' | 'enhanced' | 'minimal';
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
  const [showCenterIcon, setShowCenterIcon] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // التأكد من تحميل المكون قبل إظهار زر التبديل لتجنب الوميض عند التحميل الأولي
  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-r from-background/40 to-background/60 animate-pulse" />
    );
  }
  
  const toggleTheme = async () => {
    setIsChanging(true);
    setShowCenterIcon(true);
    
    // استخدام View Transitions API إذا كان متاحاً مع تأثيرات محسنة
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const transition = document.startViewTransition(() => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
      });
      
      try {
        await transition.finished;
        setTimeout(() => {
          setShowCenterIcon(false);
          setIsChanging(false);
        }, 1200);
      } catch (error) {
        // تجاهل الأخطاء إذا تم إلغاء الانتقال
        setTimeout(() => {
          setShowCenterIcon(false);
          setIsChanging(false);
        }, 1200);
      }
    } else {
      // الانتقال التقليدي مع تحسينات
      setTimeout(() => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        setTimeout(() => {
          setShowCenterIcon(false);
          setIsChanging(false);
        }, 1200);
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
        disabled={isChanging}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "relative overflow-hidden w-9 h-9 rounded-full group",
          "bg-background/60 backdrop-blur-md border border-border/40",
          "hover:bg-primary/10 hover:border-primary/30 hover:shadow-xl",
          "transition-all duration-500 ease-out transform-gpu",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          isChanging && "scale-95 opacity-80",
          className
        )}
      >
        {/* خلفية متدرجة متحركة */}
        <div className={cn(
          "absolute inset-0 rounded-full opacity-0 group-hover:opacity-100",
          "bg-gradient-to-tr from-primary/15 via-primary/8 to-transparent",
          "transition-all duration-700 ease-out"
        )} />
        
        <div className="relative w-full h-full flex items-center justify-center z-10">
          {/* أيقونة الشمس للوضع الفاتح */}
          <Sun 
            className={cn(
              "absolute h-5 w-5 transition-all duration-700 transform-gpu",
              theme === 'dark' 
                ? 'rotate-180 scale-0 opacity-0' 
                : 'rotate-0 scale-100 opacity-100',
              "text-amber-500 group-hover:text-amber-400",
              "drop-shadow-sm",
              isHovered && theme === 'light' && "animate-spin"
            )}
          />
          
          {/* أيقونة القمر للوضع الداكن */}
          <Moon 
            className={cn(
              "absolute h-5 w-5 transition-all duration-700 transform-gpu",
              theme === 'dark' 
                ? 'rotate-0 scale-100 opacity-100' 
                : '-rotate-180 scale-0 opacity-0',
              "text-slate-400 group-hover:text-slate-300",
              "drop-shadow-sm",
              isHovered && theme === 'dark' && "animate-pulse"
            )}
          />
          
          {/* تأثير الموجة المحسن أثناء تغيير الثيم */}
          {isChanging && (
            <>
              <div className={cn(
                "absolute inset-0 animate-ping rounded-full",
                theme === 'dark' ? 'bg-slate-400/30' : 'bg-amber-500/30'
              )} />
              <div 
                className={cn(
                  "absolute inset-0 animate-pulse rounded-full",
                  theme === 'dark' ? 'bg-slate-400/20' : 'bg-amber-500/20'
                )}
                style={{ animationDelay: '0.2s' }}
              />
              <div 
                className={cn(
                  "absolute inset-0 animate-ping rounded-full",
                  theme === 'dark' ? 'bg-slate-400/15' : 'bg-amber-500/15'
                )}
                style={{ animationDelay: '0.4s' }}
              />
            </>
          )}
        </div>
        
        {/* تأثير التوهج الخفيف */}
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
        disabled={isChanging}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <Sun 
            className={cn(
              "absolute h-4 w-4 transition-all duration-500",
              theme === 'dark' 
                ? 'rotate-0 scale-100 opacity-0' 
                : 'rotate-0 scale-100 opacity-100 text-amber-500'
            )}
          />
          <Moon 
            className={cn(
              "absolute h-4 w-4 transition-all duration-500",
              theme === 'dark' 
                ? 'rotate-0 scale-100 opacity-100 text-indigo-400' 
                : 'rotate-90 scale-0 opacity-0'
            )}
          />
          {isChanging && (
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          )}
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
        disabled={isChanging}
        className={cn(
          "rounded-full bg-background/40 backdrop-blur-sm border border-border/20 shadow-sm",
          "hover:shadow-md hover:bg-primary/10 transition-all duration-300 relative overflow-hidden group",
          className
        )}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent -z-10" />
        
        <div className="relative w-full h-full flex items-center justify-center">
          {theme === 'light' ? (
            <Moon className="h-4.5 w-4.5 transition-all duration-500 hover:rotate-[360deg] z-10" />
          ) : (
            <Sun className="h-4.5 w-4.5 transition-all duration-500 hover:rotate-[360deg] z-10" />
          )}
          
          {isChanging && (
            <div className={cn(
              "absolute inset-0 animate-ping rounded-full",
              theme === 'dark' ? 'bg-indigo-400/20' : 'bg-amber-500/20'
            )} />
          )}
        </div>
      </Button>
    );
  }
  
  const buttonWithCenterIcon = (
    <>
      {themeToggleButton}
      
      {/* الأيقونة المركزية الكبيرة مع التأثيرات */}
      {showCenterIcon && (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
          {/* خلفية شفافة مع تأثير التمويه */}
          <div className="absolute inset-0 bg-background/20 backdrop-blur-sm animate-theme-fade-in" />
          
          {/* الأيقونة المركزية */}
          <div className="relative animate-theme-center-appear">
            {/* تأثير الهالة الخارجية */}
            <div className={cn(
              "absolute inset-0 rounded-full animate-theme-glow-expand",
              theme === 'dark' 
                ? "bg-amber-500/20 shadow-[0_0_100px_rgba(245,158,11,0.4)]" 
                : "bg-slate-400/20 shadow-[0_0_100px_rgba(148,163,184,0.4)]"
            )} style={{ width: '200px', height: '200px', left: '-50px', top: '-50px' }} />
            
            {/* تأثير الهالة الوسطى */}
            <div className={cn(
              "absolute inset-0 rounded-full animate-pulse",
              theme === 'dark' 
                ? "bg-amber-500/30 shadow-[0_0_60px_rgba(245,158,11,0.6)]" 
                : "bg-slate-400/30 shadow-[0_0_60px_rgba(148,163,184,0.6)]"
            )} style={{ width: '120px', height: '120px', left: '-10px', top: '-10px' }} />
            
            {/* الأيقونة الرئيسية */}
            <div className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-background/90 to-background/70",
              "border-2 animate-theme-slide-up gpu-accelerated smooth-rendering",
              theme === 'dark' 
                ? "border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.8)]" 
                : "border-slate-400/50 shadow-[0_0_40px_rgba(148,163,184,0.8)]"
            )}>
              {theme === 'dark' ? (
                <Sun className={cn(
                  "w-12 h-12 text-amber-500 animate-theme-icon-rotate icon-glow-sun",
                  "drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]"
                )} />
              ) : (
                <Moon className={cn(
                  "w-12 h-12 text-slate-400 animate-theme-icon-rotate icon-glow-moon",
                  "drop-shadow-[0_0_10px_rgba(148,163,184,0.8)]"
                )} />
              )}
            </div>
            
            {/* جسيمات متحركة حول الأيقونة */}
            <div className="absolute inset-0 animate-theme-border-rotate">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute w-2 h-2 rounded-full animate-theme-particles-float",
                    theme === 'dark' ? "bg-amber-500/60" : "bg-slate-400/60"
                  )}
                  style={{
                    left: `${50 + 40 * Math.cos((i * Math.PI * 2) / 8)}%`,
                    top: `${50 + 40 * Math.sin((i * Math.PI * 2) / 8)}%`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
            
            {/* موجات انتشار محسنة */}
            <div className={cn(
              "absolute inset-0 rounded-full border-2 animate-theme-ripple-effect",
              theme === 'dark' ? "border-amber-500/30" : "border-slate-400/30"
            )} style={{ width: '150px', height: '150px', left: '-25px', top: '-25px' }} />
            
            <div className={cn(
              "absolute inset-0 rounded-full border-2 animate-theme-ripple-effect",
              theme === 'dark' ? "border-amber-500/20" : "border-slate-400/20"
            )} style={{ 
              width: '180px', 
              height: '180px', 
              left: '-40px', 
              top: '-40px',
              animationDelay: '0.3s'
            }} />
            
            {/* تأثير إضافي للموجات */}
            <div className={cn(
              "absolute inset-0 rounded-full border animate-ping",
              theme === 'dark' ? "border-amber-500/15" : "border-slate-400/15"
            )} style={{ 
              width: '220px', 
              height: '220px', 
              left: '-60px', 
              top: '-60px',
              animationDelay: '0.6s'
            }} />
            
            {/* تأثير النجوم المتلألئة */}
            <div className="absolute inset-0">
              {[...Array(12)].map((_, i) => (
                <div
                  key={`star-${i}`}
                  className={cn(
                    "absolute w-1 h-1 rounded-full animate-pulse",
                    theme === 'dark' ? "bg-amber-300/80" : "bg-slate-300/80"
                  )}
                  style={{
                    left: `${20 + 60 * Math.cos((i * Math.PI * 2) / 12)}%`,
                    top: `${20 + 60 * Math.sin((i * Math.PI * 2) / 12)}%`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: '1.5s'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
  
  if (!showTooltip) {
    return buttonWithCenterIcon;
  }
  
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          {buttonWithCenterIcon}
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
