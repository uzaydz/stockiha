import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Monitor, 
  Smartphone, 
  Database, 
  Settings, 
  Download, 
  Upload,
  Bell,
  Shield,
  Zap,
  Globe
} from 'lucide-react';

interface DesktopAppProps {
  children?: React.ReactNode;
}

export const DesktopApp: React.FC<DesktopAppProps> = ({ children }) => {
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    // تحميل معلومات النظام
    if (window.electronAPI) {
      window.electronAPI.getSystemInfo().then((info: any) => {
        setSystemInfo(info);
      });

      window.electronAPI.getAppVersion().then((version: string) => {
        setAppVersion(version);
      });
    }

    // مراقبة حالة الاتصال
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                سطوكيها - سطح المكتب
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                منصة إدارة المتاجر الذكية
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant={isOnline ? "default" : "destructive"}>
              <Globe className="w-3 h-3 mr-1" />
              {isOnline ? 'متصل' : 'غير متصل'}
            </Badge>
            
            <Badge variant="outline">
              الإصدار {appVersion}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>معلومات النظام</span>
              </CardTitle>
              <CardDescription>
                تفاصيل النظام والتطبيق
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {systemInfo && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">النظام:</span>
                    <Badge variant="outline">
                      {systemInfo.platform === 'darwin' ? 'macOS' : 
                       systemInfo.platform === 'win32' ? 'Windows' : 'Linux'}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">البنية:</span>
                    <span className="text-sm font-medium">{systemInfo.arch}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Node.js:</span>
                    <span className="text-sm font-medium">{systemInfo.version}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Electron:</span>
                    <span className="text-sm font-medium">{systemInfo.electronVersion}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>الميزات المحلية</span>
              </CardTitle>
              <CardDescription>
                ميزات سطح المكتب المتقدمة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <Bell className="w-4 h-4 text-green-600" />
                <span className="text-sm">إشعارات النظام</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-sm">أمان محسن</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Download className="w-4 h-4 text-purple-600" />
                <span className="text-sm">إدارة الملفات</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Settings className="w-4 h-4 text-orange-600" />
                <span className="text-sm">إعدادات متقدمة</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5" />
                <span>إجراءات سريعة</span>
              </CardTitle>
              <CardDescription>
                أدوات سريعة للوصول
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                الإعدادات
              </Button>
              
              <Button className="w-full justify-start" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                تصدير البيانات
              </Button>
              
              <Button className="w-full justify-start" variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                استيراد البيانات
              </Button>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-6" />

        {/* App Content */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DesktopApp;
