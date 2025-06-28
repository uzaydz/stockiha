import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyCanvasPlaceholderProps {
  onAddClick: () => void;
}

/**
 * مكون عرض عندما تكون الصفحة فارغة بدون أي مكونات
 */
const EmptyCanvasPlaceholder: React.FC<EmptyCanvasPlaceholderProps> = ({ onAddClick }) => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-muted/40 border-2 border-dashed border-muted-foreground/20 rounded-lg p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
      <h3 className="text-xl font-medium text-muted-foreground mb-4">
        {t('الصفحة فارغة')}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {t('قم بإضافة مكونات من القائمة الجانبية لبناء صفحة الهبوط الخاصة بك.')}
      </p>
      <Button onClick={onAddClick} variant="outline" className="gap-2">
        <Plus className="h-4 w-4" />
        {t('إضافة مكون')}
      </Button>
    </div>
  );
};

export default EmptyCanvasPlaceholder;
