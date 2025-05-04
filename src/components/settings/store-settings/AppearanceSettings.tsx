import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationSettings } from '@/types/settings';

interface AppearanceSettingsProps {
  settings: OrganizationSettings;
  updateSetting: (key: keyof OrganizationSettings, value: any) => void;
}

const AppearanceSettings = ({ settings, updateSetting }: AppearanceSettingsProps) => {
  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="bg-muted/30">
        <CardTitle>المظهر والألوان</CardTitle>
        <CardDescription>
          تخصيص ألوان وشكل المتجر الإلكتروني
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* اللون الرئيسي */}
        <div className="space-y-3">
          <Label htmlFor="theme_primary_color" className="text-base font-medium">اللون الرئيسي</Label>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Input
                id="theme_primary_color"
                type="color"
                value={settings.theme_primary_color}
                onChange={(e) => updateSetting('theme_primary_color', e.target.value)}
                className="h-11 w-20 p-1 border-2"
              />
              <div className="absolute inset-0 pointer-events-none border rounded-sm" style={{ borderColor: settings.theme_primary_color }} />
            </div>
            <Input
              type="text"
              value={settings.theme_primary_color}
              onChange={(e) => updateSetting('theme_primary_color', e.target.value)}
              className="flex-1 h-11 font-mono"
            />
            <div className="flex space-x-1 space-x-reverse rtl:space-x-reverse">
              {['#0099ff', '#6366f1', '#f43f5e', '#10b981', '#fb923c', '#ffffff'].map((color) => (
                <button
                  key={color}
                  className="w-11 h-11 rounded-md border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ background: color }}
                  onClick={() => updateSetting('theme_primary_color', color)}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            سيتم استخدام هذا اللون كلون أساسي في واجهة المتجر (الأزرار، الروابط، إلخ)
          </p>
        </div>
        
        {/* اللون الثانوي */}
        <div className="space-y-3 pt-2">
          <Label htmlFor="theme_secondary_color" className="text-base font-medium">اللون الثانوي</Label>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Input
                id="theme_secondary_color"
                type="color"
                value={settings.theme_secondary_color}
                onChange={(e) => updateSetting('theme_secondary_color', e.target.value)}
                className="h-11 w-20 p-1 border-2"
              />
              <div className="absolute inset-0 pointer-events-none border rounded-sm" style={{ borderColor: settings.theme_secondary_color }} />
            </div>
            <Input
              type="text"
              value={settings.theme_secondary_color}
              onChange={(e) => updateSetting('theme_secondary_color', e.target.value)}
              className="flex-1 h-11 font-mono"
            />
            <div className="flex space-x-1 space-x-reverse rtl:space-x-reverse">
              {['#6c757d', '#64748b', '#334155', '#0f172a', '#e5e7eb', '#000000'].map((color) => (
                <button
                  key={color}
                  className="w-11 h-11 rounded-md border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ background: color }}
                  onClick={() => updateSetting('theme_secondary_color', color)}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            سيتم استخدام هذا اللون في العناصر الثانوية مثل النصوص الفرعية والتفاصيل
          </p>
        </div>
        
        {/* وضع المظهر */}
        <div className="space-y-3 pt-4">
          <Label htmlFor="theme_mode" className="text-base font-medium">وضع المظهر</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            {/* وضع الإضاءة */}
            <div 
              className={`relative cursor-pointer group rounded-xl overflow-hidden transition-all ${
                settings.theme_mode === 'light' 
                  ? 'ring-2 ring-primary scale-[1.02]' 
                  : 'hover:scale-[1.01] border border-border'
              }`}
              onClick={() => updateSetting('theme_mode', 'light')}
            >
              <div className="aspect-[4/3]">
                <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-white/80">
                  <div className="absolute top-0 w-full h-10 bg-white border-b flex items-center px-3 space-x-2 space-x-reverse rtl:space-x-reverse">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="absolute top-10 right-0 w-16 h-[calc(100%-40px)] bg-gray-100 p-2">
                    <div className="w-full h-4 bg-white rounded mb-2"></div>
                    <div className="w-full h-4 bg-white rounded mb-2"></div>
                    <div className="w-full h-4 bg-white rounded"></div>
                  </div>
                  <div className="absolute top-12 left-2 right-20 space-y-2">
                    <div className="h-6 w-24 bg-blue-100 rounded"></div>
                    <div className="h-4 w-40 bg-gray-200 rounded"></div>
                    <div className="h-24 w-full bg-white border rounded-lg"></div>
                    <div className="flex space-x-1 space-x-reverse rtl:space-x-reverse">
                      <div className="h-8 w-20 bg-blue-500 rounded"></div>
                      <div className="h-8 w-20 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute bottom-0 w-full bg-background p-3 border-t group-hover:border-primary transition-colors">
                <p className={`text-center font-medium ${settings.theme_mode === 'light' ? 'text-primary' : ''}`}>
                  وضع الإضاءة
                </p>
              </div>
              {settings.theme_mode === 'light' && (
                <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              )}
            </div>
            
            {/* الوضع الداكن */}
            <div 
              className={`relative cursor-pointer group rounded-xl overflow-hidden transition-all ${
                settings.theme_mode === 'dark' 
                  ? 'ring-2 ring-primary scale-[1.02]' 
                  : 'hover:scale-[1.01] border border-border'
              }`}
              onClick={() => updateSetting('theme_mode', 'dark')}
            >
              <div className="aspect-[4/3]">
                <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/80">
                  <div className="absolute top-0 w-full h-10 bg-gray-800 border-b border-gray-700 flex items-center px-3 space-x-2 space-x-reverse rtl:space-x-reverse">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="absolute top-10 right-0 w-16 h-[calc(100%-40px)] bg-gray-800 p-2">
                    <div className="w-full h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="w-full h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="w-full h-4 bg-gray-700 rounded"></div>
                  </div>
                  <div className="absolute top-12 left-2 right-20 space-y-2">
                    <div className="h-6 w-24 bg-blue-900 rounded"></div>
                    <div className="h-4 w-40 bg-gray-700 rounded"></div>
                    <div className="h-24 w-full bg-gray-800 border border-gray-700 rounded-lg"></div>
                    <div className="flex space-x-1 space-x-reverse rtl:space-x-reverse">
                      <div className="h-8 w-20 bg-blue-500 rounded"></div>
                      <div className="h-8 w-20 bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute bottom-0 w-full bg-gray-900 p-3 border-t border-gray-800 group-hover:border-primary transition-colors">
                <p className={`text-center font-medium text-gray-200 ${settings.theme_mode === 'dark' ? 'text-primary' : ''}`}>
                  الوضع الداكن
                </p>
              </div>
              {settings.theme_mode === 'dark' && (
                <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-muted/30 border rounded-lg">
          <p className="text-sm">
            <strong>ملاحظة:</strong> يمكن للمستخدمين تغيير وضع المظهر (فاتح/داكن) عند تصفح المتجر حسب تفضيلاتهم، ولكن هذا الإعداد يحدد الوضع الافتراضي.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppearanceSettings; 