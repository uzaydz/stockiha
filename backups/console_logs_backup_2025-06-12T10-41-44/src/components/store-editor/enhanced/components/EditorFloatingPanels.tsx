import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export const EditorFloatingPanels: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* شريط الأدوات العائم */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-background/80 backdrop-blur-sm border rounded-lg shadow-lg p-2"
        >
          <div className="text-xs text-muted-foreground px-2">
            الأدوات العائمة (قريباً)
          </div>
        </motion.div>
      </div>
    </div>
  )
}
