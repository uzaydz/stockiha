import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import './cta-button.css';

/**
 * مكون زر الدعوة للعمل المستخدم في صفحات الهبوط
 * هذا المكون مبسط ويستخدم مباشرة في عرض صفحات الهبوط وليس في المحرر
 */
const ctaButtonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-2 border-primary bg-transparent text-primary hover:bg-primary/10",
        ghost: "bg-transparent hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-gradient-to-r from-primary to-secondary text-white hover:brightness-110",
        glass: "bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg hover:bg-white/30",
        neon: "bg-black text-white border-2 hover:text-primary-lighter neon-effect",
        soft: "bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30",
        vibrant: "bg-primary text-white font-bold hover:saturate-150 transition-all duration-300",
      },
      size: {
        xs: "h-8 px-2.5 py-1.5 text-xs",
        sm: "h-9 px-3 py-2 text-sm",
        default: "h-10 px-4 py-2.5 text-base",
        lg: "h-12 px-6 py-3 text-lg",
        xl: "h-14 px-8 py-4 text-xl",
        xxl: "h-16 px-10 py-5 text-2xl",
      },
      roundness: {
        none: "rounded-none",
        sm: "rounded-sm",
        default: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        full: "rounded-full",
        pill: "rounded-[999px]",
      },
      shadow: {
        none: "shadow-none",
        sm: "shadow-sm",
        default: "shadow",
        md: "shadow-md",
        lg: "shadow-lg",
        xl: "shadow-xl",
        layered: "layered-shadow",
        glow: "glow-shadow",
        sharp: "sharp-shadow",
      },
      animation: {
        none: "",
        pulse: "animate-pulse",
        bounce: "animate-bounce",
        shake: "animate-shake", 
        glow: "animate-glow", 
        scale: "hover:scale-105 active:scale-95 transition-transform duration-200",
        breathe: "breathe-animation",
        spin: "hover:animate-spin-slow",
        wiggle: "hover:animate-wiggle",
      },
      effect: {
        none: "",
        ripple: "", 
        shine: "overflow-hidden shine-effect", 
        float: "hover:-translate-y-1 transition-transform duration-200",
        elevate: "hover:shadow-xl transition-shadow duration-200",
        morphing: "morphing-effect transition-all duration-300",
        movingGradient: "moving-gradient",
        growShrink: "hover:scale-105 active:scale-95 transition-all duration-300",
        tilt: "tilt-effect",
      },
      borderStyle: {
        none: "border-none",
        solid: "border-solid",
        dashed: "border-dashed",
        dotted: "border-dotted",
        double: "border-double border-2",
        outset: "border-solid shadow-outset",
        gradient: "gradient-border",
        animated: "animated-border",
      },
      fontWeight: {
        normal: "font-normal",
        medium: "font-medium",
        semibold: "font-semibold",
        bold: "font-bold",
        extrabold: "font-extrabold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      roundness: "default",
      shadow: "none",
      animation: "none",
      effect: "none",
      borderStyle: "none",
      fontWeight: "medium",
    },
  }
);

// الأيقونات المتاحة للزر
const iconMap: Record<string, React.ReactNode> = {
  arrowRight: <span>→</span>,
  arrowLeft: <span>←</span>,
  chevronRight: <span>❯</span>,
  chevronLeft: <span>❮</span>,
  mousePointer: <span>👆</span>,
  shoppingCart: <span>🛒</span>,
  dollarSign: <span>💲</span>,
  creditCard: <span>💳</span>,
  gift: <span>🎁</span>,
  zap: <span>⚡</span>,
  eye: <span>👁️</span>,
  clock: <span>⏰</span>,
  check: <span>✓</span>,
  heart: <span>❤️</span>,
  star: <span>⭐</span>,
  download: <span>⬇️</span>,
};

interface CtaButtonComponentProps {
  settings: Record<string, any>;
}

const CtaButtonComponent: React.FC<CtaButtonComponentProps> = ({ settings }) => {
  const {
    text = 'اضغط هنا',
    variant = 'default',
    size = 'default',
    roundness = 'default',
    shadow = 'none',
    animation = 'none',
    effect = 'none',
    borderStyle = 'none',
    fontWeight = 'medium',
    scrollToId,
    hasRipple = false,
    hasPulsingBorder = false,
    isGlowingText = false,
    hasDoubleText = false,
    secondaryText = '',
    customTextColor,
    customBgColor,
    customBorderColor,
    hoverTextColor,
    iconPosition = 'right',
    iconType = 'none',
    iconSpacing = 'normal',
    useCustomColors = false,
  } = settings;

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = React.useState(false);

  // التمرير إلى العنصر المطلوب عند النقر
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (scrollToId) {
      e.preventDefault();
      
      
      // محاولة العثور على العنصر بعدة طرق
      let element = document.getElementById(scrollToId);
      
      // في حالة عدم العثور على العنصر بناءً على المعرّف، جرب البحث بطرق أخرى
      if (!element) {
        // محاولة البحث باستخدام معرفات دينامية للنماذج
        element = document.getElementById(`form-section-${scrollToId}`);
        
        if (!element) {
          // محاولة البحث بواسطة سمات البيانات
          try {
            const elementsByData = document.querySelector(`[data-section-id="${scrollToId}"], [data-id="${scrollToId}"], [data-form-id="${scrollToId}"], .section-${scrollToId}`);
            if (elementsByData) {
              element = elementsByData as HTMLElement;
              
            }
          } catch (err) {
            console.error("خطأ أثناء البحث باستخدام محدد البيانات:", err);
          }
          
          // محاولة البحث بواسطة الفئة
          if (!element) {
            const elementsByClass = document.getElementsByClassName(scrollToId);
            if (elementsByClass.length > 0) {
              element = elementsByClass[0] as HTMLElement;
              
            }
          }
        } else {
          
        }
      } else {
        
      }
      
      if (element) {
        // حفظ الأنماط الأصلية للعنصر
        const originalTransition = element.style.transition;
        const originalZIndex = element.style.zIndex;
        
        // إضافة أنماط أولية للانتقال
        element.style.transition = "all 0.5s ease-in-out";
        element.style.zIndex = "5";
        
        // تأخير قصير للتأكد من أن DOM جاهز
        setTimeout(() => {
          try {
            // حساب المواضع والإزاحات
            const headerOffset = 80; // ارتفاع الشريط العلوي
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            // تعيين مدة التمرير (أبطأ لتمرير أكثر سلاسة)
            const scrollDuration = 1500; 
            
            // دالة مساعدة للتمرير السلس بطريقة مخصصة
            const smoothScrollTo = (to: number, duration: number) => {
              const start = window.pageYOffset;
              const change = to - start;
              const increment = 16;
              let currentTime = 0;
              
              const animateScroll = () => {
                currentTime += increment;
                const val = easeInOutQuint(currentTime, start, change, duration);
                window.scrollTo(0, val);
                if (currentTime < duration) {
                  window.requestAnimationFrame(animateScroll);
                }
              };
              
              // دالة تسارع أكثر سلاسة (Quint بدلاً من Quad)
              const easeInOutQuint = (t: number, b: number, c: number, d: number) => {
                t /= d / 2;
                if (t < 1) return c / 2 * t * t * t * t * t + b;
                t -= 2;
                return c / 2 * (t * t * t * t * t + 2) + b;
              };
              
              animateScroll();
            };
            
            // تطبيق التمرير السلس
            smoothScrollTo(offsetPosition, scrollDuration);
            
            // إضافة تأثير وهج للعنصر المستهدف بعد الوصول إليه
            setTimeout(() => {
              // استخدام كلاس CSS بدلاً من أنماط مضمنة للحصول على تأثير أكثر سلاسة
              element.classList.add('highlight-scroll-target');
              
              // إزالة الكلاس بعد اكتمال التأثير
              setTimeout(() => {
                element.classList.remove('highlight-scroll-target');
                element.style.transition = originalTransition;
                element.style.zIndex = originalZIndex;
              }, 2500); // توقيت يتوافق مع مدة التأثير في ملف CSS
            }, scrollDuration);
            
          } catch (err) {
            console.error("خطأ أثناء التمرير:", err);
            // استعادة الأنماط الأصلية في حالة حدوث خطأ
            element.style.transition = originalTransition;
            element.style.zIndex = originalZIndex;
          }
        }, 100);
      } else {
        console.warn(`لم يتم العثور على العنصر: #${scrollToId}`);
      }
    }
  };

  // تحديد المسافة بين الأيقونة والنص
  const getIconSpacingClass = () => {
    // عكس المفاهيم في RTL - "right" يعني على اليمين (أول العنصر في RTL)، و"left" يعني على اليسار (آخر العنصر في RTL)
    // في RTL، "left" يجب أن تضيف margin-right و"right" يجب أن تضيف margin-left
    switch (iconSpacing) {
      case "close":
        return iconPosition === "right" ? "ml-1" : "mr-1";
      case "normal":
        return iconPosition === "right" ? "ml-3" : "mr-3";
      case "far":
        return iconPosition === "right" ? "ml-4" : "mr-4";
      default:
        return iconPosition === "right" ? "ml-3" : "mr-3";
    }
  };

  // تحديد الأنماط المخصصة
  const getCustomStyle = () => {
    if (!useCustomColors) {
      return {};
    }

    const style: React.CSSProperties = {};

    if (customTextColor) {
      style.color = customTextColor;
    }

    if (customBgColor && variant !== 'outline' && variant !== 'ghost' && variant !== 'link') {
      style.backgroundColor = customBgColor;
    }

    if (customBorderColor) {
      style.borderColor = customBorderColor;
      
      if (variant === 'outline' || borderStyle !== 'none') {
        style.borderWidth = '2px';
        style.borderStyle = borderStyle === 'none' ? 'solid' : borderStyle;
      }
    }

    return style;
  };

  // تطبيق تأثيرات التوهج للنص
  const getTextStyles = () => {
    if (isGlowingText) {
      return {
        textShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor',
      };
    }
    
    if (hoverTextColor && isHovered) {
      return {
        color: hoverTextColor,
      };
    }
    
    return {};
  };

  // الحصول على مكون الأيقونة
  const getIcon = () => {
    if (iconType === 'none') return null;
    return iconMap[iconType] || null;
  };

  const buttonIcon = getIcon();
  const customStyle = getCustomStyle();
  const textStyle = getTextStyles();

  return (
    <div className="flex items-center justify-center w-full py-6">
      <button
        ref={buttonRef}
        className={cn(
          ctaButtonVariants({ 
            variant: variant as any,
            size: size as any,
            roundness: roundness as any,
            shadow: shadow as any,
            animation: animation as any,
            effect: effect as any,
            borderStyle: borderStyle as any,
            fontWeight: fontWeight as any
          }),
          hasPulsingBorder && "pulsing-border",
          (hasRipple || effect === "ripple") && "overflow-hidden",
          "rtl" // حفظ RTL للزر
        )}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          ...customStyle,
          ...textStyle
        }}
        dir="rtl" // إضافة صريحة لاتجاه RTL
      >
        {/* صياغة مختلفة للتعامل مع RTL بشكل أفضل */}
        {/* في RTL، "right" تعني في بداية النص (على اليمين) و"left" تعني في نهاية النص (على اليسار) */}
        {iconPosition === "right" && buttonIcon && (
          <span className={getIconSpacingClass()}>
            {buttonIcon}
          </span>
        )}
        
        <span>
          {hasDoubleText && isHovered && secondaryText ? secondaryText : text}
        </span>
        
        {iconPosition === "left" && buttonIcon && (
          <span className={getIconSpacingClass()}>
            {buttonIcon}
          </span>
        )}
      </button>
    </div>
  );
};

export default CtaButtonComponent; 