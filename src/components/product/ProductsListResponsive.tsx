import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  AlertCircle,
  Tags,
  Loader2,
  ExternalLink,
  FileText,
  Clock,
  CheckCircle,
  Upload,
  Undo2,
  Package,
  DollarSign
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import DeleteProductDialog from './DeleteProductDialog';
import ViewProductDialog from './ViewProductDialog';
import type { Product } from '@/lib/api/products';
import { publishProduct, revertProductToDraft } from '@/lib/api/products';
import { formatPrice, cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { toast } from 'sonner';
import { hasPermissions } from '@/lib/api/userPermissionsUnified';
import { Link, useNavigate } from 'react-router-dom';

interface ProductsListResponsiveProps {
  products: Product[];
  onRefreshProducts: () => Promise<void>;
  viewMode?: 'grid' | 'list';
  isLoading?: boolean;
}

// مكون البطاقة المحسن للموبايل
const ProductCard: React.FC<{
  product: Product;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onPublish: (product: Product) => void;
  onRevertToDraft: (product: Product) => void;
  onPreview: (product: Product) => void;
  canEdit: boolean;
  canDelete: boolean;
  getPublicationStatus: (product: Product) => string;
}> = ({
  product,
  onView,
  onEdit,
  onDelete,
  onPublish,
  onRevertToDraft,
  onPreview,
  canEdit,
  canDelete,
  getPublicationStatus
}) => {
  const publicationStatus = getPublicationStatus(product);
  const navigate = useNavigate();

  // Stock status with improved styling
  const StockStatus = () => {
    if (product.stock_quantity <= 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          نفذ المخزون
        </Badge>
      );
    } else if (product.stock_quantity <= 5) {
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">
          منخفض ({product.stock_quantity})
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
          متوفر ({product.stock_quantity})
        </Badge>
      );
    }
  };

  // Publication status badge
  const PublicationBadge = () => {
    switch (publicationStatus) {
      case 'draft':
        return (
          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
            <FileText className="w-3 h-3 ml-1" />
            مسودة
          </Badge>
        );
      case 'published':
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
            <CheckCircle className="w-3 h-3 ml-1" />
            منشور
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className={cn(
      "h-full flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md",
      publicationStatus === 'draft' && "border-yellow-500/30 bg-yellow-50/5"
    )}>
      {/* صورة المنتج */}
      <div className="relative aspect-square rounded-t-lg overflow-hidden bg-muted">
        <img
          src={product.thumbnail_image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
        {/* شارة الحالة */}
        <div className="absolute top-2 right-2">
          <PublicationBadge />
        </div>
      </div>

      {/* معلومات المنتج */}
      <CardHeader className="p-3 sm:p-4 pb-2 flex-grow">
        <CardTitle className="text-sm sm:text-base line-clamp-1">
          {product.name}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm line-clamp-2 mt-1">
          {product.description}
        </CardDescription>
      </CardHeader>

      {/* تفاصيل المنتج */}
      <CardContent className="p-3 sm:p-4 pt-0 pb-2 space-y-2">
        {/* السعر والمخزون */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold text-sm sm:text-base">
              {formatPrice(product.price)}
            </span>
          </div>
          <StockStatus />
        </div>

        {/* معلومات إضافية */}
        <div className="flex flex-wrap gap-1">
          {product.category && (
            <Badge variant="outline" className="text-xs">
              {typeof product.category === 'object' && 'name' in product.category
                ? (product.category as { name: string }).name
                : typeof product.category === 'string'
                ? product.category
                : ''}
            </Badge>
          )}
          {product.sku && (
            <Badge variant="secondary" className="text-xs">
              SKU: {product.sku}
            </Badge>
          )}
        </div>
      </CardContent>

      {/* أزرار الإجراءات - تصميم محسن للموبايل */}
      <CardFooter className="p-3 border-t bg-muted/30">
        <div className="grid grid-cols-3 gap-2 w-full">
          {/* زر العرض */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(product)}
            className="flex flex-col items-center justify-center h-auto py-2 hover:bg-primary/10"
          >
            <Eye className="h-4 w-4 mb-1" />
            <span className="text-xs">عرض</span>
          </Button>

          {/* زر التعديل */}
          {canEdit ? (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="flex flex-col items-center justify-center h-auto py-2 hover:bg-blue-50 dark:hover:bg-blue-950/20"
            >
              <Link to={`/dashboard/product/${product.id}`}>
                <Edit className="h-4 w-4 mb-1 text-blue-600 dark:text-blue-400" />
                <span className="text-xs">تعديل</span>
              </Link>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="flex flex-col items-center justify-center h-auto py-2 opacity-50"
            >
              <Edit className="h-4 w-4 mb-1" />
              <span className="text-xs">تعديل</span>
            </Button>
          )}

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
              <DropdownMenuItem onClick={() => onPreview(product)}>
                <ExternalLink className="ml-2 h-4 w-4" />
                صفحة الشراء
              </DropdownMenuItem>

              {publicationStatus === 'draft' && canEdit && (
                <DropdownMenuItem onClick={() => onPublish(product)}>
                  <Upload className="ml-2 h-4 w-4 text-green-600" />
                  نشر المنتج
                </DropdownMenuItem>
              )}

              {publicationStatus === 'published' && canEdit && (
                <DropdownMenuItem onClick={() => onRevertToDraft(product)}>
                  <Undo2 className="ml-2 h-4 w-4 text-yellow-600" />
                  إرجاع لمسودة
                </DropdownMenuItem>
              )}

              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(product)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="ml-2 h-4 w-4" />
                    حذف المنتج
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
};

const ProductsListResponsive: React.FC<ProductsListResponsiveProps> = ({
  products,
  onRefreshProducts,
  viewMode = 'list',
  isLoading = false
}) => {
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const { isAdmin, permissions } = useAuth();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [permissionAlertType, setPermissionAlertType] = useState<'edit' | 'delete'>('edit');
  const [canEditProducts, setCanEditProducts] = useState(false);
  const [canDeleteProducts, setCanDeleteProducts] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);

  // التحقق من الصلاحيات
  useEffect(() => {
    const checkPermissions = async () => {
      setIsCheckingPermissions(true);
      try {
        if (isAdmin) {
          setCanEditProducts(true);
          setCanDeleteProducts(true);
        } else if (permissions?.canManageProducts) {
          setCanEditProducts(true);
          setCanDeleteProducts(true);
        } else {
          const hasEditPermission = await hasPermissions('product', 'edit');
          const hasDeletePermission = await hasPermissions('product', 'delete');
          setCanEditProducts(hasEditPermission);
          setCanDeleteProducts(hasDeletePermission);
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        setCanEditProducts(false);
        setCanDeleteProducts(false);
      } finally {
        setIsCheckingPermissions(false);
      }
    };

    checkPermissions();
  }, [isAdmin, permissions]);

  // دالة للحصول على حالة النشر
  const getPublicationStatus = (product: Product) => {
    if (product.is_active === false) return 'draft';
    if (product.is_active === true) return 'published';
    if ((product as any).publication_status) {
      return (product as any).publication_status;
    }
    return 'published';
  };

  // Handler functions
  const handleView = (product: Product) => {
    setSelectedProduct(product);
    setShowViewDialog(true);
  };

  const handleEdit = (product: Product) => {
    if (!canEditProducts) {
      setPermissionAlertType('edit');
      setShowPermissionAlert(true);
      return;
    }
    navigate(`/dashboard/product/${product.id}`);
  };

  const handleDelete = (product: Product) => {
    if (!canDeleteProducts) {
      setPermissionAlertType('delete');
      setShowPermissionAlert(true);
      return;
    }
    setSelectedProduct(product);
    setShowDeleteDialog(true);
  };

  const handlePublish = async (product: Product) => {
    if (!canEditProducts) {
      setPermissionAlertType('edit');
      setShowPermissionAlert(true);
      return;
    }

    setIsPublishing(product.id);
    try {
      await publishProduct(product.id);
      await onRefreshProducts();
      toast.success('تم نشر المنتج بنجاح');
    } catch (error) {
      console.error('Error publishing product:', error);
      toast.error('حدث خطأ أثناء نشر المنتج');
    } finally {
      setIsPublishing(null);
    }
  };

  const handleRevertToDraft = async (product: Product) => {
    if (!canEditProducts) {
      setPermissionAlertType('edit');
      setShowPermissionAlert(true);
      return;
    }

    setIsPublishing(product.id);
    try {
      await revertProductToDraft(product.id);
      await onRefreshProducts();
      toast.success('تم إرجاع المنتج إلى مسودة');
    } catch (error) {
      console.error('Error reverting product:', error);
      toast.error('حدث خطأ أثناء إرجاع المنتج إلى مسودة');
    } finally {
      setIsPublishing(null);
    }
  };

  const handlePreviewProduct = (product: Product) => {
    const productSlug = product.slug || product.id;
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const baseDomain = import.meta.env.VITE_APP_DOMAIN || 'ktobi.online';
    const purchasePagePath = 'product-purchase-max-v2';

    let url = '';
    if (currentOrganization?.domain) {
      url = `${protocol}//${currentOrganization.domain}/${purchasePagePath}/${productSlug}`;
    } else if (currentOrganization?.subdomain && currentOrganization.subdomain !== 'main') {
      if (hostname.includes('localhost')) {
        const port = window.location.port ? `:${window.location.port}` : '';
        url = `${protocol}//${currentOrganization.subdomain}.localhost${port}/${purchasePagePath}/${productSlug}`;
      } else {
        url = `${protocol}//${currentOrganization.subdomain}.${baseDomain}/${purchasePagePath}/${productSlug}`;
      }
    } else {
      url = `${protocol}//${hostname}/${purchasePagePath}/${productSlug}`;
    }

    window.open(url, '_blank');
  };

  // عرض مؤشر التحميل
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

  // عرض حالة فارغة
  if (products.length === 0) {
    return (
      <Card className="border border-dashed">
        <CardHeader className="text-center">
          <CardTitle>لا توجد منتجات</CardTitle>
          <CardDescription>لم يتم العثور على أي منتجات</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <Tags className="w-16 h-16 text-muted-foreground/50" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* تنبيه الصلاحيات */}
      <Dialog open={showPermissionAlert} onOpenChange={setShowPermissionAlert}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              عدم وجود صلاحية كافية
            </DialogTitle>
            <DialogDescription>
              {permissionAlertType === 'edit'
                ? 'ليس لديك صلاحية لتعديل المنتجات.'
                : 'ليس لديك صلاحية لحذف المنتجات.'}
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>تنبيه أمان</AlertTitle>
            <AlertDescription>
              تتطلب هذه العملية صلاحيات خاصة لم يتم منحها لحسابك.
            </AlertDescription>
          </Alert>
          <DialogFooter>
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

      {/* عرض القائمة أو الشبكة */}
      {viewMode === 'list' ? (
        // عرض الجدول للشاشات الكبيرة والبطاقات للموبايل
        <div className="block lg:hidden">
          {/* عرض البطاقات للموبايل حتى في وضع القائمة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPublish={handlePublish}
                onRevertToDraft={handleRevertToDraft}
                onPreview={handlePreviewProduct}
                canEdit={canEditProducts}
                canDelete={canDeleteProducts}
                getPublicationStatus={getPublicationStatus}
              />
            ))}
          </div>
        </div>
      ) : (
        // عرض الشبكة
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-0">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPublish={handlePublish}
              onRevertToDraft={handleRevertToDraft}
              onPreview={handlePreviewProduct}
              canEdit={canEditProducts}
              canDelete={canDeleteProducts}
              getPublicationStatus={getPublicationStatus}
            />
          ))}
        </div>
      )}

      {/* الجدول للشاشات الكبيرة فقط في وضع القائمة */}
      {viewMode === 'list' && (
        <div className="hidden lg:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[250px]">المنتج</TableHead>
                <TableHead>الصنف</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>حالة النشر</TableHead>
                <TableHead>المخزون</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="rounded-md h-10 w-10">
                        <AvatarImage src={product.thumbnail_image} alt={product.name} />
                        <AvatarFallback className="rounded-md">
                          {product.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {product.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.category && (
                      <Badge variant="outline">
                        {typeof product.category === 'object' && 'name' in product.category
                          ? (product.category as { name: string }).name
                          : typeof product.category === 'string'
                          ? product.category
                          : '-'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatPrice(product.price)}</TableCell>
                  <TableCell>{product.stock_quantity}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {product.sku || '-'}
                  </TableCell>
                  <TableCell>
                    {getPublicationStatus(product) === 'draft' ? (
                      <Badge className="bg-yellow-50 text-yellow-700">
                        <FileText className="w-3 h-3 ml-1" />
                        مسودة
                      </Badge>
                    ) : (
                      <Badge className="bg-green-50 text-green-700">
                        <CheckCircle className="w-3 h-3 ml-1" />
                        منشور
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.stock_quantity <= 0 ? (
                      <Badge variant="destructive">نفذ</Badge>
                    ) : product.stock_quantity <= 5 ? (
                      <Badge className="bg-amber-100 text-amber-700">منخفض</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700">متوفر</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(product)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>عرض</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {canEditProducts ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="h-8 w-8 p-0"
                              >
                                <Link to={`/dashboard/product/${product.id}`}>
                                  <Edit className="h-4 w-4" />
                                </Link>
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </TooltipTrigger>
                          <TooltipContent>تعديل</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {canDeleteProducts && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(product)}
                                className="h-8 w-8 p-0 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>حذف</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      {selectedProduct && showViewDialog && (
        <ViewProductDialog
          product={selectedProduct}
          open={showViewDialog}
          onOpenChange={setShowViewDialog}
        />
      )}

      {selectedProduct && showDeleteDialog && (
        <DeleteProductDialog
          product={selectedProduct}
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onDeleted={onRefreshProducts}
        />
      )}
    </>
  );
};

export default ProductsListResponsive;