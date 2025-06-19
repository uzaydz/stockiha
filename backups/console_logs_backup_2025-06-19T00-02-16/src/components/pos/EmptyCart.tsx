import { ShoppingBasket, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface EmptyCartProps {
  onAddProduct?: () => void;
}

export default function EmptyCart({ onAddProduct }: EmptyCartProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-xs mx-auto flex flex-col items-center text-center"
      >
        {/* خلفية الأيقونة - تحسين المظهر البصري */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="relative mb-6"
        >
          {/* الدائرة الخارجية */}
          <div className="w-24 h-24 rounded-full bg-primary/10 dark:bg-primary/5 flex items-center justify-center shadow-sm">
            {/* الأيقونة */}
            <ShoppingCart className="h-10 w-10 text-primary/60 dark:text-primary/50" strokeWidth={1.5} />
          </div>
          
          {/* عداد الصفر */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.2 }}
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-background dark:bg-zinc-800 
                      border-2 border-white dark:border-zinc-700 text-foreground dark:text-zinc-300 
                      text-xs font-bold flex items-center justify-center shadow-sm"
          >
            0
          </motion.div>
        </motion.div>
        
        {/* نص الحالة - تحسين حجم وتباعد النص */}
        <div className="space-y-2 mb-6">
          <motion.h3
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg font-medium text-foreground dark:text-zinc-200"
          >
            السلة فارغة
          </motion.h3>
          
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-muted-foreground dark:text-zinc-400"
          >
            لم تقم بإضافة أي منتجات إلى سلة التسوق الخاصة بك بعد
          </motion.p>
        </div>

        {/* زر العمل - تحسين شكل الزر */}
        {onAddProduct && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full"
          >
            <Button
              onClick={onAddProduct}
              variant="default"
              size="sm"
              className="w-full shadow-md py-5 transition-all bg-primary hover:bg-primary/90 dark:bg-primary/90 dark:hover:bg-primary/80 text-primary-foreground rounded-full"
            >
              استكشاف المنتجات
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
