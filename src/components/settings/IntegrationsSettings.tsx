import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  CreditCard, 
  Truck, 
  ExternalLink,
  ShoppingBag
} from 'lucide-react';
import WhatsAppSettings from './WhatsAppSettings';
import ShippingSettings from './ShippingSettings';

export default function IntegrationsSettings() {
  const [activeTab, setActiveTab] = useState('whatsapp');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">إعدادات التكامل والربط</h3>
        <p className="text-sm text-muted-foreground">
          قم بربط نظامك مع خدمات خارجية مثل واتساب والدفع الإلكتروني وخدمات الشحن
        </p>
      </div>

      <Tabs defaultValue="whatsapp" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2 h-auto">
          <TabsTrigger value="whatsapp" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex gap-2 items-center py-2">
            <MessageSquare className="h-4 w-4" />
            <span>واتساب</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex gap-2 items-center py-2" disabled>
            <CreditCard className="h-4 w-4" />
            <span>الدفع الإلكتروني</span>
          </TabsTrigger>
          <TabsTrigger value="shipping" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex gap-2 items-center py-2">
            <Truck className="h-4 w-4" />
            <span>خدمات التوصيل</span>
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="flex gap-2 items-center py-2" disabled>
            <ShoppingBag className="h-4 w-4" />
            <span>المتاجر الإلكترونية</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="whatsapp" className="space-y-4 mt-4">
          <WhatsAppSettings />
        </TabsContent>
        
        <TabsContent value="payment" className="space-y-4 mt-4">
          <div className="flex flex-col items-center justify-center py-10 px-6 border border-dashed rounded-lg">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">تكامل بوابات الدفع</h3>
            <p className="text-center text-muted-foreground mb-4">
              تكامل مع أشهر بوابات الدفع الإلكتروني مثل STC Pay، و Mada، و PayPal وغيرها
            </p>
            <div className="flex items-center text-sm text-blue-500">
              <span>قريباً</span>
              <ExternalLink className="h-4 w-4 ml-1" />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="shipping" className="space-y-4 mt-4">
          <ShippingSettings />
        </TabsContent>
        
        <TabsContent value="marketplace" className="space-y-4 mt-4">
          <div className="flex flex-col items-center justify-center py-10 px-6 border border-dashed rounded-lg">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">تكامل المتاجر الإلكترونية</h3>
            <p className="text-center text-muted-foreground mb-4">
              تكامل مع منصات التسوق الإلكتروني مثل سلة وزد وأمازون
            </p>
            <div className="flex items-center text-sm text-blue-500">
              <span>قريباً</span>
              <ExternalLink className="h-4 w-4 ml-1" />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 