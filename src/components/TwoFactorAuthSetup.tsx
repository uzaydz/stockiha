import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import QRCode from 'react-qr-code';
import { 
  Shield, 
  QrCode, 
  Key, 
  Copy, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Download
} from 'lucide-react';
import { 
  setupTwoFactorAuth, 
  enableTwoFactorAuth, 
  disableTwoFactorAuth,
  getTwoFactorStatus,
  regenerateBackupCodes,
  verifyTwoFactorCode,
  resetTwoFactorAuth,
  type TwoFactorSetup 
} from '@/lib/api/security';
import { generateTestTOTP, debugTOTP } from '@/lib/totp-verification';

interface TwoFactorAuthSetupProps {
  onStatusChange?: (enabled: boolean) => void;
}

export default function TwoFactorAuthSetup({ onStatusChange }: TwoFactorAuthSetupProps) {
  const [status, setStatus] = useState({
    enabled: false,
    method: undefined as string | undefined,
    backup_codes_count: 0,
    setup_completed: false
  });
  const [setupData, setSetupData] = useState<TwoFactorSetup | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState<'status' | 'setup' | 'verify' | 'backup'>('status');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [testCode, setTestCode] = useState<string>('');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const statusData = await getTwoFactorStatus();
      setStatus({
        enabled: statusData.enabled,
        method: statusData.method,
        backup_codes_count: statusData.backup_codes_count || 0,
        setup_completed: statusData.setup_completed || false
      });
    } catch (error) {
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await setupTwoFactorAuth();
      
      if (result.success) {
        setSetupData(result);
        setStep('setup');
        setSuccess('تم إنشاء إعدادات المصادقة الثنائية بنجاح');
      } else {
        setError(result.error || 'فشل في إعداد المصادقة الثنائية');
      }
    } catch (error) {
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    if (!verificationCode.trim()) {
      setError('يرجى إدخال رمز التحقق');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await enableTwoFactorAuth(verificationCode);
      
      if (result.success) {
        setSuccess('تم تفعيل المصادقة الثنائية بنجاح!');
        setStep('backup');
        setBackupCodes(setupData?.backup_codes || []);
        await loadStatus();
        onStatusChange?.(true);
      } else {
        setError(result.error || 'فشل في تفعيل المصادقة الثنائية');
      }
    } catch (error) {
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!verificationCode.trim()) {
      setError('يرجى إدخال رمز التحقق لإلغاء التفعيل');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await disableTwoFactorAuth(verificationCode);
      
      if (result.success) {
        setSuccess('تم إلغاء تفعيل المصادقة الثنائية');
        setStep('status');
        setSetupData(null);
        setVerificationCode('');
        await loadStatus();
        onStatusChange?.(false);
      } else {
        setError(result.error || 'فشل في إلغاء تفعيل المصادقة الثنائية');
      }
    } catch (error) {
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await regenerateBackupCodes();
      
      if (result.success && result.backup_codes) {
        setBackupCodes(result.backup_codes);
        setSuccess('تم إعادة توليد backup codes بنجاح');
        await loadStatus();
      } else {
        setError(result.error || 'فشل في إعادة توليد backup codes');
      }
    } catch (error) {
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await resetTwoFactorAuth();
      
      if (result.success) {
        setSuccess('تم إعادة تعيين المصادقة الثنائية بنجاح');
        setStep('status');
        setSetupData(null);
        setVerificationCode('');
        setBackupCodes([]);
        await loadStatus();
        onStatusChange?.(false);
      } else {
        setError(result.error || 'فشل في إعادة تعيين المصادقة الثنائية');
      }
    } catch (error) {
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('تم نسخ النص');
  };

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFlow = () => {
    setStep('status');
    setSetupData(null);
    setVerificationCode('');
    setError(null);
    setSuccess(null);
    setBackupCodes([]);
    setTestCode('');
  };

  const generateCurrentCode = async () => {
    if (!setupData?.totp_secret) {
      setError('لا يوجد مفتاح سري');
      return;
    }

    try {
      const currentCode = await generateTestTOTP(setupData.totp_secret);
      setTestCode(currentCode);
      setSuccess(`الرمز الحالي: ${currentCode}`);
      
      // Debug info
      await debugTOTP(setupData.totp_secret);
    } catch (error) {
      setError('فشل في توليد الرمز');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {step === 'status' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              المصادقة الثنائية (2FA)
            </CardTitle>
            <CardDescription>
              أضف طبقة حماية إضافية لحسابك باستخدام تطبيق المصادقة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">الحالة الحالية</p>
                <p className="text-sm text-muted-foreground">
                  {status.enabled ? 'مفعل' : 'غير مفعل'}
                </p>
              </div>
              <Badge variant={status.enabled ? 'default' : 'secondary'}>
                {status.enabled ? 'مفعل' : 'غير مفعل'}
              </Badge>
            </div>

            {status.enabled && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="font-medium">معلومات إضافية</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>الطريقة: {status.method || 'TOTP'}</p>
                    <p>Backup codes متبقية: {status.backup_codes_count}</p>
                  </div>
                </div>
                
                {/* تحذير إذا كانت المصادقة مفعلة لكن بدون إعداد صحيح */}
                {status.enabled && !status.setup_completed && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      المصادقة الثنائية مفعلة لكن لم يتم إعدادها بشكل صحيح. يرجى إعادة الإعداد.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('backup')}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    إعادة توليد Backup Codes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleReset}
                    disabled={loading}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    إعادة الإعداد
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => setStep('verify')}
                    disabled={loading}
                  >
                    إلغاء التفعيل
                  </Button>
                </div>
              </>
            )}

            {!status.enabled && (
              <Button onClick={handleSetup} disabled={loading}>
                {loading ? 'جاري الإعداد...' : 'إعداد المصادقة الثنائية'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'setup' && setupData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              إعداد تطبيق المصادقة
            </CardTitle>
            <CardDescription>
              امسح رمز QR أو أدخل المفتاح يدوياً في تطبيق المصادقة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code URL */}
            <div className="space-y-2">
              <Label>رمز QR للمسح</Label>
              <div className="p-6 border rounded-lg bg-card text-center">
                <div className="mb-4">
                  <h3 className="font-medium text-lg mb-2">امسح هذا الرمز بتطبيق المصادقة</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    استخدم Google Authenticator أو أي تطبيق TOTP آخر
                  </p>
                </div>
                
                {/* QR Code الحقيقي */}
                <div className="flex justify-center mb-4">
                  {setupData.qr_url ? (
                    <div className="p-4 bg-white rounded-lg border-2 border-border">
                      <QRCode 
                        value={setupData.qr_url} 
                        size={200}
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 mx-auto border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <QrCode className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">جاري تحميل QR Code...</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* تعليمات التطبيقات */}
                <div className="text-left space-y-2 bg-muted p-4 rounded-lg">
                  <h4 className="font-medium text-sm">التطبيقات المدعومة:</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-foreground">Google Authenticator</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-foreground">Microsoft Authenticator</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-foreground">Authy</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-foreground">1Password</span>
                    </div>
                  </div>
                </div>
                
                {/* رابط QR للمطورين */}
                <details className="mt-4">
                  <summary className="text-xs text-muted-foreground cursor-pointer">عرض رابط QR (للمطورين)</summary>
                  <code className="text-xs break-all bg-muted p-2 rounded mt-2 block text-foreground">
                    {setupData.qr_url}
                  </code>
                </details>
              </div>
            </div>

            {/* Manual Entry */}
            <div className="space-y-2">
              <Label>الإدخال اليدوي</Label>
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">إذا لم تتمكن من مسح الرمز:</h4>
                  <ol className="text-sm space-y-1 list-decimal list-inside text-blue-800 dark:text-blue-200">
                    <li>افتح تطبيق المصادقة</li>
                    <li>اختر "إضافة حساب يدوياً" أو "إدخال مفتاح"</li>
                    <li>أدخل المعلومات التالية:</li>
                  </ol>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">اسم الحساب:</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={setupData.account_name || ''} 
                        readOnly 
                        className="text-sm"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(setupData.account_name || '')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">المُصدر (Issuer):</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={setupData.issuer || 'Bazaar Console'} 
                        readOnly 
                        className="text-sm"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(setupData.issuer || 'Bazaar Console')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">المفتاح السري:</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={setupData.manual_entry_key || ''} 
                        readOnly 
                        className="font-mono text-sm"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(setupData.manual_entry_key || '')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                  <strong className="text-foreground">ملاحظة:</strong> تأكد من أن إعدادات التطبيق هي:
                  <br />• نوع الرمز: Time-based (TOTP)
                  <br />• الخوارزمية: SHA1
                  <br />• الأرقام: 6
                  <br />• الفترة: 30 ثانية
                </div>
              </div>
            </div>

            {/* Test Code Generator */}
            <div className="space-y-2 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm text-yellow-800 dark:text-yellow-200">أدوات الاختبار</h4>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    للتأكد من صحة الإعداد قبل التفعيل
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={generateCurrentCode}
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  توليد رمز اختبار
                </Button>
              </div>
              {testCode && (
                <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900 rounded text-center">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    الرمز الحالي: <span className="font-mono font-bold text-lg">{testCode}</span>
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    يتغير كل 30 ثانية - تحقق من console للمزيد من التفاصيل
                  </p>
                </div>
              )}
            </div>

            {/* Verification */}
            <div className="space-y-2">
              <Label htmlFor="verification-code">رمز التحقق</Label>
              <Input
                id="verification-code"
                placeholder="أدخل الرمز من تطبيق المصادقة أو استخدم رمز الاختبار أعلاه"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
              />
              {testCode && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setVerificationCode(testCode)}
                  className="text-xs"
                >
                  استخدام رمز الاختبار: {testCode}
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleEnable} disabled={loading || !verificationCode.trim()}>
                {loading ? 'جاري التفعيل...' : 'تفعيل المصادقة الثنائية'}
              </Button>
              <Button variant="outline" onClick={resetFlow}>
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'verify' && status.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              إلغاء تفعيل المصادقة الثنائية
            </CardTitle>
            <CardDescription>
              أدخل رمز التحقق لإلغاء تفعيل المصادقة الثنائية
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-code">رمز التحقق</Label>
              <Input
                id="disable-code"
                placeholder="أدخل الرمز من تطبيق المصادقة"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                onClick={handleDisable} 
                disabled={loading || !verificationCode.trim()}
              >
                {loading ? 'جاري الإلغاء...' : 'إلغاء التفعيل'}
              </Button>
              <Button variant="outline" onClick={resetFlow}>
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'backup' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Backup Codes
            </CardTitle>
            <CardDescription>
              احفظ هذه الرموز في مكان آمن. يمكن استخدام كل رمز مرة واحدة فقط
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {backupCodes.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                  {backupCodes.map((code) => (
                    <div key={code} className="font-mono text-sm p-2 bg-card rounded border">
                      {code}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={downloadBackupCodes}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    تحميل كملف
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => copyToClipboard(backupCodes.join('\n'))}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    نسخ الكل
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleRegenerateBackupCodes}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    إعادة توليد
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">لا توجد backup codes</p>
                <Button onClick={handleRegenerateBackupCodes} disabled={loading}>
                  {loading ? 'جاري التوليد...' : 'توليد Backup Codes'}
                </Button>
              </div>
            )}

            <Button variant="outline" onClick={resetFlow} className="w-full">
              العودة للإعدادات
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
