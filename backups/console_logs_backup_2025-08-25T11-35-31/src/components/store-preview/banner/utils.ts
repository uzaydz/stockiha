import { LucideIcon, Truck, ShieldCheck, Gem } from 'lucide-react';
import { HeroData } from './types';

// خريطة الأيقونات المتاحة
const iconMap: Record<string, LucideIcon> = {
  Truck,
  ShieldCheck, 
  Gem,
};

// دالة تحويل اسم الأيقونة إلى مكون
export const getIconComponent = (iconName: string | LucideIcon): LucideIcon => {
  if (typeof iconName !== 'string') {
    return iconName;
  }
  return iconMap[iconName] || Gem;
};

// دالة لإنشاء بيانات البانر الافتراضية مع الترجمة
export const getDefaultHeroData = (t: any): HeroData => ({
  imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop&crop=center',
  title: t('banner.welcomeTitle'),
  description: t('banner.welcomeSubtitle'),
  primaryButtonText: t('banner.shopNow'),
  primaryButtonLink: '/products',
  primaryButtonStyle: 'primary',
  secondaryButtonText: t('banner.learnMore'),
  secondaryButtonLink: '/offers',
  secondaryButtonStyle: 'outline',
});

// بيانات افتراضية للتوافق مع النسخة القديمة
export const defaultHeroData: HeroData = {
  imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop&crop=center',
  title: 'أحدث المنتجات',
  description: 'تسوق أحدث منتجاتنا المختارة بعناية بأفضل الأسعار التنافسية.',
  primaryButtonText: 'تصفح الكل',
  primaryButtonLink: '/products',
  primaryButtonStyle: 'primary',
  secondaryButtonText: 'العروض الخاصة',
  secondaryButtonLink: '/offers',
  secondaryButtonStyle: 'outline',
};

// النصوص الافتراضية للتحقق من الترجمة
const defaultTexts = [
  'تسوق الآن', 'Shop Now', 'Acheter maintenant',
  'معلومات أكثر', 'Learn More', 'En savoir plus',
  'تصفح الكل', 'Browse All', 'Parcourir tout',
  'العروض الخاصة', 'Special Offers', 'Offres spéciales',
  'أحدث المنتجات', 'Latest Products', 'Derniers produits',
  'مرحباً بك في متجرنا', 'Welcome to Our Store', 'Bienvenue dans notre boutique'
];

// دالة للتحقق من النصوص الافتراضية
export const isDefaultText = (text: string): boolean => {
  return defaultTexts.includes(text);
};

// دالة للحصول على النص المناسب مع الترجمة
export const getButtonText = (heroText?: string, translatedText?: string): string => {
  if (!heroText || isDefaultText(heroText)) {
    return translatedText || '';
  }
  return heroText;
};

// دالة لمعالجة النصوص مع الترجمة
export const processText = (text: string | undefined, translatedText: string | undefined): string => {
  if (!text || isDefaultText(text)) {
    return translatedText || '';
  }
  return text;
};
