import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Layers, FileText, LayoutGrid, MessageSquare, Image, Heart } from 'lucide-react';
import { LandingPageComponent } from '../types';

interface ComponentDragPreviewProps {
  component: LandingPageComponent;
}

const ComponentDragPreview: React.FC<ComponentDragPreviewProps> = ({ component }) => {
  const { t } = useTranslation();
  
  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'hero':
        return <Layers className="h-4 w-4" />;
      case 'form':
        return <FileText className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'features':
        return <LayoutGrid className="h-4 w-4" />;
      case 'testimonial':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
    }
  };
  
  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      className="preview-while-dragging shadow-xl rounded-lg overflow-hidden border-2 border-primary w-full max-w-[500px]"
    >
      <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-2 flex items-center justify-between border-b">
        <div className="flex items-center gap-1.5">
          {getComponentIcon(component.type)}
          <span className="text-sm font-medium">{t(component.type)}</span>
        </div>
        <div className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-sm">
          {t('جاري النقل...')}
        </div>
      </div>
      
      <div className="bg-background p-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-primary/20 rounded-full flex items-center justify-center">
            <Heart className="h-2 w-2 text-primary" />
          </div>
          <div className="text-xs">{t('سيتم إضافته إلى الموقع بعد الإفلات')}</div>
        </div>
      </div>
    </motion.div>
  );
};

export default ComponentDragPreview; 