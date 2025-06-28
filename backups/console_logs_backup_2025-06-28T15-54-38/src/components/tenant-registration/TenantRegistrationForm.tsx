import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import { registerTenant } from '@/lib/api/tenant-fixed';
import { useAuth } from '@/context/AuthContext';

// المكونات الفرعية
import RegistrationHeader from './RegistrationHeader';
import RegistrationStepper from './RegistrationStepper';
import PersonalInfoForm from './PersonalInfoForm';
import OrganizationInfoForm from './OrganizationInfoForm';
import { Form } from '@/components/ui/form';

// مخطط التحقق من صحة النموذج
const formSchema = z.object({
  name: z.string().min(3, { message: 'يجب أن يكون الاسم 3 أحرف على الأقل' }),
  email: z.string().email({ message: 'يرجى إدخال بريد إلكتروني صحيح' }),
  phone: z.string().optional(),
  password: z.string().min(6, { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' }),
  confirmPassword: z.string(),
  organizationName: z.string().min(3, { message: 'يجب أن يكون اسم المؤسسة 3 أحرف على الأقل' }),
  subdomain: z.string()
    .min(3, { message: 'يجب أن يكون النطاق الفرعي 3 أحرف على الأقل' })
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { 
      message: 'النطاق الفرعي يجب أن يحتوي على أحرف صغيرة وأرقام وشرطات فقط' 
    }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

const TenantRegistrationForm = () => {
  const navigate = useNavigate();
  const { refreshData } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // إعداد نموذج React Hook Form مع Zod
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      organizationName: '',
      subdomain: '',
    },
    mode: 'onChange'
  });

  // التحقق من صحة الخطوة الأولى
  const validateFirstStep = () => {
    console.log('🔍 التحقق من صحة الخطوة الأولى...');
    const { name, email, password, confirmPassword } = form.getValues();
    
    console.log('📋 بيانات الخطوة الأولى:', {
      name: name || '[فارغ]',
      email: email || '[فارغ]',
      passwordLength: password?.length || 0,
      confirmPasswordLength: confirmPassword?.length || 0
    });
    
    // التحقق من حقول الخطوة الأولى
    if (!name || name.length < 3) {
      console.log('❌ الاسم غير صالح');
      form.setError('name', { 
        type: 'manual', 
        message: 'يجب أن يكون الاسم 3 أحرف على الأقل' 
      });
      return false;
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log('❌ البريد الإلكتروني غير صالح');
      form.setError('email', { 
        type: 'manual', 
        message: 'يرجى إدخال بريد إلكتروني صحيح' 
      });
      return false;
    }
    
    if (!password || password.length < 6) {
      console.log('❌ كلمة المرور قصيرة جداً');
      form.setError('password', { 
        type: 'manual', 
        message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' 
      });
      return false;
    }
    
    if (password !== confirmPassword) {
      console.log('❌ كلمات المرور غير متطابقة');
      form.setError('confirmPassword', { 
        type: 'manual', 
        message: 'كلمات المرور غير متطابقة' 
      });
      return false;
    }
    
    console.log('✅ الخطوة الأولى صالحة');
    return true;
  };

  // الانتقال إلى الخطوة التالية
  const handleNext = () => {
    console.log('➡️ محاولة الانتقال إلى الخطوة التالية...');
    if (validateFirstStep()) {
      console.log('✅ الانتقال إلى الخطوة الثانية');
      setCurrentStep(2);
    } else {
      console.log('❌ فشل في الانتقال إلى الخطوة التالية');
    }
  };

  // العودة إلى الخطوة السابقة
  const handlePrevious = () => {
    console.log('⬅️ العودة إلى الخطوة الأولى');
    setCurrentStep(1);
  };

  // معالجة إرسال النموذج
  const handleSubmit = async () => {
    console.log('🚀 بدء عملية إرسال النموذج...');
    
    // التحقق من صحة كل الحقول قبل الإرسال
    const isValid = await form.trigger();
    
    if (!isValid) {
      console.log('❌ النموذج غير صالح');
      const errors = form.formState.errors;
      console.log('📋 أخطاء النموذج:', errors);
      toast.error('يرجى التأكد من صحة جميع البيانات المدخلة');
      return;
    }
    
    console.log('✅ النموذج صالح، بدء عملية التسجيل...');
    setIsLoading(true);
    const values = form.getValues();
    
    console.log('📋 القيم المرسلة للتسجيل:', {
      name: values.name,
      email: values.email,
      organizationName: values.organizationName,
      subdomain: values.subdomain,
      hasPhone: !!values.phone,
      passwordLength: values.password?.length || 0
    });
    
    try {
      console.log('📞 استدعاء وظيفة registerTenant...');
      const { success, error } = await registerTenant({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
        organizationName: values.organizationName,
        subdomain: values.subdomain,
      });
      
      console.log('📝 نتيجة عملية التسجيل:', { success, error });
      
      if (success) {
        console.log('🎉 نجح التسجيل!');
        toast.success('🎉 تم إنشاء حساب المسؤول بنجاح! مرحباً بك في ستوكيها');
        
        // تحديث بيانات AuthContext لجلب المؤسسة الجديدة
        console.log('🔄 تحديث بيانات AuthContext...');
        try {
          await refreshData();
          console.log('✅ تم تحديث بيانات AuthContext بنجاح');
        } catch (error) {
          console.error('❌ خطأ في تحديث بيانات AuthContext:', error);
        }
        
        // التوجيه إلى stockiha.com/dashboard بدلاً من النطاق الفرعي
        setTimeout(() => {
          console.log('🔄 التوجيه إلى لوحة التحكم...');
          navigate('/dashboard');
        }, 1000); // تأخير قصير لإظهار رسالة النجاح
      } else {
        const errorMessage = error || 'حدث خطأ غير متوقع أثناء التسجيل';
        console.error('❌ فشل التسجيل:', errorMessage);
        toast.error(`فشل التسجيل: ${errorMessage}`);
      }
    } catch (error) {
      console.error('❌ استثناء أثناء التسجيل:', error);
      toast.error('حدث خطأ أثناء التسجيل');
    } finally {
      console.log('🔚 انتهاء عملية التسجيل');
      setIsLoading(false);
    }
  };

  console.log('🎨 تصيير مكون التسجيل - الخطوة الحالية:', currentStep);

  return (
    <div>
      <RegistrationHeader currentStep={currentStep} totalSteps={2} />
      <RegistrationStepper currentStep={currentStep} />
      
      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()}>
          <AnimatePresence mode="wait">
            {currentStep === 1 ? (
              <PersonalInfoForm 
                key="step1" 
                form={form} 
                onNext={handleNext} 
                isLoading={isLoading} 
              />
            ) : (
              <OrganizationInfoForm 
                key="step2" 
                form={form} 
                onPrevious={handlePrevious} 
                onSubmit={handleSubmit} 
                isLoading={isLoading} 
              />
            )}
          </AnimatePresence>
        </form>
      </Form>
    </div>
  );
};

export default TenantRegistrationForm;
