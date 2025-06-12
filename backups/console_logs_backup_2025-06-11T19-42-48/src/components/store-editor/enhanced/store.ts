import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { debounce } from 'lodash-es'
import type { 
  EditorState, 
  ElementConfig, 
  PageConfig, 
  ViewportSize, 
  EditorMode,
  PanelType,
  EditorHistoryEntry,
  ResponsiveStyles,
  ElementProperties,
  Asset,
  ComponentLibraryItem,
  PageTemplate,
  ExportSettings,
  PublishSettings
} from './types'

// واجهة الإجراءات
interface EditorActions {
  // إدارة الصفحات
  setCurrentPage: (page: PageConfig) => void
  createPage: (page: Omit<PageConfig, 'id' | 'createdAt' | 'updatedAt'>) => string
  updatePage: (updates: Partial<PageConfig>) => void
  deletePage: (id: string) => void
  duplicatePage: (id: string) => string
  
  // إدارة العناصر
  selectElements: (ids: string[]) => void
  selectElement: (id: string | null) => void
  toggleElementSelection: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
  hoverElement: (id: string | null) => void
  focusElement: (id: string | null) => void
  
  // معالجة العناصر
  createElement: (element: Omit<ElementConfig, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateElement: (id: string, updates: Partial<ElementConfig>) => void
  updateElementProperties: (id: string, properties: Partial<ElementProperties>) => void
  updateElementStyles: (id: string, viewport: ViewportSize, styles: Partial<ResponsiveStyles[ViewportSize]>) => void
  duplicateElements: (ids: string[]) => string[]
  deleteElements: (ids: string[]) => void
  moveElements: (ids: string[], targetIndex: number, targetParentId?: string) => void
  groupElements: (ids: string[]) => string
  ungroupElement: (id: string) => void
  
  // إدارة الواجهة
  setMode: (mode: EditorMode) => void
  setViewport: (viewport: ViewportSize) => void
  setZoom: (zoom: number) => void
  togglePanel: (panel: PanelType) => void
  openPanel: (panel: PanelType) => void
  closePanel: (panel: PanelType) => void
  
  // أدوات التحرير
  toggleGrid: () => void
  toggleRulers: () => void
  toggleElementBounds: () => void
  toggleSnapToGrid: () => void
  setGridSize: (size: number) => void
  
  // التاريخ والتراجع
  undo: () => void
  redo: () => void
  addToHistory: (entry: Omit<EditorHistoryEntry, 'id' | 'timestamp'>) => void
  clearHistory: () => void
  setMaxHistorySize: (size: number) => void
  
  // الحفظ والنشر
  saveChanges: () => Promise<void>
  publishPage: (settings?: PublishSettings) => Promise<void>
  exportPage: (settings: ExportSettings) => Promise<string>
  
  // إدارة الأصول
  addAsset: (asset: Omit<Asset, 'id' | 'createdAt'>) => string
  updateAsset: (id: string, updates: Partial<Asset>) => void
  deleteAsset: (id: string) => void
  
  // إدارة المكونات
  addComponent: (component: Omit<ComponentLibraryItem, 'id'>) => string
  updateComponent: (id: string, updates: Partial<ComponentLibraryItem>) => void
  deleteComponent: (id: string) => void
  
  // إدارة القوالب
  addTemplate: (template: Omit<PageTemplate, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateTemplate: (id: string, updates: Partial<PageTemplate>) => void
  deleteTemplate: (id: string) => void
  applyTemplate: (templateId: string) => void
  
  // إدارة الحالة
  setLoading: (loading: boolean) => void
  setSaving: (saving: boolean) => void
  setPublishing: (publishing: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  
  // إعدادات المحرر
  updateSettings: (updates: Partial<EditorState['settings']>) => void
  resetSettings: () => void
}

type StoreType = EditorState & EditorActions

// الحالة الأولية
const initialState: EditorState = {
  // حالة الصفحة
  currentPage: null,
  pages: [],
  
  // حالة التحديد
  selectedElementIds: [],
  hoveredElementId: null,
  focusedElementId: null,
  
  // حالة الواجهة
  mode: 'design',
  viewport: 'desktop',
  zoom: 100,
  activePanels: new Set(['components', 'properties']),
  
  // حالة الأدوات
  showGrid: false,
  showRulers: false,
  showElementBounds: true,
  snapToGrid: true,
  gridSize: 20,
  
  // حالة التحرير
  isDirty: false,
  isLoading: false,
  isSaving: false,
  isPublishing: false,
  lastSaved: null,
  error: null,
  
  // تاريخ التعديلات
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
  
  // إعدادات المحرر
  settings: {
    autoSave: true,
    autoSaveInterval: 30000, // 30 ثانية
    enableCollaboration: false,
    enableAnimations: true,
    enableKeyboardShortcuts: true,
    theme: 'light',
    language: 'ar',
  },
  
  // بيانات إضافية
  assets: [],
  components: [],
  templates: [],
}

// دالة الحفظ التلقائي المحسنة
const debouncedAutoSave = debounce(async (
  pageId: string, 
  elements: ElementConfig[],
  onSave: () => Promise<void>
) => {
  try {
    console.log('بدء الحفظ التلقائي للصفحة:', pageId)
    await onSave()
    console.log('تم الحفظ التلقائي بنجاح')
  } catch (error) {
    console.error('فشل الحفظ التلقائي:', error)
  }
}, 2000)

// إنشاء المتجر
export const useEnhancedStoreEditor = create<StoreType>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,
          
          // إدارة الصفحات
          setCurrentPage: (page) => {
            set((state) => {
              state.currentPage = page
              state.selectedElementIds = []
              state.hoveredElementId = null
              state.focusedElementId = null
              state.isDirty = false
              
              // إذا كانت الصفحة فارغة، أضف بعض العناصر التجريبية
              if (!page.elements || page.elements.length === 0) {
                const sampleElements = [
                  {
                    id: 'hero_sample',
                    type: 'hero' as any,
                    name: 'البانر الرئيسي',
                    properties: {
                      title: 'مرحباً بكم في متجرنا',
                      description: 'اكتشف أحدث المنتجات والعروض الحصرية',
                    },
                    styles: { desktop: {}, tablet: {}, mobile: {} },
                    order: 0,
                    isVisible: true,
                    isLocked: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                  {
                    id: 'featured_products_sample',
                    type: 'featured_products' as any,
                    name: 'المنتجات المميزة',
                    properties: {
                      title: 'منتجاتنا المميزة',
                      description: 'أفضل اختياراتنا لهذا الشهر',
                      displayCount: 4,
                    },
                    styles: { desktop: {}, tablet: {}, mobile: {} },
                    order: 1,
                    isVisible: true,
                    isLocked: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                  {
                    id: 'categories_sample',
                    type: 'product_categories' as any,
                    name: 'فئات المنتجات',
                    properties: {
                      title: 'تصفح فئاتنا',
                      description: 'جميع الفئات في مكان واحد',
                      displayCount: 6,
                    },
                    styles: { desktop: {}, tablet: {}, mobile: {} },
                    order: 2,
                    isVisible: true,
                    isLocked: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  }
                ]
                
                state.currentPage.elements = sampleElements
                state.isDirty = true
              }
            })
          },
          
          createPage: (pageData) => {
            const id = `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            const now = new Date()
            
            const page: PageConfig = {
              ...pageData,
              id,
              createdAt: now,
              updatedAt: now,
            }
            
            set((state) => {
              state.pages.push(page)
              state.currentPage = page
              state.isDirty = true
            })
            
            return id
          },
          
          updatePage: (updates) => {
            set((state) => {
              if (!state.currentPage) return
              
              Object.assign(state.currentPage, {
                ...updates,
                updatedAt: new Date(),
              })
              state.isDirty = true
            })
          },
          
          deletePage: (id) => {
            set((state) => {
              const index = state.pages.findIndex(p => p.id === id)
              if (index >= 0) {
                state.pages.splice(index, 1)
                if (state.currentPage?.id === id) {
                  state.currentPage = state.pages[0] || null
                }
                state.isDirty = true
              }
            })
          },
          
          duplicatePage: (id) => {
            const newId = `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            set((state) => {
              const page = state.pages.find(p => p.id === id)
              if (page) {
                const newPage: PageConfig = {
                  ...page,
                  id: newId,
                  name: `${page.name} (نسخة)`,
                  slug: `${page.slug}-copy`,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }
                state.pages.push(newPage)
                state.isDirty = true
              }
            })
            
            return newId
          },
          
          // إدارة العناصر
          selectElements: (ids) => {
            set((state) => {
              state.selectedElementIds = ids
              state.focusedElementId = ids[0] || null
            })
          },
          
          selectElement: (id) => {
            set((state) => {
              state.selectedElementIds = id ? [id] : []
              state.focusedElementId = id
            })
          },
          
          toggleElementSelection: (id) => {
            set((state) => {
              const index = state.selectedElementIds.indexOf(id)
              if (index >= 0) {
                state.selectedElementIds.splice(index, 1)
              } else {
                state.selectedElementIds.push(id)
              }
              state.focusedElementId = state.selectedElementIds[0] || null
            })
          },
          
          selectAll: () => {
            set((state) => {
              if (state.currentPage) {
                state.selectedElementIds = state.currentPage.elements.map(el => el.id)
                state.focusedElementId = state.selectedElementIds[0] || null
              }
            })
          },
          
          clearSelection: () => {
            set((state) => {
              state.selectedElementIds = []
              state.focusedElementId = null
            })
          },
          
          hoverElement: (id) => {
            set((state) => {
              state.hoveredElementId = id
            })
          },
          
          focusElement: (id) => {
            set((state) => {
              state.focusedElementId = id
            })
          },
          
          // معالجة العناصر
          createElement: (elementData) => {
            const id = `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            const now = new Date()
            
            const element: ElementConfig = {
              ...elementData,
              id,
              createdAt: now,
              updatedAt: now,
            }
            
            set((state) => {
              if (!state.currentPage) return
              
              state.currentPage.elements.push(element)
              state.selectedElementIds = [id]
              state.focusedElementId = id
              state.isDirty = true
              
              // إضافة إلى التاريخ
              const historyEntry: EditorHistoryEntry = {
                id: `history_${Date.now()}`,
                action: 'create',
                elementId: id,
                elementType: element.type,
                description: `إنشاء عنصر ${element.name}`,
                newState: element,
                timestamp: now,
              }
              
              get().addToHistory(historyEntry)
            })
            
            return id
          },
          
          updateElement: (id, updates) => {
            set((state) => {
              if (!state.currentPage) return
              
              const element = state.currentPage.elements.find(el => el.id === id)
              if (element) {
                const previousState = { ...element }
                Object.assign(element, {
                  ...updates,
                  updatedAt: new Date(),
                })
                state.isDirty = true
                
                // إضافة إلى التاريخ
                const historyEntry: EditorHistoryEntry = {
                  id: `history_${Date.now()}`,
                  action: 'update',
                  elementId: id,
                  elementType: element.type,
                  description: `تحديث ${element.name}`,
                  previousState,
                  newState: { ...element },
                  timestamp: new Date(),
                }
                
                get().addToHistory(historyEntry)
              }
            })
          },

          updateElementProperties: (id, properties) => {
            set((state) => {
              if (!state.currentPage) return
              
              const element = state.currentPage.elements.find(el => el.id === id)
              if (element) {
                Object.assign(element.properties, properties)
                element.updatedAt = new Date()
                state.isDirty = true
              }
            })
          },

          updateElementStyles: (id, viewport, styles) => {
            set((state) => {
              if (!state.currentPage) return
              
              const element = state.currentPage.elements.find(el => el.id === id)
              if (element) {
                if (!element.styles[viewport]) {
                  element.styles[viewport] = {}
                }
                Object.assign(element.styles[viewport], styles)
                element.updatedAt = new Date()
                state.isDirty = true
              }
            })
          },

          duplicateElements: (ids) => {
            const newIds: string[] = []
            
            set((state) => {
              if (!state.currentPage) return
              
              ids.forEach(id => {
                const element = state.currentPage!.elements.find(el => el.id === id)
                if (element) {
                  const newId = `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                  const duplicatedElement: ElementConfig = {
                    ...element,
                    id: newId,
                    name: `${element.name} (نسخة)`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  }
                  
                  state.currentPage!.elements.push(duplicatedElement)
                  newIds.push(newId)
                }
              })
              
              state.selectedElementIds = newIds
              state.isDirty = true
            })
            
            return newIds
          },

          deleteElements: (ids) => {
            set((state) => {
              if (!state.currentPage) return
              
              state.currentPage.elements = state.currentPage.elements.filter(
                el => !ids.includes(el.id)
              )
              state.selectedElementIds = state.selectedElementIds.filter(
                id => !ids.includes(id)
              )
              state.isDirty = true
            })
          },

          moveElements: (ids, targetIndex, targetParentId) => {
            set((state) => {
              if (!state.currentPage) return
              
              // تنفيذ منطق نقل العناصر
              const elements = state.currentPage.elements
              const elementsToMove = elements.filter(el => ids.includes(el.id))
              const remainingElements = elements.filter(el => !ids.includes(el.id))
              
              // إعادة ترتيب العناصر
              remainingElements.splice(targetIndex, 0, ...elementsToMove)
              state.currentPage.elements = remainingElements
              state.isDirty = true
            })
          },

          groupElements: (ids) => {
            const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            set((state) => {
              if (!state.currentPage) return
              
              const elementsToGroup = state.currentPage.elements.filter(el => ids.includes(el.id))
              
              // إنشاء مجموعة جديدة
              const groupElement: ElementConfig = {
                id: groupId,
                type: 'group' as any,
                name: 'مجموعة جديدة',
                properties: {},
                styles: { desktop: {}, tablet: {}, mobile: {} },
                children: elementsToGroup,
                order: Math.max(...state.currentPage.elements.map(el => el.order || 0)) + 1,
                isVisible: true,
                isLocked: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
              
              // إزالة العناصر المجمعة من القائمة الرئيسية
              state.currentPage.elements = state.currentPage.elements.filter(el => !ids.includes(el.id))
              state.currentPage.elements.push(groupElement)
              
              state.selectedElementIds = [groupId]
              state.isDirty = true
            })
            
            return groupId
          },

          ungroupElement: (id) => {
            set((state) => {
              if (!state.currentPage) return
              
              const groupElement = state.currentPage.elements.find(el => el.id === id)
              if (groupElement && groupElement.children) {
                // إضافة العناصر الفرعية إلى القائمة الرئيسية
                state.currentPage.elements.push(...groupElement.children)
                
                // إزالة المجموعة
                state.currentPage.elements = state.currentPage.elements.filter(el => el.id !== id)
                
                state.selectedElementIds = groupElement.children.map(child => child.id)
                state.isDirty = true
              }
            })
          },
          
          // إدارة الواجهة
          setMode: (mode) => {
            set((state) => {
              state.mode = mode
            })
          },
          
          setViewport: (viewport) => {
            set((state) => {
              state.viewport = viewport
            })
          },
          
          setZoom: (zoom) => {
            set((state) => {
              state.zoom = Math.max(25, Math.min(200, zoom))
            })
          },
          
          togglePanel: (panel) => {
            set((state) => {
              if (state.activePanels.has(panel)) {
                state.activePanels.delete(panel)
              } else {
                state.activePanels.add(panel)
              }
            })
          },
          
          openPanel: (panel) => {
            set((state) => {
              state.activePanels.add(panel)
            })
          },
          
          closePanel: (panel) => {
            set((state) => {
              state.activePanels.delete(panel)
            })
          },
          
          // أدوات التحرير
          toggleGrid: () => {
            set((state) => {
              state.showGrid = !state.showGrid
            })
          },
          
          toggleRulers: () => {
            set((state) => {
              state.showRulers = !state.showRulers
            })
          },
          
          toggleElementBounds: () => {
            set((state) => {
              state.showElementBounds = !state.showElementBounds
            })
          },
          
          toggleSnapToGrid: () => {
            set((state) => {
              state.snapToGrid = !state.snapToGrid
            })
          },
          
          setGridSize: (size) => {
            set((state) => {
              state.gridSize = Math.max(5, Math.min(50, size))
            })
          },
          
          // التاريخ والتراجع
          undo: () => {
            set((state) => {
              if (state.historyIndex >= 0) {
                const entry = state.history[state.historyIndex]
                // تنفيذ منطق التراجع
                state.historyIndex--
                state.isDirty = true
              }
            })
          },
          
          redo: () => {
            set((state) => {
              if (state.historyIndex < state.history.length - 1) {
                state.historyIndex++
                const entry = state.history[state.historyIndex]
                // تنفيذ منطق الإعادة
                state.isDirty = true
              }
            })
          },
          
          addToHistory: (entryData) => {
            set((state) => {
              const entry: EditorHistoryEntry = {
                ...entryData,
                id: `history_${Date.now()}`,
                timestamp: new Date(),
              }
              
              // إزالة الإدخالات اللاحقة إذا كنا في منتصف التاريخ
              if (state.historyIndex < state.history.length - 1) {
                state.history.splice(state.historyIndex + 1)
              }
              
              state.history.push(entry)
              state.historyIndex = state.history.length - 1
              
              // الحفاظ على الحد الأقصى لحجم التاريخ
              if (state.history.length > state.maxHistorySize) {
                state.history.shift()
                state.historyIndex--
              }
            })
          },
          
          clearHistory: () => {
            set((state) => {
              state.history = []
              state.historyIndex = -1
            })
          },
          
          setMaxHistorySize: (size) => {
            set((state) => {
              state.maxHistorySize = Math.max(10, size)
              
              // تقليم التاريخ إذا تجاوز الحد الجديد
              if (state.history.length > state.maxHistorySize) {
                const excess = state.history.length - state.maxHistorySize
                state.history.splice(0, excess)
                state.historyIndex = Math.max(-1, state.historyIndex - excess)
              }
            })
          },
          
          // الحفظ والنشر
          saveChanges: async () => {
            set((state) => {
              state.isSaving = true
              state.error = null
            })
            
            try {
              // تنفيذ منطق الحفظ
              await new Promise(resolve => setTimeout(resolve, 1000)) // محاكاة
              
              set((state) => {
                state.isDirty = false
                state.lastSaved = new Date()
                state.isSaving = false
              })
            } catch (error) {
              set((state) => {
                state.error = 'فشل في حفظ التغييرات'
                state.isSaving = false
              })
              throw error
            }
          },
          
          publishPage: async (settings) => {
            set((state) => {
              state.isPublishing = true
              state.error = null
            })
            
            try {
              // تنفيذ منطق النشر
              await new Promise(resolve => setTimeout(resolve, 2000)) // محاكاة
              
              set((state) => {
                state.isPublishing = false
              })
            } catch (error) {
              set((state) => {
                state.error = 'فشل في نشر الصفحة'
                state.isPublishing = false
              })
              throw error
            }
          },
          
          exportPage: async (settings) => {
            try {
              // تنفيذ منطق التصدير
              const currentPage = get().currentPage
              if (!currentPage) throw new Error('لا توجد صفحة للتصدير')
              
              return JSON.stringify(currentPage, null, 2)
            } catch (error) {
              set((state) => {
                state.error = 'فشل في تصدير الصفحة'
              })
              throw error
            }
          },
          
          // إدارة الأصول
          addAsset: (assetData) => {
            const id = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            const asset: Asset = {
              ...assetData,
              id,
              createdAt: new Date(),
            }
            
            set((state) => {
              state.assets.push(asset)
            })
            
            return id
          },
          
          updateAsset: (id, updates) => {
            set((state) => {
              const asset = state.assets.find(a => a.id === id)
              if (asset) {
                Object.assign(asset, updates)
              }
            })
          },
          
          deleteAsset: (id) => {
            set((state) => {
              state.assets = state.assets.filter(a => a.id !== id)
            })
          },
          
          // إدارة المكونات
          addComponent: (componentData) => {
            const id = `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            const component: ComponentLibraryItem = {
              ...componentData,
              id,
            }
            
            set((state) => {
              state.components.push(component)
            })
            
            return id
          },
          
          updateComponent: (id, updates) => {
            set((state) => {
              const component = state.components.find(c => c.id === id)
              if (component) {
                Object.assign(component, updates)
              }
            })
          },
          
          deleteComponent: (id) => {
            set((state) => {
              state.components = state.components.filter(c => c.id !== id)
            })
          },
          
          // إدارة القوالب
          addTemplate: (templateData) => {
            const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            const now = new Date()
            
            const template: PageTemplate = {
              ...templateData,
              id,
              createdAt: now,
              updatedAt: now,
            }
            
            set((state) => {
              state.templates.push(template)
            })
            
            return id
          },
          
          updateTemplate: (id, updates) => {
            set((state) => {
              const template = state.templates.find(t => t.id === id)
              if (template) {
                Object.assign(template, {
                  ...updates,
                  updatedAt: new Date(),
                })
              }
            })
          },
          
          deleteTemplate: (id) => {
            set((state) => {
              state.templates = state.templates.filter(t => t.id !== id)
            })
          },
          
          applyTemplate: (templateId) => {
            set((state) => {
              const template = state.templates.find(t => t.id === templateId)
              if (template) {
                state.currentPage = { ...template.config }
                state.selectedElementIds = []
                state.isDirty = true
              }
            })
          },
          
          // إدارة الحالة
          setLoading: (loading) => {
            set((state) => {
              state.isLoading = loading
            })
          },
          
          setSaving: (saving) => {
            set((state) => {
              state.isSaving = saving
            })
          },
          
          setPublishing: (publishing) => {
            set((state) => {
              state.isPublishing = publishing
            })
          },
          
          setError: (error) => {
            set((state) => {
              state.error = error
            })
          },
          
          clearError: () => {
            set((state) => {
              state.error = null
            })
          },
          
          // إعدادات المحرر
          updateSettings: (updates) => {
            set((state) => {
              Object.assign(state.settings, updates)
            })
          },
          
          resetSettings: () => {
            set((state) => {
              state.settings = { ...initialState.settings }
            })
          },
        }))
      ),
      {
        name: 'enhanced-store-editor',
        partialize: (state) => ({
          currentPage: state.currentPage,
          pages: state.pages,
          settings: state.settings,
          activePanels: Array.from(state.activePanels), // تحويل Set إلى Array للتخزين
        }),
        onRehydrateStorage: () => (state) => {
          if (state?.activePanels) {
            // إعادة تحويل Array إلى Set
            state.activePanels = new Set(state.activePanels as any)
          }
        },
      }
    ),
    { name: 'enhanced-store-editor' }
  )
)

// خطافات مساعدة
export const useCurrentPage = () => useEnhancedStoreEditor(state => state.currentPage)
export const useSelectedElements = () => useEnhancedStoreEditor(state => state.selectedElementIds)
export const useViewport = () => useEnhancedStoreEditor(state => state.viewport)
export const useEditorMode = () => useEnhancedStoreEditor(state => state.mode)
export const useActivePanels = () => useEnhancedStoreEditor(state => state.activePanels)
export const useEditorSettings = () => useEnhancedStoreEditor(state => state.settings)
export const useCanUndo = () => useEnhancedStoreEditor(state => state.historyIndex >= 0)
export const useCanRedo = () => useEnhancedStoreEditor(state => state.historyIndex < state.history.length - 1)
export const useIsDirty = () => useEnhancedStoreEditor(state => state.isDirty)
export const useIsLoading = () => useEnhancedStoreEditor(state => state.isLoading)
export const useIsSaving = () => useEnhancedStoreEditor(state => state.isSaving) 