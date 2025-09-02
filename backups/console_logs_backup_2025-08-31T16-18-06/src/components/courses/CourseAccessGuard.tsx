import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { CoursesService, CourseAccessInfo } from '@/lib/courses-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  GraduationCap, 
  Crown, 
  Zap, 
  Clock, 
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { CoursesAccessType } from '@/types/activation';

interface CourseAccessGuardProps {
  courseId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const CourseAccessGuard: React.FC<CourseAccessGuardProps> = ({
  courseId,
  children,
  fallback
}) => {
  const { user, organizationId } = useUser();
  const [accessInfo, setAccessInfo] = useState<CourseAccessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !organizationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const access = await CoursesService.checkCourseAccess(
          courseId, 
          organizationId
        );
        setAccessInfo(access);
      } catch (err) {
        setError('حدث خطأ أثناء فحص الوصول للدورة');
        console.error('Error checking course access:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [courseId, user, organizationId]);

  // إذا كان التحميل جارياً
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري فحص الوصول...</p>
        </div>
      </div>
    );
  }

  // إذا لم يكن المستخدم مسجل الدخول
  if (!user) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Lock className="w-5 h-5" />
            تسجيل الدخول مطلوب
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            يجب عليك تسجيل الدخول للوصول لهذه الدورة
          </p>
          <Button className="w-full" onClick={() => window.location.href = '/login'}>
            تسجيل الدخول
          </Button>
        </CardContent>
      </Card>
    );
  }

  // إذا لم يكن المستخدم ينتمي لمؤسسة
  if (!organizationId) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Lock className="w-5 h-5" />
            مؤسسة مطلوبة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            يجب أن تكون عضواً في مؤسسة للوصول لهذه الدورة
          </p>
          <Button className="w-full" onClick={() => window.location.href = '/dashboard'}>
            العودة للوحة التحكم
          </Button>
        </CardContent>
      </Card>
    );
  }

  // إذا حدث خطأ أثناء فحص الوصول
  if (error) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            خطأ في فحص الوصول
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <Button className="w-full" onClick={() => window.location.reload()}>
            إعادة المحاولة
          </Button>
        </CardContent>
      </Card>
    );
  }

  // إذا لم يكن لديه وصول للدورة
  if (!accessInfo || !accessInfo.is_accessible) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Lock className="w-5 h-5" />
            لا يمكن الوصول للدورة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {accessInfo?.access_type === CoursesAccessType.LIFETIME ? 'مدى الحياة' : 'مؤقت'}
              </Badge>
            </div>
            
            {accessInfo?.expires_at && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                انتهت صلاحية الوصول في: {new Date(accessInfo.expires_at).toLocaleDateString('ar-SA')}
              </p>
            )}
            
            <div className="space-y-2">
              <p className="text-gray-600 dark:text-gray-400">
                للوصول لهذه الدورة، تحتاج إلى:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• اشتراك نشط في المؤسسة</li>
                <li>• أو كود تفعيل يمنح الوصول للدورات</li>
              </ul>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => window.location.href = '/dashboard/courses'}
              >
                عرض الدورات المتاحة
              </Button>
              <Button 
                className="flex-1"
                onClick={() => window.location.href = '/dashboard/subscription'}
              >
                تجديد الاشتراك
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // إذا كان لديه وصول، اعرض المحتوى
  return <>{children}</>;
};

export default CourseAccessGuard;
