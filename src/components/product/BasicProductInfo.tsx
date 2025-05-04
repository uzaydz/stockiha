import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";

interface BasicProductInfoProps {
  form: UseFormReturn<ProductFormValues>;
}

export default function BasicProductInfo({ form }: BasicProductInfoProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>اسم المنتج*</FormLabel>
              <FormControl>
                <Input placeholder="اسم المنتج" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>العلامة التجارية</FormLabel>
              <FormControl>
                <Input placeholder="العلامة التجارية (اختياري)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>وصف المنتج</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="وصف المنتج التفصيلي (اختياري)" 
                className="min-h-[120px]" 
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <FormField
          control={form.control}
          name="is_featured"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0">
              <FormControl>
                <Checkbox 
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>منتج مميز</FormLabel>
                <p className="text-sm text-muted-foreground">
                  سيظهر هذا المنتج في قسم المنتجات المميزة
                </p>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_new"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0">
              <FormControl>
                <Checkbox 
                  checked={field.value} 
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>منتج جديد</FormLabel>
                <p className="text-sm text-muted-foreground">
                  سيظهر هذا المنتج مع علامة "جديد"
                </p>
              </div>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="show_price_on_landing"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0">
              <FormControl>
                <Checkbox 
                  checked={field.value} 
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>إظهار السعر في الواجهة</FormLabel>
                <p className="text-sm text-muted-foreground">
                  سيظهر سعر هذا المنتج في الصفحة الرئيسية
                </p>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
} 