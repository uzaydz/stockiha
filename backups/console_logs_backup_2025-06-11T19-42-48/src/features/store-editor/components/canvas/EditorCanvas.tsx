import React, { useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useEditorStore } from '../../stores/editor-store'
import { ElementConfig } from '../../types/editor.types'
import { StoreElementRenderer } from '../elements/StoreElementRenderer'

interface EditorCanvasProps {
  className?: string
}

const ElementRenderer: React.FC<{ element: ElementConfig }> = ({ element }) => {
  const { selectedElementId, selectElement } = useEditorStore()
  const isSelected = selectedElementId === element.id

  const handleSelect = () => {
    selectElement(element.id)
  }

  const handleEdit = () => {
    selectElement(element.id)
  }

  return (
    <div className="mb-4">
      <StoreElementRenderer
        element={element}
        isSelected={isSelected}
        onEdit={handleEdit}
        onSelect={handleSelect}
      />
    </div>
  )
}

export const EditorCanvas = ({ className }: EditorCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null)

  const {
    currentPage,
    selectedElementId,
    selectElement,
    clearSelection,
  } = useEditorStore()

  // معالج النقر على الخلفية
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      clearSelection()
    }
  }, [clearSelection])

  // تصفية العناصر وترتيبها
  const sortedElements = currentPage?.elements
    ? [...currentPage.elements].sort((a, b) => a.order - b.order)
    : []

  if (!currentPage) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <h3 className="text-lg font-semibold mb-2">لا توجد صفحة محددة</h3>
          <p>قم بإنشاء صفحة جديدة أو اختر صفحة موجودة</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex-1 bg-gray-50 dark:bg-gray-900 overflow-auto relative",
      "flex items-start justify-center",
      className
    )}>
      {/* منطقة التمرير */}
      <div className="w-full min-h-full flex items-start justify-center p-8">
        <div
          ref={canvasRef}
          className={cn(
            "bg-white dark:bg-gray-800 shadow-2xl relative w-full max-w-4xl",
            "border border-gray-200 dark:border-gray-700 min-h-[600px]"
          )}
          onClick={handleCanvasClick}
        >
          {/* العناصر الرئيسية */}
          {sortedElements.map((element) => (
            <ElementRenderer key={element.id} element={element} />
          ))}

          {/* رسالة فارغة */}
          {sortedElements.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400 dark:text-gray-500 p-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">ابدأ في إنشاء متجرك</h3>
                <p className="text-sm">
                  استخدم الأدوات الجانبية لإضافة العناصر والمكونات إلى صفحتك
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 