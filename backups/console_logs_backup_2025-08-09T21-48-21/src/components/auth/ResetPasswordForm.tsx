import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-unified';
import { Eye, EyeOff, Lock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import AuthLayout from './AuthLayout';

interface PasswordStrength {
  score: number;
  feedback: string[];
}

const ResetPasswordForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: []
  });

  // استخراج الرموز المميزة من URL
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  // أيضاً التحقق من hash fragment إذا كان موجوداً
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const hashAccessToken = hashParams.get('access_token');
  const hashRefreshToken = hashParams.get('refresh_token');
  const hashToken = hashParams.get('token');
  const hashType = hashParams.get('type');

  // استخدام الرموز من query parameters أولاً، ثم من hash fragment
  const finalAccessToken = accessToken || hashAccessToken;
  const finalRefreshToken = refreshToken || hashRefreshToken;
  const finalToken = token || hashToken;
  const finalType = type || hashType;

  useEffect(() => {
    // التحقق من وجود رموز صالحة
    const hasValidTokens = (finalAccessToken && finalRefreshToken) || finalToken;
    
    console.log('Checking tokens:', { 
      accessToken: !!finalAccessToken, 
      refreshToken: !!finalRefreshToken,
      token: !!finalToken,
      type: finalType,
      url: window.location.href,
      search: window.location.search,
      hash: window.location.hash
    });
    
    if (!hasValidTokens || finalType !== 'recovery') {
      console.log('Tokens not found:', { 
        accessToken: !!finalAccessToken, 
        refreshToken: !!finalRefreshToken,
        token: !!finalToken,
        type: finalType,
        url: window.location.href,
        search: window.location.search,
        hash: window.location.hash
      });
      
      toast.error('رابط غير صالح لإعادة تعيين كلمة المرور');
      navigate('/forgot-password');
    } else {
      console.log('Valid tokens found:', { 
        hasAccessToken: !!finalAccessToken, 
        hasRefreshToken: !!finalRefreshToken,
        hasToken: !!finalToken,
        type: finalType
      });
    }
  }, [finalAccessToken, finalRefreshToken, finalToken, finalType, navigate]);

  // دالة تقييم قوة كلمة المرور
  const evaluatePasswordStrength = (password: string): PasswordStrength => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('يجب أن تكون كلمة المرور 8 أحرف على الأقل');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('يجب أن تحتوي على حرف صغير');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('يجب أن تحتوي على حرف كبير');
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('يجب أن تحتوي على رقم');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('يجب أن تحتوي على رمز خاص');
    }

    return { score, feedback };
  };

  // مراقبة تغييرات كلمة المرور
  useEffect(() => {
    if (password) {
      setPasswordStrength(evaluatePasswordStrength(password));
    } else {
      setPasswordStrength({ score: 0, feedback: [] });
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من وجود رموز صالحة
    const hasValidTokens = (finalAccessToken && finalRefreshToken) || finalToken;
    
    if (!hasValidTokens || finalType !== 'recovery') {
      toast.error('رابط غير صالح لإعادة تعيين كلمة المرور');
      navigate('/forgot-password');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }

    if (passwordStrength.score < 3) {
      toast.error('كلمة المرور ضعيفة جداً، يرجى اختيار كلمة مرور أقوى');
      return;
    }

    setIsLoading(true);

    try {
      let sessionData;
      let sessionError;

      if (finalToken) {
        // إذا كان لدينا token واحد، نستخدم verifyOtp
        console.log('Using single token for verification:', finalToken);
        
        // التحقق من صحة الـ token
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: finalToken,
          type: 'recovery'
        });
        
        if (verifyError) {
          console.error('خطأ في التحقق من الـ token:', verifyError);
          toast.error('رابط غير صالح أو منتهي الصلاحية');
          navigate('/forgot-password');
          return;
        }
        
        // تحديث كلمة المرور مباشرة
        const { data, error } = await supabase.auth.updateUser({
          password: password
        });
        
        if (error) {
          console.error('خطأ في تحديث كلمة المرور:', error);
          toast.error('حدث خطأ في تحديث كلمة المرور');
          return;
        }
        
        sessionData = data;
      } else {
        // إذا كان لدينا access_token و refresh_token، نستخدم setSession
        console.log('Using access_token and refresh_token for session');
        
        const { data, error } = await supabase.auth.setSession({
          access_token: finalAccessToken,
          refresh_token: finalRefreshToken
        });
        
        if (error) {
          console.error('خطأ في تعيين الجلسة:', error);
          toast.error('رابط غير صالح أو منتهي الصلاحية');
          navigate('/forgot-password');
          return;
        }
        
        // تحديث كلمة المرور
        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
          password: password
        });
        
        if (updateError) {
          console.error('خطأ في تحديث كلمة المرور:', updateError);
          toast.error('حدث خطأ في تحديث كلمة المرور');
          return;
        }
        
        sessionData = updateData;
      }

      setIsSuccess(true);
      toast.success('تم تحديث كلمة المرور بنجاح');
      
      // تسجيل الخروج بعد تحديث كلمة المرور لضمان الأمان
      await supabase.auth.signOut();
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

  const getStrengthColor = (score: number) => {
    if (score <= 1) return 'bg-red-500';
    if (score <= 2) return 'bg-orange-500';
    if (score <= 3) return 'bg-yellow-500';
    if (score <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number) => {
    if (score <= 1) return 'ضعيفة جداً';
    if (score <= 2) return 'ضعيفة';
    if (score <= 3) return 'متوسطة';
    if (score <= 4) return 'قوية';
    return 'قوية جداً';
  };

  if (isSuccess) {
    return (
      <AuthLayout
        title="تم التحديث بنجاح"
        subtitle="تم تحديث كلمة المرور بنجاح"
        icon={<CheckCircle className="w-8 h-8 text-white" />}
        iconBgColor="from-green-500 to-green-600"
      >
        <Card className="shadow-xl border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center">تم تحديث كلمة المرور</CardTitle>
            <CardDescription className="text-center text-gray-600 dark:text-gray-300">
              يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Lock className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بحسابك.
              </p>
            </div>
          </CardContent>
          
          <CardFooter className="border-t bg-gray-50/50 dark:bg-gray-800/50 rounded-b-lg">
            <Button 
              onClick={handleBackToLogin}
              className="w-full h-12 bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/80 hover:from-[#fc5d41]/90 hover:to-[#fc5d41] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              تسجيل الدخول
            </Button>
          </CardFooter>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="إعادة تعيين كلمة المرور"
      subtitle="أدخل كلمة المرور الجديدة"
      icon={<Lock className="w-8 h-8 text-white" />}
    >
      <Card className="shadow-xl border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-semibold text-center">كلمة المرور الجديدة</CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-300">
            اختر كلمة مرور قوية وآمنة
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور الجديدة</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  required
                  autoComplete="new-password"
                  className="text-right pl-20 pr-10 h-12 border-2 border-gray-200 focus:border-[#fc5d41] focus:ring-2 focus:ring-[#fc5d41]/20 transition-all duration-200 rounded-lg bg-white/80 backdrop-blur-sm"
                  dir="rtl"
                />
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-[#fc5d41]" />
                
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:text-[#fc5d41]"
                  title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* مؤشر قوة كلمة المرور */}
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">قوة كلمة المرور:</span>
                    <span className={`font-medium ${
                      passwordStrength.score <= 1 ? 'text-red-500' :
                      passwordStrength.score <= 2 ? 'text-orange-500' :
                      passwordStrength.score <= 3 ? 'text-yellow-500' :
                      passwordStrength.score <= 4 ? 'text-blue-500' : 'text-green-500'
                    }`}>
                      {getStrengthText(passwordStrength.score)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength.score)}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                  
                  {/* قائمة المتطلبات */}
                  <div className="space-y-1">
                    {passwordStrength.feedback.map((feedback, index) => (
                      <div key={index} className="flex items-center text-xs">
                        {passwordStrength.score >= index + 1 ? (
                          <CheckCircle className="w-3 h-3 text-green-500 ml-1" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500 ml-1" />
                        )}
                        <span className={passwordStrength.score >= index + 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {feedback}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                  required
                  autoComplete="new-password"
                  className="text-right pl-20 pr-10 h-12 border-2 border-gray-200 focus:border-[#fc5d41] focus:ring-2 focus:ring-[#fc5d41]/20 transition-all duration-200 rounded-lg bg-white/80 backdrop-blur-sm"
                  dir="rtl"
                />
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-[#fc5d41]" />
                
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:text-[#fc5d41]"
                  title={showConfirmPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                  <XCircle className="w-4 h-4 ml-1" />
                  كلمات المرور غير متطابقة
                </p>
              )}
              
              {confirmPassword && password === confirmPassword && (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
                  <CheckCircle className="w-4 h-4 ml-1" />
                  كلمات المرور متطابقة
                </p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/80 hover:from-[#fc5d41]/90 hover:to-[#fc5d41] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none rounded-lg" 
              disabled={isLoading || passwordStrength.score < 3 || password !== confirmPassword}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جارٍ التحديث...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Lock className="w-5 h-5 ml-2" />
                  تحديث كلمة المرور
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

export default ResetPasswordForm; 