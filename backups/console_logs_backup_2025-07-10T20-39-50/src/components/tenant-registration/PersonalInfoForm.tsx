import { motion } from 'framer-motion';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UseFormReturn } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';

interface PersonalInfoFormProps {
  form: UseFormReturn<any>;
  onNext: () => void;
  isLoading?: boolean;
}

export const PersonalInfoForm = ({ 
  form, 
  onNext,
  isLoading = false
}: PersonalInfoFormProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mb-6">
        <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
          المعلومات الشخصية للمسؤول
        </h3>
        <p className="text-muted-foreground text-sm">هذه المعلومات خاصة بحساب مسؤول المؤسسة الذي سيتمكن من إدارة النظام</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الاسم الكامل</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="أدخل اسمك الكامل" 
                  className="text-right" 
                  dir="rtl"
                  autoComplete="name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>البريد الإلكتروني</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="email" 
                  placeholder="أدخل بريدك الإلكتروني" 
                  className="text-right" 
                  dir="rtl"
                  autoComplete="email"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>رقم الهاتف</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="tel" 
                  placeholder="أدخل رقم هاتفك" 
                  className="text-right" 
                  dir="rtl"
                  autoComplete="tel"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="md:col-span-2 h-px bg-border my-2"></div>

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>كلمة المرور</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="password" 
                  placeholder="أدخل كلمة المرور" 
                  className="text-right" 
                  dir="rtl"
                  autoComplete="new-password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>تأكيد كلمة المرور</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="password" 
                  placeholder="أعد إدخال كلمة المرور" 
                  className="text-right" 
                  dir="rtl"
                  autoComplete="new-password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <div className="pt-4 flex justify-end">
        <Button 
          type="button" 
          onClick={onNext}
          className="min-w-[140px] gap-1 group"
          disabled={isLoading}
        >
          <span>التالي</span>
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        </Button>
      </div>
    </motion.div>
  );
};

export default PersonalInfoForm;
