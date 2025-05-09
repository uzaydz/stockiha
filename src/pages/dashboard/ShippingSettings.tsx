import { Helmet } from 'react-helmet-async';
import ShippingSettings from '@/components/settings/ShippingSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ShippingSettingsPage() {
  return (
    <>
      <Helmet>
        <title>إعدادات خدمات التوصيل | بازار</title>
      </Helmet>
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">إعدادات خدمات التوصيل</h1>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>خدمات التوصيل</CardTitle>
            <CardDescription>
              إدارة وتكوين خدمات التوصيل المختلفة لمتجرك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              يمكنك من هنا تكوين وإدارة التكامل مع مختلف شركات التوصيل في الجزائر لتسهيل عملية الشحن والتسليم لطلبات العملاء.
            </p>
          </CardContent>
        </Card>
        
        <ShippingSettings />
      </div>
    </>
  );
} 