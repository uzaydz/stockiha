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

interface ProductsListProps {
  products: Product[];
  onRefreshProducts: () => Promise<void>;
}

const ProductsList = ({ products, onRefreshProducts }: ProductsListProps) => {
  const navigate = useNavigate();
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [productForFeatures, setProductForFeatures] = useState<Product | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
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
      return <Badge variant="destructive">نفذ من المخزون</Badge>;
    } else if (quantity <= 5) {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">منخفض ({quantity})</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">متوفر ({quantity})</Badge>;
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
                  <TableHead>المنتج</TableHead>
                  <TableHead>الصنف</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="rounded-md h-9 w-9">
                          <AvatarImage src={product.thumbnail_image} alt={product.name} />
                          <AvatarFallback className="rounded-md bg-primary/10 text-primary">
                            {product.name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                            {product.description.substring(0, 40)}
                            {product.description.length > 40 ? '...' : ''}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        if (!product.category) return '';
                        if (typeof product.category === 'string') return product.category;
                        if (typeof product.category === 'object' && 'name' in product.category) {
                          return (product.category as { name: string }).name;
                        }
                        return '';
                      })()}
                    </TableCell>
                    <TableCell>{formatPrice(product.price)}</TableCell>
                    <TableCell>{product.stock_quantity}</TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>
                      <StockStatus quantity={product.stock_quantity} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(product)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">عرض</span>
                        </Button>
                        
                        {/* زر التعديل - يظهر فقط إذا كان المستخدم لديه صلاحية */}
                        {canEditProducts ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link to={`/dashboard/product/${product.id}`}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">تعديل</span>
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                            className="opacity-50 cursor-not-allowed"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">تعديل</span>
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">المزيد</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* إضافة خيار تعديل ميزات المنتج */}
                            {canEditProducts && (
                              <DropdownMenuItem onClick={() => handleEditFeatures(product)}>
                                <Settings className="ml-2 h-4 w-4" />
                                تعديل مميزات المنتج
                              </DropdownMenuItem>
                            )}
                            
                            {/* ===== بداية الإضافة ===== */}
                            <DropdownMenuItem asChild>
                             <Link to={`/dashboard/products/${product.id}/customize-purchase-page`}>
                               <Settings className="ml-2 h-4 w-4" />
                               تخصيص صفحة الشراء
                             </Link>
                           </DropdownMenuItem>
                            {/* ===== نهاية الإضافة ===== */}
                            
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {products.map((product) => (
              <Card key={product.id} className="h-full">
                <CardHeader className="p-4 pb-2">
                  <div className="aspect-square rounded-md overflow-hidden mb-2">
                    <img
                      src={product.thumbnail_image}
                      alt={product.name}
                      className="h-full w-full object-cover transition-all hover:scale-105"
                    />
                  </div>
                  <CardTitle className="text-base truncate">{product.name}</CardTitle>
                  <CardDescription className="truncate">
                    {product.description.substring(0, 60)}
                    {product.description.length > 60 ? '...' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{formatPrice(product.price)}</div>
                    <StockStatus quantity={product.stock_quantity} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    SKU: {product.sku}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-2 flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => handleView(product)}>
                    <Eye className="ml-1 h-3 w-3" />
                    عرض
                  </Button>
                  {canEditProducts ? (
                    <Button variant="outline" size="sm" asChild>
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
                      className="opacity-50 cursor-not-allowed"
                    >
                      <Edit className="ml-1 h-3 w-3" />
                      تعديل
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(product)}
                  >
                    <Trash2 className="ml-1 h-3 w-3" />
                    حذف
                  </Button>
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

      {/* تم إزالة EditProductDialog - الآن نستخدم صفحة ProductForm الكاملة */}

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
