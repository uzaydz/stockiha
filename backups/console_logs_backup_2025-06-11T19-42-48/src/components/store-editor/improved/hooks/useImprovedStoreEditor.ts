import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { v4 as uuidv4 } from 'uuid'

// أنواع المكونات المتاحة
export type ComponentType = 
  | 'hero' 
  | 'featured_products' 
  | 'product_categories' 
  | 'testimonials' 
  | 'about' 
  | 'services' 
  | 'contact' 
  | 'footer' 
  | 'countdownoffers'

// بنية مكون المتجر
export interface StoreComponent {
  id: string
  type: ComponentType
  name: string
  settings: Record<string, any>
  isActive: boolean
  isVisible?: boolean
  orderIndex: number
  isSelected?: boolean
  isHovered?: boolean
}

// حالة المحرر
interface ImprovedStoreEditorState {
  // المكونات
  components: StoreComponent[]
  selectedComponentId: string | null
  hoveredComponentId: string | null
  
  // حالة الواجهة
  isLoading: boolean
  isSaving: boolean
  isDirty: boolean
  
  // إعدادات المحرر
  previewMode: boolean
  sidebarWidth: number
  propertiesWidth: number
  
  // التبويبات
  activeTab: 'components' | 'layers' | 'templates'
  
  // الإجراءات
  setComponents: (components: StoreComponent[]) => void
  addComponent: (type: ComponentType) => void
  updateComponent: (id: string, updates: Partial<StoreComponent>) => void
  deleteComponent: (id: string) => void
  selectComponent: (id: string | null) => void
  hoverComponent: (id: string | null) => void
  reorderComponents: (fromIndex: number, toIndex: number) => void
  duplicateComponent: (id: string) => void
  toggleComponentVisibility: (id: string) => void
  
  // إدارة الحفظ والاستعادة
  saveToStorage: () => void
  loadFromStorage: () => boolean
  hasUnsavedChanges: () => boolean
  getLastSaveTime: () => Date | null
  
  // إدارة الحالة
  setLoading: (loading: boolean) => void
  setSaving: (saving: boolean) => void
  setDirty: (dirty: boolean) => void
  setPreviewMode: (preview: boolean) => void
  setSidebarWidth: (width: number) => void
  setPropertiesWidth: (width: number) => void
  setActiveTab: (tab: 'components' | 'layers' | 'templates') => void
  
  // أدوات مساعدة
  getComponentById: (id: string) => StoreComponent | undefined
  getSelectedComponent: () => StoreComponent | undefined
  getComponentsByType: (type: ComponentType) => StoreComponent[]
  getActiveComponents: () => StoreComponent[]
  updateComponentSettings: (componentId: string, key: string, value: any) => void
  updateNestedSettings: (componentId: string, path: string[], value: any) => void
}

// الإعدادات الافتراضية للمكونات
const getDefaultComponentSettings = (type: ComponentType): Record<string, any> => {
  switch (type) {
    case 'hero':
      return {
        title: 'أهلاً بك في متجرنا',
        description: 'تسوق أحدث المنتجات بأفضل الأسعار',
        imageUrl: 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        primaryButton: {
          text: 'تسوق الآن',
          link: '/products'
        },
        secondaryButton: {
          text: 'معلومات أكثر',
          link: '/about'
        },
        primaryButtonStyle: 'primary',
        secondaryButtonStyle: 'primary',
        trustBadges: [
          { id: 'badge1', icon: 'Truck', text: 'شحن سريع' },
          { id: 'badge2', icon: 'ShieldCheck', text: 'ضمان جودة' },
          { id: 'badge3', icon: 'Gem', text: 'خدمة متميزة' }
        ]
      }
    case 'featured_products':
      return {
        title: 'منتجات مميزة',
        description: 'اكتشف مجموعتنا المختارة من المنتجات المميزة',
        displayCount: 4,
        sortBy: 'popularity',
        showRatings: true,
        categoryId: null
      }
    case 'product_categories':
      return {
        title: 'تسوق حسب الفئة',
        description: 'استكشف منتجاتنا حسب الفئة',
        layout: 'grid',
        displayCount: 6,
        selectionMethod: 'automatic',
        selectedCategories: [],
        showDescription: true,
        showProductCount: true,
        showImages: true,
        displayStyle: 'cards',
        backgroundStyle: 'light',
        showViewAllButton: true
      }
    case 'testimonials':
      return {
        title: 'آراء عملائنا',
        description: 'استمع إلى تجارب عملائنا الحقيقية مع منتجاتنا وخدماتنا',
        visibleCount: 3,
        backgroundColor: 'default',
        cardStyle: 'default',
        testimonials: undefined // استخدام البيانات الافتراضية من المكون
      }
    case 'about':
      return {
        title: 'عن متجرنا',
        subtitle: 'متجر إلكترونيات وتقنية متميز',
        description: 'تأسس متجرنا منذ أكثر من عشر سنوات بهدف تقديم أحدث منتجات التكنولوجيا بأسعار منافسة وجودة عالية. نحن نفخر بتوفير تجربة تسوق متميزة لعملائنا من خلال فريق متخصص يقدم المشورة والدعم الفني المستمر.',
        features: [
          'منتجات أصلية بضمان الوكيل',
          'شحن سريع لجميع مناطق المملكة',
          'دعم فني متخصص',
          'خدمة ما بعد البيع'
        ],
        image: 'https://images.unsplash.com/photo-1612690669207-fed642192c40?q=80&w=1740',
        storeInfo: {
          yearFounded: 2010,
          customersCount: 12000,
          productsCount: 1500,
          branches: 6
        }
      }
    case 'footer':
      return {
        storeName: 'متجرنا',
        logoUrl: '',
        description: 'متجر إلكتروني متخصص في بيع أحدث المنتجات التقنية والإلكترونية بأفضل الأسعار وجودة عالية.',
        socialLinks: [
          { platform: 'facebook', url: 'https://facebook.com' },
          { platform: 'twitter', url: 'https://twitter.com' },
          { platform: 'instagram', url: 'https://instagram.com' }
        ],
        contactInfo: {
          phone: '+966 12 345 6789',
          email: 'info@store.com',
          address: 'الرياض، المملكة العربية السعودية'
        },
        footerSections: [
          {
            id: 'links1',
            title: 'روابط سريعة',
            links: [
              { id: 'home', text: 'الرئيسية', url: '/' },
              { id: 'products', text: 'المنتجات', url: '/products' },
              { id: 'categories', text: 'الفئات', url: '/categories' },
              { id: 'about', text: 'من نحن', url: '/about' }
            ]
          },
          {
            id: 'links2',
            title: 'خدمة العملاء',
            links: [
              { id: 'support', text: 'الدعم الفني', url: '/support' },
              { id: 'contact', text: 'اتصل بنا', url: '/contact' },
              { id: 'faq', text: 'الأسئلة الشائعة', url: '/faq' },
              { id: 'returns', text: 'سياسة الإرجاع', url: '/returns' }
            ]
          }
        ],
        features: [
          {
            id: '1',
            icon: 'Truck',
            title: 'شحن سريع',
            description: 'توصيل مجاني للطلبات +500 ريال'
          },
          {
            id: '2',
            icon: 'CreditCard',
            title: 'دفع آمن',
            description: 'طرق دفع متعددة 100% آمنة'
          },
          {
            id: '3',
            icon: 'Heart',
            title: 'ضمان الجودة',
            description: 'منتجات عالية الجودة معتمدة'
          },
          {
            id: '4',
            icon: 'ShieldCheck',
            title: 'دعم 24/7',
            description: 'مساعدة متوفرة طول اليوم'
          }
        ],
        copyrightText: '',
        showSocialLinks: true,
        showContactInfo: true,
        showFeatures: true,
        showNewsletter: true,
        newsletterSettings: {
          enabled: true,
          title: 'النشرة البريدية',
          description: 'اشترك في نشرتنا البريدية للحصول على آخر العروض والتحديثات.',
          placeholder: 'البريد الإلكتروني',
          buttonText: 'اشتراك'
        },
        showPaymentMethods: true,
        paymentMethods: ['visa', 'mastercard', 'paypal', 'mada'],
        legalLinks: [
          { id: 'privacy', text: 'سياسة الخصوصية', url: '/privacy' },
          { id: 'terms', text: 'شروط الاستخدام', url: '/terms' }
        ]
      }
    default:
      return {}
  }
}

// أسماء المكونات باللغة العربية
export const getComponentDisplayName = (type: ComponentType): string => {
  const names: Record<ComponentType, string> = {
    hero: 'البانر الرئيسي',
    featured_products: 'منتجات مميزة',
    product_categories: 'فئات المنتجات',
    testimonials: 'آراء العملاء',
    about: 'من نحن',
    services: 'خدماتنا',
    contact: 'اتصل بنا',
    footer: 'تذييل الصفحة',
    countdownoffers: 'عروض محدودة'
  }
  return names[type] || type
}

// أيقونات المكونات
export const getComponentIcon = (type: ComponentType): string => {
  const icons: Record<ComponentType, string> = {
    hero: '🏆',
    featured_products: '⭐',
    product_categories: '🏷️',
    testimonials: '💬',
    about: '📋',
    services: '🛠️',
    contact: '📞',
    footer: '🔗',
    countdownoffers: '⏰'
  }
  return icons[type] || '📦'
}

// إنشاء مخزن الحالة
export const useImprovedStoreEditor = create<ImprovedStoreEditorState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // الحالة الأولية
        components: [],
        selectedComponentId: null,
        hoveredComponentId: null,
        
        isLoading: false,
        isSaving: false,
        isDirty: false,
        
        previewMode: false,
        sidebarWidth: 300,
        propertiesWidth: 320,
        
        activeTab: 'components',
        
        // الأعمال
        setComponents: (components) => 
          set((state) => {
            state.components = components
            state.isDirty = true
          }),
          
        addComponent: (type) => 
          set((state) => {
            const newComponent: StoreComponent = {
              id: uuidv4(),
              type,
              name: getComponentDisplayName(type),
              settings: getDefaultComponentSettings(type),
              isActive: true,
              isVisible: true,
              orderIndex: state.components.length
            }
            
            state.components.push(newComponent)
            state.selectedComponentId = newComponent.id
            state.isDirty = true
          }),
        
        updateComponent: (id, updates) => 
          set((state) => {
            const component = state.components.find(c => c.id === id)
            if (component) {
              Object.assign(component, updates)
              state.isDirty = true
            }
          }),

        deleteComponent: (id) => 
          set((state) => {
            state.components = state.components.filter(c => c.id !== id)
            if (state.selectedComponentId === id) {
              state.selectedComponentId = null
            }
            state.isDirty = true
          }),

        selectComponent: (id) => 
          set((state) => {
            state.selectedComponentId = id
            // إزالة التحديد من جميع المكونات
            state.components.forEach(c => c.isSelected = false)
            // تحديد المكون المختار
            if (id) {
              const component = state.components.find(c => c.id === id)
              if (component) component.isSelected = true
            }
            // لا نضع isDirty = true هنا لأن التحديد لا يحتاج حفظ
          }),

        hoverComponent: (id) => 
          set((state) => {
            state.hoveredComponentId = id
            // إزالة التمرير من جميع المكونات
            state.components.forEach(c => c.isHovered = false)
            // تطبيق التمرير على المكون المحدد
            if (id) {
              const component = state.components.find(c => c.id === id)
              if (component) component.isHovered = true
            }
            // لا نضع isDirty = true هنا لأن التمرير لا يحتاج حفظ
          }),

        reorderComponents: (fromIndex, toIndex) => 
          set((state) => {
            const [movedComponent] = state.components.splice(fromIndex, 1)
            state.components.splice(toIndex, 0, movedComponent)
            
            // تحديث ترقيم الترتيب
            state.components.forEach((component, index) => {
              component.orderIndex = index
            })
            
            state.isDirty = true
          }),

        duplicateComponent: (id) => 
          set((state) => {
            const component = state.components.find(c => c.id === id)
            if (component) {
              const duplicate: StoreComponent = {
                ...component,
                id: uuidv4(),
                name: `${component.name} (نسخة)`,
                isVisible: true,
                orderIndex: component.orderIndex + 1
              }
              
              // إدراج النسخة بعد المكون الأصلي
              const insertIndex = state.components.findIndex(c => c.id === id) + 1
              state.components.splice(insertIndex, 0, duplicate)
              
              // تحديث ترقيم الترتيب
              state.components.forEach((comp, index) => {
                comp.orderIndex = index
              })
              
              state.selectedComponentId = duplicate.id
              state.isDirty = true
            }
          }),

        toggleComponentVisibility: (id) => 
          set((state) => {
            const component = state.components.find(c => c.id === id)
            if (component) {
              // التأكد من أن القيمة boolean صالحة
              const currentVisibility = component.isVisible ?? true
              const newVisibility = !currentVisibility
              component.isVisible = newVisibility
              
              // تحديث الإعدادات أيضاً لضمان التزامن مع قاعدة البيانات
              if (!component.settings) {
                component.settings = {}
              }
              component.settings._isVisible = newVisibility
              
              state.isDirty = true
            }
          }),

        // إدارة الحفظ والاستعادة
        saveToStorage: () => {
          const state = get()
          const dataToSave = {
            components: state.components,
            selectedComponentId: state.selectedComponentId,
            timestamp: Date.now()
          }
          localStorage.setItem('store-editor-data', JSON.stringify(dataToSave))
          set((draft) => {
            draft.isDirty = false
            draft.isSaving = false
          })
        },

        loadFromStorage: () => {
          try {
            const savedData = localStorage.getItem('store-editor-data')
            if (savedData) {
              const parsedData = JSON.parse(savedData)
              set((state) => {
                // التأكد من أن كل مكون له isVisible و isActive
                state.components = (parsedData.components || []).map((component: StoreComponent) => ({
                  ...component,
                  isActive: component.isActive ?? true, // إذا لم تكن موجودة، اجعلها true
                  isVisible: component.isVisible ?? true // إذا لم تكن موجودة، اجعلها true
                }))
                state.selectedComponentId = parsedData.selectedComponentId || null
                state.isDirty = false
              })
              return true
            }
            return false
          } catch (error) {
            console.error('فشل في تحميل البيانات المحفوظة:', error)
            return false
          }
        },

        hasUnsavedChanges: () => get().isDirty,

        getLastSaveTime: () => {
          try {
            const savedData = localStorage.getItem('store-editor-data')
            if (savedData) {
              const parsedData = JSON.parse(savedData)
              return parsedData.timestamp ? new Date(parsedData.timestamp) : null
            }
            return null
          } catch (error) {
            return null
          }
        },

        // إدارة الحالة
        setLoading: (loading) => set((state) => { state.isLoading = loading }),
        setSaving: (saving) => set((state) => { state.isSaving = saving }),
        setDirty: (dirty) => set((state) => { state.isDirty = dirty }),
        setPreviewMode: (preview) => set((state) => { state.previewMode = preview }),
        setSidebarWidth: (width) => set((state) => { state.sidebarWidth = width }),
        setPropertiesWidth: (width) => set((state) => { state.propertiesWidth = width }),
        setActiveTab: (tab) => set((state) => { state.activeTab = tab }),

        // أدوات مساعدة
        getComponentById: (id) => get().components.find(c => c.id === id),
        getSelectedComponent: () => {
          const { selectedComponentId, components } = get()
          return selectedComponentId ? components.find(c => c.id === selectedComponentId) : undefined
        },
        getComponentsByType: (type) => get().components.filter(c => c.type === type),
        getActiveComponents: () => get().components.filter(c => c.isActive),
        
        // وظائف مساعدة إضافية للتعامل مع الإعدادات المتداخلة
        updateComponentSettings: (componentId: string, key: string, value: any) => 
          set((state) => {
            const component = state.components.find(c => c.id === componentId)
            if (component) {
              component.settings = {
                ...component.settings,
                [key]: value
              }
              state.isDirty = true
            }
          }),
          
        updateNestedSettings: (componentId: string, path: string[], value: any) => 
          set((state) => {
            const component = state.components.find(c => c.id === componentId)
            if (component) {
              // استنساخ الإعدادات للتعديل
              const newSettings = JSON.parse(JSON.stringify(component.settings || {}))
              
              // معالجة الحالة الخاصة إذا كان المسار فارغًا
              if (path.length === 0) {
                component.settings = value
                state.isDirty = true
                return
              }
              
              // البدء من جذر الإعدادات
              let current = newSettings
              
              // متابعة المسار حتى المستوى ما قبل الأخير
              for (let i = 0; i < path.length - 1; i++) {
                const key = path[i]
                // إنشاء مستوى متداخل إذا لم يكن موجودًا
                if (!current[key] || typeof current[key] !== 'object') {
                  current[key] = {}
                }
                current = current[key]
              }
              
              // تعيين القيمة على المستوى الأخير
              const lastKey = path[path.length - 1]
              current[lastKey] = value
              
              component.settings = newSettings
              state.isDirty = true
            }
          })
      })),
      {
        name: 'improved-store-editor',
        partialize: (state) => ({
          sidebarWidth: state.sidebarWidth,
          propertiesWidth: state.propertiesWidth,
          activeTab: state.activeTab
        })
      }
    ),
    { name: 'improved-store-editor' }
  )
)