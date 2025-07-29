import React, { useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

import { useEnhancedStoreEditor } from '../store'
import { ElementRenderer } from './elements/ElementLibrary'

export const EditorCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null)
  
  const {
    currentPage,
    selectedElementIds,
    viewport,
    zoom,
    showGrid,
    showRulers,
    showElementBounds,
    hoverElement,
    selectElement,
    clearSelection,
  } = useEnhancedStoreEditor()

  // معالجة النقر على الخلفية
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      clearSelection()
    }
  }, [clearSelection])

  // حساب أبعاد منطقة العمل
  const getCanvasSize = () => {
    switch (viewport) {
      case 'mobile':
        return { width: 375, height: 667 }
      case 'tablet':
        return { width: 768, height: 1024 }
      default:
        return { width: 1200, height: 800 }
    }
  }

  const canvasSize = getCanvasSize()
  const scale = zoom / 100

  return (
    <div className="w-full h-full overflow-y-auto overflow-x-hidden bg-muted/30 relative">
      {/* المساطر */}
      {showRulers && (
        <>
          {/* مسطرة أفقية */}
          <div className="sticky top-0 left-8 right-0 h-8 bg-background border-b border-border z-20">
            <div className="flex items-center h-full px-2 text-xs text-muted-foreground">
              مسطرة أفقية
            </div>
          </div>
          
          {/* مسطرة عمودية */}
          <div className="fixed top-8 left-0 bottom-0 w-8 bg-background border-r border-border z-20">
            <div className="flex items-center justify-center h-8 text-xs text-muted-foreground transform -rotate-90">
              مسطرة
            </div>
          </div>
        </>
      )}

      {/* منطقة العمل الرئيسية */}
      <div 
        className={cn(
          "w-full p-8 pb-32",
          showRulers && "pt-16 pl-16"
        )}
        onClick={handleCanvasClick}
      >
        {/* إطار الجهاز */}
        <div className="flex justify-center w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="relative"
            style={{ 
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              marginBottom: '50px'
            }}
          >
            {/* حاوية الصفحة */}
            <div
              ref={canvasRef}
              className={cn(
                "bg-white rounded-lg shadow-2xl relative overflow-visible",
                viewport === 'mobile' && "rounded-3xl",
                viewport === 'tablet' && "rounded-xl"
              )}
              style={{
                width: canvasSize.width,
                minHeight: canvasSize.height,
              }}
            >
              {/* الشبكة */}
              {showGrid && (
                <div 
                  className="absolute inset-0 opacity-20 pointer-events-none z-0"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, #000 1px, transparent 1px),
                      linear-gradient(to bottom, #000 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                  }}
                />
              )}

              {/* العناصر */}
              <div className="relative z-10 w-full">
                {currentPage?.elements
                  ? [...currentPage.elements]
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((element) => (
                        <div
                          key={element.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            selectElement(element.id)
                          }}
                          onMouseEnter={() => hoverElement(element.id)}
                          onMouseLeave={() => hoverElement(null)}
                          className="w-full"
                        >
                          <ElementRenderer
                            element={element}
                            isSelected={selectedElementIds.includes(element.id)}
                          />
                        </div>
                      ))
                  : null}
              </div>

              {/* رسالة عدم وجود عناصر */}
              {(!currentPage?.elements || currentPage.elements.length === 0) && (
                <div className="flex items-center justify-center" style={{ minHeight: canvasSize.height }}>
                  <div className="text-center space-y-4 max-w-md mx-auto p-8">
                    <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      >
                        🎨
                      </motion.div>
                    </div>
                    <h3 className="text-xl font-semibold text-muted-foreground">
                      ابدأ في التصميم
                    </h3>
                    <p className="text-muted-foreground">
                      اختر عنصر من الشريط الجانبي لبدء تصميم متجرك
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center text-sm">
                      <span className="bg-muted px-2 py-1 rounded">🌟 بانر رئيسي</span>
                      <span className="bg-muted px-2 py-1 rounded">⭐ منتجات مميزة</span>
                      <span className="bg-muted px-2 py-1 rounded">💬 آراء العملاء</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* معلومات الجهاز */}
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 bg-background border rounded-full px-3 py-1 text-xs text-muted-foreground">
                <span>{canvasSize.width} × {canvasSize.height}</span>
                <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
                <span>{viewport}</span>
                <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
                <span>{zoom}%</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
