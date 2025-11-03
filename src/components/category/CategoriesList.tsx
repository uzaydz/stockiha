import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
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
// import { useOptimizedClickHandler } from "@/lib/performance-utils"; // Temporarily disabled

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
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [isMobile, setIsMobile] = useState(false);
  const [hasSubcategories, setHasSubcategories] = useState(false);

  // اكتشاف الشاشات الصغيرة
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setViewMode('grid');
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      // 🚫 تعطيل الواجهة لمنع التفاعل المتعدد
      setIsLoading(true);
      
      // 🔍 فحص الفئات الفرعية أولاً
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

    // 🚫 منع الحذف إذا كانت هناك فئات فرعية
    if (hasSubcategories) {
      setIsDeleteOpen(false);
      toast.error('لا يمكن حذف هذه الفئة لأنها تحتوي على فئات فرعية');
      return;
    }

    setIsLoading(true);
    try {
      // 🗑️ محاولة حذف الفئة مع التحقق المحسن
      await deleteCategory(deleteConfirmCategory.id, deleteConfirmCategory.organization_id);

      // ✅ إشعار النجاح
      toast.success('تم حذف الفئة بنجاح');
      setIsDeleteOpen(false);
      
      // 🔄 تحديث البيانات بطريقة محسنة
      // استخدام requestAnimationFrame لتجنب blocking the main thread
      requestAnimationFrame(async () => {
        try {
          await onRefreshCategories();
        } catch (refreshError) {
          // لا نعرض خطأ للمستخدم هنا لأن الحذف نجح
        }
      });
      
    } catch (error) {
      
      // 📝 معالجة رسائل الخطأ المحددة
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

    return <IconComponent className={className} />;
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
        {!isMobile && (
          <div className="flex justify-end p-3 border-b">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs px-3"
                onClick={() => setViewMode('table')}
              >
                جدول
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs px-3"
                onClick={() => setViewMode('grid')}
              >
                شبكة
              </Button>
            </div>
          </div>
        )}
        
        {!isMobile && viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">الفئة</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[200px]">الوصف</TableHead>
                  <TableHead className="min-w-[100px]">النوع</TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[150px]">الرابط</TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[120px]">تاريخ الإنشاء</TableHead>
                  <TableHead className="min-w-[100px]">الحالة</TableHead>
                  <TableHead className="text-left min-w-[120px] sticky left-0 bg-background">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="min-w-[200px]">
                      <div className="flex items-center gap-2 sm:gap-3">
                        {category.image_url ? (
                          <Avatar className="h-9 w-9 rounded-md border border-muted">
                            <img src={category.image_url} alt={category.name} className="object-cover" width={128} height={96} />
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
                    <TableCell className="hidden md:table-cell min-w-[200px]">
                      <div className="truncate max-w-[250px]">
                        {category.description || 'لا يوجد وصف'}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <Badge 
                        variant="outline" 
                        className={category.type === 'product' 
                          ? "bg-blue-50 text-blue-700 border-blue-200" 
                          : "bg-purple-50 text-purple-700 border-purple-200"}
                      >
                        {category.type === 'product' ? 'منتجات' : 'خدمات'}
                      </Badge>
                    </TableCell>
                    <TableCell dir="ltr" className="hidden lg:table-cell min-w-[150px]">{category.slug}</TableCell>
                    <TableCell className="hidden lg:table-cell min-w-[120px]">{formatDate(category.created_at)}</TableCell>
                    <TableCell className="min-w-[100px]">
                      <Badge 
                        variant={category.is_active ? "default" : "secondary"}
                        className={category.is_active 
                          ? "bg-green-100 text-green-700 hover:bg-green-100" 
                          : "bg-gray-100 text-gray-700 hover:bg-gray-100"}
                      >
                        {category.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell className="sticky left-0 bg-background min-w-[120px]">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleView(category)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">عرض</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">تعديل</span>
                        </Button>
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">المزيد</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="bottom" sideOffset={5} className="z-50">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4">
            {categories.map((category) => (
              <Card key={category.id} className="overflow-hidden hover:shadow-lg transition-all">
                {category.image_url ? (
                  <div className="h-40 sm:h-48 overflow-hidden bg-muted relative">
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
                  <div className="h-40 sm:h-48 flex items-center justify-center bg-primary/10 relative">
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
                <CardHeader className="pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant="outline" 
                      className={category.type === 'product' 
                        ? "bg-blue-50 text-blue-700 border-blue-200" 
                        : "bg-purple-50 text-purple-700 border-purple-200"}
                    >
                      {category.type === 'product' ? 'منتجات' : 'خدمات'}
                    </Badge>
                  </div>
                  <CardTitle className="text-base sm:text-lg line-clamp-1">{category.name}</CardTitle>
                  <CardDescription className="line-clamp-2 text-sm min-h-[2.5rem]">
                    {category.description || 'لا يوجد وصف'}
                  </CardDescription>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-muted-foreground">الرابط:</span>
                    <code className="text-xs bg-muted px-2 py-0.5 rounded truncate" dir="ltr">{category.slug}</code>
                  </div>
                </CardHeader>
                <CardFooter className="pt-0 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(category.created_at)}</span>
                  </div>
                  
                  {/* الأزرار الرئيسية */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-9"
                      onClick={() => handleView(category)}
                    >
                      <Eye className="ml-1 h-3.5 w-3.5" />
                      عرض
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-9"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="ml-1 h-3.5 w-3.5" />
                      تعديل
                    </Button>
                    <Button
                      variant={category.is_active ? "outline" : "default"}
                      size="sm"
                      className="w-full text-xs h-9"
                      onClick={() => handleToggleActive(category)}
                    >
                      {category.is_active ? (
                        <>
                          <FolderCog className="ml-1 h-3.5 w-3.5" />
                          تعطيل
                        </>
                      ) : (
                        <>
                          <FolderPlus className="ml-1 h-3.5 w-3.5" />
                          تفعيل
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full text-xs h-9"
                      onClick={() => handleDelete(category)}
                    >
                      <Trash2 className="ml-1 h-3.5 w-3.5" />
                      حذف
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
