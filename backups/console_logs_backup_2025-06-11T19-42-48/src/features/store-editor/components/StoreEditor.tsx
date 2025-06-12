import React, { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useEditorStore } from '../stores/editor-store'
import { MainToolbar } from './toolbar/MainToolbar'
import { EditorCanvas } from './canvas/EditorCanvas'
import { PropertiesPanel } from './panels/PropertiesPanel'
import { LayersPanel } from './panels/LayersPanel'
import { TemplatesPanel } from './panels/TemplatesPanel'
import { AssetsPanel } from './panels/AssetsPanel'
import { ElementsToolbar } from './toolbar/ElementsToolbar'
import { PageConfig } from '../types/editor.types'
import { AnimatePresence, motion } from 'framer-motion'
import { TooltipProvider } from '@/components/ui/tooltip'

interface StoreEditorProps {
  className?: string
  initialPage?: PageConfig
}

export const StoreEditor = ({ className, initialPage }: StoreEditorProps) => {
  const {
    currentPage,
    isLayersPanelOpen,
    isPropertiesPanelOpen,
    isTemplatesPanelOpen,
    isAssetsPanelOpen,
    setCurrentPage,
    createPage,
    toggleTemplatesPanel,
    toggleAssetsPanel,
  } = useEditorStore()

  console.log('StoreEditor rendered, isTemplatesPanelOpen:', isTemplatesPanelOpen)

  // تهيئة الصفحة الافتراضية
  useEffect(() => {
    if (!currentPage) {
      if (initialPage) {
        setCurrentPage(initialPage)
      } else {
        // إنشاء صفحة افتراضية
        createPage({
          name: 'الصفحة الرئيسية',
          slug: 'home',
          elements: [],
        })
      }
    }
  }, [currentPage, initialPage, setCurrentPage, createPage])

  return (
    <TooltipProvider>
      <div className="w-full h-screen bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
        {/* شريط الأدوات الرئيسي */}
        <MainToolbar />

        <div className="flex-1 flex overflow-hidden">
          {/* لوحة الطبقات */}
          <AnimatePresence>
            {isLayersPanelOpen && (
              <motion.div
                initial={{ x: -320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -320, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="h-full"
              >
                <LayersPanel />
              </motion.div>
            )}
          </AnimatePresence>

          {/* شريط أدوات العناصر */}
          <ElementsToolbar />

          {/* منطقة الرسم الرئيسية */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <EditorCanvas />
          </div>

          {/* لوحة الخصائص */}
          <AnimatePresence>
            {isPropertiesPanelOpen && (
              <motion.div
                initial={{ x: 320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 320, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="h-full"
              >
                <PropertiesPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* النوافذ المنبثقة */}
        <TemplatesPanel 
          isOpen={isTemplatesPanelOpen}
          onClose={toggleTemplatesPanel}
        />
        <AssetsPanel 
          isOpen={isAssetsPanelOpen}
          onClose={toggleAssetsPanel}
        />
      </div>
    </TooltipProvider>
  )
} 