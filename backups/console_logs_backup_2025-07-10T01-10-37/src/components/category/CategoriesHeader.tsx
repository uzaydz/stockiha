import { FolderRoot, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CategoriesHeaderProps {
  categoryCount: number;
  onAddCategory: () => void;
}

const CategoriesHeader = ({ categoryCount, onAddCategory }: CategoriesHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex items-center space-x-4">
        <div className="bg-primary/10 p-3 rounded-full">
          <FolderRoot className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">إدارة الفئات</h1>
          <p className="text-muted-foreground">
            {categoryCount} فئة{categoryCount !== 1 ? '' : ''}
          </p>
        </div>
      </div>
      
      <Button onClick={onAddCategory} className="ms-auto">
        <PlusCircle className="ml-2 h-4 w-4" />
        إضافة فئة جديدة
      </Button>
    </div>
  );
};

export default CategoriesHeader;
