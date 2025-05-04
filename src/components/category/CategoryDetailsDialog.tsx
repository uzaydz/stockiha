import { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Category } from '@/lib/api/categories';
import { getLucideIcon } from '@/lib/utils';
import SubcategoriesList from './SubcategoriesList';

interface CategoryDetailsDialogProps {
  category: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (category: Category) => void;
}

const CategoryDetailsDialog = ({ 
  category, 
  open, 
  onOpenChange,
  onEdit,
}: CategoryDetailsDialogProps) => {
  const [activeTab, setActiveTab] = useState('details');

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // عرض أيقونة الفئة
  const renderCategoryIcon = (iconName: string | null, className: string = "h-12 w-12") => {
    if (!iconName) return null;
    
    const IconComponent = getLucideIcon(iconName);
    if (!IconComponent) return null;
    
    const Icon = IconComponent as React.ElementType;
    return <Icon className={className} />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>تفاصيل الفئة</DialogTitle>
          <DialogDescription>
            عرض تفاصيل الفئة والفئات الفرعية التابعة لها
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 pt-2">
          <div className="h-20 w-20 flex items-center justify-center rounded-md bg-primary/10 text-primary">
            {renderCategoryIcon(category.icon, "h-12 w-12")}
          </div>
          <h2 className="text-xl font-bold">{category.name}</h2>
          <Badge 
            variant={category.is_active ? "default" : "secondary"}
            className={category.is_active 
              ? "bg-green-100 text-green-700 hover:bg-green-100" 
              : "bg-gray-100 text-gray-700 hover:bg-gray-100"}
          >
            {category.is_active ? 'نشط' : 'غير نشط'}
          </Badge>
        </div>

        <Tabs defaultValue="details" className="w-full mt-6" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="details">تفاصيل الفئة</TabsTrigger>
            <TabsTrigger value="subcategories">الفئات الفرعية</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="py-4">
            <div className="w-full space-y-2">
              <div className="grid grid-cols-3 gap-2 py-2 border-b">
                <div className="font-medium">الوصف:</div>
                <div className="col-span-2">{category.description || 'لا يوجد وصف'}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 border-b">
                <div className="font-medium">الرابط الدائم:</div>
                <div className="col-span-2" dir="ltr">{category.slug}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 border-b">
                <div className="font-medium">تاريخ الإنشاء:</div>
                <div className="col-span-2">{formatDate(category.created_at)}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 border-b">
                <div className="font-medium">آخر تحديث:</div>
                <div className="col-span-2">{formatDate(category.updated_at)}</div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="subcategories">
            <SubcategoriesList category={category} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>إغلاق</Button>
          <Button variant="outline" onClick={() => {
            onOpenChange(false);
            onEdit(category);
          }}>
            <Edit className="ml-2 h-4 w-4" />
            تعديل الفئة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryDetailsDialog; 