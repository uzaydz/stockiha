import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { OrderFormValues } from '../OrderFormTypes';

interface PersonalInfoFieldsProps {
  form: UseFormReturn<OrderFormValues, any, OrderFormValues>; // Adjusted type
}

export const PersonalInfoFields: React.FC<PersonalInfoFieldsProps> = ({ form }) => {
  // TODO: Add form fields for personal information (fullName, phone, etc.)
  // Example: using components from @/components/ui/form if available
  return (
    <div className="space-y-4">
      {/* Example Field (replace with actual implementation) */}
      {/* <FormField
        control={form.control}
        name="fullName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>الاسم الكامل</FormLabel>
            <FormControl>
              <Input placeholder="مثال: محمد أحمد" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      /> */}
      <p className="text-center text-gray-500">[مكون معلومات شخصية - سيتم ملؤه لاحقًا]</p>
    </div>
  );
}; 