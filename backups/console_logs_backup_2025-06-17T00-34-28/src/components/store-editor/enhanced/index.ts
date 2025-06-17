// المكون الرئيسي المحسن
export { EnhancedStoreEditor as default } from './EnhancedStoreEditor'
export { EnhancedStoreEditor } from './EnhancedStoreEditor'

// المتجر والخطافات
export { useEnhancedStoreEditor } from './store'
export {
  useCurrentPage,
  useSelectedElements,
  useViewport,
  useEditorMode,
  useActivePanels,
  useEditorSettings,
  useCanUndo,
  useCanRedo,
  useIsDirty,
  useIsLoading,
  useIsSaving,
} from './store'

// الأنواع والواجهات
export type {
  ViewportSize,
  EditorMode,
  PanelType,
  ElementType,
  ResponsiveStyle,
  ResponsiveStyles,
  ElementProperties,
  ElementConfig,
  PageConfig,
  PageTemplate,
  EditorHistoryEntry,
  EditorState,
  Asset,
  ComponentLibraryItem,
  DragEvent,
  ResizeEvent,
  ExportSettings,
  PublishSettings,
} from './types'

// المكونات الفردية (للاستخدام المنفصل)
export { EditorHeader } from './components/EditorHeader'

// إعادة تصدير المكونات القديمة للتوافق
export { 
  ComponentEditor,
  ComponentPreview,
  AboutEditor,
} from '../index'

// ثوابت مفيدة
export const SUPPORTED_ELEMENT_TYPES = [
  'hero',
  'featured_products',
  'product_categories',
  'testimonials',
  'about',
  'services',
  'contact',
  'footer',
  'countdownoffers',
  'newsletter',
  'gallery',
  'text',
  'image',
  'button',
  'spacer',
  'divider',
  'video',
  'map',
  'social_links',
  'custom_html',
] as const

export const VIEWPORT_SIZES = {
  desktop: { width: 1920, height: 1080, label: 'سطح المكتب' },
  tablet: { width: 768, height: 1024, label: 'تابلت' },
  mobile: { width: 375, height: 667, label: 'جوال' },
} as const

export const EDITOR_MODES = {
  design: { label: 'تصميم', description: 'وضع التصميم والتحرير' },
  preview: { label: 'معاينة', description: 'معاينة النتيجة النهائية' },
  code: { label: 'كود', description: 'عرض وتحرير الكود' },
} as const

export const DEFAULT_EDITOR_SETTINGS = {
  autoSave: true,
  autoSaveInterval: 30000,
  enableCollaboration: false,
  enableAnimations: true,
  enableKeyboardShortcuts: true,
  theme: 'light' as const,
  language: 'ar' as const,
}

// مساعدات ووظائف مفيدة
export const createElementId = () => `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
export const createPageId = () => `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
export const createHistoryId = () => `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const getElementDisplayName = (type: string) => {
  const names: Record<string, string> = {
    hero: 'البانر الرئيسي',
    featured_products: 'المنتجات المميزة',
    product_categories: 'فئات المنتجات',
    testimonials: 'آراء العملاء',
    about: 'عن المتجر',
    services: 'الخدمات',
    contact: 'تواصل معنا',
    footer: 'التذييل',
    countdownoffers: 'العروض المحدودة',
    newsletter: 'النشرة البريدية',
    gallery: 'معرض الصور',
    text: 'نص',
    image: 'صورة',
    button: 'زر',
    spacer: 'مساحة فارغة',
    divider: 'فاصل',
    video: 'فيديو',
    map: 'خريطة',
    social_links: 'روابط التواصل',
    custom_html: 'HTML مخصص',
  }
  return names[type] || type
}

export const getElementIcon = (type: string) => {
  const icons: Record<string, string> = {
    hero: '🌟',
    featured_products: '⭐',
    product_categories: '🏷️',
    testimonials: '💬',
    about: '📖',
    services: '🛠️',
    contact: '📞',
    footer: '🔗',
    countdownoffers: '⏰',
    newsletter: '📧',
    gallery: '🖼️',
    text: '📝',
    image: '🖼️',
    button: '🔘',
    spacer: '📏',
    divider: '➖',
    video: '🎥',
    map: '🗺️',
    social_links: '🔗',
    custom_html: '💻',
  }
  return icons[type] || '📦'
}
