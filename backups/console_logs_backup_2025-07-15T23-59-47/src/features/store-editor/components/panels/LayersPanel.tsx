import React from 'react'
import { cn } from '@/lib/utils'
import { Layers, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '../../stores/editor-store'

interface LayersPanelProps {
  className?: string
}

export const LayersPanel = ({ className }: LayersPanelProps) => {
  const { toggleLayersPanel } = useEditorStore()

  return (
    <div className={cn(
      "w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/60 dark:border-gray-700/60 shadow-lg",
      "flex flex-col h-full",
      className
    )}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200/60 dark:border-gray-700/60">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">الطبقات</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLayersPanel}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 p-4">
        <p className="text-sm text-gray-500">قريباً...</p>
      </div>
    </div>
  )
}
