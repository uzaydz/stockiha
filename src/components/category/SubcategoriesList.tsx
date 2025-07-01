import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Edit, 
  Trash2, 
  MoreVertical, 
  FolderRoot,
  Plus,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Category, Subcategory } from '@/lib/api/categories';
import { getSubcategories, deleteSubcategory } from '@/lib/api/categories';
import AddSubcategoryDialog from './AddSubcategoryDialog';

interface SubcategoriesListProps {
  category: Category;
}

const SubcategoriesList = ({ category }: SubcategoriesListProps) => {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteConfirmSubcategory, setDeleteConfirmSubcategory] = useState<Subcategory | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // جلب الفئات الفرعية عند تحميل المكون
  useEffect(() => {
    fetchSubcategories();
  }, [category.id]);

  // دالة لجلب الفئات الفرعية
  const fetchSubcategories = async () => {
    setIsLoading(true);
    try {
      const data = await getSubcategories(category.id, category.organization_id);
      setSubcategories(data);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      toast.error('حدث خطأ أثناء تحميل الفئات الفرعية');
    } finally {
      setIsLoading(false);
    }
  };

  // دالة لحذف فئة فرعية
  const handleDelete = (subcategory: Subcategory) => {
    setDeleteConfirmSubcategory(subcategory);
    setIsDeleteOpen(true);
  };

  // تأكيد حذف الفئة الفرعية
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmSubcategory) return;

    setIsDeleting(true);
    try {
      await deleteSubcategory(deleteConfirmSubcategory.id);
      toast.success('تم حذف الفئة الفرعية بنجاح');
      fetchSubcategories();
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف الفئة الفرعية');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // دالة فتح مربع حوار إضافة فئة فرعية
  const handleAddSubcategory = () => {
    setIsAddDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل الفئات الفرعية...</span>
      </div>
    );
  }

  return (
    <>
      <div className="bg-background rounded-lg border shadow-sm overflow-hidden mt-6">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium">الفئات الفرعية لـ: {category.name}</h3>
          <Button onClick={handleAddSubcategory} size="sm">
            <Plus className="ml-2 h-4 w-4" />
            إضافة فئة فرعية
          </Button>
        </div>

        {subcategories.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">لا توجد فئات فرعية</h4>
            <p className="text-muted-foreground mb-4">
              لم يتم إضافة أي فئات فرعية لهذه الفئة حتى الآن. قم بإضافة فئات فرعية لتنظيم منتجاتك بشكل أفضل.
            </p>
            <Button onClick={handleAddSubcategory}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة فئة فرعية الآن
            </Button>
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الفئة الفرعية</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الرابط الدائم</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead className="text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subcategories.map((subcategory) => (
                  <TableRow key={subcategory.id}>
                    <TableCell className="font-medium">{subcategory.name}</TableCell>
                    <TableCell>
                      <div className="truncate max-w-[250px]">
                        {subcategory.description || 'لا يوجد وصف'}
                      </div>
                    </TableCell>
                    <TableCell dir="ltr">{subcategory.slug}</TableCell>
                    <TableCell>{formatDate(subcategory.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end space-x-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">إجراءات</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(subcategory)}
                            >
                              <Trash2 className="ml-2 h-4 w-4" />
                              حذف الفئة الفرعية
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* مربع حوار إضافة فئة فرعية */}
      <AddSubcategoryDialog
        parentCategory={category}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubcategoryAdded={fetchSubcategories}
      />

      {/* مربع حوار تأكيد الحذف */}
      {deleteConfirmSubcategory && (
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من حذف هذه الفئة الفرعية؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف الفئة الفرعية "{deleteConfirmSubcategory.name}" نهائياً من النظام.
                هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحذف...
                  </>
                ) : (
                  "حذف"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export default SubcategoriesList;
