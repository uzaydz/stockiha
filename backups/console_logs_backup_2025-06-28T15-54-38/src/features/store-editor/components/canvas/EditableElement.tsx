import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { ElementConfig } from '../../types/editor.types'
import { useEditorStore } from '../../stores/editor-store'
import { TextElement } from '../elements/TextElement'
import { ButtonElement } from '../elements/ButtonElement'

interface EditableElementProps {
  element: ElementConfig
}

export const EditableElement = ({ element }: EditableElementProps) => {
  const {
    selectedElementId,
    hoveredElementId,
    selectElement,
    hoverElement,
  } = useEditorStore()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: element.id,
    data: {
      type: element.type,
      element,
    },
  })

  const isSelected = selectedElementId === element.id
  const isHovered = hoveredElementId === element.id

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleSelect = () => {
    selectElement(element.id)
  }

  const handleMouseEnter = () => {
    if (!isDragging) {
      hoverElement(element.id)
    }
  }

  const handleMouseLeave = () => {
    hoverElement(null)
  }

  const renderElement = () => {
    const commonProps = {
      element,
      isSelected,
      isHovered,
      onSelect: handleSelect,
    }

    switch (element.type) {
      case 'text':
        return <TextElement {...commonProps} />
      case 'button':
        return <ButtonElement {...commonProps} />
      case 'hero':
        return (
          <div 
            className={cn(
              'relative p-8 bg-blue-600 text-white text-center rounded-lg',
              'hover:outline hover:outline-2 hover:outline-blue-300 hover:outline-offset-2',
              isSelected && 'outline outline-2 outline-blue-500 outline-offset-2',
              isHovered && !isSelected && 'outline outline-1 outline-blue-200 outline-offset-1'
            )}
            onClick={handleSelect}
          >
            <h1 className="text-4xl font-bold mb-4">
              {element.properties?.text || 'عنوان رئيسي'}
            </h1>
            <p className="text-xl opacity-90">
              نص فرعي للقسم الرئيسي
            </p>
            {(isSelected || isHovered) && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs opacity-80">
                ✎
              </div>
            )}
          </div>
        )
      default:
        return (
          <div 
            className={cn(
              'relative p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center',
              'hover:border-blue-300 dark:hover:border-blue-500',
              isSelected && 'border-blue-500 dark:border-blue-400',
              isHovered && !isSelected && 'border-blue-200 dark:border-blue-600'
            )}
            onClick={handleSelect}
          >
            <p className="text-gray-500 dark:text-gray-400">
              عنصر {element.type} - تحت التطوير
            </p>
            {(isSelected || isHovered) && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-500 text-white rounded-full flex items-center justify-center text-xs opacity-80">
                ?
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'editable-element',
        isDragging && 'opacity-50 scale-95',
        element.isHidden && 'opacity-30'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...attributes}
      {...listeners}
    >
      {renderElement()}
      
      {/* عنصر التحكم في السحب */}
      {isSelected && (
        <div className="absolute -top-3 -left-3 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs cursor-move opacity-80 hover:opacity-100">
          ⋮⋮
        </div>
      )}
    </div>
  )
}
