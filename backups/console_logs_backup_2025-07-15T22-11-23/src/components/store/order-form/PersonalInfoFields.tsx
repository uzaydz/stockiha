import { Phone, User } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PersonalInfoFieldsProps } from "./OrderFormTypes";
import { useTranslation } from "react-i18next";

const PersonalInfoFields = ({ form }: PersonalInfoFieldsProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-primary/90">معلومات شخصية</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* الاسم واللقب */}
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">{t('orderForm.fullName')}</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder={t('orderForm.fullNamePlaceholder')} 
                    {...field} 
                    className="pr-10 focus-visible:ring-primary transition-all border-muted-foreground/20 hover:border-primary/30"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* رقم الهاتف */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">{t('orderForm.phoneNumber')}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Phone className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder={t('orderForm.phoneNumberPlaceholder')} 
                    type="tel"
                    className="pr-10 focus-visible:ring-primary transition-all border-muted-foreground/20 hover:border-primary/30 !text-right"
                    style={{ textAlign: 'right', direction: 'rtl' }}
                    inputMode="tel"
                    {...field} 
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default PersonalInfoFields;
