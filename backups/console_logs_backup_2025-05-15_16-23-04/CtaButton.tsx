import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

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
        shake: "animate-shake", // Custom animation
        glow: "animate-glow", // Custom animation
        scale: "hover:scale-105 active:scale-95 transition-transform duration-200",
        breathe: "breathe-animation",
        spin: "hover:animate-spin-slow",
        wiggle: "hover:animate-wiggle",
      },
      effect: {
        none: "",
        ripple: "", // Handled separately via ripple effect
        shine: "overflow-hidden shine-effect", // Custom shine effect
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

const RIPPLE_DURATION = 600;

export interface CtaButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof ctaButtonVariants> {
  text: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  iconSpacing?: "close" | "normal" | "far";
  scrollToId?: string;
  scrollBehavior?: ScrollBehavior;
  scrollOffset?: number;
  hasRipple?: boolean;
  hasPulsingBorder?: boolean;
  isGlowingText?: boolean;
  hasDoubleText?: boolean;
  secondaryText?: string;
  hoverTextColor?: string;
}

export const CtaButton = React.forwardRef<HTMLButtonElement, CtaButtonProps>(
  (
    {
      className,
      variant,
      size,
      roundness,
      shadow,
      animation,
      effect,
      borderStyle,
      fontWeight,
      text,
      icon,
      iconPosition = "left",
      iconSpacing = "normal",
      scrollToId,
      scrollBehavior = "smooth",
      scrollOffset = 0,
      hasRipple = false,
      hasPulsingBorder = false,
      isGlowingText = false,
      hasDoubleText = false,
      secondaryText,
      hoverTextColor,
      onClick,
      style: customStyle = {},
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<
      Array<{ x: number; y: number; id: number }>
    >([]);
    const [isHovered, setIsHovered] = useState(false);
    let rippleCount = 0;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Handle ripple effect
      if (hasRipple || effect === "ripple") {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newRipple = {
          x,
          y,
          id: rippleCount++,
        };

        setRipples((prevRipples) => [...prevRipples, newRipple]);

        setTimeout(() => {
          setRipples((prevRipples) =>
            prevRipples.filter((ripple) => ripple.id !== newRipple.id)
          );
        }, RIPPLE_DURATION);
      }

      // Handle scroll to element
      if (scrollToId) {
        e.preventDefault();
        console.log(`محاولة التمرير إلى العنصر: #${scrollToId}`);
        
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
                console.log(`تم العثور على العنصر بواسطة سمات البيانات: ${scrollToId}`);
              }
            } catch (err) {
              console.error("خطأ أثناء البحث باستخدام محدد البيانات:", err);
            }
            
            // محاولة البحث بواسطة الفئة
            if (!element) {
              const elementsByClass = document.getElementsByClassName(scrollToId);
              if (elementsByClass.length > 0) {
                element = elementsByClass[0] as HTMLElement;
                console.log(`تم العثور على العنصر بواسطة الفئة: ${scrollToId}`);
              }
            }
          } else {
            console.log(`تم العثور على العنصر باستخدام معرف النموذج الديناميكي: form-section-${scrollToId}`);
          }
        } else {
          console.log(`تم العثور على العنصر بنجاح: #${scrollToId}`);
        }
        
        if (element) {
          // إضافة تأثير بصري مؤقت للعنصر المستهدف
          const originalTransition = element.style.transition;
          const originalBoxShadow = element.style.boxShadow;
          const originalZIndex = element.style.zIndex;
          const originalOutline = element.style.outline;
          
          // إضافة توقيت انتقالي للتأثيرات البصرية
          element.style.transition = "all 0.5s ease-in-out";
          element.style.zIndex = "5";
          
          // استخدام تأخير قصير للتأكد من أن DOM جاهز
          setTimeout(() => {
            try {
              // تطبيق تأثير التمرير المحسن
              const headerOffset = scrollOffset || 80; // ارتفاع الشريط العلوي
              const elementPosition = element.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
              
              // دالة التمرير السلس بتأثير غير خطي للشعور بتجربة أفضل
              const smoothScrollWithEffect = (to: number, duration: number) => {
                const start = window.pageYOffset;
                const change = to - start;
                const increment = 16; // 60fps تقريبًا
                let currentTime = 0;
                
                const animateScroll = () => {
                  currentTime += increment;
                  // استخدام تأثير easeInOutQuint للشعور بحركة أكثر طبيعية وسلاسة
                  const val = easeInOutQuint(currentTime, start, change, duration);
                  window.scrollTo(0, val);
                  if (currentTime < duration) {
                    window.requestAnimationFrame(animateScroll);
                  } else {
                    // اكتمل التمرير، إضافة تأثير الإبراز
                    highlightTargetElement();
                  }
                };
                
                // دالة تسارع من الدرجة الخامسة للحصول على حركة أكثر نعومة
                const easeInOutQuint = (t: number, b: number, c: number, d: number) => {
                  t /= d / 2;
                  if (t < 1) return c / 2 * t * t * t * t * t + b;
                  t -= 2;
                  return c / 2 * (t * t * t * t * t + 2) + b;
                };
                
                animateScroll();
              };
              
              // إضافة تأثير وهج عند الوصول للعنصر المستهدف
              const highlightTargetElement = () => {
                // استخدام كلاس CSS بدلاً من أنماط مضمنة للحصول على تأثير أكثر سلاسة
                element.classList.add('highlight-scroll-target');
                
                // إزالة الكلاس بعد اكتمال التأثير وإعادة الأنماط الأصلية
                setTimeout(() => {
                  element.classList.remove('highlight-scroll-target');
                  element.style.transition = originalTransition;
                  element.style.outline = originalOutline;
                  element.style.boxShadow = originalBoxShadow;
                  element.style.zIndex = originalZIndex;
                }, 2500); // توقيت يتوافق مع مدة التأثير في ملف CSS
              };
              
              // تنفيذ التمرير السلس مع المدة المحددة
              const scrollDuration = 1500; // زيادة المدة لتمرير أكثر سلاسة
              smoothScrollWithEffect(offsetPosition, scrollDuration);
              
            } catch (err) {
              console.error("خطأ أثناء التمرير:", err);
              // استعادة الأنماط الأصلية في حالة حدوث خطأ
              element.style.transition = originalTransition;
              element.style.boxShadow = originalBoxShadow;
              element.style.outline = originalOutline;
              element.style.zIndex = originalZIndex;
            }
          }, 50);
        } else {
          console.warn(`لم يتم العثور على العنصر: #${scrollToId}`);
        }
      }

      // Call the provided onClick handler
      onClick?.(e);
    };

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

    // المسافة بين الأيقونة والنص
    const getIconSpacingClass = () => {
      // عكس المفاهيم في RTL - "right" يعني على اليمين (أول العنصر في RTL)، و"left" يعني على اليسار (آخر العنصر في RTL)
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

    // تجهيز كل الأنماط المطبقة على الزر
    const combinedStyle: React.CSSProperties = {
      ...customStyle,
    };

    // إضافة أنماط النص المتوهج أو تغيير لون النص عند التحويم
    const textStyle = getTextStyles();

    return (
      <button
        ref={ref}
        className={cn(
          ctaButtonVariants({ variant, size, roundness, shadow, animation, effect, borderStyle, fontWeight }),
          hasPulsingBorder && "pulsing-border",
          (hasRipple || effect === "ripple") && "overflow-hidden",
          "rtl", // إضافة RTL للزر
          className
        )}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{...combinedStyle, ...textStyle}}
        dir="rtl"
        {...props}
      >
        {/* في RTL، الأيقونة اليمنى تظهر أولاً (بداية النص) */}
        {iconPosition === "right" && icon && (
          <span className={`inline-flex items-center ${getIconSpacingClass()}`}>{icon}</span>
        )}
        
        {hasDoubleText ? (
          <span className="button-double-text-container">
            <span className="button-main-text">{text}</span>
            <span className="button-secondary-text">{secondaryText || text}</span>
          </span>
        ) : (
          <span>{text}</span>
        )}
        
        {/* في RTL، الأيقونة اليسرى تظهر آخراً (نهاية النص) */}
        {iconPosition === "left" && icon && (
          <span className={`inline-flex items-center ${getIconSpacingClass()}`}>{icon}</span>
        )}
        
        {/* Ripple effect */}
        {(hasRipple || effect === "ripple") &&
          ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="absolute rounded-full bg-white/30 animate-ripple pointer-events-none"
              style={{
                left: ripple.x,
                top: ripple.y,
                transform: "translate(-50%, -50%) scale(0)",
                width: "200%",
                paddingBottom: "200%",
              }}
            />
          ))}
      </button>
    );
  }
);

CtaButton.displayName = "CtaButton"; 