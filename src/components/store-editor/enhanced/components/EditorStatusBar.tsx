import React from 'react'
import { motion } from 'framer-motion'
import { Zap, Clock, Layers, Mouse } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useEnhancedStoreEditor } from '../store'

export const EditorStatusBar: React.FC = () => {
  const {
    currentPage,
    selectedElementIds,
    viewport,
    zoom,
    mode,
    isDirty,
    lastSaved,
    isLoading,
    isSaving,
    history,
    historyIndex,
  } = useEnhancedStoreEditor()

  const formatTime = (date: Date | null) => {
    if (!date) return 'لم يتم الحفظ'
    return date.toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const getStatusColor = () => {
    if (isSaving) return 'text-blue-600'
    if (isDirty) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getStatusText = () => {
    if (isSaving) return 'جاري الحفظ...'
    if (isDirty) return 'تغييرات غير محفوظة'
    return 'محفوظ'
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-8 bg-muted/50 border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground"
    >
      {/* القسم الأيسر - معلومات الصفحة */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Layers className="w-3 h-3" />
          <span>{currentPage?.elements.length || 0} عنصر</span>
        </div>
        
        {selectedElementIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Mouse className="w-3 h-3" />
            <span>{selectedElementIds.length} محدد</span>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs h-5">
            {viewport}
          </Badge>
          <span>{zoom}%</span>
        </div>
      </div>

      {/* القسم الأوسط - حالة التشغيل */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isLoading ? 'bg-blue-500 animate-pulse' :
            isSaving ? 'bg-blue-500 animate-pulse' :
            isDirty ? 'bg-yellow-500' : 'bg-green-500'
          }`} />
          <span className={getStatusColor()}>
            {getStatusText()}
          </span>
        </div>

        {!isLoading && !isSaving && (
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>آخر حفظ: {formatTime(lastSaved)}</span>
          </div>
        )}
      </div>

      {/* القسم الأيمن - إحصائيات المحرر */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3" />
          <span>التاريخ: {historyIndex + 1}/{history.length}</span>
        </div>
        
        <Badge variant="secondary" className="text-xs h-5">
          {mode}
        </Badge>
        
        <span className="text-xs opacity-60">
          محرر المتجر المتطور v2.0
        </span>
      </div>
    </motion.div>
  )
} 