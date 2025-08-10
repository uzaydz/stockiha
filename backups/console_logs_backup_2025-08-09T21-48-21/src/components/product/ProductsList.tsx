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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Eye, 
  Edit, 
  Trash2, 
  MoreVertical, 
  AlertCircle, 
  CheckCircle2, 
  Tags,
  Loader2,
  Settings
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import DeleteProductDialog from './DeleteProductDialog';
import ViewProductDialog from './ViewProductDialog';
import type { Product } from '@/lib/api/products';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { EmployeePermissions } from '@/types/employee';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { checkUserPermissions, refreshUserData } from '@/lib/api/permissions';
import { ProductFeatures } from '@/components/store/ProductFeatures';
import { Link, useNavigate } from 'react-router-dom';
import '@/styles/products-responsive.css';

interface ProductsListProps {
  products: Product[];
  onRefreshProducts: () => Promise<void>;
  viewMode?: 'grid' | 'list';
  isLoading?: boolean;
}

const ProductsList = ({ 
  products, 
  onRefreshProducts, 
  viewMode = 'list',
  isLoading = false 
}: ProductsListProps) => {
  const navigate = useNavigate();
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [productForFeatures, setProductForFeatures] = useState<Product | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [permissionAlertType, setPermissionAlertType] = useState<'edit' | 'delete'>('edit');
  const [canEditProducts, setCanEditProducts] = useState(false);
  const [canDeleteProducts, setCanDeleteProducts] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [isUpdatingFeatures, setIsUpdatingFeatures] = useState(false);

  // استدعاء معلومات المستخدم من سياق المصادقة
  const { user } = useAuth();
  
  // تعديل آلية التحقق من الصلاحيات
  useEffect(() => {
    if (!user) return;
    
    const checkPermissions = async () => {
      try {
        setIsCheckingPermissions(true);
        
        // تحديث بيانات المستخدم من قاعدة البيانات
        const userData = await refreshUserData(user.id);
        
        // دمج البيانات المحدثة مع بيانات المستخدم
        const mergedUserData = {
          ...user,
          permissions: userData?.permissions || user.user_metadata?.permissions,
          is_org_admin: userData?.is_org_admin || user.user_metadata?.is_org_admin,
          is_super_admin: userData?.is_super_admin || user.user_metadata?.is_super_admin,
          role: userData?.role || user.user_metadata?.role,
        };
        
        // استخدام وظيفة فحص الصلاحيات
        const canEdit = await checkUserPermissions(mergedUserData, 'editProducts');
        const canDelete = await checkUserPermissions(mergedUserData, 'deleteProducts');
        
        setCanEditProducts(canEdit);
        setCanDeleteProducts(canDelete);
      } catch (error) {
        // في حالة الخطأ، تحقق مباشرة من البيانات الخام
        const permissions = user.user_metadata?.permissions || {};
        const isAdmin = 
          user.user_metadata?.role === 'admin' || 
          user.user_metadata?.role === 'owner' || 
          user.user_metadata?.is_org_admin === true;
          
        setCanEditProducts(isAdmin || Boolean(permissions.editProducts) || Boolean(permissions.manageProducts));
        setCanDeleteProducts(isAdmin || Boolean(permissions.deleteProducts) || Boolean(permissions.manageProducts));
      } finally {
        setIsCheckingPermissions(false);
      }
    };
    
    checkPermissions();
  }, [user]);

  const handleView = (product: Product) => {
    setViewProduct(product);
    setIsViewOpen(true);
  };

  const handleEdit = (product: Product) => {
    if (canEditProducts) {
      // التنقل إلى صفحة تعديل المنتج
      navigate(`/dashboard/product/${product.id}`);
    } else {
      // عرض تنبيه عدم وجود صلاحية
      setPermissionAlertType('edit');
      setShowPermissionAlert(true);
      toast.error("ليس لديك صلاحية تعديل المنتجات");
    }
  };

  const handleDelete = (product: Product) => {
    if (canDeleteProducts) {
      setDeleteProduct(product);
      setIsDeleteOpen(true);
    } else {
      // عرض تنبيه عدم وجود صلاحية
      setPermissionAlertType('delete');
      setShowPermissionAlert(true);
      toast.error("ليس لديك صلاحية حذف المنتجات");
    }
  };

  const handleEditFeatures = (product: Product) => {
    setProductForFeatures(product);
    setIsFeaturesOpen(true);
  };

  const handleFeaturesUpdated = async () => {
    setIsUpdatingFeatures(true);
    try {
      await onRefreshProducts();
      toast.success('تم تحديث مميزات المنتج بنجاح');
      setIsFeaturesOpen(false);
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث المنتج');
    } finally {
      setIsUpdatingFeatures(false);
    }
  };

  // Stock status badge
  const StockStatus = ({ quantity }: { quantity: number }) => {
    if (quantity <= 0) {
      return <Badge variant="destructive" className="text-xs">نفذ من المخزون</Badge>;
    } else if (quantity <= 5) {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">منخفض ({quantity})</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">متوفر ({quantity})</Badge>;
    }
  };

  // عرض مؤشر تحميل أثناء التحقق من الصلاحيات
  if (isCheckingPermissions) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="border border-dashed">
        <CardHeader className="text-center">
          <CardTitle>لا توجد منتجات</CardTitle>
          <CardDescription>لم يتم العثور على أي منتجات تطابق معايير البحث</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <Tags className="w-16 h-16 text-muted-foreground/50" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* نافذة تنبيه عدم وجود صلاحية */}
      <Dialog open={showPermissionAlert} onOpenChange={setShowPermissionAlert}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              عدم وجود صلاحية كافية
            </DialogTitle>
            <DialogDescription>
              {permissionAlertType === 'edit' 
                ? 'ليس لديك صلاحية لتعديل المنتجات. يرجى التواصل مع مدير النظام للحصول على هذه الصلاحية.'
                : 'ليس لديك صلاحية لحذف المنتجات. يرجى التواصل مع مدير النظام للحصول على هذه الصلاحية.'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>تنبيه أمان</AlertTitle>
              <AlertDescription>
                تتطلب هذه العملية صلاحيات خاصة لم يتم منحها لحسابك.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="sm:justify-center mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPermissionAlert(false)}
            >
              فهمت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-background rounded-lg border shadow-sm overflow-hidden">
        {viewMode === 'list' ? (
          <div className="overflow-auto">
            <Table>
              <TableHeader className="hidden sm:table-header-group">
                <TableRow>
                  <TableHead className="min-w-[250px]">المنتج</TableHead>
                  <TableHead className="hidden md:table-cell">الصنف</TableHead>
                  <TableHead className="hidden lg:table-cell">السعر</TableHead>
                  <TableHead className="hidden lg:table-cell">الكمية</TableHead>
                  <TableHead className="hidden xl:table-cell">SKU</TableHead>
                  <TableHead className="hidden md:table-cell">الحالة</TableHead>
                  <TableHead className="text-left min-w-[120px]">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className="sm:table-row block border-b border-border pb-4 mb-4 sm:pb-0 sm:mb-0">
                    <TableCell className="sm:table-cell block pb-2 sm:pb-0">
                      <div className="flex items-start gap-3">
                        <Avatar className="rounded-md h-12 w-12 sm:h-9 sm:w-9 flex-shrink-0">
                          <AvatarImage src={product.thumbnail_image} alt={product.name} />
                          <AvatarFallback className="rounded-md bg-primary/10 text-primary">
                            {product.name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm sm:text-base">{product.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-1 sm:truncate sm:max-w-[250px]">
                            {product.description.substring(0, 60)}
                            {product.description.length > 60 ? '...' : ''}
                          </div>
                          {/* Mobile info - show on small screens only */}
                          <div className="flex flex-wrap gap-2 mt-2 sm:hidden">
                            <span className="text-sm font-medium">{formatPrice(product.price)}</span>
                            <StockStatus quantity={product.stock_quantity} />
                            {product.category && (
                              <Badge variant="outline" className="text-xs">
                                {(() => {
                                  if (typeof product.category === 'string') return product.category;
                                  if (typeof product.category === 'object' && 'name' in product.category) {
                                    return (product.category as { name: string }).name;
                                  }
                                  return '';
                                })()}
                              </Badge>
                            )}
                          </div>
                          {product.sku && (
                            <div className="text-xs text-muted-foreground mt-1 sm:hidden">
                              SKU: {product.sku}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {(() => {
                        if (!product.category) return '-';
                        if (typeof product.category === 'string') return product.category;
                        if (typeof product.category === 'object' && 'name' in product.category) {
                          return (product.category as { name: string }).name;
                        }
                        return '-';
                      })()}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{formatPrice(product.price)}</TableCell>
                    <TableCell className="hidden lg:table-cell">{product.stock_quantity}</TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{product.sku}</code>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <StockStatus quantity={product.stock_quantity} />
                    </TableCell>
                    <TableCell className="sm:table-cell block">
                      <div className="flex items-center justify-end gap-1 sm:gap-2 flex-wrap product-list-actions">
                        {/* زر العرض - دائماً متاح */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(product)}
                          className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:px-2 sm:py-1 text-xs"
                          title="عرض المنتج"
                        >
                          <Eye className="h-4 w-4 btn-icon" />
                          <span className="sr-only sm:not-sr-only sm:mr-1 btn-text">عرض</span>
                        </Button>
                        
                        {/* زر التعديل - يظهر فقط إذا كان المستخدم لديه صلاحية */}
                        {canEditProducts ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:px-2 sm:py-1 text-xs"
                            title="تعديل المنتج"
                          >
                            <Link to={`/dashboard/product/${product.id}`}>
                              <Edit className="h-4 w-4 btn-icon" />
                              <span className="sr-only sm:not-sr-only sm:mr-1 btn-text">تعديل</span>
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                            className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:px-2 sm:py-1 text-xs opacity-50 cursor-not-allowed"
                            title="تعديل المنتج"
                          >
                            <Edit className="h-4 w-4 btn-icon" />
                            <span className="sr-only sm:not-sr-only sm:mr-1 btn-text">تعديل</span>
                          </Button>
                        )}
                        
                        {/* زر القائمة المنسدلة */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:px-2 sm:py-1 text-xs"
                              title="المزيد من الخيارات"
                            >
                              <MoreVertical className="h-4 w-4 btn-icon" />
                              <span className="sr-only btn-text">المزيد</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[200px]">
                            {/* إضافة خيار تعديل ميزات المنتج */}
                            {canEditProducts && (
                              <DropdownMenuItem onClick={() => handleEditFeatures(product)}>
                                <Settings className="ml-2 h-4 w-4" />
                                تعديل مميزات المنتج
                              </DropdownMenuItem>
                            )}
                            
                            {/* خيار تخصيص صفحة الشراء */}
                            <DropdownMenuItem asChild>
                             <Link to={`/dashboard/products/${product.id}/customize-purchase-page`}>
                               <Settings className="ml-2 h-4 w-4" />
                               تخصيص صفحة الشراء
                             </Link>
                           </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            {/* خيار الحذف في القائمة المنسدلة - يظهر فقط عند وجود صلاحية */}
                            {canDeleteProducts && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(product)}
                              >
                                <Trash2 className="ml-2 h-4 w-4" />
                                حذف المنتج
                              </DropdownMenuItem>
                            )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 p-4">
            {products.map((product) => (
              <Card key={product.id} className="h-full flex flex-col overflow-hidden product-card">
                <CardHeader className="p-3 sm:p-4 pb-2 flex-shrink-0 product-card-header">
                  <div className="aspect-square rounded-md overflow-hidden mb-2 bg-muted">
                    <img
                      src={product.thumbnail_image}
                      alt={product.name}
                      className="h-full w-full object-cover transition-all hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <CardTitle className="text-sm sm:text-base line-clamp-2 leading-tight">{product.name}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm line-clamp-2 mt-1">
                    {product.description.substring(0, 60)}
                    {product.description.length > 60 ? '...' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0 pb-2 flex-shrink-0 product-card-content">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="font-medium text-sm sm:text-base">{formatPrice(product.price)}</div>
                    <StockStatus quantity={product.stock_quantity} />
                  </div>
                  {product.sku && (
                    <div className="text-xs text-muted-foreground mt-1">
                      SKU: {product.sku}
                    </div>
                  )}
                  {product.category && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        {(() => {
                          if (typeof product.category === 'string') return product.category;
                          if (typeof product.category === 'object' && 'name' in product.category) {
                            return (product.category as { name: string }).name;
                          }
                          return '';
                        })()}
                      </Badge>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-3 sm:p-4 pt-2 mt-auto flex-shrink-0 product-card-footer">
                  <div className="grid grid-cols-1 gap-2 w-full product-card-buttons">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleView(product)}
                      className="w-full text-xs h-8 px-2 py-1"
                    >
                      <Eye className="ml-1 h-3 w-3" />
                      عرض
                    </Button>
                    {canEditProducts ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                        className="w-full text-xs h-8 px-2 py-1"
                      >
                        <Link to={`/dashboard/product/${product.id}`}>
                          <Edit className="ml-1 h-3 w-3" />
                          تعديل
                        </Link>
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(product)}
                        className="w-full text-xs h-8 px-2 py-1 opacity-50 cursor-not-allowed"
                      >
                        <Edit className="ml-1 h-3 w-3" />
                        تعديل
                      </Button>
                    )}
                    {canDeleteProducts && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive w-full text-xs h-8 px-2 py-1"
                        onClick={() => handleDelete(product)}
                      >
                        <Trash2 className="ml-1 h-3 w-3" />
                        حذف
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Product Dialog */}
      {viewProduct && (
        <ViewProductDialog
          product={viewProduct}
          open={isViewOpen}
          onOpenChange={setIsViewOpen}
        />
      )}

      {/* Delete Product Dialog */}
      {deleteProduct && (
        <DeleteProductDialog
          product={deleteProduct}
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          onProductDeleted={onRefreshProducts}
        />
      )}

      {/* Dialog تعديل ميزات المنتج */}
      {productForFeatures && (
        <Dialog open={isFeaturesOpen} onOpenChange={setIsFeaturesOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>تعديل ميزات المنتج {productForFeatures.name}</DialogTitle>
              <DialogDescription>
                أضف أو عدل ميزات المنتج الإضافية التي ستظهر للعملاء
              </DialogDescription>
            </DialogHeader>
            <ProductFeatures
              productId={productForFeatures.id}
              initialFeatures={{
                hasFastShipping: productForFeatures.has_fast_shipping ?? false,
                hasMoneyBack: productForFeatures.has_money_back ?? false,
                hasQualityGuarantee: productForFeatures.has_quality_guarantee ?? false,
                fastShippingText: productForFeatures.fast_shipping_text ?? 'شحن سريع لجميع الولايات (1-3 أيام)',
                moneyBackText: productForFeatures.money_back_text ?? 'ضمان استرداد المال خلال 14 يوم',
                qualityGuaranteeText: productForFeatures.quality_guarantee_text ?? 'ضمان جودة المنتج'
              }}
              onFeaturesUpdated={handleFeaturesUpdated}
            />
            {isUpdatingFeatures && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span>جاري تحديث المنتج...</span>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ProductsList;
