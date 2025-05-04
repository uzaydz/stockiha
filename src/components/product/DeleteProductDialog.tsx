import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { deleteProduct, disableProduct } from '@/lib/api/products';
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
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Product } from '@/lib/api/products';
import { useAuth } from '@/context/AuthContext';
import { EmployeePermissions } from '@/types/employee';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { checkUserPermissions, refreshUserData } from '@/lib/api/permissions';

interface DeleteProductDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductDeleted: () => Promise<void>;
}

const DeleteProductDialog = ({ product, open, onOpenChange, onProductDeleted }: DeleteProductDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDisableOption, setShowDisableOption] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);

  // استدعاء معلومات المستخدم من سياق المصادقة
  const { user } = useAuth();
  
  // التحقق من صلاحيات الحذف مع تأخير صغير للتأكد من التحميل الكامل
  useEffect(() => {
    if (!open) {
      return; // لا تفعل شيئاً إذا كان المربع مغلقاً
    }
    
    let isMounted = true;
    const checkPermissions = async () => {
      setIsCheckingPermissions(true);
      setShowPermissionAlert(false); // إعادة تعيين حالة الإنذار
      
      if (!user) {
        if (isMounted) {
          setHasPermission(false);
          setIsCheckingPermissions(false);
          setShowPermissionAlert(true);
        }
        return;
      }
      
      try {
        // تحديث بيانات المستخدم من قاعدة البيانات
        const userData = await refreshUserData(user.id);
        
        // دمج البيانات المحدثة مع بيانات المستخدم الحالية
        const mergedUserData = {
          ...user,
          permissions: userData?.permissions || user.user_metadata?.permissions,
          is_org_admin: userData?.is_org_admin || user.user_metadata?.is_org_admin,
          is_super_admin: userData?.is_super_admin || user.user_metadata?.is_super_admin,
          role: userData?.role || user.user_metadata?.role,
        };
        
        // طباعة بيانات التصحيح
        console.log('مكون DeleteProductDialog - بيانات المستخدم للتحقق:', mergedUserData);
        
        // التحقق من الصلاحيات - يجب انتظار حل الوعد (Promise)
        const canDeletePromise = checkUserPermissions(mergedUserData, 'deleteProducts');
        
        // انتظار نتيجة الوعد
        const canDelete = await canDeletePromise;
        
        console.log(`مكون DeleteProductDialog - نتيجة التحقق من صلاحية الحذف: ${canDelete}`);
        
        if (isMounted) {
          setHasPermission(canDelete);
          
          // إظهار تنبيه إذا لم يكن لدى المستخدم الصلاحية
          if (!canDelete) {
            console.log('المستخدم ليس لديه صلاحية الحذف، إظهار التنبيه');
            setShowPermissionAlert(true);
          } else {
            console.log('المستخدم لديه صلاحية الحذف، إخفاء التنبيه');
            setShowPermissionAlert(false);
          }
        }
      } catch (error) {
        console.error('خطأ في التحقق من صلاحيات الحذف:', error);
        
        // في حالة الخطأ، تحقق مباشرة من البيانات الخام
        const permissions = user.user_metadata?.permissions || {};
        const isAdmin = 
          user.user_metadata?.role === 'admin' || 
          user.user_metadata?.role === 'owner' || 
          user.user_metadata?.is_org_admin === true;
        
        const fallbackPermission = isAdmin || 
          Boolean(permissions.deleteProducts) || 
          Boolean(permissions.manageProducts);
        
        if (isMounted) {
          setHasPermission(fallbackPermission);
          setShowPermissionAlert(!fallbackPermission);
        }
      } finally {
        if (isMounted) {
          setIsCheckingPermissions(false);
        }
      }
    };
    
    checkPermissions();
    
    // تنظيف عند إلغاء تحميل المكون
    return () => {
      isMounted = false;
    };
  }, [user, open, product?.id]);
  
  // عند بدء التحقق من الصلاحيات، أظهر مؤشر التحميل
  if (isCheckingPermissions) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <div className="flex flex-col items-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-center text-sm text-muted-foreground">
              جاري التحقق من الصلاحيات...
            </p>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const handleDelete = async () => {
    // التحقق مرة أخرى من الصلاحيات قبل محاولة الحذف
    if (!hasPermission) {
      console.log('فشل التحقق من الصلاحيات في handleDelete');
      setShowPermissionAlert(true);
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteProduct(product.id);
      toast.success(`تم حذف المنتج "${product.name}" بنجاح`);
      onOpenChange(false);
      await onProductDeleted();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      
      if (error.code === 'PRODUCT_IN_USE') {
        setShowDisableOption(true);
        toast.error(error.message || 'لا يمكن حذف المنتج لأنه مستخدم في طلبات سابقة');
      } else if (error.code === '23503') {
        setShowDisableOption(true);
        toast.error('لا يمكن حذف المنتج لأنه مستخدم في طلبات سابقة. يمكنك تعطيل المنتج بدلاً من حذفه.');
      } else if (error.code === 'PGRST301') {
        // خطأ صلاحيات قاعدة البيانات
        console.log('خطأ PGRST301: ليس لديك صلاحية كافية في قاعدة البيانات');
        setShowPermissionAlert(true);
      } else {
        toast.error('حدث خطأ أثناء حذف المنتج');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDisable = async () => {
    // التحقق من الصلاحيات قبل محاولة التعطيل
    if (!hasPermission) {
      console.log('فشل التحقق من الصلاحيات في handleDisable');
      setShowPermissionAlert(true);
      return;
    }
    
    setIsDisabling(true);
    try {
      await disableProduct(product.id);
      toast.success(`تم تعطيل المنتج "${product.name}" بنجاح. لن يظهر في نقاط البيع.`);
      onOpenChange(false);
      await onProductDeleted();
    } catch (error) {
      console.error('Error disabling product:', error);
      toast.error('حدث خطأ أثناء تعطيل المنتج');
    } finally {
      setIsDisabling(false);
    }
  };

  const handleClose = () => {
    console.log('تم استدعاء handleClose');
    setShowPermissionAlert(false);
    onOpenChange(false);
  };

  // إذا كان المستخدم لا يملك الصلاحية، أظهر نافذة تنبيه
  if (showPermissionAlert) {
    console.log('عرض نافذة الصلاحيات غير كافية');
    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              عدم وجود صلاحية كافية
            </AlertDialogTitle>
            <AlertDialogDescription>
              ليس لديك صلاحية لحذف المنتجات. يرجى التواصل مع مدير النظام للحصول على هذه الصلاحية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>تنبيه أمان</AlertTitle>
              <AlertDescription>
                تتطلب هذه العملية صلاحيات خاصة لم يتم منحها لحسابك.
              </AlertDescription>
            </Alert>
          </div>
          <AlertDialogFooter>
            <Button
              variant="secondary"
              onClick={handleClose}
            >
              فهمت
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {showDisableOption 
              ? 'هل تريد تعطيل المنتج بدلاً من حذفه؟'
              : 'هل أنت متأكد من حذف هذا المنتج؟'
            }
          </AlertDialogTitle>
          <AlertDialogDescription>
            {showDisableOption ? (
              <>
                لا يمكن حذف المنتج <strong className="text-foreground">{product.name}</strong> لأنه مرتبط بطلبات سابقة.
                <br />
                يمكنك تعطيل المنتج بدلاً من حذفه، مما سيؤدي إلى إخفائه من نقاط البيع مع الحفاظ على سجلات الطلبات السابقة.
              </>
            ) : (
              <>
                أنت على وشك حذف المنتج <strong className="text-foreground">{product.name}</strong>.
                <br />
                هذا الإجراء لا يمكن التراجع عنه وسيتم حذف المنتج نهائياً من النظام.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting || isDisabling}>إلغاء</AlertDialogCancel>
          
          {showDisableOption ? (
            <Button 
              variant="secondary" 
              onClick={handleDisable} 
              disabled={isDisabling}
            >
              {isDisabling && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              تعطيل المنتج
            </Button>
          ) : (
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حذف المنتج
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteProductDialog; 