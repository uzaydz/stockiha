import { useState } from 'react';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { updateMinimumStockLevel } from '@/lib/api/inventory';
import type { Product } from '@/types';

interface MinimumStockDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsUpdated: () => Promise<void>;
}

// قالب ضبط الحد الأدنى للمخزون
const minimumStockSchema = z.object({
  min_stock_level: z.coerce.number().nonnegative({ message: 'يجب أن تكون القيمة صفر أو أكثر' }),
  reorder_level: z.coerce.number().nonnegative({ message: 'يجب أن تكون القيمة صفر أو أكثر' }),
  reorder_quantity: z.coerce.number().positive({ message: 'يجب أن تكون القيمة أكبر من صفر' }),
}).refine((data) => data.reorder_level >= data.min_stock_level, {
  message: 'يجب أن يكون حد إعادة الطلب أكبر من أو يساوي الحد الأدنى للمخزون',
  path: ['reorder_level'],
});

type MinimumStockValues = z.infer<typeof minimumStockSchema>;

const MinimumStockDialog = ({ product, open, onOpenChange, onSettingsUpdated }: MinimumStockDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<MinimumStockValues>({
    resolver: zodResolver(minimumStockSchema),
    defaultValues: {
      min_stock_level: product.min_stock_level || 5,
      reorder_level: product.reorder_level || 10,
      reorder_quantity: product.reorder_quantity || 20,
    },
  });
  
  const handleSaveSettings = async (values: MinimumStockValues) => {
    setIsSubmitting(true);
    try {
      await updateMinimumStockLevel(
        product.id,
        values.min_stock_level,
        values.reorder_level,
        values.reorder_quantity
      );
      
      toast.success('تم تحديث إعدادات المخزون بنجاح');
      onOpenChange(false);
      await onSettingsUpdated();
    } catch (error) {
      console.error('Error updating minimum stock settings:', error);
      toast.error('حدث خطأ أثناء تحديث إعدادات المخزون');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ضبط الحد الأدنى للمخزون: {product.name}</DialogTitle>
          <DialogDescription>
            تحديد إعدادات الحد الأدنى ومستويات إعادة الطلب
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSaveSettings)} className="space-y-4">
            <FormField
              control={form.control}
              name="min_stock_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الحد الأدنى للمخزون</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      step="1" 
                      {...field} 
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    عندما يصل المخزون إلى هذا المستوى أو أقل، سيتم اعتباره "نفذ من المخزون"
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="reorder_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>حد إعادة الطلب</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      step="1" 
                      {...field} 
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    عندما يصل المخزون إلى هذا المستوى أو أقل، يجب طلب المزيد
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="reorder_quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>كمية إعادة الطلب المقترحة</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      step="1" 
                      {...field} 
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    الكمية المقترح طلبها عند إعادة الطلب
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="bg-muted/30 p-3 rounded-md flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <p>
                المخزون الحالي: <span className="font-bold">{product.stock_quantity}</span> وحدة.
                {product.stock_quantity <= form.getValues('min_stock_level') && (
                  <span className="text-rose-600 block mt-1">
                    المخزون الحالي أقل من أو يساوي الحد الأدنى!
                  </span>
                )}
                {product.stock_quantity <= form.getValues('reorder_level') && product.stock_quantity > form.getValues('min_stock_level') && (
                  <span className="text-amber-600 block mt-1">
                    المخزون الحالي أقل من حد إعادة الطلب!
                  </span>
                )}
              </p>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                حفظ الإعدادات
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default MinimumStockDialog; 