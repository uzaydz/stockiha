export type ViewportSize = 'desktop' | 'tablet' | 'mobile'

export type ElementType = 
  | 'hero'
  | 'text'
  | 'image' 
  | 'button'
  | 'section'
  | 'container'
  | 'grid'
  | 'flex'
  | 'product-card'
  | 'product-grid'
  | 'category-section'
  | 'testimonials'
  | 'footer'
  | 'header'
  | 'navigation'
  | 'featured_products'
  | 'categories'
  | 'countdownoffers'
  | 'product_categories'
  | 'about'
  | 'services'
  | 'contact'

export interface ElementStyles {
  // Layout
  display?: 'block' | 'flex' | 'grid' | 'inline' | 'inline-block' | 'none'
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky'
  top?: string
  right?: string
  bottom?: string
  left?: string
  zIndex?: number
  
  // Flexbox
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline'
  gap?: string
  
  // Grid
  gridTemplateColumns?: string
  gridTemplateRows?: string
  gridGap?: string
  
  // Dimensions
  width?: string
  height?: string
  minWidth?: string
  maxWidth?: string
  minHeight?: string
  maxHeight?: string
  
  // Spacing
  margin?: string
  marginTop?: string
  marginRight?: string
  marginBottom?: string
  marginLeft?: string
  padding?: string
  paddingTop?: string
  paddingRight?: string
  paddingBottom?: string
  paddingLeft?: string
  
  // Typography
  fontSize?: string
  fontWeight?: number | string
  fontFamily?: string
  lineHeight?: string
  letterSpacing?: string
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  textDecoration?: 'none' | 'underline' | 'line-through'
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  color?: string
  
  // Background
  backgroundColor?: string
  backgroundImage?: string
  backgroundSize?: 'auto' | 'cover' | 'contain'
  backgroundPosition?: string
  backgroundRepeat?: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y'
  backgroundAttachment?: 'scroll' | 'fixed' | 'local'
  
  // Border
  border?: string
  borderTop?: string
  borderRight?: string
  borderBottom?: string
  borderLeft?: string
  borderRadius?: string
  borderColor?: string
  borderWidth?: string
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none'
  
  // Effects
  boxShadow?: string
  opacity?: number
  transform?: string
  transition?: string
  filter?: string
  backdropFilter?: string
  
  // Other
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto'
  cursor?: string
}

export interface ResponsiveStyles {
  desktop?: ElementStyles
  tablet?: ElementStyles
  mobile?: ElementStyles
}

export interface ElementProperties {
  // Common properties
  id?: string
  className?: string
  
  // Text elements
  text?: string
  placeholder?: string
  
  // Image elements
  src?: string
  alt?: string
  
  // Link elements
  href?: string
  target?: '_blank' | '_self' | '_parent' | '_top'
  
  // Button elements
  onClick?: string
  disabled?: boolean
  
  // Product elements
  productId?: string
  categoryId?: string
  
  // Animation
  animation?: {
    type: 'fadeIn' | 'slideIn' | 'zoomIn' | 'bounce' | 'pulse'
    duration: number
    delay: number
    direction?: 'up' | 'down' | 'left' | 'right'
  }
  
  // Interactive states
  hover?: ElementStyles
  active?: ElementStyles
  focus?: ElementStyles
}

export interface StoreSettings {
  // إعدادات البانر الرئيسي (hero)
  hero?: {
    title?: string
    imageUrl?: string
    description?: string
    trustBadges?: Array<{
      id: string
      icon: string
      text: string
    }>
    primaryButton?: { link: string; text: string }
    secondaryButton?: { link: string; text: string }
    primaryButtonStyle?: string
    secondaryButtonStyle?: string
  }
  
  // إعدادات المنتجات المميزة
  featured_products?: {
    title?: string
    description?: string
    displayType?: 'grid' | 'carousel'
    displayCount?: number
    selectionCriteria?: 'featured' | 'bestselling' | 'newest'
    selectionMethod?: 'automatic' | 'manual'
    selectedProducts?: string[]
  }
  
  // إعدادات فئات المنتجات
  categories?: {
    title?: string
    description?: string
    displayType?: 'grid' | 'list'
    displayCount?: number
    selectedCategories?: string[]
  }
  
  // إعدادات العروض المحدودة بوقت
  countdownoffers?: {
    theme?: 'light' | 'dark'
    title?: string
    subtitle?: string
    layout?: 'grid' | 'carousel'
    offers?: Array<{
      id: string
      productId?: string
      title?: string
      originalPrice?: number
      discountPrice?: number
      endDate?: string
    }>
    currency?: string
    maxItems?: number
    buttonText?: string
    viewAllUrl?: string
    showViewAll?: boolean
  }
  
  // إعدادات عن المتجر
  about?: {
    image?: string
    title?: string
    subtitle?: string
    description?: string
    features?: string[]
    storeInfo?: {
      branches?: number
      yearFounded?: number
      productsCount?: number
      customersCount?: number
    }
  }
  
  // إعدادات الخدمات
  services?: {
    title?: string
    description?: string
    services?: Array<{
      id: string
      icon: string
      title: string
      description: string
    }>
  }
  
  // إعدادات اتصل بنا
  contact?: {
    title?: string
    description?: string
    showContactForm?: boolean
    showContactInfo?: boolean
    contactInfo?: {
      phone?: string
      email?: string
      address?: string
      workingHours?: string
    }
  }
  
  // إعدادات آراء العملاء
  testimonials?: {
    title?: string
    description?: string
    testimonials?: Array<{
      id: string
      name: string
      rating: number
      comment: string
      avatar?: string
      title?: string
    }>
    displayType?: 'carousel' | 'grid'
    showRatings?: boolean
  }
  
  // إعدادات الفوتر
  footer?: {
    storeName?: string
    description?: string
    logoUrl?: string
    socialLinks?: {
      facebook?: string
      twitter?: string
      instagram?: string
      youtube?: string
      linkedin?: string
    }
    footerSections?: Array<{
      id: string
      title: string
      links: Array<{
        id: string
        text: string
        url: string
        isExternal: boolean
      }>
    }>
    features?: Array<{
      id: string
      icon: string
      title: string
      description: string
    }>
    contactInfo?: {
      phone?: string
      email?: string
      address?: string
    }
    showSocialLinks?: boolean
    showContactInfo?: boolean
    showFeatures?: boolean
    showNewsletter?: boolean
    newsletterSettings?: {
      enabled: boolean
      title: string
      description: string
      placeholder: string
      buttonText: string
    }
    paymentMethods?: string[]
    legalLinks?: Array<{
      id: string
      text: string
      url: string
      isExternal: boolean
    }>
    copyrightText?: string
  }
  
  // إعدادات SEO (للمتجر ككل)
  seo_settings?: {
    title?: string
    description?: string
    keywords?: string
    robots_txt?: string
    enable_sitemap?: boolean
    default_image_url?: string
    enable_open_graph?: boolean
    enable_twitter_cards?: boolean
    enable_canonical_urls?: boolean
    generate_meta_tags?: boolean
    enable_schema_markup?: boolean
    structured_data?: {
      business_name?: string
      business_type?: string
      business_logo?: string
      business_phone?: string
      business_address?: string
    }
    social_media?: {
      facebook_page?: string
      twitter_handle?: string
      instagram_handle?: string
      linkedin_page?: string
    }
    advanced?: {
      google_analytics_id?: string
      google_tag_manager_id?: string
      google_search_console_id?: string
      bing_webmaster_id?: string
      custom_head_tags?: string
      custom_robots_txt?: string
    }
  }
}

export interface ElementConfig {
  id: string
  type: ElementType
  name: string
  properties: {
    text?: string
    href?: string
    src?: string
    alt?: string
    storeSettings?: StoreSettings[keyof StoreSettings]
    [key: string]: any
  }
  styles: ResponsiveStyles
  children?: ElementConfig[]
  parentId?: string
  order: number
  isLocked?: boolean
  isHidden?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PageConfig {
  id: string
  name: string
  slug: string
  elements: ElementConfig[]
  globalStyles?: ElementStyles
  seoSettings?: {
    title: string
    description: string
    keywords: string[]
    ogImage?: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface Template {
  id: string
  name: string
  description?: string
  category: string
  thumbnail: string
  previewImages: string[]
  config: ElementConfig
  tags: string[]
  isPremium?: boolean
  isPublic?: boolean
  rating?: number
  downloads?: number
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface EditorHistory {
  id: string
  action: 'create' | 'update' | 'delete' | 'move' | 'duplicate'
  elementId: string
  previousState?: any
  newState?: any
  timestamp: Date
}

export interface EditorState {
  // Canvas state
  selectedElementId: string | null
  hoveredElementId: string | null
  focusedElementId: string | null
  multiSelectedIds: string[]
  
  // Page state
  currentPage: PageConfig | null
  pages: PageConfig[]
  isDirty: boolean
  lastSaved: Date | null
  
  // UI state
  isEditMode: boolean
  isPreviewMode: boolean
  viewport: ViewportSize
  zoom: number
  showGrid: boolean
  showRulers: boolean
  showElementBounds: boolean
  
  // Panels state
  isLayersPanelOpen: boolean
  isPropertiesPanelOpen: boolean
  isTemplatesPanelOpen: boolean
  isAssetsPanelOpen: boolean
  
  // History state
  history: EditorHistory[]
  historyIndex: number
  canUndo: boolean
  canRedo: boolean
  
  // Loading states
  isLoading: boolean
  isSaving: boolean
  isPublishing: boolean
  
  // Error state
  error: string | null
}

export type CreateElementInput = Omit<ElementConfig, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateElementInput = Partial<Omit<ElementConfig, 'id' | 'createdAt' | 'updatedAt'>>

export interface DragEvent {
  elementId: string
  startPosition: { x: number; y: number }
  currentPosition: { x: number; y: number }
}

export interface ResizeEvent {
  elementId: string
  newSize: { width: number; height: number }
}

export interface EditorSettings {
  autoSave: boolean
  autoSaveInterval: number
  snapToGrid: boolean
  gridSize: number
  showElementBounds: boolean
  enableAnimations: boolean
} 