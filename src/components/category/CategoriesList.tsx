import { useState } from 'react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Eye, 
  Edit, 
  Trash2, 
  MoreVertical, 
  FolderRoot,
  FolderCog,
  FolderPlus,
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
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
import { Loader2 } from 'lucide-react';
import type { Category } from '@/lib/api/categories';
import { deleteCategory, updateCategory, getSubcategories } from '@/lib/api/categories';
import EditCategoryDialog from './EditCategoryDialog';
import { getLucideIcon } from '@/lib/utils';
import CategoryDetailsDialog from './CategoryDetailsDialog';

interface CategoriesListProps {
  categories: Category[];
  onRefreshCategories: () => Promise<void>;
}

const CategoriesList = ({ categories, onRefreshCategories }: CategoriesListProps) => {
  const [viewCategory, setViewCategory] = useState<Category | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<Category | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [hasSubcategories, setHasSubcategories] = useState(false);

  const handleView = (category: Category) => {
    setViewCategory(category);
    setIsViewOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditCategory(category);
    setIsEditOpen(true);
  };

  const handleDelete = async (category: Category) => {
    try {
      const subcategories = await getSubcategories(category.id);
      setHasSubcategories(subcategories.length > 0);
      setDeleteConfirmCategory(category);
      setIsDeleteOpen(true);
    } catch (error) {
      console.error('Error checking subcategories:', error);
      toast.error('حدث خطأ أثناء التحقق من الفئات الفرعية');
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await updateCategory(category.id, { 
        is_active: !category.is_active 
      });
      toast.success(`تم ${category.is_active ? 'إلغاء تنشيط' : 'تنشيط'} الفئة بنجاح`);
      onRefreshCategories();
    } catch (error) {
      console.error('Error toggling category status:', error);
      toast.error('حدث خطأ أثناء تغيير حالة الفئة');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmCategory) return;

    if (hasSubcategories) {
      setIsDeleteOpen(false);
      toast.error('لا يمكن حذف هذه الفئة لأنها تحتوي على فئات فرعية');
      return;
    }

    setIsLoading(true);
    try {
      await deleteCategory(deleteConfirmCategory.id);
      toast.success('تم حذف الفئة بنجاح');
      setIsDeleteOpen(false);
      onRefreshCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('حدث خطأ أثناء حذف الفئة');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Render category icon
  const renderCategoryIcon = (iconName: string | null, className: string = "h-5 w-5") => {
    if (!iconName) return <FolderRoot className={className} />;
    
    const IconComponent = getLucideIcon(iconName);
    if (!IconComponent) return <FolderRoot className={className} />;
    
    const Icon = IconComponent as React.ElementType;
    return <Icon className={className} />;
  };

  if (categories.length === 0) {
    return (
      <Card className="border border-dashed">
        <CardHeader className="text-center">
          <CardTitle>لا توجد فئات</CardTitle>
          <CardDescription>لم يتم العثور على أي فئات تطابق معايير البحث</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <FolderRoot className="w-16 h-16 text-muted-foreground/50" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="bg-background rounded-lg border shadow-sm overflow-hidden">
        <div className="flex justify-end p-2">
          <div className="flex space-x-1 rounded-lg bg-muted p-1">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs"
              onClick={() => setViewMode('table')}
            >
              جدول
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs"
              onClick={() => setViewMode('grid')}
            >
              شبكة
            </Button>
          </div>
        </div>
        
        {viewMode === 'table' ? (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الفئة</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الرابط</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {category.image_url ? (
                          <Avatar className="h-9 w-9 rounded-md border border-muted">
                            <img src={category.image_url} alt={category.name} className="object-cover" />
                            <AvatarFallback className="rounded-md bg-primary/10 text-primary">
                              {renderCategoryIcon(category.icon, "h-5 w-5")}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-9 w-9 flex items-center justify-center rounded-md bg-primary/10 text-primary">
                            {renderCategoryIcon(category.icon, "h-5 w-5")}
                          </div>
                        )}
                        <div className="font-medium">{category.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="truncate max-w-[250px]">
                        {category.description || 'لا يوجد وصف'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={category.type === 'product' 
                          ? "bg-blue-50 text-blue-700 border-blue-200" 
                          : "bg-purple-50 text-purple-700 border-purple-200"}
                      >
                        {category.type === 'product' ? 'منتجات' : 'خدمات'}
                      </Badge>
                    </TableCell>
                    <TableCell dir="ltr">{category.slug}</TableCell>
                    <TableCell>{formatDate(category.created_at)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={category.is_active ? "default" : "secondary"}
                        className={category.is_active 
                          ? "bg-green-100 text-green-700 hover:bg-green-100" 
                          : "bg-gray-100 text-gray-700 hover:bg-gray-100"}
                      >
                        {category.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(category)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">عرض</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">تعديل</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">المزيد</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(category)}>
                              <Eye className="ml-2 h-4 w-4" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(category)}>
                              <Edit className="ml-2 h-4 w-4" />
                              تعديل الفئة
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(category)}>
                              {category.is_active ? (
                                <>
                                  <FolderCog className="ml-2 h-4 w-4" />
                                  تعطيل الفئة
                                </>
                              ) : (
                                <>
                                  <FolderPlus className="ml-2 h-4 w-4" />
                                  تفعيل الفئة
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(category)}
                            >
                              <Trash2 className="ml-2 h-4 w-4" />
                              حذف الفئة
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {categories.map((category) => (
              <Card key={category.id} className="overflow-hidden">
                {category.image_url ? (
                  <div className="h-40 overflow-hidden bg-muted relative">
                    <img 
                      src={category.image_url} 
                      alt={category.name} 
                      className="w-full h-full object-cover"
                    />
                    <Badge 
                      variant={category.is_active ? "default" : "secondary"}
                      className={`absolute top-2 left-2 ${category.is_active 
                        ? "bg-green-100 text-green-700 hover:bg-green-100" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-100"}`}
                    >
                      {category.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center bg-primary/10">
                    {renderCategoryIcon(category.icon, "h-16 w-16 text-primary")}
                    <Badge 
                      variant={category.is_active ? "default" : "secondary"}
                      className={`absolute top-2 left-2 ${category.is_active 
                        ? "bg-green-100 text-green-700 hover:bg-green-100" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-100"}`}
                    >
                      {category.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={category.type === 'product' 
                          ? "bg-blue-50 text-blue-700 border-blue-200" 
                          : "bg-purple-50 text-purple-700 border-purple-200"}
                      >
                        {category.type === 'product' ? 'منتجات' : 'خدمات'}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-lg truncate">{category.name}</CardTitle>
                  <CardDescription className="line-clamp-2 h-10">
                    {category.description || 'لا يوجد وصف'}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-0 flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    {formatDate(category.created_at)}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(category)}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">عرض</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">تعديل</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">حذف</span>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Category Details Dialog */}
      {viewCategory && (
        <CategoryDetailsDialog
          category={viewCategory}
          open={isViewOpen}
          onOpenChange={setIsViewOpen}
          onEdit={handleEdit}
        />
      )}

      {/* Edit Category Dialog */}
      {editCategory && (
        <EditCategoryDialog
          category={editCategory}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onCategoryUpdated={onRefreshCategories}
        />
      )}

      {/* Delete Category Confirmation */}
      {deleteConfirmCategory && (
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من حذف هذه الفئة؟</AlertDialogTitle>
              <AlertDialogDescription>
                {hasSubcategories ? (
                  <div className="text-destructive font-medium">
                    لا يمكن حذف هذه الفئة لأنها تحتوي على فئات فرعية. يجب حذف جميع الفئات الفرعية أولاً.
                  </div>
                ) : (
                  <>
                    سيتم حذف الفئة "{deleteConfirmCategory.name}" نهائياً من النظام.
                    هذا الإجراء لا يمكن التراجع عنه.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>إلغاء</AlertDialogCancel>
              {!hasSubcategories && (
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  disabled={isLoading}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري الحذف...
                    </>
                  ) : (
                    "حذف"
                  )}
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export default CategoriesList; 