import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-unified';
import { ArrowRight, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import AuthLayout from './AuthLayout';

const ForgotPasswordForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('يرجى إدخال بريدك الإلكتروني');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('خطأ في إرسال رابط إعادة تعيين كلمة المرور:', error);
        toast.error('حدث خطأ في إرسال رابط إعادة تعيين كلمة المرور');
        return;
      }

      setIsEmailSent(true);
      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
    } catch (error) {
      console.error('خطأ غير متوقع:', error);
      toast.error('حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleResendEmail = () => {
    setIsEmailSent(false);
    setEmail('');
  };

  if (isEmailSent) {
    return (
      <AuthLayout
        title="تم إرسال الرابط"
        subtitle="تحقق من بريدك الإلكتروني"
        icon={<CheckCircle className="w-8 h-8 text-white" />}
        iconBgColor="from-green-500 to-green-600"
      >
        <Card className="shadow-xl border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center">تم إرسال الرابط بنجاح</CardTitle>
            <CardDescription className="text-center text-gray-600 dark:text-gray-300">
              تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                تحقق من مجلد الرسائل الواردة أو مجلد الرسائل المزعجة
              </p>
            </div>
          </CardContent>
          
          <CardFooter className="border-t bg-gray-50/50 dark:bg-gray-800/50 rounded-b-lg">
            <div className="w-full space-y-3">
              <Button 
                onClick={handleBackToLogin}
                variant="outline"
                className="w-full h-12 border-2 border-gray-200 hover:border-[#fc5d41] hover:bg-[#fc5d41]/5 text-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:border-[#fc5d41] dark:hover:bg-[#fc5d41]/10 transition-all duration-200 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4 ml-2" />
                العودة لتسجيل الدخول
              </Button>
              <Button 
                onClick={handleResendEmail}
                className="w-full h-12 bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/80 hover:from-[#fc5d41]/90 hover:to-[#fc5d41] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] rounded-lg"
              >
                إعادة إرسال الرابط
              </Button>
            </div>
          </CardFooter>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="نسيت كلمة المرور؟"
      subtitle="أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور"
      icon={
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      }
    >
      <Card className="shadow-xl border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-semibold text-center">إعادة تعيين كلمة المرور</CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-300">
            سنرسل لك رابطاً لإعادة تعيين كلمة المرور
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="أدخل بريدك الإلكتروني"
                  required
                  autoComplete="username"
                  className="text-right pl-10 h-12 border-2 border-gray-200 focus:border-[#fc5d41] focus:ring-2 focus:ring-[#fc5d41]/20 transition-all duration-200 rounded-lg bg-white/80 backdrop-blur-sm"
                  dir="rtl"
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-[#fc5d41]" />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/80 hover:from-[#fc5d41]/90 hover:to-[#fc5d41] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none rounded-lg" 
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جارٍ الإرسال...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 ml-2" />
                  إرسال رابط إعادة التعيين
                </div>
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="border-t bg-gray-50/50 dark:bg-gray-800/50 rounded-b-lg">
          <div className="w-full text-center">
            <Button 
              onClick={handleBackToLogin}
              variant="ghost"
              className="text-sm font-medium text-[#fc5d41] hover:text-[#fc5d41]/80 dark:text-[#fc5d41] dark:hover:text-[#fc5d41]/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 ml-1" />
              العودة لتسجيل الدخول
            </Button>
          </div>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
};

export default ForgotPasswordForm; 