import React from 'react';
import { CtaButton } from './components/CtaButton';
import './styles/cta-button.css';
import { LandingPageComponent } from './types';
import { getIconComponent } from './CtaButtonComponentEditor';

interface CtaButtonComponentPreviewProps {
  component: LandingPageComponent;
  isEditor?: boolean;
}

export function CtaButtonComponentPreview({ 
  component, 
  isEditor = false 
}: CtaButtonComponentPreviewProps) {
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
  } = component.settings || {};

  // تحديد الأنماط المخصصة بناءً على حالة الزر
  const getCustomStyle = () => {
    if (!useCustomColors) {
      return {};
    }

    const style: React.CSSProperties = {};

    // تطبيق لون النص
    if (customTextColor) {
      style.color = customTextColor;
    }

    // تطبيق لون الخلفية - لا نطبقه للأزرار الشفافة
    if (customBgColor && variant !== 'outline' && variant !== 'ghost' && variant !== 'link') {
      style.backgroundColor = customBgColor;
    }

    // تطبيق لون الحدود - تأكد من تطبيقه على جميع أنواع الأزرار
    if (customBorderColor) {
      style.borderColor = customBorderColor;
      
      // إذا كان الزر له حدود مخصصة، تأكد من عرضها
      if (variant === 'outline' || borderStyle !== 'none') {
        style.borderWidth = '2px';
        style.borderStyle = borderStyle === 'none' ? 'solid' : borderStyle;
      }
    }

    return style;
  };

  // الحصول على مكون الأيقونة المناسب
  const buttonIcon = iconType !== 'none' ? getIconComponent(iconType) : null;

  return (
    <div className="flex flex-col items-center justify-center w-full py-6" dir="rtl">
      <CtaButton
        text={text}
        variant={variant as any}
        size={size as any}
        roundness={roundness as any}
        shadow={shadow as any}
        animation={animation as any}
        effect={effect as any}
        borderStyle={borderStyle as any}
        fontWeight={fontWeight as any}
        scrollToId={isEditor ? undefined : scrollToId}
        scrollOffset={0}
        hasRipple={hasRipple}
        hasPulsingBorder={hasPulsingBorder}
        isGlowingText={isGlowingText}
        hasDoubleText={hasDoubleText}
        secondaryText={secondaryText}
        hoverTextColor={hoverTextColor}
        iconPosition={iconPosition as any}
        iconSpacing={iconSpacing as any}
        icon={buttonIcon}
        style={getCustomStyle()}
        onClick={(e) => {
          if (isEditor) {
            e.preventDefault();
          }
        }}
      />
      
      {/* عرض معلومات إضافية للمحرر */}
      {isEditor && scrollToId && (
        <div className="mt-2 text-xs text-muted-foreground text-center">
          التمرير إلى: {scrollToId}
        </div>
      )}
    </div>
  );
} 