import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import YalidineSettings from './shipping/YalidineSettings';
import { Package, Truck, TruckIcon, Package2, Copy } from 'lucide-react';

interface ShippingSettingsProps {
  onNavigateToClones?: () => void;
}

export default function ShippingSettings({ onNavigateToClones }: ShippingSettingsProps = {}) {
  const [activeProvider, setActiveProvider] = useState('yalidine');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
          <CardTitle className="text-xl">خدمات التوصيل</CardTitle>
          <CardDescription>
            قم بتفعيل وإعداد خدمات التوصيل المختلفة لمتجرك
          </CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={onNavigateToClones}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            <span>إدارة النسخ المستنسخة</span>
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="yalidine" value={activeProvider} onValueChange={setActiveProvider} className="space-y-4">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2 h-auto">
              <TabsTrigger 
                value="yalidine" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex gap-2 items-center py-2"
              >
                <Package2 className="h-4 w-4" />
                <span>ياليدين</span>
              </TabsTrigger>
              <TabsTrigger 
                value="zrexpress" 
                className="flex gap-2 items-center py-2"
              >
                <TruckIcon className="h-4 w-4" />
                <span>ZR Express</span>
              </TabsTrigger>
              <TabsTrigger 
                value="mayesto" 
                className="flex gap-2 items-center py-2"
              >
                <Package className="h-4 w-4" />
                <span>مايستو</span>
              </TabsTrigger>
              <TabsTrigger 
                value="ecotrack" 
                className="flex gap-2 items-center py-2"
              >
                <Truck className="h-4 w-4" />
                <span>إيكوتراك</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="yalidine" className="space-y-4 mt-4">
              <YalidineSettings />
            </TabsContent>
            
            <TabsContent value="zrexpress" className="space-y-4 mt-4">
              <div className="flex flex-col items-center justify-center py-10 px-6 border border-dashed rounded-lg">
                <TruckIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">ZR Express</h3>
                <p className="text-center text-muted-foreground mb-4">
                  تكامل مع خدمة ZR Express للشحن والتوصيل سيكون متاحاً قريباً
                </p>
                <div className="flex items-center text-sm text-blue-500">
                  <span>قريباً</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="mayesto" className="space-y-4 mt-4">
              <div className="flex flex-col items-center justify-center py-10 px-6 border border-dashed rounded-lg">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">مايستو</h3>
                <p className="text-center text-muted-foreground mb-4">
                  تكامل مع خدمة مايستو للشحن والتوصيل سيكون متاحاً قريباً
                </p>
                <div className="flex items-center text-sm text-blue-500">
                  <span>قريباً</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="ecotrack" className="space-y-4 mt-4">
              <div className="flex flex-col items-center justify-center py-10 px-6 border border-dashed rounded-lg">
                <Truck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">إيكوتراك</h3>
                <p className="text-center text-muted-foreground mb-4">
                  تكامل مع خدمة إيكوتراك للشحن والتوصيل سيكون متاحاً قريباً
                </p>
                <div className="flex items-center text-sm text-blue-500">
                  <span>قريباً</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 