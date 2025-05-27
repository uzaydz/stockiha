import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { 
  DragStartEvent, 
  DragEndEvent, 
  DragCancelEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { restrictToWindowEdges, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { LandingPage, LandingPageComponent } from '../types';

export const useDragDrop = (
  page: LandingPage,
  onPageUpdate: (page: LandingPage) => void
) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [draggedComponent, setDraggedComponent] = useState<LandingPageComponent | null>(null);
  
  // إعداد أجهزة الاستشعار بخيارات محسنة للسحب والإفلات
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // مسافة أقل لتسهيل بدء السحب
        tolerance: 5, 
        delay: 50
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // معالجة بدء السحب
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedItem = page.components.find(component => component.id === active.id);
    
    if (draggedItem) {
      setDraggedComponent(draggedItem);
      document.body.style.cursor = 'grabbing';
      document.body.classList.add('dragging');
    }
  };
  
  // معالجة إلغاء السحب
  const handleDragCancel = (event: DragCancelEvent) => {
    setDraggedComponent(null);
    document.body.style.cursor = 'default';
    document.body.classList.remove('dragging');
    
    toast({
      title: t('تم إلغاء السحب'),
      description: t('تم إلغاء عملية السحب'),
      duration: 1000,
    });
  };
  
  // معالجة انتهاء السحب
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedComponent(null);
    document.body.style.cursor = 'default';
    document.body.classList.remove('dragging');
    
    if (over && active.id !== over.id) {
      const oldIndex = page.components.findIndex(component => component.id === active.id);
      const newIndex = page.components.findIndex(component => component.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newComponents = arrayMove(page.components, oldIndex, newIndex);
        onPageUpdate({
          ...page,
          components: newComponents
        });
        
        toast({
          title: t('تم نقل المكون'),
          description: t('تم تغيير موضع المكون بنجاح'),
          duration: 1500,
        });
      }
    }
  };
  
  // تعيين تأثيرات السحب المخصصة
  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };
  
  // خيارات تقييد السحب للبقاء داخل الشاشة وفي المحور الرأسي فقط
  const modifiers = [restrictToVerticalAxis, restrictToWindowEdges];
  
  return {
    sensors,
    draggedComponent,
    dropAnimation,
    modifiers,
    handleDragStart,
    handleDragCancel,
    handleDragEnd,
  };
};
