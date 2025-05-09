import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  width?: number;
}

const SlidePanel: React.FC<SlidePanelProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  width = 340,
}) => {
  // Add responsive width calculation
  const [panelWidth, setPanelWidth] = useState(width);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      // Make panel wider on larger screens, but not too wide
      const screenWidth = window.innerWidth;
      const isLarge = screenWidth >= 1024;
      setIsLargeScreen(isLarge);
      
      const calculatedWidth = screenWidth < 768 
        ? Math.min(360, screenWidth * 0.8)
        : Math.min(width, screenWidth * 0.4);
      setPanelWidth(calculatedWidth);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - تأثير خلفية شفافة عند فتح اللوحة */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black"
            style={{ zIndex: 49 }}
            onClick={onClose} // إغلاق اللوحة عند النقر على الخلفية
          />
          
          {/* Panel - اللوحة المنزلقة */}
          <motion.div
            initial={{ x: -panelWidth - 20, opacity: 0.8 }}
            animate={{ 
              x: isLargeScreen ? 96 : 0,  // Full width on mobile, adjusted on desktop
              opacity: 1 
            }}
            exit={{ x: -panelWidth - 20, opacity: 0.8 }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 300,
              mass: 0.8
            }}
            className="fixed top-0 h-full"
            style={{ width: panelWidth, zIndex: 50 }}
          >
            <Card className="h-full flex flex-col overflow-hidden border-l shadow-xl">
              {/* Header - رأس اللوحة */}
              <motion.div 
                className="py-4 px-5 border-b flex items-center justify-between flex-shrink-0"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                    {icon}
                  </div>
                  <h2 className="font-medium text-lg">{title}</h2>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose}
                  className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <X size={16} />
                </Button>
              </motion.div>
              
              {/* Content - محتوى اللوحة مع تمرير */}
              <ScrollArea className="flex-1 relative">
                <motion.div 
                  className="p-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {children}
                </motion.div>
                
                {/* ظل خفيف في الأعلى عند التمرير */}
                <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
                {/* ظل خفيف في الأسفل */}
                <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
              </ScrollArea>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SlidePanel; 