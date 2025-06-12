import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ElementConfig } from '../../types/editor.types'
import { useEditorStore } from '../../stores/editor-store'

interface ButtonElementProps {
  element: ElementConfig
  isSelected: boolean
  isHovered: boolean
  onSelect: () => void
}

export const ButtonElement = ({ element, isSelected, isHovered, onSelect }: ButtonElementProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(element.properties?.text || 'زر')
  const inputRef = useRef<HTMLInputElement>(null)
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
    if (e.key === 'Enter') {
      e.preventDefault()
      setIsEditing(false)
      handleBlur()
    }
    if (e.key === 'Escape') {
      setIsEditing(false)
      setText(element.properties?.text || 'زر')
    }
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // استخدام الستايلات من element.styles
  const currentViewport = 'desktop'
  const elementStyles = element.styles[currentViewport] || {}
  
  const buttonStyles = {
    fontSize: elementStyles.fontSize || '14px',
    fontWeight: elementStyles.fontWeight || '500',
    color: elementStyles.color || '#ffffff',
    backgroundColor: elementStyles.backgroundColor || '#3b82f6',
    borderRadius: elementStyles.borderRadius || '8px',
    padding: elementStyles.padding || '12px 24px',
    border: elementStyles.border || 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: elementStyles.fontFamily || 'inherit',
    minWidth: '80px',
    textAlign: 'center' as const,
  }

  const wrapperStyle = {
    display: 'inline-block',
    ...buttonStyles
  }

  return (
    <div
      className={cn(
        'relative inline-block transition-all duration-200',
        'hover:outline hover:outline-2 hover:outline-blue-300 hover:outline-offset-2',
        isSelected && 'outline outline-2 outline-blue-500 outline-offset-2',
        isHovered && !isSelected && 'outline outline-1 outline-blue-200 outline-offset-1',
        isEditing && 'outline outline-2 outline-green-500 outline-offset-2'
      )}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="outline-none bg-transparent text-center min-w-[80px]"
          style={{
            ...buttonStyles,
            width: 'auto',
            minWidth: `${Math.max(text.length * 8 + 40, 80)}px`
          }}
        />
      ) : (
        <button
          style={buttonStyles}
          className={cn(
            'hover:opacity-90 active:scale-95 transition-all duration-150',
            element.properties?.disabled && 'opacity-50 cursor-not-allowed'
          )}
          disabled={element.properties?.disabled}
          onClick={(e) => {
            e.stopPropagation()
            // هنا يمكن تنفيذ الإجراء المحدد في onClick property
            if (element.properties?.onClick) {
            }
          }}
        >
          {text}
        </button>
      )}
      
      {/* مؤشر التحرير */}
      {(isSelected || isHovered) && !isEditing && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs opacity-80">
          ✎
        </div>
      )}
      
      {/* نصائح التحرير */}
      {isSelected && !isEditing && (
        <div className="absolute -bottom-8 left-0 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm border whitespace-nowrap">
          اضغط مرتين لتحرير النص
        </div>
      )}
    </div>
  )
}
