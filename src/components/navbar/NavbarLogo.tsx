import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface NavbarLogoProps {
  orgLogo?: string;
  siteName?: string;
  displayTextWithLogo?: boolean;
  isAdminPage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  withGradientEffect?: boolean;
}

export function NavbarLogo({ 
  orgLogo, 
  siteName, 
  displayTextWithLogo = true, 
  isAdminPage = false,
  size = 'md',
  withGradientEffect = true
}: NavbarLogoProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  
  // Apply animation after mount to avoid flickering on first render
  useEffect(() => {
    const timer = setTimeout(() => setHasLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Size configurations
  const sizeClasses = {
    sm: {
      container: "gap-2",
      logo: "h-6 w-auto",
      icon: "h-4 w-4",
      iconContainer: "p-1.5 rounded-lg",
      text: "text-sm",
      subtext: "text-[8px]"
    },
    md: {
      container: "gap-2.5",
      logo: "h-8 w-auto", 
      icon: "h-5 w-5",
      iconContainer: "p-2 rounded-xl",
      text: "text-lg",
      subtext: "text-[10px]"
    },
    lg: {
      container: "gap-3",
      logo: "h-10 w-auto",
      icon: "h-6 w-6", 
      iconContainer: "p-2.5 rounded-xl",
      text: "text-xl",
      subtext: "text-xs"
    }
  };
  
  return (
    <Link 
      to={isAdminPage ? '/dashboard' : '/'} 
      className={cn(
        "flex items-center group relative select-none",
        sizeClasses[size].container,
        hasLoaded && "animate-in fade-in-50 duration-300",
        withGradientEffect && "hover:after:opacity-100 after:opacity-0 after:absolute after:-z-10 after:blur-xl after:rounded-full after:w-full after:h-full after:transition-opacity after:duration-500 after:bg-gradient-to-r after:from-primary/20 after:via-primary/10 after:to-transparent"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
    >
      {orgLogo ? (
        <div className={cn(
          "overflow-hidden rounded-md relative",
          isPressed && "scale-95 transition-transform duration-150"
        )}>
          <img 
            src={orgLogo} 
            alt={siteName || "شعار الموقع"} 
            className={cn(
              sizeClasses[size].logo,
              "object-contain transition-all duration-500",
              isHovered ? "scale-110 rotate-3" : "scale-100 rotate-0",
              "hover:drop-shadow-md"
            )}
            onLoad={() => setHasLoaded(true)}
          />
          <div className={cn(
            "absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 transition-opacity duration-300 rounded-md",
            isHovered && "opacity-100"
          )} />
          
          {/* شعاع ضوئي متحرك */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 transition-all duration-700 skew-x-12 -translate-x-full",
            isHovered && "opacity-100 translate-x-full"
          )} />
        </div>
      ) : (
        <div className={cn(
          "bg-primary/10 transition-all duration-500 overflow-hidden relative",
          sizeClasses[size].iconContainer,
          isHovered ? "scale-110 rotate-3 bg-primary/20 shadow-md" : "scale-100 rotate-0",
          isPressed && "scale-95 transition-transform duration-150"
        )}>
          <Store className={cn(
            sizeClasses[size].icon, 
            "text-primary transition-all duration-500 relative z-10",
            isHovered && "rotate-12"
          )} />
          
          {/* شعاع ضوئي متحرك */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 transition-all duration-700 skew-x-12 -translate-x-full",
            isHovered && "opacity-100 translate-x-full"
          )} />
        </div>
      )}
      
      {(displayTextWithLogo || !orgLogo) && (
        <div className="flex flex-col">
          <span className={cn(
            "font-bold transition-all duration-300 text-gradient-fancy", 
            sizeClasses[size].text,
            isHovered && "text-primary translate-x-0.5",
            "drop-shadow-[0_0_0.3px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_0.5px_rgba(255,255,255,0.2)]"
          )}>
            {siteName || (isAdminPage ? 'لوحة التحكم' : 'المتجر')}
          </span>
          {isAdminPage && (
            <span className={cn(
              "text-muted-foreground transition-all duration-500",
              sizeClasses[size].subtext,
              isHovered && "text-primary/80 translate-x-0.5"
            )}>
              إدارة متجرك بكفاءة
            </span>
          )}
        </div>
      )}
      
      {/* تأثير نبض عند التحويم */}
      <div className={cn(
        "absolute inset-0 -z-10 rounded-full bg-primary/5 opacity-0 transition-all duration-500 scale-90",
        isHovered && "opacity-100 scale-110 animate-pulse"
      )} />
    </Link>
  );
} 

// إضافة هذه القواعد إلى ملف index.css أو بشكل مضمن في المكون
// .text-gradient-fancy {
//   @apply bg-clip-text bg-gradient-to-r from-primary to-primary/70 text-transparent;
// } 