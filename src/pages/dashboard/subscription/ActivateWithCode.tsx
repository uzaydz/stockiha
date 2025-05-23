import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ActivationService } from '@/lib/activation-service';

// مكونات UI
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface ActivationCodeResponse {
  success: boolean;
  message: string;
  subscription_end_date?: string;
  subscription_id?: string;
}

interface ActivateWithCodeProps {
  onActivated: () => void;
}

const ActivateWithCode: React.FC<ActivateWithCodeProps> = ({ onActivated }) => {
  const { organization, user, refreshOrganizationData } = useAuth();
  const [activationCode, setActivationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ActivationCodeResponse | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // التحقق من وجود معرف المؤسسة عند تحميل المكون
  useEffect(() => {
    const getOrganizationId = async () => {
      // 1. أولاً نحاول الحصول على المعرف من الكونتكست
      if (organization?.id) {
        
        setOrganizationId(organization.id);
        return;
      }

      // 2. نحاول الحصول عليه من localStorage
      const storedOrgId = localStorage.getItem('bazaar_organization_id');
      if (storedOrgId) {
        
        setOrganizationId(storedOrgId);
        return;
      }

      // 3. نحاول الحصول عليه من جدول المستخدمين إذا كان المستخدم مسجلاً
      if (user?.id) {
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single();

          if (!error && userData?.organization_id) {
            
            setOrganizationId(userData.organization_id);
            // نحفظ المعرف في localStorage للمرات القادمة
            localStorage.setItem('bazaar_organization_id', userData.organization_id);
            return;
          }
        } catch (err) {
          console.error("خطأ عند محاولة الحصول على معرف المؤسسة من بيانات المستخدم:", err);
        }
      }

      console.error("لم يتم العثور على معرف المؤسسة من أي مصدر");
    };

    getOrganizationId();
  }, [organization, user]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activationCode) {
      toast.error('الرجاء إدخال كود التفعيل');
      return;
    }
    
    // طباعة معلومات المؤسسة للتشخيص
    
    
    
    if (!organizationId) {
      console.error('Missing organization ID in ActivateWithCode component');
      setResult({
        success: false,
        message: 'لم يتم العثور على معلومات المؤسسة. يرجى تسجيل الدخول مرة أخرى أو التأكد من إنشاء مؤسسة.'
      });
      toast.error('لم يتم العثور على معلومات المؤسسة');
      return;
    }
    
    setLoading(true);
    
    try {
      
      
      // استخدام خدمة التفعيل من ActivationService بدلاً من استدعاء RPC مباشرة
      const result = await ActivationService.activateSubscription({
        activation_code: activationCode.trim(),
        organization_id: organizationId
      });
      
      setResult(result);
      
      if (result.success) {
        toast.success('تم تفعيل الاشتراك بنجاح');
        
        // تحديث بيانات المؤسسة في قاعدة البيانات مع معرف الاشتراك
        try {
          if (result.subscription_id) {
            
            
            const { error: updateError } = await supabase
              .from('organizations')
              .update({
                subscription_status: 'active',
                subscription_id: result.subscription_id,
                subscription_tier: 'premium', // عادة ما تكون "premium" للاشتراكات المدفوعة
                updated_at: new Date().toISOString()
              })
              .eq('id', organizationId);
              
            if (updateError) {
              console.error('خطأ في تحديث بيانات المؤسسة:', updateError);
            } else {
              
            }
          } else {
            console.error('لم يتم العثور على معرف الاشتراك في نتيجة التفعيل');
          }
        } catch (updateError) {
          console.error('خطأ أثناء تحديث بيانات المؤسسة:', updateError);
        }
        
        // تحديث بيانات المؤسسة في سياق المصادقة
        await refreshOrganizationData();

        // انتظار قصير للتأكد من تطبيق التغييرات
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // محاولة إضافية لتحديث البيانات
        await refreshOrganizationData();
        
        // إعادة تحميل الصفحة بطريقة كاملة للتأكد من تحديث جميع البيانات
        setTimeout(() => {
          // استخدام نافذة جديدة لتجاوز ذاكرة التخزين المؤقت
          window.location.href = window.location.origin + 
                                 window.location.pathname + 
                                 '?refresh=' + Date.now();
        }, 2500);
      } else {
        toast.error(result.message || 'حدث خطأ أثناء تفعيل الاشتراك');
      }
    } catch (error: any) {
      console.error('Error activating subscription:', error);
      toast.error(error.message || 'حدث خطأ أثناء تفعيل الاشتراك');
      setResult({
        success: false,
        message: error.message || 'حدث خطأ أثناء تفعيل الاشتراك'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <form onSubmit={handleActivate} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="activation-code">كود التفعيل</Label>
          <div className="flex">
            <Input
              id="activation-code"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)}
              placeholder="أدخل كود التفعيل هنا"
              disabled={loading}
              className="ml-2"
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin ml-2"></div>
                  تفعيل...
                </>
              ) : (
                'تفعيل'
              )}
            </Button>
          </div>
        </div>
      </form>
      
      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          {result.success ? (
            <CheckCircle2 className="h-4 w-4 ml-2" />
          ) : (
            <AlertTriangle className="h-4 w-4 ml-2" />
          )}
          <AlertTitle>{result.success ? 'تم التفعيل بنجاح' : 'فشل التفعيل'}</AlertTitle>
          <AlertDescription>
            {result.message}
            {result.success && result.subscription_end_date && (
              <div className="mt-2">
                <p>تم تفعيل الاشتراك بنجاح</p>
                <p>تاريخ الانتهاء: <strong>{new Date(result.subscription_end_date).toLocaleDateString('ar-SA')}</strong></p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      <p className="text-sm text-muted-foreground">
        يمكنك الحصول على كود تفعيل جديد من خلال الاتصال بالدعم الفني أو شراء اشتراك جديد.
      </p>
    </div>
  );
};

export default ActivateWithCode; 