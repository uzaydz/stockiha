import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LandingPageComponent } from '../types';
import ComponentPreview from '../ComponentPreview';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  ChevronUp, ChevronDown, Edit, Eye, EyeOff, 
  Trash2, GripVertical, Copy, Settings, Layers 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import our new modal component
import ComponentEditorModal from './ComponentEditorModal';

interface SortableItemProps {
  id: string;
  component: LandingPageComponent;
  isActive: boolean;
  isHovered: boolean;
  index: number;
  totalItems: number;
  onActivate: (id: string) => void;
  onToggleActive: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onHover: (id: string | null) => void;
}

// Cambiar de componente funcional normal a utilizar forwardRef
const SortableItem = React.forwardRef<HTMLDivElement, SortableItemProps>(({
  id,
  component, 
  isActive,
  isHovered,
  index,
  totalItems,
  onActivate,
  onToggleActive,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onHover
}, ref) => {
  const { t } = useTranslation();
  const [showEditModal, setShowEditModal] = useState(false);
  
  // إعداد مكون قابل للسحب
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : 'auto',
    opacity: isDragging ? 0.3 : 1,
  };

  // تعديل الدالة لمنع فتح النافذة المنبثقة لجميع المكونات
  const handleEdit = () => {
    // تنشيط المكون فقط دون فتح أي نافذة منبثقة
    onActivate(id);
    
    // سجل تصحيح الأخطاء
    console.log('تم تنشيط المكون:', component.type, 'بدون فتح نافذة منبثقة');
    
    // لا نقوم بفتح النافذة المنبثقة لأي مكون
    // setShowEditModal(true); -- تم تعطيل هذا السطر
  };

  return (
    <>
      <motion.div 
        ref={(node) => {
          // Combinar las dos refs: la interna de dnd-kit y la externa pasada al componente
          setNodeRef(node);
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        style={style}
        layout="position"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "relative group border rounded-lg shadow-md overflow-hidden",
          isActive ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/40",
          isHovered ? "bg-muted/50" : "bg-background",
          !component.isActive && "opacity-60"
        )}
        onMouseEnter={() => onHover(id)}
        onMouseLeave={() => onHover(null)}
      >
        {/* شريط أدوات مكون محسن بتصميم أفضل */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent h-14 opacity-0 group-hover:opacity-100 transition-opacity z-10 backdrop-blur-[1px]">
          <div className="flex justify-between items-center p-2.5">
            <div className="flex items-center gap-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-white hover:bg-white/20"
                      onClick={handleEdit}
                    >
                      <Edit size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {t('تعديل المكون')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-white hover:bg-white/20"
                      onClick={() => onToggleActive(id)}
                    >
                      {component.isActive ? <Eye size={15} /> : <EyeOff size={15} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {component.isActive ? t('إخفاء المكون') : t('إظهار المكون')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-white hover:bg-white/20"
                      onClick={() => onDuplicate(id)}
                    >
                      <Copy size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {t('نسخ المكون')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="flex items-center gap-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-white hover:bg-white/20"
                      onClick={() => onMoveUp(id)}
                      disabled={index === 0}
                    >
                      <ChevronUp size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {t('تحريك لأعلى')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-white hover:bg-white/20"
                      onClick={() => onMoveDown(id)}
                      disabled={index === totalItems - 1}
                    >
                      <ChevronDown size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {t('تحريك لأسفل')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-white hover:bg-red-500/30"
                      onClick={() => onDelete(id)}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {t('حذف المكون')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Handle for drag & drop */}
              <div 
                className="h-9 w-9 flex items-center justify-center cursor-grab text-white hover:bg-white/20 active:cursor-grabbing rounded-md"
                {...attributes}
                {...listeners}
              >
                <GripVertical size={15} className="text-white/90" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Component preview */}
        <div 
          className={cn(
            "cursor-pointer transition-all",
            isActive && "ring-inset ring-1 ring-primary"
          )}
          onClick={handleEdit}
        >
          <ComponentPreview component={component} />
        </div>
        
        {/* Component type badge at bottom */}
        <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
          <Layers size={12} className="text-primary" />
          {t(component.type)}
        </div>
        
        {/* Active drag indicator */}
        {isDragging && (
          <div className="absolute inset-0 border-2 border-primary border-dashed rounded-lg pointer-events-none bg-primary/5" />
        )}
        
        {/* Hidden component indicator */}
        {!component.isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
            <div className="bg-background/90 rounded-full p-2 shadow-lg">
              <EyeOff size={18} className="text-muted-foreground" />
            </div>
          </div>
        )}
        
        {/* Component number */}
        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center text-xs font-medium border shadow-sm">
          {index + 1}
        </div>
      </motion.div>

      {/* Enhanced Component Editor Modal */}
      <ComponentEditorModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        component={component}
        onUpdateSettings={(settings) => {
          // Using custom event to communicate with the landing page editor
          const event = new CustomEvent('updateComponentSettings', {
            detail: { id, settings }
          });
          document.dispatchEvent(event);
        }}
        onToggleComponentActive={onToggleActive}
        onDuplicateComponent={onDuplicate}
        onDeleteComponent={onDelete}
      />
    </>
  );
});

// Añadir displayName para ayudar con la depuración y las herramientas de desarrollo
SortableItem.displayName = 'SortableItem';

export default SortableItem; 