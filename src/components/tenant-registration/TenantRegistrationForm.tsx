import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { registerTenant } from '@/lib/api/tenant-fixed';
import { useAuth } from '@/context/AuthContext';

// Components
import RegistrationSidebar from './RegistrationSidebar';
import PersonalInfoForm from './PersonalInfoForm';
import OrganizationInfoForm from './OrganizationInfoForm';
import { Form } from '@/components/ui/form';

// Validation Schema
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
  const [direction, setDirection] = useState(0);

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

  const validateFirstStep = async () => {
    const result = await form.trigger(['name', 'email', 'password', 'confirmPassword', 'phone']);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateFirstStep();
    if (isValid) {
      setDirection(1);
      setCurrentStep(2);
    }
  };

  const handlePrevious = () => {
    setDirection(-1);
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    const subdomainValue = form.getValues('subdomain');
    if (subdomainValue) {
      const cleanSubdomain = subdomainValue
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-');
      form.setValue('subdomain', cleanSubdomain);
    }

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
        toast.success('🎉 تم إنشاء حساب المسؤول بنجاح!');
        try { await refreshData(); } catch { }
        setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
      } else {
        toast.error(`فشل التسجيل: ${error || 'حدث خطأ غير متوقع'}`);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء التسجيل');
    } finally {
      setIsLoading(false);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0,
      scale: 0.98
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 20 : -20,
      opacity: 0,
      scale: 0.98
    }),
  };

  return (
    <div className="w-full">
      {/* Mobile Stepper (Visible only on small screens) */}
      <div className="lg:hidden mb-8">
        <div className="flex items-center justify-between text-sm font-medium text-slate-500 mb-3">
          <span>الخطوة {currentStep} من 2</span>
          <span className="text-orange-600 font-bold">{Math.round((currentStep / 2) * 100)}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-rose-500"
            initial={{ width: '0%' }}
            animate={{ width: `${(currentStep / 2) * 100}%` }}
            transition={{ duration: 0.5, ease: "circOut" }}
          />
        </div>
      </div>

      <div className="mb-10">
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-3">
          {currentStep === 1 ? 'مرحباً بك 👋' : 'بيانات المتجر 🏪'}
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400">
          {currentStep === 1 ? 'أدخل بياناتك الشخصية لإنشاء حساب مسؤول جديد' : 'قم بتخصيص رابط وهوية متجرك الإلكتروني'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="relative">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            {currentStep === 1 ? (
              <motion.div
                key="step1"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                <PersonalInfoForm
                  form={form}
                  onNext={handleNext}
                  isLoading={isLoading}
                />
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                <OrganizationInfoForm
                  form={form}
                  onPrevious={handlePrevious}
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </Form>

      <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="text-slate-500 dark:text-slate-400">
          لديك حساب بالفعل؟{' '}
          <a href="/login" className="font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 transition-colors hover:underline underline-offset-4 decoration-orange-200">
            تسجيل الدخول
          </a>
        </p>
      </div>
    </div>
  );
};

export default TenantRegistrationForm;
