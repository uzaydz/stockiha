import React, { ReactNode } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useEditorStore } from '../../stores/editor-store'

interface DragDropProviderProps {
  children: ReactNode
}

export const DragDropProvider = ({ children }: DragDropProviderProps) => {
  const { currentPage, moveElement } = useEditorStore()
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    // معالجة بداية السحب
    console.log('Drag start:', event)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) {
      return
    }

    // إعادة ترتيب العناصر باستخدام moveElement
    if (moveElement) {
      const activeIndex = currentPage?.elements.findIndex(el => el.id === active.id) ?? -1
      const overIndex = currentPage?.elements.findIndex(el => el.id === over.id) ?? -1
      
      if (activeIndex !== -1 && overIndex !== -1) {
        moveElement(active.id as string, null, overIndex)
      }
    }
  }

  const elementIds = currentPage?.elements.map(el => el.id) ?? []

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={elementIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      <DragOverlay>
        {/* محتوى الطبقة أثناء السحب */}
        <div className="bg-blue-500 dark:bg-blue-400 text-white px-2 py-1 rounded shadow-lg opacity-80">
          سحب العنصر...
        </div>
      </DragOverlay>
    </DndContext>
  )
} 