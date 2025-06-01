import React from 'react'
import { Package, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatePresence, motion } from 'framer-motion'

interface TemplatesPanelProps {
  isOpen: boolean
  onClose: () => void
}

export const TemplatesPanel = ({ isOpen, onClose }: TemplatesPanelProps) => {
  console.log('TemplatesPanel rendered with isOpen:', isOpen)
  
  if (!isOpen) return null

  const handleClose = () => {
    console.log('TemplatesPanel: Close button clicked')
    onClose()
  }

  const handleBackdropClick = () => {
    console.log('TemplatesPanel: Backdrop clicked')
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">مكتبة القوالب</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">اختر من مجموعة كبيرة من القوالب المصممة مسبقاً</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex-1 p-6">
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">قريباً...</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">سيتم إضافة مجموعة كبيرة من القوالب الجاهزة قريباً</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 