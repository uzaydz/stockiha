import { StoreComponent } from '@/types/store-editor';

export type ComponentMeta = {
  id: string;
  type: StoreComponent['type'];
  name: string;
  description: string;
  isActive: boolean;
  orderIndex: number;
};

export type HeroSettings = {
  imageUrl: string;
  title: string;
  description: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  primaryButton?: {
    text: string;
    link: string;
  };
  secondaryButton?: {
    text: string;
    link: string;
  };
  primaryButtonStyle?: 'primary' | 'secondary' | 'outline';
  secondaryButtonStyle?: 'primary' | 'secondary' | 'outline';
  trustBadges?: Array<{
    id: string;
    text: string;
    icon: string;
  }>;
  // خصائص المنتجات الجديدة
  selectedProducts?: string[];
  showProducts?: boolean;
  productsDisplay?: string;
  productsLimit?: number;
  productsType?: 'featured' | 'selected' | 'latest' | 'new';
  organization_id?: string;
};

export type FeaturedProductsSettings = {
  title: string;
  description: string;
  displayCount: number;
  displayType: 'grid' | 'list';
  selectionMethod: 'automatic' | 'manual';
  selectionCriteria: 'featured' | 'best_selling' | 'newest' | 'discounted';
  showPrices: boolean;
  showRatings: boolean;
  showAddToCart: boolean;
  showBadges: boolean;
  showViewAllButton: boolean;
  selectedProducts: string[];
  categoryId?: string | null;
  organization_id?: string;
};

export type AboutSectionSettings = {
  title: string;
  subtitle: string;
  description: string;
  image?: string;
  features: string[];
  storeInfo?: {
    yearFounded?: number;
    customersCount?: number;
    productsCount?: number;
    branches?: number;
  };
  organization_id?: string;
};

export type FooterLink = {
  id: string;
  text: string;
  url: string;
  isExternal?: boolean;
};

export type FooterSection = {
  id: string;
  title: string;
  links: FooterLink[];
};

export type SocialLink = {
  platform: 'facebook' | 'twitter' | 'instagram' | 'youtube' | 'linkedin' | 'tiktok';
  url: string;
};

export type ContactInfo = {
  phone?: string;
  email?: string;
  address?: string;
};

export type FooterFeature = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

export type NewsletterSettings = {
  enabled: boolean;
  title: string;
  description: string;
  placeholder: string;
  buttonText: string;
};

export type FooterSectionSettings = {
  storeName: string;
  logoUrl?: string;
  description: string;
  socialLinks: SocialLink[];
  contactInfo: ContactInfo;
  footerSections: FooterSection[];
  features: FooterFeature[];
  copyrightText?: string;
  showSocialLinks?: boolean;
  showContactInfo?: boolean;
  showFeatures?: boolean;
  showNewsletter?: boolean;
  newsletterSettings?: NewsletterSettings;
  showPaymentMethods?: boolean;
  paymentMethods?: string[];
  legalLinks?: FooterLink[];
  organization_id?: string;
  lastUpdated?: string;
};

export type ComponentEditorProps = {
  settings: HeroSettings;
  onChange: (changes: Partial<HeroSettings>) => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

export type ComponentsSidebarProps = {
  components: ComponentMeta[];
  selectedComponentId: string;
  onSelect: (componentId: string) => void;
  onToggleVisibility: (componentId: string, value: boolean) => void;
  onMove: (componentId: string, direction: 'up' | 'down') => void;
  onSaveLayout: () => void;
  hasUnsavedChanges: boolean;
  hasLayoutChanges: boolean;
  isSavingLayout: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

export type MainContentAreaProps = {
  selectedComponent: ComponentMeta | undefined;
  heroSettings: HeroSettings;
  categorySettings: CategorySectionSettings;
  featuredSettings: FeaturedProductsSettings;
  aboutSettings: AboutSectionSettings;
  testimonialSettings: TestimonialSectionSettings;
  onHeroChange: (changes: Partial<HeroSettings>) => void;
  onCategoryChange: (changes: Partial<CategorySectionSettings>) => void;
  onFeaturedChange: (key: keyof FeaturedProductsSettings, value: FeaturedProductsSettings[keyof FeaturedProductsSettings]) => void;
  onAboutChange: (key: keyof AboutSectionSettings, value: AboutSectionSettings[keyof AboutSectionSettings]) => void;
  footerSettings: FooterSectionSettings;
  onFooterChange: (key: keyof FooterSectionSettings, value: FooterSectionSettings[keyof FooterSectionSettings]) => void;
  onTestimonialChange: (changes: Partial<TestimonialSectionSettings>) => void;
  organizationId?: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

export type ActionButtonsProps = {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onReset: () => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

export type LoadingStateProps = {
  message?: string;
  description?: string;
};

// أنواع الفئات
export interface Category {
  id: string;
  name: string;
  description?: string;
  slug: string;
  image_url?: string;
  icon?: string;
  is_active: boolean;
  product_count?: number;
  parent_id?: string | null;
  order_count?: number;
}

export type CategorySectionSettings = {
  title: string;
  description: string;
  selectionMethod: 'random' | 'bestselling' | 'manual' | 'automatic' | 'popular' | 'newest';
  maxCategories: number;
  displayCount?: number;
  showProductCount: boolean;
  showDescription: boolean;
  showImages?: boolean;
  enableHoverEffects?: boolean;
  selectedCategories: string[];
  displayStyle: 'cards' | 'grid' | 'list';
  enableViewAll: boolean;
  showViewAllButton?: boolean;
  backgroundStyle: 'light' | 'dark' | 'brand' | 'muted' | 'gradient';
  organization_id?: string;
  // خصائص الترتيب
  categoryOrder?: string[];
  lastUpdated?: string;
};

export type CategoryEditorProps = {
  settings: CategorySectionSettings;
  onChange: (changes: Partial<CategorySectionSettings>) => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

// أنواع بيانات الشهادات
export interface Testimonial {
  id: string;
  customer_name: string;
  customer_avatar?: string;
  rating: number;
  comment: string;
  verified?: boolean;
  purchase_date?: string;
  product_name?: string;
  product_image?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type TestimonialSectionSettings = {
  title: string;
  subtitle: string;
  autoPlay: boolean;
  autoPlayDelay: number;
  showRating: boolean;
  showNavigation: boolean;
  displayStyle: 'carousel' | 'grid' | 'list';
  maxTestimonials: number;
  showStats: boolean;
  showProductInfo: boolean;
  backgroundStyle: 'light' | 'dark' | 'brand' | 'muted' | 'gradient';
  selectedTestimonials: string[];
  organization_id?: string;
  // خصائص الترتيب
  testimonialOrder?: string[];
  lastUpdated?: string;
};

export type TestimonialEditorProps = {
  settings: TestimonialSectionSettings;
  onChange: (changes: Partial<TestimonialSectionSettings>) => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};
