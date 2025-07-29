import { LucideIcon } from 'lucide-react';

// أنماط الأزرار المتاحة
export const buttonStyles = {
  primary: "bg-foreground text-background hover:bg-foreground/90 shadow-lg hover:shadow-xl transition-all duration-300 border-0",
  secondary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300",
  outline: "border-2 border-foreground text-foreground hover:bg-foreground hover:text-background shadow-lg hover:shadow-xl transition-all duration-300",
} as const;

// نوع أنماط الأزرار
export type ButtonStyleType = keyof typeof buttonStyles;

// واجهة شارة الثقة
export interface TrustBadge {
  icon: LucideIcon | string;
  text: string;
}

// واجهة الزر
export interface ButtonConfig {
  text: string;
  link: string;
}

// واجهة بيانات البانر
export interface HeroData {
  imageUrl: string;
  title: string;
  description: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  primaryButton?: ButtonConfig;
  secondaryButton?: ButtonConfig;
  primaryButtonStyle?: ButtonStyleType;
  secondaryButtonStyle?: ButtonStyleType;
  trustBadges?: TrustBadge[];
}

// خصائص الصورة المحسّنة
export interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
}

// خصائص محتوى البانر
export interface BannerContentProps {
  title: string;
  description: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  primaryButtonStyle?: ButtonStyleType;
  secondaryButtonStyle?: ButtonStyleType;
  isRTL?: boolean;
}

// خصائص شارات الثقة
export interface TrustBadgesProps {
  badges: TrustBadge[];
  isRTL?: boolean;
}

// خصائص صورة البانر
export interface BannerImageProps {
  imageUrl: string;
  title: string;
  isRTL?: boolean;
  onImageLoad?: () => void;
} 