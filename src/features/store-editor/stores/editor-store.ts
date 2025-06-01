import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { debounce } from 'lodash-es'
import type { 
  EditorState, 
  ElementConfig, 
  PageConfig, 
  ViewportSize, 
  EditorHistory,
  ElementStyles 
} from '../types/editor.types'

interface EditorActions {
  // Element selection
  selectElement: (id: string | null) => void
  selectMultipleElements: (ids: string[]) => void
  hoverElement: (id: string | null) => void
  focusElement: (id: string | null) => void
  clearSelection: () => void
  
  // Element manipulation
  createElement: (element: Omit<ElementConfig, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateElement: (id: string, updates: Partial<ElementConfig>) => void
  updateElementStyles: (id: string, viewport: ViewportSize, styles: Partial<ElementStyles>) => void
  duplicateElement: (id: string) => string
  deleteElement: (id: string) => void
  moveElement: (id: string, newParentId: string | null, newOrder: number) => void
  
  // Page management
  setCurrentPage: (page: PageConfig) => void
  createPage: (page: Omit<PageConfig, 'id' | 'createdAt' | 'updatedAt'>) => void
  updatePage: (updates: Partial<PageConfig>) => void
  deletePage: (id: string) => void
  
  // UI state
  setEditMode: (mode: boolean) => void
  setPreviewMode: (mode: boolean) => void
  setViewport: (viewport: ViewportSize) => void
  setZoom: (zoom: number) => void
  toggleGrid: () => void
  toggleRulers: () => void
  toggleElementBounds: () => void
  
  // Panel state
  toggleLayersPanel: () => void
  togglePropertiesPanel: () => void
  toggleTemplatesPanel: () => void
  toggleAssetsPanel: () => void
  
  // History management
  undo: () => void
  redo: () => void
  addToHistory: (action: Omit<EditorHistory, 'id' | 'timestamp'>) => void
  clearHistory: () => void
  
  // Save operations
  saveChanges: () => Promise<void>
  publishPage: () => Promise<void>
  
  // Error handling
  setError: (error: string | null) => void
  clearError: () => void
  
  // Loading states
  setLoading: (loading: boolean) => void
  setSaving: (saving: boolean) => void
  setPublishing: (publishing: boolean) => void
}

type EditorStore = EditorState & EditorActions

const initialState: EditorState = {
  // Canvas state
  selectedElementId: null,
  hoveredElementId: null,
  focusedElementId: null,
  multiSelectedIds: [],
  
  // Page state
  currentPage: {
    id: 'default-page',
    name: 'الصفحة الرئيسية',
    slug: 'home',
    elements: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  pages: [],
  isDirty: false,
  lastSaved: null,
  
  // UI state
  isEditMode: true,
  isPreviewMode: false,
  viewport: 'desktop',
  zoom: 100,
  showGrid: false,
  showRulers: false,
  showElementBounds: false,
  
  // Panels state
  isLayersPanelOpen: true,
  isPropertiesPanelOpen: true,
  isTemplatesPanelOpen: false,
  isAssetsPanelOpen: false,
  
  // History state
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
  
  // Loading states
  isLoading: false,
  isSaving: false,
  isPublishing: false,
  
  // Error state
  error: null,
}

// Debounced auto-save function
const debouncedAutoSave = debounce(async (pageId: string, elements: ElementConfig[]) => {
  try {
    // Here you would call your Supabase save function
    console.log('Auto-saving page:', pageId, elements)
    // await savePageToDatabase(pageId, elements)
  } catch (error) {
    console.error('Auto-save failed:', error)
  }
}, 2000)

export const useEditorStore = create<EditorStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // Element selection
        selectElement: (id) => {
          set((state) => {
            state.selectedElementId = id
            state.multiSelectedIds = id ? [id] : []
            state.focusedElementId = id
          })
        },
        
        selectMultipleElements: (ids) => {
          set((state) => {
            state.multiSelectedIds = ids
            state.selectedElementId = ids[0] || null
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
        
        clearSelection: () => {
          set((state) => {
            state.selectedElementId = null
            state.multiSelectedIds = []
            state.focusedElementId = null
          })
        },
        
        // Element manipulation
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
            state.isDirty = true
            
            // Add to history
            const historyEntry: EditorHistory = {
              id: `history_${Date.now()}`,
              action: 'create',
              elementId: id,
              newState: element,
              timestamp: now,
            }
            
            state.history = state.history.slice(0, state.historyIndex + 1)
            state.history.push(historyEntry)
            state.historyIndex = state.history.length - 1
            state.canUndo = true
            state.canRedo = false
          })
          
          // Auto-save
          const currentPage = get().currentPage
          if (currentPage) {
            debouncedAutoSave(currentPage.id, currentPage.elements)
          }
          
          return id
        },
        
        updateElement: (id, updates) => {
          set((state) => {
            if (!state.currentPage) return
            
            const elementIndex = state.currentPage.elements.findIndex(el => el.id === id)
            if (elementIndex === -1) return
            
            const oldElement = { ...state.currentPage.elements[elementIndex] }
            
            state.currentPage.elements[elementIndex] = {
              ...state.currentPage.elements[elementIndex],
              ...updates,
              updatedAt: new Date(),
            }
            
            state.isDirty = true
            
            // Add to history
            const historyEntry: EditorHistory = {
              id: `history_${Date.now()}`,
              action: 'update',
              elementId: id,
              previousState: oldElement,
              newState: state.currentPage.elements[elementIndex],
              timestamp: new Date(),
            }
            
            state.history = state.history.slice(0, state.historyIndex + 1)
            state.history.push(historyEntry)
            state.historyIndex = state.history.length - 1
            state.canUndo = true
            state.canRedo = false
          })
          
          // Auto-save
          const currentPage = get().currentPage
          if (currentPage) {
            debouncedAutoSave(currentPage.id, currentPage.elements)
          }
        },
        
        updateElementStyles: (id, viewport, styles) => {
          set((state) => {
            if (!state.currentPage) return
            
            const elementIndex = state.currentPage.elements.findIndex(el => el.id === id)
            if (elementIndex === -1) return
            
            const element = state.currentPage.elements[elementIndex]
            const oldStyles = { ...element.styles }
            
            element.styles = {
              ...element.styles,
              [viewport]: {
                ...element.styles[viewport],
                ...styles,
              }
            }
            
            element.updatedAt = new Date()
            state.isDirty = true
            
            // Add to history
            const historyEntry: EditorHistory = {
              id: `history_${Date.now()}`,
              action: 'update',
              elementId: id,
              previousState: { styles: oldStyles },
              newState: { styles: element.styles },
              timestamp: new Date(),
            }
            
            state.history = state.history.slice(0, state.historyIndex + 1)
            state.history.push(historyEntry)
            state.historyIndex = state.history.length - 1
            state.canUndo = true
            state.canRedo = false
          })
          
          // Auto-save
          const currentPage = get().currentPage
          if (currentPage) {
            debouncedAutoSave(currentPage.id, currentPage.elements)
          }
        },
        
        duplicateElement: (id) => {
          const element = get().currentPage?.elements.find(el => el.id === id)
          if (!element) return ''
          
          const newId = get().createElement({
            ...element,
            name: `${element.name} (Copy)`,
            order: element.order + 1,
          })
          
          return newId
        },
        
        deleteElement: (id) => {
          set((state) => {
            if (!state.currentPage) return
            
            const elementIndex = state.currentPage.elements.findIndex(el => el.id === id)
            if (elementIndex === -1) return
            
            const deletedElement = state.currentPage.elements[elementIndex]
            state.currentPage.elements.splice(elementIndex, 1)
            state.isDirty = true
            
            // Clear selection if deleted element was selected
            if (state.selectedElementId === id) {
              state.selectedElementId = null
              state.multiSelectedIds = []
            }
            
            // Add to history
            const historyEntry: EditorHistory = {
              id: `history_${Date.now()}`,
              action: 'delete',
              elementId: id,
              previousState: deletedElement,
              timestamp: new Date(),
            }
            
            state.history = state.history.slice(0, state.historyIndex + 1)
            state.history.push(historyEntry)
            state.historyIndex = state.history.length - 1
            state.canUndo = true
            state.canRedo = false
          })
          
          // Auto-save
          const currentPage = get().currentPage
          if (currentPage) {
            debouncedAutoSave(currentPage.id, currentPage.elements)
          }
        },
        
        moveElement: (id, newParentId, newOrder) => {
          set((state) => {
            if (!state.currentPage) return
            
            const elementIndex = state.currentPage.elements.findIndex(el => el.id === id)
            if (elementIndex === -1) return
            
            const oldElement = { ...state.currentPage.elements[elementIndex] }
            
            state.currentPage.elements[elementIndex].parentId = newParentId
            state.currentPage.elements[elementIndex].order = newOrder
            state.currentPage.elements[elementIndex].updatedAt = new Date()
            state.isDirty = true
            
            // Add to history
            const historyEntry: EditorHistory = {
              id: `history_${Date.now()}`,
              action: 'move',
              elementId: id,
              previousState: oldElement,
              newState: state.currentPage.elements[elementIndex],
              timestamp: new Date(),
            }
            
            state.history = state.history.slice(0, state.historyIndex + 1)
            state.history.push(historyEntry)
            state.historyIndex = state.history.length - 1
            state.canUndo = true
            state.canRedo = false
          })
        },
        
        // Page management
        setCurrentPage: (page) => {
          set((state) => {
            state.currentPage = page
            state.isDirty = false
            state.clearSelection()
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
          })
        },
        
        updatePage: (updates) => {
          set((state) => {
            if (!state.currentPage) return
            
            state.currentPage = {
              ...state.currentPage,
              ...updates,
              updatedAt: new Date(),
            }
            state.isDirty = true
          })
        },
        
        deletePage: (id) => {
          set((state) => {
            state.pages = state.pages.filter(page => page.id !== id)
            if (state.currentPage?.id === id) {
              state.currentPage = state.pages[0] || null
            }
          })
        },
        
        // UI state
        setEditMode: (mode) => {
          set((state) => {
            state.isEditMode = mode
            if (mode) {
              state.isPreviewMode = false
            }
          })
        },
        
        setPreviewMode: (mode) => {
          set((state) => {
            state.isPreviewMode = mode
            if (mode) {
              state.isEditMode = false
              state.clearSelection()
            }
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
        
        // Panel state
        toggleLayersPanel: () => {
          set((state) => {
            state.isLayersPanelOpen = !state.isLayersPanelOpen
          })
        },
        
        togglePropertiesPanel: () => {
          set((state) => {
            state.isPropertiesPanelOpen = !state.isPropertiesPanelOpen
          })
        },
        
        toggleTemplatesPanel: () => {
          console.log('toggleTemplatesPanel called, current state:', get().isTemplatesPanelOpen)
          set((state) => {
            state.isTemplatesPanelOpen = !state.isTemplatesPanelOpen
            console.log('toggleTemplatesPanel new state:', state.isTemplatesPanelOpen)
          })
        },
        
        toggleAssetsPanel: () => {
          set((state) => {
            state.isAssetsPanelOpen = !state.isAssetsPanelOpen
          })
        },
        
        // History management
        undo: () => {
          set((state) => {
            if (!state.canUndo || state.historyIndex < 0) return
            
            const historyEntry = state.history[state.historyIndex]
            // Apply the undo operation based on the action type
            // This would need to be implemented based on your specific needs
            
            state.historyIndex--
            state.canUndo = state.historyIndex >= 0
            state.canRedo = true
          })
        },
        
        redo: () => {
          set((state) => {
            if (!state.canRedo || state.historyIndex >= state.history.length - 1) return
            
            state.historyIndex++
            const historyEntry = state.history[state.historyIndex]
            // Apply the redo operation based on the action type
            
            state.canUndo = true
            state.canRedo = state.historyIndex < state.history.length - 1
          })
        },
        
        addToHistory: (action) => {
          set((state) => {
            const historyEntry: EditorHistory = {
              ...action,
              id: `history_${Date.now()}`,
              timestamp: new Date(),
            }
            
            state.history = state.history.slice(0, state.historyIndex + 1)
            state.history.push(historyEntry)
            state.historyIndex = state.history.length - 1
            state.canUndo = true
            state.canRedo = false
          })
        },
        
        clearHistory: () => {
          set((state) => {
            state.history = []
            state.historyIndex = -1
            state.canUndo = false
            state.canRedo = false
          })
        },
        
        // Save operations
        saveChanges: async () => {
          const state = get()
          if (!state.currentPage || !state.isDirty) return
          
          set((state) => {
            state.isSaving = true
            state.error = null
          })
          
          try {
            // Here you would implement the actual save to Supabase
            // await savePageToDatabase(state.currentPage)
            
            set((state) => {
              state.isDirty = false
              state.lastSaved = new Date()
              state.isSaving = false
            })
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'حدث خطأ أثناء الحفظ'
              state.isSaving = false
            })
          }
        },
        
        publishPage: async () => {
          const state = get()
          if (!state.currentPage) return
          
          set((state) => {
            state.isPublishing = true
            state.error = null
          })
          
          try {
            // Here you would implement the actual publish to Supabase
            // await publishPageToDatabase(state.currentPage)
            
            set((state) => {
              state.isPublishing = false
            })
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'حدث خطأ أثناء النشر'
              state.isPublishing = false
            })
          }
        },
        
        // Error handling
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
        
        // Loading states
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
      })),
      {
        name: 'store-editor-state',
        partialize: (state) => ({
          // Only persist UI preferences, not the actual page data
          viewport: state.viewport,
          zoom: state.zoom,
          showGrid: state.showGrid,
          showRulers: state.showRulers,
          showElementBounds: state.showElementBounds,
          isLayersPanelOpen: state.isLayersPanelOpen,
          isPropertiesPanelOpen: state.isPropertiesPanelOpen,
          // عدم حفظ حالة فتح مكتبة القوالب في localStorage
          // isTemplatesPanelOpen: state.isTemplatesPanelOpen,
          // isAssetsPanelOpen: state.isAssetsPanelOpen,
        }),
      }
    ),
    {
      name: 'store-editor',
    }
  )
) 