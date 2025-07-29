import { motion } from 'framer-motion';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UseFormReturn } from 'react-hook-form';
import { ArrowRight, Globe, CheckCircle2 } from 'lucide-react';

interface OrganizationInfoFormProps {
  form: UseFormReturn<any>;
  onPrevious: () => void;
  onSubmit: () => void;
  isLoading?: boolean;
}

export const OrganizationInfoForm = ({ 
  form, 
  onPrevious,
  onSubmit,
  isLoading = false
}: OrganizationInfoFormProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      dir="rtl"
    >
      <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mb-6">
        <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
          معلومات المؤسسة والنطاق
        </h3>
        <p className="text-muted-foreground text-sm">هذه المعلومات خاصة بمؤسستك والنطاق الفرعي الخاص بمتجرك الإلكتروني</p>
      </div>

      <div className="space-y-6">
        <FormField
          control={form.control}
          name="organizationName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>اسم المؤسسة</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="أدخل اسم المؤسسة" 
                  className="text-right" 
                  dir="rtl"
                />
              </FormControl>
              <FormDescription>
                سيظهر هذا الاسم للعملاء عند زيارة متجرك الإلكتروني
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <FormLabel htmlFor="subdomain">النطاق الفرعي الخاص بك</FormLabel>
            <div className="text-xs text-muted-foreground">
              سيكون هذا عنوان متجرك الإلكتروني
            </div>
          </div>
          
          <FormField
            control={form.control}
            name="subdomain"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="flex flex-col sm:flex-row items-stretch">
                    <div className="bg-muted border border-input border-l-0 sm:border-l sm:border-r-0 px-3 py-2 flex items-center text-sm text-muted-foreground rounded-l-md sm:rounded-l-none sm:rounded-r-md">
                      <span className="whitespace-nowrap">.stockiha.com</span>
                    </div>
                    <div className="flex-1 relative">
                      <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input 
                        {...field}
                        id="subdomain"
                        placeholder="mystore"
                        className="rounded-r-none sm:rounded-r-md sm:rounded-l-none pl-9 font-mono text-left lowercase"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
                <FormDescription>
                  مثال: mystore.stockiha.com - استخدم الأحرف الإنجليزية الصغيرة والأرقام والشرطات فقط
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <div className="bg-accent/20 border border-accent/30 rounded-lg p-4 mt-6">
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            ماذا ستحصل بعد التسجيل؟
          </h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              <span>متجر إلكتروني جاهز على النطاق الفرعي الخاص بك</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              <span>لوحة تحكم لإدارة المنتجات والطلبات والعملاء</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              <span>تجربة مجانية لمدة 5 أيام تشمل جميع المزايا</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              <span>دعم فني على مدار الساعة</span>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="pt-4 flex justify-between">
        <Button 
          type="button" 
          variant="outline"
          onClick={onPrevious}
          className="gap-1 group"
          disabled={isLoading}
        >
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          <span>السابق</span>
        </Button>
        
        <Button 
          type="button" 
          onClick={onSubmit}
          className="min-w-[140px]"
          disabled={isLoading}
        >
          {isLoading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب المسؤول والنطاق'}
        </Button>
      </div>
    </motion.div>
  );
};

export default OrganizationInfoForm;
