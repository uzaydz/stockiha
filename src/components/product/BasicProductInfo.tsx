import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { Package, Tag, FileText, Star, Gift, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BasicProductInfoProps {
  form: UseFormReturn<ProductFormValues>;
}

export default function BasicProductInfo({ form }: BasicProductInfoProps) {
  return (
    <div className="space-y-6">
      {/* Basic Information Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Package className="h-4 w-4 text-primary" />
            </div>
            المعلومات الأساسية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="اسم المنتج *" 
                        className="pl-10 h-11 bg-background border-border" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name_for_shipping"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="اسم المنتج للشحن" 
                        className="pl-10 h-11 bg-background border-border" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="العلامة التجارية" 
                      className="pl-10 h-11 bg-background border-border" 
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Textarea 
                      placeholder="وصف المنتج" 
                      className="pl-10 min-h-[100px] resize-none bg-background border-border" 
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Product Settings Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Star className="h-4 w-4 text-primary" />
            </div>
            إعدادات المنتج
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="is_featured"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-3 space-x-reverse p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <FormControl>
                      <Checkbox 
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className="bg-amber-100 p-1.5 rounded-full">
                        <Star className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <span className="text-sm font-medium">منتج مميز</span>
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_new"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-3 space-x-reverse p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className="bg-green-100 p-1.5 rounded-full">
                        <Gift className="w-3.5 h-3.5 text-green-600" />
                      </div>
                      <span className="text-sm font-medium">منتج جديد</span>
                    </div>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="show_price_on_landing"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-3 space-x-reverse p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className="bg-blue-100 p-1.5 rounded-full">
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium">إظهار السعر</span>
                    </div>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 