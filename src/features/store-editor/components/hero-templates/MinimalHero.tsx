import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight, ChevronDown } from 'lucide-react'

interface MinimalHeroProps {
  settings: any
  isSelected?: boolean
  onEdit?: () => void
  onSelect?: () => void
}

export const MinimalHero: React.FC<MinimalHeroProps> = ({
  settings,
  isSelected,
  onEdit,
  onSelect,
}) => {
  return (
    <div 
      className={`relative bg-white dark:bg-gray-900 cursor-pointer transition-all duration-300 ${isSelected ? 'ring-2 ring-primary ring-offset-4' : ''}`}
      onClick={onSelect}
      onDoubleClick={onEdit}
    >
      <div className="container mx-auto px-4 py-24 lg:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* العنوان */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-tight"
          >
            {settings?.title || (
              <>
                بساطة هي
                <span className="block text-gray-500 dark:text-gray-400">
                  قمة الأناقة
                </span>
              </>
            )}
          </motion.h1>

          {/* الوصف */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed"
          >
            {settings?.description || 'نحن نؤمن بأن الجمال يكمن في البساطة. اكتشف منتجاتنا المصممة بعناية لتناسب أسلوب حياتك العصري.'}
          </motion.p>

          {/* الأزرار */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <Button 
              size="lg" 
              className="bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 px-8 py-6 text-lg"
            >
              {settings?.primaryButton?.text || 'اكتشف المجموعة'}
              <ArrowRight className="mr-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="ghost"
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-8 py-6 text-lg"
            >
              {settings?.secondaryButton?.text || 'تعرف علينا'}
            </Button>
          </motion.div>

          {/* صورة بسيطة اختيارية */}
          {settings?.imageUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-16 relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={settings.imageUrl}
                  alt="Minimal Hero"
                  className="w-full max-w-3xl mx-auto h-[400px] object-cover"
                />
                {/* تدرج لوني خفيف */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              </div>
              
              {/* عناصر تزيينية بسيطة */}
              <div className="absolute -z-10 top-10 left-10 w-72 h-72 bg-gray-200 dark:bg-gray-800 rounded-full blur-3xl opacity-20" />
              <div className="absolute -z-10 bottom-10 right-10 w-72 h-72 bg-gray-300 dark:bg-gray-700 rounded-full blur-3xl opacity-20" />
            </motion.div>
          )}

          {/* مؤشر التمرير */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="pt-12"
          >
            <ChevronDown className="h-6 w-6 text-gray-400 mx-auto animate-bounce" />
          </motion.div>
        </div>
      </div>
    </div>
  )
}