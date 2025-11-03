/**
 * صفحة انتهاء الاشتراك الاحترافية
 * تظهر عند انتهاء صلاحية اشتراك المؤسسة
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SubscriptionExpiredPageProps {
  onNavigateToSubscription: () => void;
}

const SubscriptionExpiredPage: React.FC<SubscriptionExpiredPageProps> = ({
  onNavigateToSubscription
}) => {
  const { user, organization } = useAuth();
  const { organization: orgData } = useTenant();
  const [hasCoursesAccess, setHasCoursesAccess] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // التحقق من صلاحيات الوصول للدورات
  useEffect(() => {
    const checkCoursesAccess = async () => {
      if (!organization?.id) {
        setLoadingCourses(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('organization_course_access')
          .select('id, expires_at')
          .eq('organization_id', organization.id)
          .limit(1)
          .single();

        if (!error && data) {
          // التحقق من أن الوصول لم ينته أو أنه مدى الحياة (expires_at = null)
          const hasAccess = !data.expires_at || new Date(data.expires_at) > new Date();
          setHasCoursesAccess(hasAccess);
        }
      } catch (err) {
        console.error('Error checking courses access:', err);
      } finally {
        setLoadingCourses(false);
      }
    };

    checkCoursesAccess();
  }, [organization?.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-2xl border-2">
        <CardContent className="pt-12 pb-10 px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-950 dark:to-orange-950 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              اشتراكك منتهي الصلاحية
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              انتهت صلاحية اشتراكك في نظام سطوكيها
            </p>
          </div>

          {/* معلومات الحساب */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 rounded-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">اسم المؤسسة</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {orgData?.name || organization?.name || 'غير محدد'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">حالة الاشتراك</p>
                <Badge variant="destructive" className="font-medium">
                  منتهي الصلاحية
                </Badge>
              </div>
            </div>
          </div>

          {/* الرسالة الرئيسية */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-3 text-lg">
              للاستمرار في استخدام النظام
            </h3>
            <ul className="space-y-2.5 text-amber-800 dark:text-amber-200">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-2"></span>
                <span>يرجى تجديد اشتراكك لاستعادة الوصول الكامل لجميع الميزات</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-2"></span>
                <span>تواصل مع فريق المبيعات للحصول على عروض خاصة</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-2"></span>
                <span>جميع بياناتك محفوظة بشكل آمن ويمكنك استعادتها عند التجديد</span>
              </li>
            </ul>
          </div>

          {/* الأزرار */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={onNavigateToSubscription}
              size="lg"
              className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all"
            >
              تجديد الاشتراك
            </Button>

            {!loadingCourses && hasCoursesAccess && (
              <Button
                onClick={() => window.location.href = '/courses'}
                size="lg"
                variant="outline"
                className="flex-1 h-12 text-base font-semibold border-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                الانتقال للدورات التدريبية
              </Button>
            )}
          </div>

          {/* ملاحظة الدورات */}
          {!loadingCourses && hasCoursesAccess && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200 text-center">
                <span className="font-semibold">ملاحظة:</span> لديك وصول مستمر للدورات التدريبية
              </p>
            </div>
          )}

          {/* معلومات إضافية */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              للمساعدة أو الاستفسارات، يرجى التواصل مع فريق الدعم
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionExpiredPage;
