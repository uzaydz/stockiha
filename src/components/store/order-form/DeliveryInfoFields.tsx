import { Truck, MapPin } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { DeliveryInfoFieldsProps, PROVINCES, DELIVERY_COMPANIES, PAYMENT_METHODS } from "./OrderFormTypes";

const DeliveryInfoFields = ({ form, onDeliveryCompanyChange }: DeliveryInfoFieldsProps) => {
  return (
    <div className="space-y-6">
      <div className="pt-2 border-t">
        <h3 className="text-lg font-medium text-primary/90 mb-4">معلومات التوصيل</h3>
      </div>
      
      {/* شركة التوصيل */}
      <FormField
        control={form.control}
        name="deliveryCompany"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary/70" />
              <span>شركة التوصيل</span>
            </FormLabel>
            <Select 
              onValueChange={(value) => {
                onDeliveryCompanyChange(value);
                field.onChange(value);
              }}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger className="focus-visible:ring-primary border-muted-foreground/20 transition-all hover:border-primary/30">
                  <SelectValue placeholder="اختر شركة التوصيل" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {DELIVERY_COMPANIES.map((company) => (
                  <SelectItem 
                    key={company.id} 
                    value={company.id}
                    className="transition-colors hover:bg-primary/10"
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{company.icon}</span>
                        <span>{company.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{company.fee} د.ج</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* خيار التوصيل */}
      <FormField
        control={form.control}
        name="deliveryOption"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>خيار التوصيل</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-md border border-muted-foreground/10 hover:border-primary/20 hover:bg-muted/30 transition-all">
                  <RadioGroupItem value="home" id="delivery-home" className="text-primary" />
                  <Label htmlFor="delivery-home" className="cursor-pointer flex-1">
                    <div className="font-medium">توصيل للمنزل</div>
                    <div className="text-xs text-muted-foreground">توصيل مباشرة إلى عنوانك</div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-md border border-muted-foreground/10 hover:border-primary/20 hover:bg-muted/30 transition-all">
                  <RadioGroupItem value="office" id="delivery-office" className="text-primary" />
                  <Label htmlFor="delivery-office" className="cursor-pointer flex-1">
                    <div className="font-medium">استلام من مكتب شركة التوصيل</div>
                    <div className="text-xs text-muted-foreground">استلام الطلب بنفسك من أقرب مكتب</div>
                  </Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="pt-2 border-t">
        <h3 className="text-lg font-medium text-primary/90 mb-4">معلومات العنوان</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* الولاية */}
        <FormField
          control={form.control}
          name="province"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الولاية</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="focus-visible:ring-primary border-muted-foreground/20 transition-all hover:border-primary/30">
                    <SelectValue placeholder="اختر الولاية" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-[300px]">
                  {PROVINCES.map((province, index) => (
                    <SelectItem key={index} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* البلدية */}
        <FormField
          control={form.control}
          name="municipality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>البلدية</FormLabel>
              <FormControl>
                <Input 
                  placeholder="أدخل اسم البلدية" 
                  {...field} 
                  className="focus-visible:ring-primary transition-all border-muted-foreground/20 hover:border-primary/30"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      {/* العنوان بالكامل */}
      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary/70" />
              <span>العنوان بالكامل</span>
            </FormLabel>
            <FormControl>
              <Textarea 
                placeholder="الحي، الشارع، رقم المنزل..." 
                {...field} 
                className="resize-none focus-visible:ring-primary min-h-[80px] transition-all border-muted-foreground/20 hover:border-primary/30"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="pt-2 border-t">
        <h3 className="text-lg font-medium text-primary/90 mb-4">طريقة الدفع</h3>
      </div>

      {/* طريقة الدفع */}
      <FormField
        control={form.control}
        name="paymentMethod"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-col space-y-2"
              >
                {PAYMENT_METHODS.map((method) => (
                  <div 
                    key={method.id}
                    className="flex items-center space-x-2 space-x-reverse p-3 rounded-md border border-muted-foreground/10 hover:border-primary/20 hover:bg-muted/30 transition-all"
                  >
                    <RadioGroupItem value={method.id} id={`payment-${method.id}`} className="text-primary" />
                    <Label htmlFor={`payment-${method.id}`} className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{method.icon}</span>
                        <span className="font-medium">{method.name}</span>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* ملاحظات إضافية */}
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>ملاحظات إضافية (اختياري)</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="أي ملاحظات خاصة بطلبك" 
                {...field} 
                className="resize-none focus-visible:ring-primary h-20 transition-all border-muted-foreground/20 hover:border-primary/30"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default DeliveryInfoFields; 