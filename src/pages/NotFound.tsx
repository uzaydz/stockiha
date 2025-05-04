import { useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();
  const isSignupPath = location.pathname === '/signup';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-xl">
        <h1 className="text-6xl font-bold text-primary">{isSignupPath ? 'تسجيل الموظفين' : '404'}</h1>
        <h2 className="text-2xl font-semibold mt-6 mb-4">
          {isSignupPath 
            ? 'تم تعطيل التسجيل الذاتي للموظفين' 
            : 'صفحة غير موجودة'}
        </h2>
        <p className="text-muted-foreground mb-8">
          {isSignupPath 
            ? 'يتم إضافة الموظفين فقط من خلال مسؤول المؤسسة. إذا كنت تريد الانضمام كموظف، يرجى التواصل مع مسؤول المؤسسة ليقوم بإضافتك.' 
            : 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.'}
        </p>
        <Button asChild>
          <Link to="/">{isSignupPath ? 'العودة للصفحة الرئيسية' : 'الصفحة الرئيسية'}</Link>
        </Button>
        {isSignupPath && (
          <Button variant="outline" className="mt-4 mr-4" asChild>
            <Link to="/login">تسجيل الدخول</Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default NotFound;
