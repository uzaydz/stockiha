import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import { registerTenant } from '@/lib/api/tenant-fixed';

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
    const { name, email, password, confirmPassword } = form.getValues();
    
    // التحقق من حقول الخطوة الأولى
    if (!name || name.length < 3) {
      form.setError('name', { 
        type: 'manual', 
        message: 'يجب أن يكون الاسم 3 أحرف على الأقل' 
      });
      return false;
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      form.setError('email', { 
        type: 'manual', 
        message: 'يرجى إدخال بريد إلكتروني صحيح' 
      });
      return false;
    }
    
    if (!password || password.length < 6) {
      form.setError('password', { 
        type: 'manual', 
        message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' 
      });
      return false;
    }
    
    if (password !== confirmPassword) {
      form.setError('confirmPassword', { 
        type: 'manual', 
        message: 'كلمات المرور غير متطابقة' 
      });
      return false;
    }
    
    return true;
  };

  // الانتقال إلى الخطوة التالية
  const handleNext = () => {
    if (validateFirstStep()) {
      setCurrentStep(2);
    }
  };

  // العودة إلى الخطوة السابقة
  const handlePrevious = () => {
    setCurrentStep(1);
  };

  // معالجة إرسال النموذج
  const handleSubmit = async () => {
    // التحقق من صحة كل الحقول قبل الإرسال
    const isValid = await form.trigger();
    
    if (!isValid) {
      toast.error('يرجى التأكد من صحة جميع البيانات المدخلة');
      return;
    }
    
    setIsLoading(true);
    const values = form.getValues();
    
    try {
      const { success, error } = await registerTenant({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
        organizationName: values.organizationName,
        subdomain: values.subdomain,
      });
      
      if (success) {
        toast.success('تم إنشاء حساب المسؤول والنطاق الفرعي بنجاح');
        
        // التوجه إلى النطاق الفرعي بعد التسجيل الناجح
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        // بناء رابط النطاق الفرعي
        let subdomainUrl;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          // في بيئة التطوير، استخدم المنفذ للنطاق الفرعي
          subdomainUrl = `${protocol}//${values.subdomain}.${hostname}${port ? ':' + port : ''}`;
        } else {
          // في بيئة الإنتاج، استخدم النطاق الفرعي العادي
          subdomainUrl = `${protocol}//${values.subdomain}.${hostname}`;
        }
        
        // تأخير قصير ثم التوجه
        setTimeout(() => {
          window.location.href = subdomainUrl;
        }, 2000);
      } else {
        toast.error(`فشل التسجيل: ${error?.message || 'حدث خطأ'}`);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء التسجيل');
    } finally {
      setIsLoading(false);
    }
  };

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
