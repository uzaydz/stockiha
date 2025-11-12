import { useState, useEffect } from 'react';
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
  Settings,
  ExternalLink,
  FileText,
  Clock,
  CheckCircle, 
  Upload,
  Undo2
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
import DeleteProductDialog from './DeleteProductDialog';
import ViewProductDialog from './ViewProductDialog';
import type { Product } from '@/lib/api/products';
import { publishProduct, revertProductToDraft } from '@/lib/api/products';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
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
import { hasPermissions } from '@/lib/api/userPermissionsUnified';
import { ProductFeatures } from '@/components/store/ProductFeatures';
import { Link, useNavigate } from 'react-router-dom';
// import { getProductSlug } from '@/components/store/productUtils';

import '@/styles/products-responsive.css';

interface ProductsListProps {
  products: Product[];
  onRefreshProducts: () => Promise<void>;
  viewMode?: 'grid' | 'list';
  isLoading?: boolean;
}

// دالة للحصول على حالة النشر
const getPublicationStatus = (product: Product) => {
  // أولوية لحقل is_active لأنه المعتمد فعلياً في الفلاتر والاستعلامات
  if (product.is_active === false) return 'draft';
  if (product.is_active === true) return 'published';

  // إذا لم يتوفر is_active بشكل موثوق، استخدم publication_status إن وجد
  if ((product as any).publication_status) {
    return (product as any).publication_status;
  }

  // القيمة الافتراضية
  return 'published';
};

// دالة للحصول على مؤشر حالة النشر
const getPublicationStatusBadge = (status: string) => {
  switch (status) {
    case 'draft':
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <FileText className="w-3 h-3 ml-1" />
          مسودة
        </Badge>
      );
    case 'scheduled':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Clock className="w-3 h-3 ml-1" />
          مجدولة
        </Badge>
      );
    case 'published':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 ml-1" />
          منشورة
        </Badge>
      );
    case 'archived':
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          <FileText className="w-3 h-3 ml-1" />
          مؤرشفة
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          غير محدد
        </Badge>
      );
  }
};

const ProductsList = ({ 
  products, 
  onRefreshProducts, 
  viewMode = 'list',
  isLoading = false 
}: ProductsListProps) => {
  const navigate = useNavigate();
  
  // Debug: فحص البيانات الواردة
  useEffect(() => {
  }, [products]);

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
  const { currentOrganization } = useTenant();
  
  // تعديل آلية التحقق من الصلاحيات
  useEffect(() => {
    if (!user) return;
    
    const checkPermissions = async () => {
      try {
        setIsCheckingPermissions(true);
        
        // استخدام الدالة الموحدة للتحقق من عدة صلاحيات دفعة واحدة
        const permissionsResult = await hasPermissions(['editProducts', 'deleteProducts'], user.id);
        
        setCanEditProducts(permissionsResult.editProducts || false);
        setCanDeleteProducts(permissionsResult.deleteProducts || false);
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

  const handlePreviewProduct = (product: Product) => {

    // استخدام الدالة المحلية للحصول على slug
    const productSlug = generateProductSlug(product);
    
    // الحصول على معلومات النطاق
    const domainInfo = getProductDomain(product);
    
    // فتح الرابط في نافذة جديدة
    
    window.open(domainInfo.url, '_blank');
  };

  const handlePublish = async (product: Product) => {
    if (!canEditProducts) {
      toast.error("ليس لديك صلاحية نشر المنتجات");
      return;
    }

    try {
      toast.loading('جارٍ نشر المنتج...', { id: 'publish-product' });
      
      const success = await publishProduct(product.id);
      
      if (success) {
        toast.success('تم نشر المنتج بنجاح!', { id: 'publish-product' });
        
        // إعادة تحميل القائمة لتحديث الحالة
        await onRefreshProducts();
      } else {
        toast.error('فشل في نشر المنتج', { id: 'publish-product' });
      }
    } catch (error) {
      console.error('Error publishing product:', error);
      toast.error('حدث خطأ أثناء نشر المنتج', { id: 'publish-product' });
    }
  };

  const handleRevertToDraft = async (product: Product) => {
    if (!canEditProducts) {
      toast.error("ليس لديك صلاحية تعديل حالة النشر");
      return;
    }

    try {
      toast.loading('جارٍ إرجاع المنتج إلى المسودة...', { id: 'revert-product' });
      const success = await revertProductToDraft(product.id);
      if (success) {
        toast.success('تم إرجاع المنتج إلى المسودة!', { id: 'revert-product' });
        await onRefreshProducts();
      } else {
        toast.error('فشل في إرجاع المنتج إلى المسودة', { id: 'revert-product' });
      }
    } catch (error) {
      console.error('Error reverting product to draft:', error);
      toast.error('حدث خطأ أثناء إرجاع المنتج إلى المسودة', { id: 'revert-product' });
    }
  };

  // دالة محسنة لإنشاء slug من اسم المنتج - تعطي أولوية للـ slug من قاعدة البيانات
  const generateProductSlug = (product: Product): string => {

    // أولوية 1: استخدام slug موجود من قاعدة البيانات
    if (product.slug && product.slug.trim() !== '') {
      return product.slug.trim();
    }
    
    // أولوية 2: استخدام معرف المنتج كـ fallback
    return product.id;
  };

  // دالة محسنة لتحديد النطاق المناسب للمنتج
  const getProductDomain = (product: Product) => {
    // استخدام الدالة المحلية للحصول على slug
    const productSlug = generateProductSlug(product);
    
    // الحصول على معلومات النطاق من المؤسسة الحالية
    const organization = currentOrganization;
    const currentHostname = window.location.hostname;
    const currentProtocol = window.location.protocol;
    
    // الحصول على النطاق الأساسي من متغيرات البيئة أو استخدام القيمة الافتراضية
    const baseDomain = import.meta.env.VITE_APP_DOMAIN || 'ktobi.online';
    
    // مسار صفحة الشراء - يمكن جعله قابل للتكوين
    const purchasePagePath = 'product-purchase-max-v2';

    // أولوية 1: النطاق المخصص للمؤسسة
    if (organization?.domain && organization.domain.trim()) {
      const customDomain = organization.domain.trim();
      const url = `${currentProtocol}//${customDomain}/${purchasePagePath}/${productSlug}`;

      return {
        type: 'custom' as const,
        domain: customDomain,
        url: url
      };
    }
    
    // أولوية 2: النطاق الفرعي للمؤسسة
    if (organization?.subdomain && organization.subdomain.trim() && organization.subdomain !== 'main') {
      const subdomain = organization.subdomain.trim();
      
      // في بيئة التطوير (localhost)
      if (currentHostname.includes('localhost')) {
        const port = window.location.port ? `:${window.location.port}` : '';
        const url = `${currentProtocol}//${subdomain}.localhost${port}/${purchasePagePath}/${productSlug}`;

        return {
          type: 'subdomain' as const,
          domain: `${subdomain}.localhost`,
          url: url
        };
      }
      
      // في بيئة الإنتاج - استخدام النطاق الأساسي من متغيرات البيئة
      const url = `${currentProtocol}//${subdomain}.${baseDomain}/${purchasePagePath}/${productSlug}`;

      return {
        type: 'subdomain' as const,
        domain: `${subdomain}.${baseDomain}`,
        url: url
      };
    }
    
    // أولوية 3: النطاق الحالي (fallback)
    const fallbackUrl = `${currentProtocol}//${currentHostname}/${purchasePagePath}/${productSlug}`;

    return {
      type: 'fallback' as const,
      domain: currentHostname,
      url: fallbackUrl
    };
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
                  <TableHead className="hidden lg:table-cell">حالة النشر</TableHead>
                  <TableHead className="hidden md:table-cell">حالة المخزون</TableHead>
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
                          <div className={`font-medium text-sm sm:text-base flex items-center gap-2 ${
                            getPublicationStatus(product) === 'draft' ? 'text-yellow-700' : ''
                          }`}>
                            {product.name}
                            {getPublicationStatus(product) === 'draft' && (
                              <span className="text-xs text-yellow-600 font-medium bg-yellow-100 px-1 py-0.5 rounded">
                                مسودة
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-1 sm:truncate sm:max-w-[250px]">
                            {product.description ? product.description.substring(0, 60) : ''}
                            {product.description && product.description.length > 60 ? '...' : ''}
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
                    <TableCell className="hidden lg:table-cell">
                      {getPublicationStatusBadge(getPublicationStatus(product))}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <StockStatus quantity={product.stock_quantity} />
                    </TableCell>
                    <TableCell className="sm:table-cell block">
                      <div className="flex items-center justify-end gap-1 product-list-actions">
                        {/* زر العرض - دائماً متاح */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(product)}
                                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>عرض المنتج</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* زر العرض المباشر - يفتح صفحة الشراء */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreviewProduct(product)}
                                className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-950/20"
                              >
                                <ExternalLink className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>عرض صفحة الشراء</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        {/* زر التعديل - يظهر فقط إذا كان المستخدم لديه صلاحية */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {canEditProducts ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Link to={`/dashboard/product/${product.id}`}>
                                    <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </Link>
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(product)}
                                  className="h-8 w-8 p-0 opacity-50 cursor-not-allowed"
                                  disabled
                                >
                                  <Edit className="h-4 w-4 text-gray-400" />
                                </Button>
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>تعديل المنتج</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* زر النشر - يظهر فقط للمنتجات المسودة */}
                        {getPublicationStatus(product) === 'draft' && canEditProducts && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePublish(product)}
                                  className="h-8 w-8 p-0 hover:bg-green-50 dark:hover:bg-green-950/20"
                                >
                                  <Upload className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>نشر المنتج</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {/* زر إعادة إلى مسودة - يظهر فقط للمنتجات المنشورة */}
                        {getPublicationStatus(product) === 'published' && canEditProducts && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevertToDraft(product)}
                                  className="h-8 w-8 p-0 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
                                >
                                  <Undo2 className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>إرجاع إلى مسودة</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        
                        {/* زر الحذف - يظهر فقط عند وجود صلاحية */}
                        {canDeleteProducts && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(product)}
                                  className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950/20"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>حذف المنتج</p>
                              </TooltipContent>
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
                    {product.description ? product.description.substring(0, 60) : ''}
                    {product.description && product.description.length > 60 ? '...' : ''}
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
                  <div className="mt-2 flex flex-wrap gap-1">
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
                    {/* إضافة مؤشر حالة النشر */}
                    <div className="text-xs">
                      {getPublicationStatusBadge(getPublicationStatus(product))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-3 sm:p-4 pt-2 mt-auto flex-shrink-0 product-card-footer">
                  <div className="flex items-center justify-center gap-2 w-full product-card-buttons">
                    {/* زر العرض */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleView(product)}
                            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>عرض المنتج</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* زر العرض المباشر - يفتح صفحة الشراء */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handlePreviewProduct(product)}
                            className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-950/20"
                          >
                            <ExternalLink className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>عرض صفحة الشراء</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* زر التعديل */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {canEditProducts ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              asChild
                              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Link to={`/dashboard/product/${product.id}`}>
                                <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </Link>
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEdit(product)}
                              className="h-8 w-8 p-0 opacity-50 cursor-not-allowed"
                              disabled
                            >
                              <Edit className="h-4 w-4 text-gray-400" />
                            </Button>
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>تعديل المنتج</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* زر النشر - يظهر فقط للمنتجات المسودة */}
                    {getPublicationStatus(product) === 'draft' && canEditProducts && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handlePublish(product)}
                              className="h-8 w-8 p-0 hover:bg-green-50 dark:hover:bg-green-950/20"
                            >
                              <Upload className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>نشر المنتج</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {/* زر إعادة إلى مسودة - يظهر فقط للمنتجات المنشورة */}
                    {getPublicationStatus(product) === 'published' && canEditProducts && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleRevertToDraft(product)}
                              className="h-8 w-8 p-0 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
                            >
                              <Undo2 className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>إرجاع إلى مسودة</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {/* زر الحذف */}
                    {canDeleteProducts && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950/20"
                              onClick={() => handleDelete(product)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>حذف المنتج</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
