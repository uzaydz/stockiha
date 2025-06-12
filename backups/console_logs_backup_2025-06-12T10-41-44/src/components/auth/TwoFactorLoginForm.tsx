import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, AlertTriangle } from 'lucide-react';
import { verify2FAForLogin } from '@/lib/api/security';

interface TwoFactorLoginFormProps {
  userId: string;
  userName: string;
  email: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function TwoFactorLoginForm({ 
  userId, 
  userName, 
  email, 
  onSuccess, 
  onBack 
}: TwoFactorLoginFormProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  // تنظيف الحقول عند التحميل
  useEffect(() => {
    setCode('');
    setError(null);
    setAttempts(0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔐 [2FA Form] Submitting verification for:', userName);
    
    if (!code.trim()) {
      setError('يرجى إدخال رمز المصادقة الثنائية');
      return;
    }

    if (code.length !== 6) {
      setError('رمز المصادقة الثنائية يجب أن يكون 6 أرقام');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await verify2FAForLogin(userId, code);
      
      if (result.success) {
        console.log('✅ [2FA Form] Verification successful, proceeding to login');
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= maxAttempts) {
          console.log('🛑 [2FA Form] Max attempts reached, blocking user');
          setError('تم تجاوز الحد الأقصى للمحاولات. يرجى المحاولة لاحقاً.');
        } else {
          console.log('❌ [2FA Form] Verification failed, attempts remaining:', maxAttempts - newAttempts);
          setError(result.error || 'رمز المصادقة الثنائية غير صحيح');
        }
        
        setCode(''); // مسح الرمز للمحاولة التالية
      }
    } catch (error) {
      console.error('💥 [2FA Form] Exception:', error);
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const isBlocked = attempts >= maxAttempts;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
          <Shield className="h-6 w-6" />
          المصادقة الثنائية
        </CardTitle>
        <CardDescription className="text-center space-y-2">
          <span className="block">مرحباً {userName}</span>
          <span className="block">يرجى إدخال رمز المصادقة الثنائية من تطبيق المصادقة</span>
          <span className="block text-xs text-muted-foreground">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isBlocked && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">رمز المصادقة الثنائية</Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ''); // أرقام فقط
                  if (value.length <= 6) {
                    setCode(value);
                  }
                }}
                placeholder="000000"
                maxLength={6}
                className="text-center text-lg tracking-widest font-mono"
                autoComplete="one-time-code"
                autoFocus
                disabled={loading || isBlocked}
              />
              <p className="text-xs text-muted-foreground text-center">
                أدخل الرمز المكون من 6 أرقام من تطبيق Google Authenticator
              </p>
            </div>

            <div className="space-y-2">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || isBlocked || code.length !== 6}
              >
                {loading ? 'جاري التحقق...' : 'تأكيد'}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={onBack}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                العودة لتسجيل الدخول
              </Button>
            </div>

            {attempts > 0 && attempts < maxAttempts && (
              <p className="text-sm text-orange-600 text-center">
                المحاولات المتبقية: {maxAttempts - attempts}
              </p>
            )}
          </form>
        )}

        {isBlocked && (
          <div className="text-center space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                تم حظر المحاولات مؤقتاً بسبب تجاوز الحد الأقصى للمحاولات الخاطئة.
              </AlertDescription>
            </Alert>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              العودة لتسجيل الدخول
            </Button>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <h4 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">نصائح:</h4>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <li>• تأكد من أن وقت جهازك صحيح</li>
            <li>• الرمز يتغير كل 30 ثانية</li>
            <li>• يمكنك استخدام backup code إذا لم يعمل الرمز</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
