import { FolderRoot, PlusCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CategoriesHeaderProps {
  categoryCount: number;
  onAddCategory: () => void;
  canAdd?: boolean;
  onOpenGuide?: () => void;
}

const CategoriesHeader = ({ categoryCount, onAddCategory, canAdd = true, onOpenGuide }: CategoriesHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 sm:p-3 rounded-full">
          <FolderRoot className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">إدارة الفئات</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {categoryCount} فئة{categoryCount !== 1 ? '' : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        {onOpenGuide && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenGuide}
            className="flex items-center gap-1.5"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">دليل الاستخدام</span>
          </Button>
        )}

        {canAdd && (
          <Button onClick={onAddCategory} className="flex-1 sm:flex-none sm:ms-auto">
            <PlusCircle className="ml-2 h-4 w-4" />
            إضافة فئة جديدة
          </Button>
        )}
      </div>
    </div>
  );
};

export default CategoriesHeader;
