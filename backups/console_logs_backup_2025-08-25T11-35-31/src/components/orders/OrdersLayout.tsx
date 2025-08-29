import { memo, ReactNode } from "react";
import Layout from "@/components/Layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldAlert, AlertTriangle } from "lucide-react";

interface OrdersLayoutProps {
  children: ReactNode;
  permissions: {
    view: boolean;
    loading: boolean;
  };
  error?: string | null;
}

const OrdersLayout = memo(({ children, permissions, error }: OrdersLayoutProps) => {
  // Loading state
  if (permissions.loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin ml-2" />
          <span>جاري التحميل...</span>
        </div>
      </Layout>
    );
  }

  // Permission denied state
  if (!permissions.view) {
    return (
      <Layout>
        <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>غير مصرح</AlertTitle>
          <AlertDescription>
            ليس لديك صلاحية لعرض صفحة الطلبات. يرجى التواصل مع مدير النظام.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Error state */}
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
            <AlertDescription>
              حدث خطأ أثناء جلب البيانات. يرجى المحاولة مرة أخرى أو تحديث الصفحة.
            </AlertDescription>
          </Alert>
        )}
        
        {children}
      </div>
    </Layout>
  );
});

OrdersLayout.displayName = "OrdersLayout";

export default OrdersLayout;
