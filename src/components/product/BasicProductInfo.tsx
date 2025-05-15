import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { Package, Tag, FileText, Trophy, Star, DollarSign } from 'lucide-react';

interface BasicProductInfoProps {
  form: UseFormReturn<ProductFormValues>;
}

export default function BasicProductInfo({ form }: BasicProductInfoProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="relative">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Package size={18} />
                </span>
                <FormControl>
                  <Input 
                    placeholder="اسم المنتج*" 
                    className="pl-10 bg-background border-2 h-12 focus:border-primary transition-colors" 
                    {...field} 
                  />
                </FormControl>
              </div>
              <FormMessage className="mt-1" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem className="relative">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Tag size={18} />
                </span>
                <FormControl>
                  <Input 
                    placeholder="العلامة التجارية (اختياري)" 
                    className="pl-10 bg-background border-2 h-12 focus:border-primary transition-colors" 
                    {...field} 
                  />
                </FormControl>
              </div>
              <FormMessage className="mt-1" />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem className="relative">
            <div className="relative">
              <span className="absolute left-3 top-4 text-muted-foreground">
                <FileText size={18} />
              </span>
              <FormControl>
                <Textarea 
                  placeholder="وصف المنتج التفصيلي (اختياري)" 
                  className="pl-10 bg-background border-2 min-h-[120px] focus:border-primary transition-colors" 
                  {...field} 
                />
              </FormControl>
            </div>
            <FormMessage className="mt-1" />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 bg-muted/30 p-4 rounded-lg">
        <h3 className="text-lg font-medium md:col-span-2 flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          إعدادات إضافية
        </h3>
        
        <FormField
          control={form.control}
          name="is_featured"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3 bg-background p-3 rounded-md shadow-sm border border-border/50 hover:border-primary/30 transition-colors">
              <FormControl>
                <Checkbox 
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
              </FormControl>
              <div className="leading-none">
                <p className="font-medium mb-1 flex items-center gap-1">
                  <Trophy size={14} className="text-amber-500" />
                  منتج مميز
                </p>
                <p className="text-xs text-muted-foreground">
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
            <FormItem className="flex items-center gap-3 bg-background p-3 rounded-md shadow-sm border border-border/50 hover:border-primary/30 transition-colors">
              <FormControl>
                <Checkbox 
                  checked={field.value} 
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
              </FormControl>
              <div className="leading-none">
                <p className="font-medium mb-1 flex items-center gap-1">
                  <Star size={14} className="text-blue-500" />
                  منتج جديد
                </p>
                <p className="text-xs text-muted-foreground">
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
            <FormItem className="flex items-center gap-3 bg-background p-3 rounded-md shadow-sm border border-border/50 hover:border-primary/30 transition-colors md:col-span-2">
              <FormControl>
                <Checkbox 
                  checked={field.value} 
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
              </FormControl>
              <div className="leading-none">
                <p className="font-medium mb-1 flex items-center gap-1">
                  <DollarSign size={14} className="text-green-500" />
                  إظهار السعر في الواجهة
                </p>
                <p className="text-xs text-muted-foreground">
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