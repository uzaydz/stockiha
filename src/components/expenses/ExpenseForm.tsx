import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useExpenses } from "@/hooks/useExpenses";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Expense, ExpenseFormData, RecurringFrequency } from "@/types/expenses";

// تعريف مخطط التحقق من صحة النموذج
const formSchema = z.object({
  title: z.string().min(2, {
    message: "يجب أن يحتوي عنوان المصروف على حرفين على الأقل",
  }),
  amount: z.coerce.number().positive({
    message: "يجب أن يكون المبلغ أكبر من صفر",
  }),
  category: z.string({
    required_error: "يرجى اختيار فئة",
  }),
  expense_date: z.date({
    required_error: "يرجى اختيار تاريخ",
  }),
  notes: z.string().optional(),
  status: z.enum(["pending", "completed", "cancelled"]).default("completed"),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.enum(["weekly", "bi_weekly", "monthly", "quarterly", "yearly"]).optional(),
});

interface ExpenseFormProps {
  expense?: Expense;
  onSubmit: (data: ExpenseFormData) => void;
  isSubmitting?: boolean;
  onSuccess?: () => void;
}

export function ExpenseForm({ expense, onSubmit, isSubmitting = false, onSuccess }: ExpenseFormProps) {
  const { useExpenseCategoriesQuery } = useExpenses();
  const [isRecurring, setIsRecurring] = useState(expense?.is_recurring || false);
  
  const { data: categories, isLoading: categoriesLoading } = useExpenseCategoriesQuery();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: expense?.title || "",
      amount: expense?.amount ? Number(expense.amount) : 0,
      category: expense?.category || "",
      expense_date: expense?.expense_date ? new Date(expense.expense_date) : new Date(),
      notes: expense?.notes || "",
      status: expense?.status || "completed",
      is_recurring: expense?.is_recurring || false,
      recurring_frequency: expense?.recurring?.frequency || undefined,
    },
  });

  function handleSubmit(values: z.infer<typeof formSchema>) {
    // تحويل قيم النموذج إلى كائن ExpenseFormData المطلوب
    const expenseData: ExpenseFormData = {
      title: values.title,
      amount: values.amount,
      category: values.category,
      expense_date: values.expense_date,
      notes: values.notes || '',
      status: values.status,
      is_recurring: values.is_recurring,
    };
    
    // إضافة معلومات التكرار إذا كان المصروف متكرراً
    if (values.is_recurring && values.recurring_frequency) {
      expenseData.recurring = {
        frequency: values.recurring_frequency,
        start_date: values.expense_date,
        day_of_month: values.expense_date.getDate(),
        day_of_week: values.expense_date.getDay()
      };
    }
    
    onSubmit(expenseData);
  }

  const frequencyOptions = [
    { value: 'weekly', label: 'أسبوعيًا' },
    { value: 'bi_weekly', label: 'كل أسبوعين' },
    { value: 'monthly', label: 'شهريًا' },
    { value: 'quarterly', label: 'ربع سنوي' },
    { value: 'yearly', label: 'سنويًا' },
  ];

  const statusOptions = [
    { value: 'pending', label: 'قيد الانتظار' },
    { value: 'completed', label: 'مكتمل' },
    { value: 'cancelled', label: 'ملغي' },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" dir="rtl">
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2 text-primary flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 12H7.21l2.31-2.31a1 1 0 0 0-1.42-1.42l-4 4a1 1 0 0 0 0 1.41l4 4.01a1 1 0 0 0 1.42-1.42L7.21 14H18a1 1 0 1 0 0-2Z"></path>
            </svg>
            {expense ? 'تعديل المصروف' : 'إضافة مصروف جديد'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {expense ? 'قم بتعديل بيانات المصروف بالأسفل' : 'أدخل تفاصيل المصروف الجديد في النموذج أدناه'}
          </p>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"></path>
                  </svg>
                  عنوان المصروف
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="أدخل عنوان المصروف" 
                    {...field} 
                    className="focus-visible:ring-primary/30 bg-background/80"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                  المبلغ (د.ج)
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    {...field} 
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                    className="focus-visible:ring-primary/30 bg-background/80"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-sm font-semibold flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
                  </svg>
                  الفئة
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                  disabled={categoriesLoading || !categories?.length}
                >
                  <FormControl>
                    <SelectTrigger className="focus-visible:ring-primary/30 bg-background/80">
                      <SelectValue placeholder="اختر فئة" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categoriesLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        <span>جار التحميل...</span>
                      </div>
                    ) : categories?.length ? (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        لا توجد فئات متاحة
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expense_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-sm font-semibold flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                    <line x1="16" x2="16" y1="2" y2="6"></line>
                    <line x1="8" x2="8" y1="2" y2="6"></line>
                    <line x1="3" x2="21" y1="10" y2="10"></line>
                  </svg>
                  تاريخ المصروف
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-right font-normal focus-visible:ring-primary/30 bg-background/80",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>اختر تاريخ</span>
                        )}
                        <CalendarIcon className="mr-2 h-4 w-4" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => field.onChange(date || new Date())}
                      initialFocus
                      className="rounded-md shadow-md border"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-sm font-semibold flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                  <path d="m9 12 2 2 4-4"></path>
                </svg>
                الحالة
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="focus-visible:ring-primary/30 bg-background/80">
                    <SelectValue placeholder="اختر حالة المصروف" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          option.value === 'completed' ? 'bg-green-500' : 
                          option.value === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                        }`}></span>
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="21" x2="3" y1="6" y2="6"></line>
                  <line x1="15" x2="3" y1="12" y2="12"></line>
                  <line x1="17" x2="3" y1="18" y2="18"></line>
                </svg>
                ملاحظات
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="ملاحظات إضافية عن هذا المصروف"
                  {...field}
                  value={field.value || ""}
                  className="min-h-[100px] focus-visible:ring-primary/30 bg-background/80 resize-y"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border rounded-lg p-4 bg-muted/20">
          <FormField
            control={form.control}
            name="is_recurring"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 pb-4 space-x-reverse">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      setIsRecurring(checked as boolean);
                    }}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-semibold flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 0 1-9 9"></path>
                      <path d="M3 12a9 9 0 0 1 9-9"></path>
                      <path d="m12 7 3 3-3 3"></path>
                      <path d="M14 15a2 2 0 1 0 0-4"></path>
                      <path d="M3 16v-2"></path>
                    </svg>
                    مصروف متكرر
                  </FormLabel>
                  <FormDescription className="text-xs text-muted-foreground mr-5">
                    حدد هذا الخيار إذا كان المصروف متكرراً بانتظام
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {isRecurring && (
            <div className="mr-6 border-r pr-4 border-primary/20">
              <FormField
                control={form.control}
                name="recurring_frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      تكرار كل
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "monthly"}
                    >
                      <FormControl>
                        <SelectTrigger className="focus-visible:ring-primary/30 bg-background/80">
                          <SelectValue placeholder="اختر تكرار" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {frequencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full mt-6 gap-2 hover:bg-primary/90 transition-colors"
          disabled={isSubmitting}
        >
          {isSubmitting && (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          )}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          {expense ? "تحديث المصروف" : "إضافة مصروف"}
        </Button>
      </form>
    </Form>
  );
} 