import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const AppStatusNotification: React.FC<NotificationProps> = ({
  type,
  title,
  message,
  duration = 5000,
  onClose,
  action
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info
  };

  const colors = {
    success: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
    error: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    warning: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
    info: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
  };

  const iconColors = {
    success: 'text-emerald-600 dark:text-emerald-400',
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400'
  };

  const Icon = icons[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30 
          }}
          className={cn(
            "fixed top-4 right-4 z-50 max-w-sm w-full border-2 rounded-xl shadow-xl backdrop-blur-sm",
            colors[type]
          )}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex-shrink-0 w-6 h-6 mt-0.5",
                iconColors[type]
              )}>
                <Icon className="w-full h-full" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold mb-1">
                  {title}
                </h4>
                <p className="text-sm opacity-90 leading-relaxed">
                  {message}
                </p>
                
                {action && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={action.onClick}
                      className="text-xs h-7 px-3"
                    >
                      {action.label}
                    </Button>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleClose}
                className="flex-shrink-0 w-5 h-5 opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="w-full h-full" />
              </button>
            </div>
          </div>
          
          {/* شريط التقدم */}
          {duration > 0 && (
            <motion.div
              className="h-1 bg-current opacity-20 rounded-b-xl"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: duration / 1000, ease: "linear" }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppStatusNotification; 