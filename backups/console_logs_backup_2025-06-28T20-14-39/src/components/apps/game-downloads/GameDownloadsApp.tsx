import React, { useState } from 'react';
import { Gamepad2, Settings, ShoppingCart, BarChart3, Package, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import GameDownloadsSettings from './GameDownloadsSettings';
import GameOrdersManagement from './GameOrdersManagement';
import GamesCatalog from './GamesCatalog';
import GameDownloadsStats from './GameDownloadsStats';

export default function GameDownloadsApp() {
  const [activeTab, setActiveTab] = useState('orders');
  const { organization } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-6 border-b">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Gamepad2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">تطبيق تحميل الألعاب</h1>
            <p className="text-muted-foreground">إدارة متجر تحميل الألعاب وطلبات العملاء</p>
          </div>
        </div>
        <Button 
          onClick={() => {
            const currentHostname = window.location.hostname;
            const currentPort = window.location.port;
            const currentProtocol = window.location.protocol;

            // أولاً، التحقق من وجود نطاق مخصص للمؤسسة
            if (organization?.domain) {
              // استخدام النطاق المخصص مع مسار /games
              const gamesUrl = `https://${organization.domain}/games`;
              window.open(gamesUrl, '_blank');
              return;
            }

            // إذا كنا حالياً على النطاق الفرعي، استخدمه مباشرة
            if (currentHostname.includes('.localhost') && !currentHostname.startsWith('localhost')) {
              // نحن بالفعل على النطاق الفرعي مثل fredstore.localhost
              const gamesUrl = `/games`;
              window.open(gamesUrl, '_blank');
            } else if (currentHostname.includes('localhost')) {
              // نحن على localhost عادي، نحتاج للحصول على النطاق الفرعي
              const storedSubdomain = localStorage.getItem('bazaar_current_subdomain');
              const orgSubdomain = organization?.subdomain;
              
              // استخدام النطاق الفرعي المحفوظ أو نطاق المؤسسة
              let subdomain = storedSubdomain || orgSubdomain;
              
              // إذا لم نجد النطاق الفرعي، استخدم الافتراضي للاختبار
              if (!subdomain) {
                subdomain = 'testfinalfinalvhio';
              }
              
              const port = currentPort ? `:${currentPort}` : '';
              const gamesUrl = `${currentProtocol}//${subdomain}.localhost${port}/games`;
              window.open(gamesUrl, '_blank');
            } else {
              // نحن على بيئة الإنتاج
              const orgSubdomain = organization?.subdomain;
              
              if (orgSubdomain) {
                // استخدام النطاق الفرعي على stockiha.com
                const gamesUrl = `https://${orgSubdomain}.stockiha.com/games`;
                window.open(gamesUrl, '_blank');
              } else {
                // احتياطي: الذهاب إلى الصفحة الحالية مع /games
                const gamesUrl = `/games`;
                window.open(gamesUrl, '_blank');
              }
            }
          }}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          عرض المتجر العام
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            الطلبات
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            كتالوج الألعاب
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            الإحصائيات
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            الإعدادات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <GameOrdersManagement />
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <GamesCatalog />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <GameDownloadsStats />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <GameDownloadsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
