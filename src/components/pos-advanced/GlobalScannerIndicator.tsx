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
  // تم إخفاء المؤشر - يمكن إعادة تفعيله لاحقاً إذا لزم الأمر
  return null;
};

export default GlobalScannerIndicator;
