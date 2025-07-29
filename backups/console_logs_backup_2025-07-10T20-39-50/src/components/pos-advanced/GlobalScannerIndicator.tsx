import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Scan, Wifi, WifiOff, Database, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAllProductsForScanner } from '@/hooks/useAllProductsForScanner';

interface GlobalScannerIndicatorProps {
  isEnabled: boolean;
  isProcessing: boolean;
  currentBuffer?: string;
  className?: string;
}

const GlobalScannerIndicator: React.FC<GlobalScannerIndicatorProps> = ({
  isEnabled,
  isProcessing,
  currentBuffer = '',
  className
}) => {
  const { isReady, stats, totalCount } = useAllProductsForScanner();
  return (
    <div className={cn("fixed top-4 left-4 z-50", className)}>
      <AnimatePresence>
        {isEnabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <Badge 
              variant={isProcessing ? "default" : "secondary"}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all duration-300",
                "shadow-lg backdrop-blur-sm border-2",
                isProcessing 
                  ? "bg-primary/90 text-primary-foreground border-primary/50 shadow-primary/20" 
                  : "bg-green-500/90 text-white border-green-400/50 shadow-green-500/20",
                currentBuffer && !isProcessing && "bg-blue-500/90 border-blue-400/50 shadow-blue-500/20"
              )}
            >
              {isProcessing ? (
                <>
                  <Scan className="h-4 w-4 animate-pulse" />
                  جاري المعالجة...
                </>
              ) : currentBuffer ? (
                <>
                  <Scan className="h-4 w-4 animate-bounce" />
                  {currentBuffer}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <Wifi className="h-4 w-4" />
                    <span>السكانر نشط</span>
                  </div>
                  {isReady && (
                    <div className="flex items-center gap-1 text-xs opacity-80">
                      <Database className="h-3 w-3" />
                      <span>{stats.productsWithBarcode.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
            </Badge>
          </motion.div>
        )}
        
        {!isEnabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Badge 
              variant="destructive"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium shadow-lg backdrop-blur-sm"
            >
              <WifiOff className="h-4 w-4" />
              السكانر متوقف
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* مساعدة للمستخدم */}
              {isEnabled && !isProcessing && !currentBuffer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          className="absolute top-full mt-2 left-0 min-w-max"
        >
          <div className="bg-black/80 text-white text-xs px-2 py-1 rounded shadow-lg space-y-1">
            <div className="flex items-center gap-1">
              📷 امسح أي باركود في أي مكان بالصفحة
            </div>
            {isReady && (
              <div className="flex items-center gap-2 text-green-300">
                <Database className="h-3 w-3" />
                <span>{totalCount.toLocaleString()} منتج محمل محلياً</span>
                <Zap className="h-3 w-3" />
                <span>بحث فوري</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default GlobalScannerIndicator; 