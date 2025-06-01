import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ElementConfig } from '../../types/editor.types'
import { useEditorStore } from '../../stores/editor-store'

interface TextElementProps {
  element: ElementConfig
  isSelected: boolean
  isHovered: boolean
  onSelect: () => void
}

export const TextElement = ({ element, isSelected, isHovered, onSelect }: TextElementProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(element.properties?.text || 'اضغط للتحرير')
  const inputRef = useRef<HTMLDivElement>(null)
  const { updateElement } = useEditorStore()

  const handleDoubleClick = () => {
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (text !== element.properties?.text) {
      updateElement(element.id, {
        properties: {
          ...element.properties,
          text: text
        }
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      setIsEditing(false)
      handleBlur()
    }
    if (e.key === 'Escape') {
      setIsEditing(false)
      setText(element.properties?.text || 'اضغط للتحرير')
    }
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      // وضع المؤشر في نهاية النص
      const range = document.createRange()
      const selection = window.getSelection()
      range.selectNodeContents(inputRef.current)
      range.collapse(false)
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }, [isEditing])

  // استخدام الستايلات من element.styles بدلاً من properties
  const currentViewport = 'desktop' // يمكن الحصول عليها من الستور
  const elementStyles = element.styles[currentViewport] || {}
  
  const textStyles = {
    fontSize: elementStyles.fontSize || '16px',
    fontWeight: elementStyles.fontWeight || 'normal',
    color: elementStyles.color || '#000000',
    textAlign: elementStyles.textAlign || 'right',
    lineHeight: elementStyles.lineHeight || '1.5',
    fontFamily: elementStyles.fontFamily || 'inherit',
  }

  return (
    <div
      className={cn(
        'relative min-h-[40px] p-2 cursor-pointer transition-all duration-200',
        'hover:outline hover:outline-2 hover:outline-blue-300 hover:outline-offset-2',
        isSelected && 'outline outline-2 outline-blue-500 outline-offset-2',
        isHovered && !isSelected && 'outline outline-1 outline-blue-200 outline-offset-1',
        isEditing && 'outline outline-2 outline-green-500 outline-offset-2'
      )}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      style={textStyles}
    >
      {isEditing ? (
        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          className="outline-none w-full"
          style={textStyles}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onInput={(e) => setText(e.currentTarget.textContent || '')}
        >
          {text}
        </div>
      ) : (
        <div className="whitespace-pre-wrap" style={textStyles}>
          {text}
        </div>
      )}
      
      {/* مؤشر التحرير */}
      {(isSelected || isHovered) && !isEditing && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs opacity-80">
          ✎
        </div>
      )}
      
      {/* نصائح التحرير */}
      {isSelected && !isEditing && (
        <div className="absolute -bottom-8 left-0 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm border">
          اضغط مرتين للتحرير
        </div>
      )}
    </div>
  )
} 