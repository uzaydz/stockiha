import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  RefreshCw, 
  Check, 
  X, 
  MessageSquare, 
  Send, 
  Clock,
  HelpCircle
} from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  getWhatsappSettings, 
  updateWhatsappSettings, 
  sendWhatsappMessage,
  getWhatsappMessages
} from '@/lib/api/whatsapp';
import { supabase } from '@/lib/supabase';

// مخطط التحقق
const whatsappFormSchema = z.object({
  whatsappPhone: z.string()
    .min(9, { message: 'يجب إدخال رقم هاتف صحيح' })
    .refine(val => /^\+?[0-9]+$/.test(val), { message: 'يجب أن يتضمن الرقم أرقامًا فقط' }),
  whatsappConnected: z.boolean(),
  serviceCompletedTemplate: z.string()
    .min(10, { message: 'يجب أن يكون محتوى القالب 10 أحرف على الأقل' })
});

type WhatsappFormValues = z.infer<typeof whatsappFormSchema>;

interface WhatsappMessage {
  id: string;
  recipient_phone: string;
  message_content: string;
  status: string;
  sent_at: string;
  error_message?: string;
  booking?: {
    id: string;
    service_name: string;
    customer_name: string;
  };
}

export default function WhatsAppSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [activeTab, setActiveTab] = useState<string>('settings');
  
  const form = useForm<WhatsappFormValues>({
    resolver: zodResolver(whatsappFormSchema),
    defaultValues: {
      whatsappPhone: '',
      whatsappConnected: false,
      serviceCompletedTemplate: 'مرحباً {{customer_name}}، تم إكمال خدمة "{{service_name}}" بنجاح. شكراً لاستخدامك خدماتنا!'
    }
  });

  // جلب إعدادات واتساب
  useEffect(() => {
    async function fetchWhatsappSettings() {
      if (!user || !currentOrganization) return;
      
      try {
        setIsLoading(true);
        
        // جلب إعدادات واتساب
        const whatsappSettings = await getWhatsappSettings(user.id);
        
        // جلب قالب الرسائل
        const { data: templateData } = await supabase
          .from('whatsapp_templates')
          .select('template_content')
          .eq('organization_id', currentOrganization.id)
          .eq('template_name', 'service_completed')
          .eq('is_active', true)
          .single();
          
        form.reset({
          whatsappPhone: whatsappSettings.whatsappPhone || '',
          whatsappConnected: whatsappSettings.whatsappConnected || false,
          serviceCompletedTemplate: templateData?.template_content || form.getValues('serviceCompletedTemplate')
        });
      } catch (error) {
        console.error('Error loading WhatsApp settings:', error);
        toast({
          title: 'خطأ',
          description: 'لم نتمكن من تحميل إعدادات واتساب',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchWhatsappSettings();
  }, [user, currentOrganization]);

  // جلب سجل الرسائل عند تبديل التبويب
  useEffect(() => {
    if (activeTab === 'messages' && currentOrganization) {
      fetchMessages();
    }
  }, [activeTab, currentOrganization]);

  // جلب سجل الرسائل المرسلة
  const fetchMessages = async () => {
    if (!currentOrganization) return;
    
    try {
      setIsLoadingMessages(true);
      const messagesData = await getWhatsappMessages(currentOrganization.id);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching WhatsApp messages:', error);
      toast({
        title: 'خطأ',
        description: 'لم نتمكن من تحميل سجل الرسائل',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // حفظ الإعدادات
  async function onSubmit(data: WhatsappFormValues) {
    if (!user || !currentOrganization) return;
    
    try {
      setIsSaving(true);
      
      // تحديث إعدادات واتساب للمستخدم
      await updateWhatsappSettings(user.id, data.whatsappPhone, data.whatsappConnected);
      
      // تحديث قالب الرسائل
      await supabase
        .from('whatsapp_templates')
        .upsert({
          organization_id: currentOrganization.id,
          template_name: 'service_completed',
          template_content: data.serviceCompletedTemplate,
          is_active: true
        }, {
          onConflict: 'organization_id,template_name'
        });
      
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات واتساب بنجاح',
      });
    } catch (error) {
      console.error('Error saving WhatsApp settings:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ الإعدادات',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }
  
  // إرسال رسالة اختبار
  async function sendTestMessage() {
    if (!testPhone || !user || !currentOrganization) return;
    
    try {
      setIsTesting(true);
      
      const template = form.getValues('serviceCompletedTemplate');
      const message = template
        .replace('{{customer_name}}', 'العميل')
        .replace('{{service_name}}', 'خدمة الاختبار');
      
      await sendWhatsappMessage(testPhone, message);
      
      toast({
        title: 'تم الإرسال',
        description: 'تم إرسال رسالة الاختبار بنجاح',
      });
      
      // تسجيل الرسالة في قاعدة البيانات
      await supabase.from('whatsapp_messages').insert({
        organization_id: currentOrganization.id,
        recipient_phone: testPhone,
        message_content: message,
        status: 'sent'
      });
      
      // تحديث قائمة الرسائل إذا كنا في تبويب سجل الرسائل
      if (activeTab === 'messages') {
        fetchMessages();
      }
      
    } catch (error) {
      console.error('Error sending test message:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إرسال رسالة الاختبار',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  }

  // تنسيق التاريخ
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل الإعدادات...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">إعدادات واتساب</h1>
      
      <Alert className="mb-6 bg-amber-50 border-amber-200">
        <Clock className="h-5 w-5 text-amber-500" />
        <AlertTitle className="text-amber-700 font-bold text-lg">قريباً!</AlertTitle>
        <AlertDescription className="text-amber-700">
          سيتم إضافة ميزة التكامل مع واتساب قريباً. ستتمكن من إرسال رسائل للعملاء واستلام الردود مباشرة من خلال المنصة.
        </AlertDescription>
      </Alert>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            إعدادات واتساب
            <Badge className="mr-2 bg-amber-500" variant="secondary">
              قريباً
            </Badge>
          </CardTitle>
          <CardDescription>
            قم بإعداد رقم هاتف واتساب الخاص بمؤسستك وتهيئة الرسائل التلقائية
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4 opacity-70 pointer-events-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">رقم هاتف واتساب</label>
                <Input disabled placeholder="+966500000000" />
                <p className="text-sm text-muted-foreground mt-1">أدخل رقم هاتف واتساب الخاص بمؤسستك</p>
              </div>
              
              <div className="flex items-center space-x-2 mt-8 rtl:space-x-reverse">
                <Switch disabled id="whatsapp-enabled" />
                <label htmlFor="whatsapp-enabled" className="cursor-not-allowed">تفعيل واتساب</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>سيتم تفعيل هذه الميزة قريباً</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <label className="block text-sm font-medium mb-1">قالب رسالة إكمال الخدمة</label>
              <Textarea 
                disabled
                placeholder="مرحباً {{customer_name}}، تم إكمال خدمة {{service_name}} بنجاح. شكراً لاستخدامك خدماتنا!"
                className="h-24"
              />
              <p className="text-sm text-muted-foreground mt-1">
                استخدم "&#123;&#123;customer_name&#125;&#125;" و "&#123;&#123;service_name&#125;&#125;" لإضافة اسم العميل واسم الخدمة
              </p>
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button disabled className="w-full md:w-auto opacity-70">
            <Clock className="mr-2 h-4 w-4" />
            هذه الميزة قادمة قريباً
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 