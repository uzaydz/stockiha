import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback, memo } from 'react';

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

  // Optimized event handlers
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);
  const handleMouseDown = useCallback(() => setIsPressed(true), []);
  const handleMouseUp = useCallback(() => setIsPressed(false), []);
  const handleTouchStart = useCallback(() => setIsPressed(true), []);
  const handleTouchEnd = useCallback(() => setIsPressed(false), []);

  // Size configurations - محسّن للهاتف
  const sizeClasses = {
    sm: {
      container: "gap-1.5 sm:gap-2",
      logo: "h-5 sm:h-6 w-auto",
      icon: "h-3.5 w-3.5 sm:h-4 sm:w-4",
      iconContainer: "p-1 sm:p-1.5 rounded-md sm:rounded-lg",
      text: "text-xs sm:text-sm",
      subtext: "text-[7px] sm:text-[8px]"
    },
    md: {
      container: "gap-2 sm:gap-2.5",
      logo: "h-6 sm:h-8 w-auto",
      icon: "h-4 w-4 sm:h-5 sm:w-5",
      iconContainer: "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
      text: "text-sm sm:text-lg",
      subtext: "text-[8px] sm:text-[10px]"
    },
    lg: {
      container: "gap-2 sm:gap-3",
      logo: "h-8 sm:h-10 w-auto",
      icon: "h-5 w-5 sm:h-6 sm:w-6",
      iconContainer: "p-2 sm:p-2.5 rounded-lg sm:rounded-xl",
      text: "text-base sm:text-xl",
      subtext: "text-[9px] sm:text-xs"
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
      style={{ willChange: 'transform' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {orgLogo ? (
        <div className={cn(
          "overflow-hidden rounded-md relative",
          isPressed && "scale-95 transition-transform duration-150"
        )}
        style={{ willChange: 'transform' }}>
          <img 
            src={orgLogo} 
            alt={siteName || "شعار الموقع"} 
            data-logo="organization"
            className={cn(
              sizeClasses[size].logo,
              "object-contain transition-transform duration-300 ease-out",
              isHovered ? "scale-105" : "scale-100",
              "hover:drop-shadow-md"
            )}
            style={{ willChange: 'transform' }}
            width={size === 'sm' ? 24 : size === 'md' ? 32 : 40}
            height={size === 'sm' ? 24 : size === 'md' ? 32 : 40}
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
          )}
          style={{ willChange: 'transform, opacity' }} />
        </div>
      ) : (
        <div className={cn(
          "bg-primary/10 transition-all duration-300 overflow-hidden relative",
          sizeClasses[size].iconContainer,
          isHovered ? "scale-105 bg-primary/20 shadow-md" : "scale-100",
          isPressed && "scale-95 transition-transform duration-150"
        )}
        style={{ willChange: 'transform' }}>
          <Store className={cn(
            sizeClasses[size].icon, 
            "text-primary transition-transform duration-300 ease-out relative z-10",
            isHovered && "rotate-6"
          )}
          style={{ willChange: 'transform' }} />
          
          {/* شعاع ضوئي متحرك */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 transition-all duration-700 skew-x-12 -translate-x-full",
            isHovered && "opacity-100 translate-x-full"
          )}
          style={{ willChange: 'transform, opacity' }} />
        </div>
      )}
      
      {(displayTextWithLogo || !orgLogo) && (
        <div className="flex flex-col">
          <span className={cn(
            "font-bold transition-all duration-300 text-gradient-fancy", 
            sizeClasses[size].text,
            isHovered && "text-primary",
            "drop-shadow-[0_0_0.3px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_0.5px_rgba(255,255,255,0.2)]"
          )}>
            {siteName || (isAdminPage ? 'لوحة التحكم' : 'المتجر')}
          </span>
          {isAdminPage && (
            <span className={cn(
              "text-muted-foreground transition-all duration-300",
              sizeClasses[size].subtext,
              isHovered && "text-primary/80"
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
      )}
      style={{ willChange: 'transform, opacity' }} />
    </Link>
  );
}

// Optimize with React.memo to prevent unnecessary re-renders
export default memo(NavbarLogo);

// إضافة هذه القواعد إلى ملف index.css أو بشكل مضمن في المكون
// .text-gradient-fancy {
//   @apply bg-clip-text bg-gradient-to-r from-primary to-primary/70 text-transparent;
// }
