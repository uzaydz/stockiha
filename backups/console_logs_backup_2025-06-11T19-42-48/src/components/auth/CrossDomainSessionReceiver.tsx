import React, { useEffect, useState } from 'react';
import { checkAndApplyTransferredSession, validateCurrentSession } from '@/lib/cross-domain-auth';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * مكون استقبال الجلسة المنقولة بين النطاقات
 * يتم تشغيله تلقائياً عند تحميل الصفحة للتحقق من وجود جلسة منقولة
 */
interface CrossDomainSessionReceiverProps {
  onSessionReceived?: () => void;
  onSessionFailed?: () => void;
  children?: React.ReactNode;
}

export const CrossDomainSessionReceiver: React.FC<CrossDomainSessionReceiverProps> = ({
  onSessionReceived,
  onSessionFailed,
  children
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const processTransferredSession = async () => {
      // فحص إذا كان هناك معامل transfer_session في URL
      const urlParams = new URLSearchParams(window.location.search);
      const hasTransferSession = urlParams.get('transfer_session') === 'true';
      
      if (!hasTransferSession) {
        setStatus('idle');
        return;
      }

      setIsProcessing(true);
      setStatus('processing');
      setMessage('جارٍ استقبال بيانات تسجيل الدخول...');

      try {
        // محاولة تطبيق الجلسة المنقولة
        const applied = await checkAndApplyTransferredSession();
        
                 if (applied) {
           setStatus('success');
           setMessage('تم استقبال بيانات تسجيل الدخول بنجاح - جارٍ تطبيق التصميم...');
          
          // تأخير قصير للسماح بتطبيق الجلسة
          setTimeout(async () => {
            // التحقق من صحة الجلسة
            const isValid = await validateCurrentSession();
            
                         if (isValid) {
               console.log('✅ تم التحقق من صحة الجلسة المنقولة');
               
               // إعادة تطبيق الثيم بعد نجاح الجلسة
               try {
                 // طريقة 1: إعادة تشغيل theme manager
                 if ((window as any).themeManager && typeof (window as any).themeManager.reapplyTheme === 'function') {
                   (window as any).themeManager.reapplyTheme();
                   console.log('🎨 تم إعادة تطبيق الثيم بعد cross-domain auth');
                 }
                 
                 // طريقة 2: إعادة تحميل الصفحة بعد تأخير قصير (الحل الأضمن)
                 console.log('🔄 سيتم إعادة تحميل الصفحة لتطبيق التصميم الصحيح...');
                 setTimeout(() => {
                   window.location.reload();
                 }, 1500);
                 
               } catch (error) {
                 console.warn('⚠️ خطأ في إعادة تطبيق الثيم:', error);
                 // fallback: إعادة تحميل في حالة الخطأ
                 setTimeout(() => {
                   window.location.reload();
                 }, 2000);
               }
               
               onSessionReceived?.();
             } else {
               console.log('❌ فشل في التحقق من صحة الجلسة المنقولة');
               setStatus('failed');
               setMessage('فشل في تطبيق بيانات تسجيل الدخول');
               onSessionFailed?.();
             }
            
            setIsProcessing(false);
          }, 1000);
        } else {
          setStatus('failed');
          setMessage('لم يتم العثور على بيانات تسجيل دخول صالحة');
          
          // توجيه تلقائي بعد 3 ثوان
          setTimeout(() => {
            window.location.href = '/login';
          }, 3000);
          
          onSessionFailed?.();
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('خطأ في معالجة الجلسة المنقولة:', error);
        setStatus('failed');
        setMessage('حدث خطأ في معالجة بيانات تسجيل الدخول');
        onSessionFailed?.();
        setIsProcessing(false);
      }
    };

    processTransferredSession();
  }, [onSessionReceived, onSessionFailed]);

  // إذا لم يكن هناك معالجة جارية، عرض المحتوى العادي
  if (status === 'idle') {
    return <>{children}</>;
  }

  // عرض حالة المعالجة
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-4 p-6">
        {isProcessing && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription className="flex items-center gap-2">
              <span>{message}</span>
            </AlertDescription>
          </Alert>
        )}
        
        {status === 'success' && !isProcessing && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              {message}
            </AlertDescription>
          </Alert>
        )}
        
        {status === 'failed' && !isProcessing && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {message}
              <div className="mt-2 text-sm space-y-2">
                <div>
                  <a 
                    href="/login" 
                    className="underline hover:no-underline"
                  >
                    انقر هنا لتسجيل الدخول يدوياً
                  </a>
                </div>
                <div className="text-xs text-red-600">
                  أو انتظر 3 ثوان للتحويل التلقائي...
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* عرض المحتوى بعد المعالجة */}
        {!isProcessing && children}
      </div>
    </div>
  );
};

/**
 * Hook لاستخدام نظام نقل الجلسة
 */
export const useCrossDomainSession = () => {
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  const handleSessionTransfer = async (targetUrl: string) => {
    setIsTransferring(true);
    
    try {
      const { redirectWithSession } = await import('@/lib/cross-domain-auth');
      await redirectWithSession(targetUrl);
      setTransferStatus('success');
    } catch (error) {
      console.error('خطأ في نقل الجلسة:', error);
      setTransferStatus('failed');
      setIsTransferring(false);
    }
  };

  return {
    isTransferring,
    transferStatus,
    transferSession: handleSessionTransfer
  };
};

export default CrossDomainSessionReceiver; 