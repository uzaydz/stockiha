import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isChanging, setIsChanging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showCenterIcon, setShowCenterIcon] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // تجنب الوميض أثناء التحميل الأولي
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative overflow-hidden w-9 h-9 rounded-full bg-muted/20 animate-pulse"
        disabled
      >
        <div className="w-4 h-4 bg-muted/40 rounded-full" />
      </Button>
    );
  }

  const toggleTheme = async () => {
    setIsChanging(true);
    setShowCenterIcon(true);
    
    // استخدام View Transitions API إذا كان متاحاً
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const transition = document.startViewTransition(() => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
      });
      
      try {
        await transition.finished;
      } catch (error) {
        // تجاهل الأخطاء إذا تم إلغاء الانتقال
      }
      
      // إخفاء الأيقونة المركزية بعد انتهاء الانتقال
      setTimeout(() => {
        setShowCenterIcon(false);
        setIsChanging(false);
      }, 1200);
    } else {
      // الانتقال التقليدي للمتصفحات القديمة
      setTimeout(() => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        
        setTimeout(() => {
          setShowCenterIcon(false);
          setIsChanging(false);
        }, 1200);
      }, 150);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        disabled={isChanging}
        title={theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
        className={cn(
          "relative overflow-hidden w-9 h-9 rounded-full group",
          "bg-background/60 backdrop-blur-sm border border-border/50",
          "hover:bg-primary/10 hover:border-primary/30 hover:shadow-lg",
          "transition-all duration-300 ease-out",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          isChanging && "scale-95 opacity-80"
        )}
      >
        {/* خلفية متدرجة للتأثير البصري */}
        <div className={cn(
          "absolute inset-0 rounded-full opacity-0 group-hover:opacity-100",
          "bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent",
          "transition-opacity duration-500"
        )} />
        
        {/* أيقونة الشمس */}
        <Sun 
          className={cn(
            "absolute h-4 w-4 transition-all duration-500 ease-out transform-gpu",
            theme === 'dark' 
              ? 'rotate-90 scale-0 opacity-0' 
              : 'rotate-0 scale-100 opacity-100',
            "text-amber-500 group-hover:text-amber-400",
            "drop-shadow-sm"
          )}
        />
        
        {/* أيقونة القمر */}
        <Moon 
          className={cn(
            "absolute h-4 w-4 transition-all duration-500 ease-out transform-gpu",
            theme === 'dark' 
              ? 'rotate-0 scale-100 opacity-100' 
              : '-rotate-90 scale-0 opacity-0',
            "text-slate-400 group-hover:text-slate-300",
            "drop-shadow-sm"
          )}
        />
        
        {/* تأثير الموجة أثناء التغيير */}
        {isChanging && (
          <>
            <div className={cn(
              "absolute inset-0 animate-ping rounded-full",
              theme === 'dark' ? 'bg-amber-500/30' : 'bg-slate-400/30'
            )} />
            <div 
              className={cn(
                "absolute inset-0 animate-pulse rounded-full",
                theme === 'dark' ? 'bg-amber-500/20' : 'bg-slate-400/20'
              )}
              style={{ animationDelay: '0.2s' }}
            />
          </>
        )}
        
        {/* تأثير التوهج الخفيف */}
        <div className={cn(
          "absolute inset-0 rounded-full opacity-0 group-hover:opacity-30",
          "transition-opacity duration-700 ease-out",
          theme === 'dark' 
            ? "shadow-[0_0_20px_rgba(148,163,184,0.4)]" 
            : "shadow-[0_0_20px_rgba(245,158,11,0.4)]"
        )} />
        
        <span className="sr-only">
          {theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
        </span>
      </Button>

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
              "border-2 animate-theme-slide-up gpu-accelerated",
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
          </div>
        </div>
      )}
    </>
  );
}
