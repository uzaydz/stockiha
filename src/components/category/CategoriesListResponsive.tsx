import React, { useState } from 'react';
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
  Tag,
  Link as LinkIcon,
  Calendar,
  CloudOff
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { Category } from '@/lib/api/categories';
import { deleteCategory, updateCategory, getSubcategories } from '@/lib/api/categories';
import EditCategoryDialog from './EditCategoryDialog';
import { getLucideIcon } from '@/lib/utils';
import CategoryDetailsDialog from './CategoryDetailsDialog';
import { cn } from '@/lib/utils';

// ⚡ Extended Category type with offline fields
interface ExtendedCategory extends Category {
  image_base64?: string | null;
  _synced?: boolean;
  _syncStatus?: string;
  _pendingOperation?: string;
}

interface CategoriesListResponsiveProps {
  categories: ExtendedCategory[];
  onRefreshCategories: () => Promise<void>;
  viewMode?: 'grid' | 'table';
}

// ⚡ Helper function to get category image (local-first)
const getCategoryImageSrc = (category: ExtendedCategory): string | null => {
  // أولاً: الصورة المحلية Base64
  if (category.image_base64) {
    return category.image_base64;
  }
  // ثانياً: URL من الخادم
  if (category.image_url) {
    return category.image_url;
  }
  return null;
};

// مكون البطاقة المحسن للموبايل
const CategoryCard: React.FC<{
  category: ExtendedCategory;
  onView: (category: ExtendedCategory) => void;
  onEdit: (category: ExtendedCategory) => void;
  onDelete: (category: ExtendedCategory) => void;
  onToggleActive: (category: ExtendedCategory) => void;
  renderCategoryIcon: (iconName: string | null, className: string) => React.ReactNode;
  formatDate: (dateString: string) => string;
}> = ({
  category,
  onView,
  onEdit,
  onDelete,
  onToggleActive,
  renderCategoryIcon,
  formatDate
}) => {
  // ⚡ جلب الصورة (محلية أو remote)
  const imageSrc = getCategoryImageSrc(category);
  const isLocalImage = !!category.image_base64;
  const isPendingSync = category._syncStatus === 'pending' || category._pendingOperation;

  return (
    <Card className={cn(
      "h-full flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md",
      !category.is_active && "opacity-75"
    )}>
      {/* صورة الفئة */}
      <div className="relative aspect-video rounded-t-lg overflow-hidden bg-muted">
        {imageSrc ? (
          <>
            <img
              src={imageSrc}
              alt={category.name}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              loading="lazy"
            />
            {/* ⚡ مؤشر الصورة المحلية */}
            {isLocalImage && (
              <div className="absolute bottom-2 left-2">
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                  <CloudOff className="h-3 w-3 ml-1" />
                  محلي
                </Badge>
              </div>
            )}
          </>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-primary/10">
            {renderCategoryIcon(category.icon, "h-16 w-16 text-primary")}
          </div>
        )}

        {/* شارة الحالة */}
        <div className="absolute top-2 right-2">
          <Badge
            variant={category.is_active ? "default" : "secondary"}
            className={category.is_active
              ? "bg-green-100 text-green-700 hover:bg-green-100"
              : "bg-gray-100 text-gray-700 hover:bg-gray-100"}
          >
            {category.is_active ? 'نشط' : 'غير نشط'}
          </Badge>
        </div>

        {/* شارة النوع */}
        <div className="absolute top-2 left-2">
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

      {/* معلومات الفئة */}
      <CardHeader className="p-3 sm:p-4 pb-2 flex-grow">
        <CardTitle className="text-sm sm:text-base line-clamp-1">
          {category.name}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm line-clamp-2 mt-1 min-h-[2.5rem]">
          {category.description || 'لا يوجد وصف'}
        </CardDescription>
      </CardHeader>

      {/* تفاصيل إضافية */}
      <CardContent className="p-3 sm:p-4 pt-0 pb-2 space-y-2">
        {/* الرابط */}
        <div className="flex items-center gap-1.5">
          <LinkIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <code className="text-xs bg-muted px-2 py-0.5 rounded truncate" dir="ltr">
            {category.slug}
          </code>
        </div>

        {/* التاريخ */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span>{formatDate(category.created_at)}</span>
        </div>
      </CardContent>

      {/* أزرار الإجراءات - تصميم محسن للموبايل */}
      <CardFooter className="p-3 border-t bg-muted/30">
        <div className="grid grid-cols-3 gap-2 w-full">
          {/* زر العرض */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(category)}
            className="flex flex-col items-center justify-center h-auto py-2 hover:bg-primary/10"
          >
            <Eye className="h-4 w-4 mb-1" />
            <span className="text-xs">عرض</span>
          </Button>

          {/* زر التعديل */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(category)}
            className="flex flex-col items-center justify-center h-auto py-2 hover:bg-blue-50 dark:hover:bg-blue-950/20"
          >
            <Edit className="h-4 w-4 mb-1 text-blue-600 dark:text-blue-400" />
            <span className="text-xs">تعديل</span>
          </Button>

          {/* قائمة المزيد */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex flex-col items-center justify-center h-auto py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <MoreVertical className="h-4 w-4 mb-1" />
                <span className="text-xs">المزيد</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onToggleActive(category)}>
                {category.is_active ? (
                  <>
                    <FolderCog className="ml-2 h-4 w-4" />
                    تعطيل الفئة
                  </>
                ) : (
                  <>
                    <FolderPlus className="ml-2 h-4 w-4 text-green-600" />
                    تفعيل الفئة
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => onDelete(category)}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="ml-2 h-4 w-4" />
                حذف الفئة
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
};

const CategoriesListResponsive: React.FC<CategoriesListResponsiveProps> = ({
  categories,
  onRefreshCategories,
  viewMode = 'grid'
}) => {
  const [viewCategory, setViewCategory] = useState<Category | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<Category | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      setIsLoading(true);
      const subcategories = await getSubcategories(category.id);
      const hasSubcats = subcategories.length > 0;

      setHasSubcategories(hasSubcats);
      setDeleteConfirmCategory(category);
      setIsDeleteOpen(true);
    } catch (error) {
      toast.error('حدث خطأ أثناء التحقق من بيانات الفئة');
    } finally {
      setIsLoading(false);
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
      await deleteCategory(deleteConfirmCategory.id, deleteConfirmCategory.organization_id);
      toast.success('تم حذف الفئة بنجاح');
      setIsDeleteOpen(false);

      requestAnimationFrame(async () => {
        try {
          await onRefreshCategories();
        } catch (refreshError) {
          // Silent error
        }
      });
    } catch (error) {
      let errorMessage = 'حدث خطأ أثناء حذف الفئة';

      if (error instanceof Error) {
        if (error.message.includes('فئات فرعية')) {
          errorMessage = 'لا يمكن حذف الفئة لأنها تحتوي على فئات فرعية';
        } else if (error.message.includes('منتجات')) {
          errorMessage = 'لا يمكن حذف الفئة لأنها تحتوي على منتجات';
        } else if (error.message.includes('صلاحية')) {
          errorMessage = 'ليس لديك صلاحية لحذف هذه الفئة';
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar', {
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

    return <IconComponent className={className} />;
  };

  // عرض حالة فارغة
  if (categories.length === 0) {
    return (
      <Card className="border border-dashed">
        <CardHeader className="text-center">
          <CardTitle>لا توجد فئات</CardTitle>
          <CardDescription>لم يتم العثور على أي فئات</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <FolderRoot className="w-16 h-16 text-muted-foreground/50" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* عرض القائمة أو الشبكة */}
      {viewMode === 'table' ? (
        // عرض البطاقات للموبايل والجدول للشاشات الكبيرة
        <>
          {/* البطاقات للموبايل */}
          <div className="block lg:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-0">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                  renderCategoryIcon={renderCategoryIcon}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </div>

          {/* الجدول للشاشات الكبيرة */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الفئة</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الرابط</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => {
                  const tableCategoryImageSrc = getCategoryImageSrc(category as ExtendedCategory);
                  const tableIsLocalImage = !!(category as ExtendedCategory).image_base64;

                  return (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {tableCategoryImageSrc ? (
                          <div className="relative">
                            <Avatar className="h-10 w-10 rounded-md">
                              <img src={tableCategoryImageSrc} alt={category.name} className="object-cover" />
                              <AvatarFallback className="rounded-md">
                                {renderCategoryIcon(category.icon, "h-5 w-5")}
                              </AvatarFallback>
                            </Avatar>
                            {/* ⚡ مؤشر صغير للصورة المحلية */}
                            {tableIsLocalImage && (
                              <CloudOff className="absolute -bottom-1 -right-1 h-3 w-3 text-orange-500 bg-white rounded-full" />
                            )}
                          </div>
                        ) : (
                          <div className="h-10 w-10 flex items-center justify-center rounded-md bg-primary/10">
                            {renderCategoryIcon(category.icon, "h-5 w-5 text-primary")}
                          </div>
                        )}
                        <span className="font-medium">{category.name}</span>
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
                    <TableCell dir="ltr" className="text-sm text-muted-foreground">
                      {category.slug}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(category.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={category.is_active ? "default" : "secondary"}
                        className={category.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"}
                      >
                        {category.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(category)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(category)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(category)}
                          className="h-8 w-8 p-0 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        // عرض الشبكة
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-0">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              renderCategoryIcon={renderCategoryIcon}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

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
          <AlertDialogContent className="w-full max-w-[95vw] sm:max-w-md">
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

export default CategoriesListResponsive;