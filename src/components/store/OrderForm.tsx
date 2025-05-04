import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CreditCard, Truck, Check, AlertCircle, ChevronRight, Phone, Map, User } from "lucide-react";
import { Product, ProductColor, processOrder } from "@/api/store";
import { ProductSize } from "@/types/product";
import { Button } from "@/components/ui/button";
import {
  Form,
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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useTenant } from "@/context/TenantContext";

// Algerian provinces list
const PROVINCES = [
  "أدرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية", "بسكرة", "بشار", "البليدة", "البويرة",
  "تمنراست", "تبسة", "تلمسان", "تيارت", "تيزي وزو", "الجزائر", "الجلفة", "جيجل", "سطيف", "سعيدة",
  "سكيكدة", "سيدي بلعباس", "عنابة", "قالمة", "قسنطينة", "المدية", "مستغانم", "المسيلة", "معسكر", "ورقلة",
  "وهران", "البيض", "إليزي", "برج بوعريريج", "بومرداس", "الطارف", "تندوف", "تيسمسيلت", "الوادي",
  "خنشلة", "سوق أهراس", "تيبازة", "ميلة", "عين الدفلى", "النعامة", "عين تموشنت", "غرداية", "غليزان"
];

// Delivery companies
const DELIVERY_COMPANIES = [
  { id: "yalidine", name: "ياليدين", icon: "🚚", fee: 400 },
  { id: "zr_express", name: "ZR إكسبرس", icon: "🚀", fee: 450 },
  { id: "quick_line", name: "كويك لاين", icon: "⚡", fee: 350 }
];

// Payment methods
const PAYMENT_METHODS = [
  { id: "cash_on_delivery", name: "الدفع عند الاستلام", icon: "💵" },
  { id: "bank_transfer", name: "تحويل بنكي", icon: "🏦" }
];

// Form schema - simplified
const orderFormSchema = z.object({
  fullName: z.string().min(3, {
    message: "الإسم يجب أن يحتوي على 3 أحرف على الأقل",
  }),
  phone: z.string().min(10, {
    message: "يرجى إدخال رقم هاتف صحيح",
  }),
  province: z.string({
    required_error: "يرجى اختيار الولاية",
  }),
  address: z.string().min(5, {
    message: "العنوان يجب أن يحتوي على 5 أحرف على الأقل",
  }),
  deliveryCompany: z.string({
    required_error: "يرجى اختيار شركة التوصيل",
  }),
  paymentMethod: z.string({
    required_error: "يرجى اختيار طريقة الدفع",
  }),
  notes: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

interface OrderFormProps {
  product: Product;
  selectedColor: ProductColor | null;
  selectedSize: ProductSize | null;
  quantity: number;
  totalPrice: number;
}

const OrderForm = ({
  product,
  selectedColor,
  selectedSize,
  quantity,
  totalPrice,
}: OrderFormProps) => {
  const { currentOrganization } = useTenant();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [selectedDeliveryCompany, setSelectedDeliveryCompany] = useState<string>("yalidine");
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [orderError, setOrderError] = useState<string | null>(null);
  
  // Progress steps
  const steps = [
    { id: 1, name: "معلومات شخصية", icon: User },
    { id: 2, name: "العنوان", icon: Map },
    { id: 3, name: "الدفع والتوصيل", icon: CreditCard },
  ];

  // Form with validation
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      province: "",
      address: "",
      deliveryCompany: "yalidine",
      paymentMethod: "cash_on_delivery",
      notes: "",
    },
  });

  // Get the delivery company fee
  const getDeliveryFee = (): number => {
    const company = DELIVERY_COMPANIES.find(c => c.id === selectedDeliveryCompany);
    return company ? company.fee : 0;
  };

  // Calculate the price of a single item
  const calculatePrice = (): number => {
    if (!product) return 0;
    
    // إذا كان هناك مقاس محدد وله سعر خاص، استخدمه أولاً
    if (selectedSize && selectedSize.price !== undefined) {
      return selectedSize.price;
    }
    
    // If color has specific price, use it
    if (selectedColor && selectedColor.price !== undefined) {
      return selectedColor.price;
    }
    
    // Otherwise use product price
    return product.discount_price || product.price;
  };

  // Calculate the final price including delivery
  const calculateFinalPrice = (): number => {
    return totalPrice + getDeliveryFee();
  };

  // Handle next step
  const handleNextStep = async () => {
    // Validate current step fields before proceeding
    let isValid = false;
    
    if (currentStep === 1) {
      isValid = await form.trigger(['fullName', 'phone']);
    } else if (currentStep === 2) {
      isValid = await form.trigger(['province', 'address']);
    }
    
    if (isValid && currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  // Handle previous step
  const handlePreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmit = async (values: OrderFormValues) => {
    // Ensure this is only triggered by a user's explicit action to submit the form
    if (currentStep !== steps.length) {
      return;
    }
    
    setIsSubmitting(true);
    setOrderError(null);
    
    try {
      // Debug log to find any issues
      console.log("Submitting order with data:", {
        fullName: values.fullName,
        phone: values.phone,
        province: values.province,
        address: values.address,
        deliveryCompany: values.deliveryCompany,
        paymentMethod: values.paymentMethod,
        notes: values.notes || "",
        productId: product.id,
        productColorId: selectedColor?.id || null,
        productSizeId: selectedSize?.id || null,
        sizeName: selectedSize?.size_name || null,
        quantity: quantity,
        unitPrice: calculatePrice(),
        totalPrice: totalPrice,
        deliveryFee: getDeliveryFee(),
        organizationId: currentOrganization.id
      });
      
      // Call the processOrder API function
      const orderResult = await processOrder(
        currentOrganization.id,
        {
          fullName: values.fullName,
          phone: values.phone,
          province: values.province,
          address: values.address,
          deliveryCompany: values.deliveryCompany,
          paymentMethod: values.paymentMethod,
          notes: values.notes || "",
          productId: product.id,
          productColorId: selectedColor?.id || null,
          productSizeId: selectedSize?.id || null,
          sizeName: selectedSize?.size_name || null,
          quantity: quantity,
          unitPrice: calculatePrice(),
          totalPrice: totalPrice,
          deliveryFee: getDeliveryFee()
        }
      );
      
      // Check if API returned an error
      if (orderResult && orderResult.error) {
        throw new Error(`API Error: ${orderResult.error}. Details: ${orderResult.detail || 'No details provided'}`);
      }
      
      console.log("Order created:", orderResult);
      
      // Set the real order number from the database
      setOrderNumber(orderResult.order_number?.toString() || "N/A");
      
      setFormSubmitted(true);
    } catch (error) {
      console.error("Error submitting order:", error);
      setOrderError(`حدث خطأ أثناء معالجة الطلب: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeliveryCompanyChange = (value: string) => {
    setSelectedDeliveryCompany(value);
    form.setValue("deliveryCompany", value);
  };

  // If the form was successfully submitted, show a success message
  if (formSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-background/95 shadow-lg overflow-hidden">
          <CardHeader className="border-b border-green-100 dark:border-green-800/30 bg-green-50/80 dark:bg-green-900/10">
            <CardTitle className="text-green-700 dark:text-green-300 flex items-center text-2xl">
              <div className="bg-green-100 dark:bg-green-800/30 p-2 rounded-full mr-3">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              تم إرسال طلبك بنجاح!
            </CardTitle>
            <CardDescription className="text-green-600 dark:text-green-400">
              سيتم التواصل معك قريباً لتأكيد الطلب
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="mb-4 text-lg">شكراً لطلبك منتج <span className="font-semibold">{product.name}</span>.</p>
            
            <div className="bg-white dark:bg-background p-6 rounded-xl border mb-6 shadow-sm">
              <div className="flex items-center mb-3">
                <div className="bg-primary/10 p-2 rounded-full mr-3">
                  <span className="text-lg">🔖</span>
                </div>
                <h3 className="font-bold text-xl">معلومات الطلب</h3>
              </div>
              <div className="flex flex-col space-y-3 text-muted-foreground">
                <div className="flex justify-between py-2 border-b">
                  <span>رقم الطلب:</span>
                  <span className="font-bold text-foreground">#{orderNumber}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>المنتج:</span>
                  <span className="font-medium text-foreground">{product.name}</span>
                </div>
                {selectedColor && (
                  <div className="flex justify-between py-2 border-b">
                    <span>اللون:</span>
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: selectedColor.color_code }}
                      />
                      <span className="font-medium text-foreground">{selectedColor.name}</span>
                    </div>
                  </div>
                )}
                {selectedSize && (
                  <div className="flex justify-between py-2 border-b">
                    <span>المقاس:</span>
                    <span className="font-medium text-foreground">{selectedSize.size_name}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b">
                  <span>الكمية:</span>
                  <span className="font-medium text-foreground">{quantity} قطعة</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>سعر المنتج:</span>
                  <span className="font-medium text-foreground">{totalPrice.toLocaleString()} د.ج</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>رسوم التوصيل:</span>
                  <span className="font-medium text-foreground">{getDeliveryFee().toLocaleString()} د.ج</span>
                </div>
                <div className="flex justify-between pt-3 text-lg">
                  <span className="font-semibold text-foreground">الإجمالي:</span>
                  <span className="font-bold text-primary">{calculateFinalPrice().toLocaleString()} د.ج</span>
                </div>
              </div>
            </div>
            
            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>تم استلام طلبك</AlertTitle>
              <AlertDescription>
                سنتواصل معك قريباً على رقم الهاتف الذي قدمته لتأكيد التفاصيل والشحن.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex gap-4 pt-2 pb-6 border-t">
            <Button 
              className="w-full gap-2 bg-primary/90 hover:bg-primary"
              onClick={() => window.location.href = '/'}
            >
              <span>العودة للتسوق</span>
              <span className="text-lg">🛍️</span>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-3xl mx-auto"
    >
      {/* Show error message if order submission failed */}
      {orderError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription>{orderError}</AlertDescription>
        </Alert>
      )}

      {/* Step Progress */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          {steps.map((step) => (
            <div 
              key={step.id} 
              className={`flex flex-col items-center ${currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-full mb-2 ${
                currentStep > step.id 
                  ? 'bg-primary text-primary-foreground' 
                  : currentStep === step.id 
                    ? 'bg-primary/20 text-primary border-2 border-primary' 
                    : 'bg-muted/50 text-muted-foreground'
              }`}>
                {currentStep > step.id ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
              </div>
              <span className={`text-sm ${currentStep >= step.id ? 'font-medium' : ''}`}>{step.name}</span>
            </div>
          ))}
        </div>
        <Progress value={(currentStep / steps.length) * 100} className="h-2" />
      </div>

      <Form {...form}>
        <form 
          onSubmit={(e) => {
            // Prevent default form submission if we're not explicitly submitting
            if (currentStep !== steps.length) {
              e.preventDefault();
              return;
            }
            form.handleSubmit(onSubmit)(e);
          }} 
          className="space-y-6"
        >
          <Card className="shadow-sm border-muted overflow-hidden">
            {/* 1. Personal Information Step */}
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <User className="h-5 w-5 text-primary" />
                      المعلومات الشخصية
                    </CardTitle>
                    <CardDescription>أدخل معلوماتك الشخصية للتواصل معك</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 pb-4">
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الاسم الكامل</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="محمد أحمد" 
                                {...field} 
                                className="focus-visible:ring-primary"
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
                              <div className="relative">
                                <Phone className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input 
                                  placeholder="05XXXXXXXX" 
                                  type="tel"
                                  className="pr-10 focus-visible:ring-primary"
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </motion.div>
              )}

              {/* 2. Address Step */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Map className="h-5 w-5 text-primary" />
                      عنوان التوصيل
                    </CardTitle>
                    <CardDescription>أدخل معلومات العنوان لتوصيل طلبك</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 pb-4">
                    <div className="space-y-6">
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
                                <SelectTrigger className="focus-visible:ring-primary">
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
                      
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>العنوان التفصيلي</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="الحي, الشارع, رقم المنزل" 
                                {...field} 
                                className="resize-none focus-visible:ring-primary min-h-[80px]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </motion.div>
              )}

              {/* 3. Payment & Delivery Step */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onAnimationComplete={() => {
                    // Prevent auto-submission when animation completes
                    form.clearErrors();
                  }}
                >
                  <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <CreditCard className="h-5 w-5 text-primary" />
                      الدفع والتوصيل
                    </CardTitle>
                    <CardDescription>اختر طريقة الدفع وشركة التوصيل</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 pb-4">
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="deliveryCompany"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>شركة التوصيل</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={handleDeliveryCompanyChange}
                                defaultValue={field.value}
                                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                              >
                                {DELIVERY_COMPANIES.map((company) => (
                                  <div 
                                    key={company.id} 
                                    className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-3 text-center transition-colors cursor-pointer hover:bg-muted/50 ${field.value === company.id ? 'border-primary bg-primary/5' : 'border-muted'}`}
                                    onClick={() => handleDeliveryCompanyChange(company.id)}
                                  >
                                    <span className="text-xl">{company.icon}</span>
                                    <Label htmlFor={company.id} className="cursor-pointer">{company.name}</Label>
                                    <span className="text-xs text-muted-foreground">{company.fee} د.ج</span>
                                    <RadioGroupItem value={company.id} id={company.id} className="sr-only" />
                                  </div>
                                ))}
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>طريقة الدفع</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                              >
                                {PAYMENT_METHODS.map((method) => (
                                  <div
                                    key={method.id}
                                    className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 transition-colors cursor-pointer hover:bg-muted/50 ${field.value === method.id ? 'border-primary bg-primary/5' : 'border-muted'}`}
                                    onClick={() => form.setValue("paymentMethod", method.id)}
                                  >
                                    <span className="text-xl">{method.icon}</span>
                                    <Label htmlFor={method.id} className="cursor-pointer">{method.name}</Label>
                                    <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                                  </div>
                                ))}
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
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
                                className="resize-none focus-visible:ring-primary h-20"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Order Summary */}
            <div className="px-6 pt-2 pb-4 bg-muted/20 border-t">
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">سعر المنتج ({quantity})</span>
                  <span>{totalPrice.toLocaleString()} د.ج</span>
                </div>
                {currentStep >= 3 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">رسوم التوصيل</span>
                    <span>{getDeliveryFee().toLocaleString()} د.ج</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-medium">الإجمالي:</span>
                  <span className="font-bold text-primary text-lg">
                    {(currentStep >= 3 ? calculateFinalPrice() : totalPrice).toLocaleString()} د.ج
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <CardFooter className="flex justify-between pt-4 pb-6 border-t">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviousStep}
                >
                  السابق
                </Button>
              ) : (
                <div></div>
              )}
              
              {currentStep < steps.length ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-primary/90 hover:bg-primary gap-1"
                >
                  التالي
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  type="button" 
                  className="gap-2 bg-primary hover:bg-primary/90 hover:shadow-lg transition-all duration-300"
                  disabled={isSubmitting}
                  onClick={() => {
                    // Manual form submission to prevent automatic triggers
                    if (form.formState.isValid) {
                      form.handleSubmit(onSubmit)();
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري تأكيد الطلب...
                    </>
                  ) : (
                    <>
                      تأكيد الطلب
                      <CreditCard className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </form>
      </Form>
    </motion.div>
  );
};

export default OrderForm; 