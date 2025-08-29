import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Building, ArrowRight, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { ensureUserOrganizationLink } from '@/lib/api/auth-helpers';

const SetupOrganization = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    organizationName: '',
    contactAdmin: false
  });

  const handleCreateOrganization = async () => {
    if (!formData.organizationName.trim()) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يرجى إدخال اسم المؤسسة'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // الحصول على المستخدم الحالي
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('فشل في الحصول على بيانات المستخدم');
      }

      // إنشاء مؤسسة جديدة
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.organizationName.trim(),
          owner_id: user.id,
          subscription_tier: 'trial',
          subscription_status: 'trial',
          is_active: true
        })
        .select()
        .single();

      if (orgError) {
        throw new Error(`فشل في إنشاء المؤسسة: ${orgError.message}`);
      }

      // ربط المستخدم بالمؤسسة الجديدة
      const { error: updateError } = await supabase
        .from('users')
        .update({
          organization_id: orgData.id,
          role: 'admin',
          is_org_admin: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.warn('تحذير: فشل في تحديث بيانات المستخدم:', updateError);
        // لا نوقف العملية بسبب هذا
      }

      // ضمان ربط صحيح
      const linkResult = await ensureUserOrganizationLink(user.id);
      
      if (!linkResult.success) {
        throw new Error(linkResult.error || 'فشل في ربط المستخدم بالمؤسسة');
      }

      toast({
        title: 'تم بنجاح!',
        description: `تم إنشاء مؤسسة "${formData.organizationName}" بنجاح`
      });

      // إعادة توجيه للوحة التحكم
      navigate('/dashboard');

    } catch (error) {
      console.error('خطأ في إنشاء المؤسسة:', error);
      toast({
        variant: 'destructive',
        title: 'فشل في إنشاء المؤسسة',
        description: error instanceof Error ? error.message : 'حدث خطأ غير معروف'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactAdmin = () => {
    toast({
      title: 'تواصل مع المسؤول',
      description: 'يرجى التواصل مع مسؤول النظام لربط حسابك بالمؤسسة المناسبة.'
    });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
            <Building className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-xl font-bold">إعداد المؤسسة مطلوب</CardTitle>
          <CardDescription>
            لم نجد مؤسسة مرتبطة بحسابك. يمكنك إنشاء مؤسسة جديدة أو التواصل مع المسؤول.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>ماذا حدث؟</AlertTitle>
            <AlertDescription>
              يبدو أن عملية إنشاء المؤسسة لم تكتمل أثناء التسجيل، أو أن حسابك لم يتم ربطه بالمؤسسة بشكل صحيح.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label htmlFor="organizationName">اسم المؤسسة الجديدة</Label>
              <Input
                id="organizationName"
                type="text"
                placeholder="أدخل اسم مؤسستك"
                value={formData.organizationName}
                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                disabled={isLoading}
              />
            </div>
            
            <Button 
              onClick={handleCreateOrganization}
              disabled={isLoading || !formData.organizationName.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  إنشاء مؤسسة جديدة
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">أو</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={handleContactAdmin}
            className="w-full"
            disabled={isLoading}
          >
            التواصل مع المسؤول
          </Button>

          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full text-sm"
            disabled={isLoading}
          >
            تسجيل خروج والعودة لتسجيل الدخول
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupOrganization;
