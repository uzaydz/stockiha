import React, { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  Move, 
  Copy, 
  Trash2, 
  RotateCcw,
  Settings,
  GripVertical
} from 'lucide-react'
import { useEditorStore } from '../../stores/editor-store'

interface SelectionOverlayProps {
  elementId: string
  canvasRef: React.RefObject<HTMLDivElement>
}

export const SelectionOverlay = ({ elementId, canvasRef }: SelectionOverlayProps) => {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [bounds, setBounds] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [isVisible, setIsVisible] = useState(false)

  const {
    currentPage,
    duplicateElement,
    deleteElement,
    togglePropertiesPanel,
  } = useEditorStore()

  // العثور على العنصر المحدد
  const selectedElement = currentPage?.elements.find(el => el.id === elementId)

  // تحديث موقع وحجم الطبقة
  const updateBounds = () => {
    if (!canvasRef.current || !selectedElement) return

    const elementInDom = canvasRef.current.querySelector(`[data-element-id="${elementId}"]`)
    if (!elementInDom) return

    const canvasRect = canvasRef.current.getBoundingClientRect()
    const elementRect = elementInDom.getBoundingClientRect()

    setBounds({
      x: elementRect.left - canvasRect.left,
      y: elementRect.top - canvasRect.top,
      width: elementRect.width,
      height: elementRect.height,
    })

    setIsVisible(true)
  }

  useEffect(() => {
    updateBounds()
    
    const resizeObserver = new ResizeObserver(updateBounds)
    const mutationObserver = new MutationObserver(updateBounds)
    
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current)
      mutationObserver.observe(canvasRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
      })
    }

    // تحديث عند تغيير النافذة
    window.addEventListener('resize', updateBounds)
    window.addEventListener('scroll', updateBounds)

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', updateBounds)
      window.removeEventListener('scroll', updateBounds)
    }
  }, [elementId, canvasRef, selectedElement])

  if (!isVisible || !selectedElement) return null

  const handleDuplicate = () => {
    duplicateElement(elementId)
  }

  const handleDelete = () => {
    deleteElement(elementId)
  }

  const handleOpenProperties = () => {
    togglePropertiesPanel()
  }

  return (
    <div
      ref={overlayRef}
      className="absolute pointer-events-none z-30"
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
      }}
    >
      {/* إطار التحديد */}
      <div
        className={cn(
          "absolute inset-0 z-40",
          "border-2 border-blue-500 dark:border-blue-400",
          "bg-blue-500/10 dark:bg-blue-400/10",
          "pointer-events-none"
        )}
        style={{
          transform: `translate(${bounds.x}px, ${bounds.y}px)`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
        }}
      >
        {/* مقابض التحكم في الحجم */}
        <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white rounded-sm" />
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white rounded-sm" />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white rounded-sm" />
        <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-blue-500 border border-white rounded-sm" />
        <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-blue-500 border border-white rounded-sm" />
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white rounded-sm" />
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white rounded-sm" />
        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white rounded-sm" />
      </div>

      {/* شريط أدوات العنصر */}
      <div className="absolute -top-10 left-0 z-50">
        <div className="bg-blue-600 dark:bg-blue-500 text-white px-2 py-1 rounded-md shadow-lg text-xs font-medium whitespace-nowrap">
          {selectedElement?.name || selectedElement?.type}
          <div className="absolute top-full left-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-600 dark:border-t-blue-500"></div>
        </div>
      </div>

      {/* مؤشر الأبعاد */}
      <div className="absolute -bottom-6 left-0 bg-gray-800 text-white px-2 py-1 rounded text-xs font-mono pointer-events-none">
        {Math.round(bounds.width)} × {Math.round(bounds.height)}
      </div>

      {/* أيقونة السحب والإفلات */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white p-1 rounded shadow-lg pointer-events-auto cursor-move">
        <GripVertical className="h-3 w-3" />
      </div>
    </div>
  )
}
