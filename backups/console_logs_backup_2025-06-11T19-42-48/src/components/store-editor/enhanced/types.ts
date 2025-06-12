// أنواع البيانات المحسنة لمحرر المتجر
export type ViewportSize = 'desktop' | 'tablet' | 'mobile'
export type EditorMode = 'design' | 'preview' | 'code'
export type PanelType = 'layers' | 'properties' | 'components' | 'assets' | 'styles' | 'settings'

// أنواع العناصر المدعومة
export type ElementType = 
  | 'hero'
  | 'featured_products'
  | 'product_categories'
  | 'testimonials'
  | 'about'
  | 'services'
  | 'contact'
  | 'footer'
  | 'countdownoffers'
  | 'newsletter'
  | 'gallery'
  | 'text'
  | 'image'
  | 'button'
  | 'spacer'
  | 'divider'
  | 'video'
  | 'map'
  | 'social_links'
  | 'custom_html'

// أنماط العناصر المتجاوبة
export interface ResponsiveStyle {
  property: string
  value: string | number
  unit?: string
}

export interface ResponsiveStyles {
  desktop?: Record<string, ResponsiveStyle>
  tablet?: Record<string, ResponsiveStyle>
  mobile?: Record<string, ResponsiveStyle>
}

// خصائص العناصر
export interface ElementProperties {
  // خصائص عامة
  id?: string
  className?: string
  
  // خصائص النص
  text?: string
  html?: string
  placeholder?: string
  
  // خصائص الصور
  src?: string
  alt?: string
  caption?: string
  
  // خصائص الروابط
  href?: string
  target?: '_blank' | '_self' | '_parent' | '_top'
  
  // خصائص التفاعل
  onClick?: string
  onHover?: string
  
  // خصائص الرسوم المتحركة
  animation?: {
    type: 'fadeIn' | 'slideIn' | 'zoomIn' | 'bounce' | 'pulse' | 'rotate' | 'shake'
    duration: number
    delay: number
    direction?: 'up' | 'down' | 'left' | 'right' | 'in' | 'out'
    trigger?: 'onLoad' | 'onScroll' | 'onHover' | 'onClick'
    repeat?: boolean | number
    ease?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
  }
  
  // خصائص SEO
  seo?: {
    title?: string
    description?: string
    keywords?: string[]
    schema?: Record<string, any>
  }
  
  // إعدادات المتجر المتخصصة
  storeSettings?: {
    // إعدادات البانر الرئيسي
    hero?: {
      title?: string
      subtitle?: string
      description?: string
      backgroundImage?: string
      backgroundVideo?: string
      overlayOpacity?: number
      textAlignment?: 'left' | 'center' | 'right'
      buttons?: Array<{
        id: string
        text: string
        link: string
        style: 'primary' | 'secondary' | 'outline' | 'ghost'
        icon?: string
      }>
      trustBadges?: Array<{
        id: string
        icon: string
        text: string
        link?: string
      }>
      features?: Array<{
        id: string
        icon: string
        title: string
        description: string
      }>
    }
    
    // إعدادات المنتجات المميزة
    featured_products?: {
      title?: string
      description?: string
      displayType?: 'grid' | 'carousel' | 'masonry'
      columns?: number
      itemsPerView?: number
      showPagination?: boolean
      showNavigation?: boolean
      autoplay?: boolean
      autoplaySpeed?: number
      selectionMethod?: 'automatic' | 'manual' | 'category'
      criteria?: 'featured' | 'bestselling' | 'newest' | 'price_asc' | 'price_desc'
      categoryId?: string
      selectedProducts?: string[]
      showPrice?: boolean
      showRating?: boolean
      showDescription?: boolean
      showAddToCart?: boolean
      cardStyle?: 'default' | 'minimal' | 'detailed' | 'compact'
    }
    
    // إعدادات فئات المنتجات
    product_categories?: {
      title?: string
      description?: string
      displayType?: 'grid' | 'list' | 'carousel'
      columns?: number
      showProductCount?: boolean
      showDescription?: boolean
      imageStyle?: 'cover' | 'contain' | 'fill'
      selectedCategories?: string[]
      sortBy?: 'name' | 'product_count' | 'created_date'
      sortOrder?: 'asc' | 'desc'
    }
    
    // إعدادات آراء العملاء
    testimonials?: {
      title?: string
      description?: string
      displayType?: 'carousel' | 'grid' | 'masonry'
      autoplay?: boolean
      autoplaySpeed?: number
      showRating?: boolean
      showDate?: boolean
      showAvatar?: boolean
      testimonials?: Array<{
        id: string
        name: string
        title?: string
        company?: string
        avatar?: string
        rating: number
        comment: string
        date?: string
        verified?: boolean
      }>
    }
    
    // إعدادات عن المتجر
    about?: {
      title?: string
      subtitle?: string
      description?: string
      image?: string
      videoUrl?: string
      features?: Array<{
        id: string
        icon: string
        title: string
        description: string
      }>
      stats?: Array<{
        id: string
        number: number
        label: string
        suffix?: string
        prefix?: string
      }>
      timeline?: Array<{
        id: string
        year: string
        title: string
        description: string
      }>
    }
    
    // إعدادات الخدمات
    services?: {
      title?: string
      description?: string
      displayType?: 'grid' | 'list'
      services?: Array<{
        id: string
        icon: string
        title: string
        description: string
        link?: string
        image?: string
      }>
    }
    
    // إعدادات التواصل
    contact?: {
      title?: string
      description?: string
      showForm?: boolean
      showMap?: boolean
      showInfo?: boolean
      formFields?: Array<{
        id: string
        type: 'text' | 'email' | 'tel' | 'textarea' | 'select'
        label: string
        placeholder?: string
        required?: boolean
        options?: string[]
      }>
      contactInfo?: {
        phone?: string
        email?: string
        address?: string
        workingHours?: string
        mapUrl?: string
        mapEmbedCode?: string
      }
      socialLinks?: Record<string, string>
    }
    
    // إعدادات التذييل
    footer?: {
      logoUrl?: string
      description?: string
      showNewsletter?: boolean
      newsletterTitle?: string
      newsletterDescription?: string
      columns?: Array<{
        id: string
        title: string
        type: 'links' | 'contact' | 'social' | 'custom'
        content: any
      }>
      bottomText?: string
      copyrightText?: string
      showPaymentMethods?: boolean
      paymentMethods?: string[]
      showSocialLinks?: boolean
      socialLinks?: Record<string, string>
    }
    
    // إعدادات العروض المحدودة
    countdownoffers?: {
      title?: string
      subtitle?: string
      theme?: 'light' | 'dark' | 'gradient'
      backgroundColor?: string
      textColor?: string
      offers?: Array<{
        id: string
        title: string
        description?: string
        originalPrice: number
        discountPrice: number
        currency?: string
        endDate: string
        image?: string
        link?: string
        badgeText?: string
      }>
      displayType?: 'grid' | 'carousel'
      showTimer?: boolean
      timerStyle?: 'digital' | 'analog' | 'progress'
    }
  }
  
  // خصائص إضافية مرنة
  [key: string]: any
}

// تكوين العنصر
export interface ElementConfig {
  id: string
  type: ElementType
  name: string
  description?: string
  properties: ElementProperties
  styles: ResponsiveStyles
  children?: ElementConfig[]
  parentId?: string | null
  order: number
  isVisible?: boolean
  isLocked?: boolean
  createdAt: Date
  updatedAt: Date
  
  // معلومات إضافية
  metadata?: {
    version?: string
    author?: string
    tags?: string[]
    category?: string
  }
}

// تكوين الصفحة
export interface PageConfig {
  id: string
  name: string
  slug: string
  description?: string
  elements: ElementConfig[]
  globalStyles?: ResponsiveStyles
  settings?: {
    // إعدادات SEO
    seo?: {
      title?: string
      description?: string
      keywords?: string[]
      ogImage?: string
      twitterCard?: string
      canonicalUrl?: string
      robots?: string
      structuredData?: Record<string, any>
    }
    
    // إعدادات التخطيط
    layout?: {
      maxWidth?: string
      backgroundColor?: string
      backgroundImage?: string
      fontFamily?: string
      primaryColor?: string
      secondaryColor?: string
    }
    
    // إعدادات التفاعل
    interactions?: {
      smoothScroll?: boolean
      lazyLoading?: boolean
      animations?: boolean
      pageTransitions?: boolean
    }
    
    // إعدادات الأداء
    performance?: {
      enableCaching?: boolean
      optimizeImages?: boolean
      minifyCSS?: boolean
      minifyJS?: boolean
    }
  }
  createdAt: Date
  updatedAt: Date
}

// قالب الصفحة
export interface PageTemplate {
  id: string
  name: string
  description?: string
  category: string
  thumbnail: string
  previewImages: string[]
  config: PageConfig
  tags: string[]
  isPremium?: boolean
  isPublic?: boolean
  rating?: number
  downloads?: number
  author?: {
    id: string
    name: string
    avatar?: string
  }
  createdAt: Date
  updatedAt: Date
}

// تاريخ التعديلات
export interface EditorHistoryEntry {
  id: string
  action: 'create' | 'update' | 'delete' | 'move' | 'duplicate' | 'style' | 'reorder'
  elementId?: string
  elementType?: ElementType
  description: string
  previousState?: any
  newState?: any
  timestamp: Date
  user?: {
    id: string
    name: string
  }
}

// حالة المحرر
export interface EditorState {
  // حالة الصفحة
  currentPage: PageConfig | null
  pages: PageConfig[]
  
  // حالة التحديد
  selectedElementIds: string[]
  hoveredElementId: string | null
  focusedElementId: string | null
  
  // حالة الواجهة
  mode: EditorMode
  viewport: ViewportSize
  zoom: number
  activePanels: Set<PanelType>
  
  // حالة الأدوات
  showGrid: boolean
  showRulers: boolean
  showElementBounds: boolean
  snapToGrid: boolean
  gridSize: number
  
  // حالة التحرير
  isDirty: boolean
  isLoading: boolean
  isSaving: boolean
  isPublishing: boolean
  lastSaved: Date | null
  error: string | null
  
  // تاريخ التعديلات
  history: EditorHistoryEntry[]
  historyIndex: number
  maxHistorySize: number
  
  // إعدادات المحرر
  settings: {
    autoSave: boolean
    autoSaveInterval: number
    enableCollaboration: boolean
    enableAnimations: boolean
    enableKeyboardShortcuts: boolean
    theme: 'light' | 'dark' | 'auto'
    language: 'ar' | 'en'
  }
  
  // بيانات إضافية
  assets: Asset[]
  components: ComponentLibraryItem[]
  templates: PageTemplate[]
}

// ملف أو وسائط
export interface Asset {
  id: string
  name: string
  type: 'image' | 'video' | 'audio' | 'document' | 'font'
  url: string
  size: number
  dimensions?: {
    width: number
    height: number
  }
  mimeType: string
  createdAt: Date
  tags?: string[]
  alt?: string
  description?: string
}

// عنصر من مكتبة المكونات
export interface ComponentLibraryItem {
  id: string
  name: string
  description?: string
  category: string
  icon: string
  config: ElementConfig
  thumbnail?: string
  isPremium?: boolean
  tags: string[]
}

// أحداث السحب والإفلات
export interface DragEvent {
  elementId: string
  startPosition: { x: number; y: number }
  currentPosition: { x: number; y: number }
  dropZoneId?: string
}

// أحداث تغيير الحجم
export interface ResizeEvent {
  elementId: string
  startSize: { width: number; height: number }
  currentSize: { width: number; height: number }
  corner: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'
}

// إعدادات التصدير
export interface ExportSettings {
  format: 'html' | 'react' | 'vue' | 'json'
  includeAssets: boolean
  minify: boolean
  responsive: boolean
  seo: boolean
  analytics?: {
    googleAnalytics?: string
    facebookPixel?: string
    customCode?: string
  }
}

// إعدادات النشر
export interface PublishSettings {
  domain?: string
  subdomain?: string
  customDomain?: string
  sslEnabled?: boolean
  password?: string
  seoSettings?: PageConfig['settings']['seo']
  socialSharing?: boolean
  analytics?: ExportSettings['analytics']
} 