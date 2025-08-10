import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  iconBgColor?: string;
  showFooter?: boolean;
}

const AuthLayout = ({ 
  children, 
  title, 
  subtitle, 
  icon, 
  iconBgColor = "from-[#fc5d41] to-[#fc5d41]/80",
  showFooter = true 
}: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-8">
      <div className="w-full max-w-md mx-auto">
        {/* شعار أو أيقونة */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${iconBgColor} rounded-full mb-4 shadow-lg`}>
            {icon}
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/80 bg-clip-text text-transparent">
            {title}
          </h1>
          {subtitle && (
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              {subtitle}
            </p>
          )}
        </div>

        {/* المحتوى الرئيسي */}
        {children}
        
        {/* معلومات إضافية في أسفل الصفحة */}
        {showFooter && (
          <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
            <p>© 2025 سطوكيها - منصة التجارة الإلكترونية. جميع الحقوق محفوظة.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthLayout;
