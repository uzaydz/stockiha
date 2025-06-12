import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  User,
  UserCheck,
  UserX,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { fixMissingUser, checkAndFixUserStatus } from '@/lib/api/fix-missing-user';

interface SessionStatus {
  isOnline: boolean;
  sessionLoaded: boolean;
  userProfileLoaded: boolean;
  organizationLoaded: boolean;
  hasErrors: boolean;
  errorCount: number;
  lastErrorTime?: Date;
  userExists: boolean;
  userFixed: boolean;
}

interface ConsoleError {
  message: string;
  timestamp: Date;
  type: 'error' | 'warning' | 'info';
  source?: string;
}

export const SessionMonitor: React.FC = () => {
  const { 
    session, 
    user, 
    userProfile, 
    organization, 
    loading, 
    isLoadingUserProfile, 
    isLoadingOrganization 
  } = useAuth();

  const [status, setStatus] = useState<SessionStatus>({
    isOnline: navigator.onLine,
    sessionLoaded: false,
    userProfileLoaded: false,
    organizationLoaded: false,
    hasErrors: false,
    errorCount: 0,
    userExists: false,
    userFixed: false
  });

  const [consoleErrors, setConsoleErrors] = useState<ConsoleError[]>([]);
  const [isFixingUser, setIsFixingUser] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // مراقبة حالة الاتصال بالإنترنت
  useEffect(() => {
    const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // مراقبة أخطاء وحدة التحكم
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      const message = args.join(' ');
      
      // تجاهل أخطاء رفع الصور وملفات التخزين
      if (
        message.includes('storage/v1/object') ||
        message.includes('supabase.co/storage') ||
        message.includes('organization-assets') ||
        message.includes('.jpg') ||
        message.includes('.png') ||
        message.includes('.jpeg') ||
        message.includes('.gif') ||
        message.includes('.webp') ||
        message.includes('.svg') ||
        message.includes('.ico')
      ) {
        // تجاهل أخطاء الصور والملفات
        originalError.apply(console, args);
        return;
      }
      
      // تصفية الأخطاء المهمة
      if (
        message.includes('406') ||
        message.includes('Not Acceptable') ||
        message.includes('فشل في تحميل') ||
        message.includes('المستخدم غير موجود') ||
        message.includes('check_user_requires_2fa')
      ) {
        // منع تكرار نفس الخطأ خلال 5 ثوانٍ
        const now = new Date();
        const lastError = consoleErrors[0];
        
        if (lastError && 
            lastError.message === message && 
            now.getTime() - lastError.timestamp.getTime() < 5000) {
          // تجاهل الخطأ المتكرر
          originalError.apply(console, args);
          return;
        }
        
        setConsoleErrors(prev => {
          const newError: ConsoleError = {
            message,
            timestamp: new Date(),
            type: 'error',
            source: 'console'
          };
          return [newError, ...prev.slice(0, 9)]; // الاحتفاظ بآخر 10 أخطاء
        });

        setStatus(prev => ({
          ...prev,
          hasErrors: true,
          errorCount: prev.errorCount + 1,
          lastErrorTime: new Date()
        }));
      }

      // تصفية الأخطاء المعروفة والمتوقعة
      const errorMessage = args.join(' ');
      
      // تجاهل أخطاء React Query المتعلقة بإلغاء الاستعلامات
      if (
        errorMessage.includes('CancelledError') ||
        errorMessage.includes('dehydrated as pending') ||
        errorMessage.includes('AbortError') ||
        errorMessage.includes('The operation was aborted')
      ) {
        return;
      }
      
      // تجاهل أخطاء Supabase Auth المؤقتة
      if (
        errorMessage.includes('Failed to fetch') &&
        (errorMessage.includes('_getUser') ||
         errorMessage.includes('_useSession') ||
         errorMessage.includes('supabase.co/auth'))
      ) {
        return;
      }
      
      // تجاهل أخطاء Supabase Storage المؤقتة
      if (
        errorMessage.includes('Failed to fetch') &&
        (errorMessage.includes('storage/v1/object') || 
         errorMessage.includes('organization-assets'))
      ) {
        return;
      }
      
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args.join(' ');
      
      // تجاهل تحذيرات الصور والملفات
      if (
        message.includes('storage/v1/object') ||
        message.includes('supabase.co/storage') ||
        message.includes('organization-assets') ||
        message.includes('.jpg') ||
        message.includes('.png') ||
        message.includes('.jpeg') ||
        message.includes('.gif') ||
        message.includes('.webp') ||
        message.includes('.svg') ||
        message.includes('.ico')
      ) {
        // تجاهل تحذيرات الصور والملفات
        originalWarn.apply(console, args);
        return;
      }
      
      if (message.includes('406') || message.includes('session')) {
        // منع تكرار نفس التحذير خلال 5 ثوانٍ
        const now = new Date();
        const lastError = consoleErrors[0];
        
        if (lastError && 
            lastError.message === message && 
            now.getTime() - lastError.timestamp.getTime() < 5000) {
          // تجاهل التحذير المتكرر
          originalWarn.apply(console, args);
          return;
        }
        
        setConsoleErrors(prev => {
          const newError: ConsoleError = {
            message,
            timestamp: new Date(),
            type: 'warning',
            source: 'console'
          };
          return [newError, ...prev.slice(0, 9)];
        });
      }

      originalWarn.apply(console, args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [consoleErrors]);

  // تحديث حالة الجلسة
  useEffect(() => {
    setStatus(prev => ({
      ...prev,
      sessionLoaded: !!session && !!user,
      userProfileLoaded: !isLoadingUserProfile && !!userProfile,
      organizationLoaded: !isLoadingOrganization
    }));
  }, [session, user, userProfile, organization, isLoadingUserProfile, isLoadingOrganization]);

  // فحص حالة المستخدم عند تسجيل الدخول
  useEffect(() => {
    const checkUserStatus = async () => {
      if (user && !userProfile && !isLoadingUserProfile) {
        
        try {
          const result = await checkAndFixUserStatus();
          
          setStatus(prev => ({
            ...prev,
            userExists: result.details.dbUserExists,
            userFixed: result.details.userFixed
          }));

          if (result.details.userFixed) {
            toast.success('تم إصلاح بيانات المستخدم بنجاح');
            // إعادة تحميل الصفحة لتحديث البيانات
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else if (!result.details.dbUserExists && user?.email) {
            // محاولة إضافية لإصلاح المستخدم
            const { fixUserWithDatabaseFunction } = await import('@/lib/api/fix-missing-user');
            const fixResult = await fixUserWithDatabaseFunction(user.email);
            
            if (fixResult.success && fixResult.action !== 'none') {
              toast.success('تم إصلاح المستخدم بنجاح');
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            }
          }
        } catch (error) {
        }
      }
    };

    checkUserStatus();
  }, [user, userProfile, isLoadingUserProfile]);

  // دالة إصلاح المستخدم يدوياً
  const handleFixUser = useCallback(async () => {
    if (!user) return;

    setIsFixingUser(true);
    try {
      const result = await fixMissingUser();
      
      if (result.success) {
        toast.success(result.message);
        setStatus(prev => ({
          ...prev,
          userExists: true,
          userFixed: !!result.userCreated
        }));
        
        // إعادة تحميل الصفحة لتحديث البيانات
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('حدث خطأ في إصلاح المستخدم');
    } finally {
      setIsFixingUser(false);
    }
  }, [user]);

  // دالة مسح الأخطاء
  const clearErrors = useCallback(() => {
    setConsoleErrors([]);
    setStatus(prev => ({
      ...prev,
      hasErrors: false,
      errorCount: 0,
      lastErrorTime: undefined
    }));
  }, []);

  // إذا كان كل شيء يعمل بشكل طبيعي، لا تظهر شيئاً
  if (
    status.isOnline && 
    status.sessionLoaded && 
    status.userProfileLoaded && 
    status.organizationLoaded && 
    !status.hasErrors &&
    status.userExists
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md space-y-2">
      {/* حالة الاتصال */}
      {!status.isOnline && (
        <Alert className="border-orange-200 bg-orange-50">
          <WifiOff className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            لا يوجد اتصال بالإنترنت
          </AlertDescription>
        </Alert>
      )}

      {/* حالة تحميل الجلسة */}
      {loading && (
        <Alert className="border-blue-200 bg-blue-50">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-800">
            تم تسجيل الدخول، بدء تهيئة الجلسة...
          </AlertDescription>
        </Alert>
      )}

      {/* مشكلة المستخدم المفقود */}
      {user && !userProfile && !isLoadingUserProfile && (
        <Alert className="border-red-200 bg-red-50">
          <UserX className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="space-y-2">
              <p>جاري إعداد بيانات المستخدم...</p>
              <p className="text-sm text-red-600">
                المستخدم: {user.email}
              </p>
              <div className="text-xs text-red-500 mt-2">
                قد يستغرق الأمر بضع ثوانٍ، من فضلك انتظر...
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* معالجة خاصة للمستخدمين الذين لديهم مشاكل فعلية في البيانات */}
      {user && !userProfile && !isLoadingUserProfile && status.hasErrors && (
        <Alert className="border-red-200 bg-red-50">
          <UserX className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="space-y-2">
              <p>هناك مشكلة في تحميل بيانات المستخدم</p>
              <p className="text-sm text-red-600">
                المستخدم: {user.email}
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleFixUser}
                disabled={isFixingUser}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                {isFixingUser ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    جاري الإصلاح...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-3 w-3 mr-1" />
                    إصلاح المستخدم
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* حالة الأخطاء */}
      {status.hasErrors && consoleErrors.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  تم اكتشاف أخطاء ({status.errorCount})
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDetails(!showDetails)}
                className="text-yellow-700 hover:bg-yellow-100"
              >
                {showDetails ? 'إخفاء' : 'عرض'}
              </Button>
            </div>

            {showDetails && (
              <div className="space-y-2">
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {consoleErrors.slice(0, 3).map((error, index) => (
                    <div key={index} className="text-xs p-2 bg-yellow-100 rounded border">
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant={error.type === 'error' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {error.type}
                        </Badge>
                        <span className="text-yellow-600">
                          {error.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-yellow-800 mt-1 break-words">
                        {error.message.substring(0, 100)}
                        {error.message.length > 100 && '...'}
                      </p>
                    </div>
                  ))}
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearErrors}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                  >
                    مسح الأخطاء
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    إعادة تحميل
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* حالة نجاح الإصلاح */}
      {status.userFixed && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            تم إصلاح بيانات المستخدم بنجاح
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Hook لاستخدام مراقب الجلسة
export const useSessionMonitor = () => {
  const { session, user, userProfile, loading } = useAuth();
  
  return {
    isSessionHealthy: !!session && !!user && !!userProfile && !loading,
    hasSession: !!session,
    hasUser: !!user,
    hasUserProfile: !!userProfile,
    isLoading: loading
  };
};

// تصدير افتراضي للمكون
export default SessionMonitor;
