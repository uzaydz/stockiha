import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CalendarIcon, CalendarDays, Clock, User, Phone } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { createBooking } from '@/lib/api/services';
import type { Service } from '@/lib/api/services';
import { formatPrice } from '@/lib/utils';

// مخطط نموذج الحجز
const bookingFormSchema = z.object({
  customer_name: z.string().min(2, {
    message: 'يجب أن يتكون اسم العميل من حرفين على الأقل',
  }),
  customer_phone: z.string().min(8, {
    message: 'يجب أن يتكون رقم الهاتف من 8 أرقام على الأقل',
  }),
  booking_date: z.date({
    required_error: 'يرجى تحديد تاريخ الحجز',
  }),
  booking_time: z.string().min(1, {
    message: 'يرجى إدخال وقت الحجز',
  }),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface BookingDialogProps {
  service: Service;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingCreated: () => Promise<void>;
}

const BookingDialog = ({
  service,
  open,
  onOpenChange,
  onBookingCreated,
}: BookingDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // إعداد النموذج
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      booking_time: '',
      notes: '',
    },
  });

  // تنسيق المدة
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} دقيقة`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} ساعة`;
      } else {
        return `${hours} ساعة و ${remainingMinutes} دقيقة`;
      }
    }
  };

  // معالجة تقديم النموذج
  async function onSubmit(data: BookingFormValues) {
    setIsSubmitting(true);
    
    try {
      // استخراج ساعة ودقيقة من وقت الحجز (مثال: 14:30)
      const [hours, minutes] = data.booking_time.split(':');
      const bookingDateTime = new Date(data.booking_date);
      bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // تحضير بيانات الحجز
      const bookingData = {
        service_id: service.id,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        booking_date: bookingDateTime.toISOString().split('T')[0],
        booking_time: data.booking_time,
        notes: data.notes || null,
        status: 'pending' as const
      };
      
      // إرسال طلب الحجز
      await createBooking(bookingData);
      
      toast.success('تم إنشاء الحجز بنجاح');
      form.reset();
      onOpenChange(false);
      onBookingCreated();
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء الحجز');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>حجز موعد</DialogTitle>
          <DialogDescription>
            حجز موعد للخدمة: {service.name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mt-2 mb-4 p-3 bg-muted/50 rounded-lg">
          <div>
            <div className="text-sm text-muted-foreground">السعر</div>
            <div className="font-semibold">{formatPrice(service.price)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">المدة</div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{service.estimated_time}</span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* اسم العميل */}
              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم العميل</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <div className="flex items-center px-3 border border-l-0 rounded-r-md bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Input
                          placeholder="أدخل اسم العميل"
                          {...field}
                          className="rounded-l-md rounded-r-none"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* رقم هاتف العميل */}
              <FormField
                control={form.control}
                name="customer_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <div className="flex items-center px-3 border border-l-0 rounded-r-md bg-muted">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Input
                          placeholder="الهاتف رقم أدخل"
                          type="tel"
                          {...field}
                          className="rounded-l-md rounded-r-none text-right [&::placeholder]:text-right [&::placeholder]:mr-0"
                          style={{ 
                            textAlign: 'right', 
                            direction: 'rtl'
                          }}
                          dir="rtl"
                          inputMode="tel"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* تاريخ الحجز */}
              <FormField
                control={form.control}
                name="booking_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ الحجز</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-right font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ar })
                            ) : (
                              <span>اختر تاريخ</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => 
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* وقت الحجز */}
              <FormField
                control={form.control}
                name="booking_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وقت الحجز</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <div className="flex items-center px-3 border border-l-0 rounded-r-md bg-muted">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Input
                          type="time"
                          {...field}
                          className="rounded-l-md rounded-r-none"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      أوقات العمل من 9:00 صباحاً إلى 8:00 مساءً
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ملاحظات */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="أضف أي ملاحظات أو متطلبات خاصة"
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'جاري الحجز...' : 'تأكيد الحجز'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
