import React from 'react';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export default function NotificationsSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            إعدادات الإشعارات
          </CardTitle>
          <CardDescription>
            تحكم في الإشعارات والتنبيهات التي تتلقاها
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">إشعارات البريد الإلكتروني</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">تحديثات النظام</h4>
                <p className="text-sm text-muted-foreground">
                  تلقي إشعارات حول تحديثات النظام والصيانة
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">تنبيهات الأمان</h4>
                <p className="text-sm text-muted-foreground">
                  تنبيهات حول الأنشطة الأمنية في حسابك
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">تقارير النشاط</h4>
                <p className="text-sm text-muted-foreground">
                  تقارير دورية عن نشاط حسابك
                </p>
              </div>
              <Switch />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">إشعارات التطبيق</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">الرسائل الجديدة</h4>
                <p className="text-sm text-muted-foreground">
                  إشعارات عند وصول رسائل جديدة
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">تحديثات المهام</h4>
                <p className="text-sm text-muted-foreground">
                  إشعارات عند تحديث حالة المهام
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">دعوات الفريق</h4>
                <p className="text-sm text-muted-foreground">
                  إشعارات عند تلقي دعوات للانضمام للفرق
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">إشعارات الهاتف المحمول</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">الإشعارات الفورية</h4>
                <p className="text-sm text-muted-foreground">
                  إشعارات فورية على الهاتف المحمول
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">الرسائل النصية</h4>
                <p className="text-sm text-muted-foreground">
                  تلقي رسائل نصية للتنبيهات المهمة
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>أوقات الإشعارات</CardTitle>
          <CardDescription>
            تحديد الأوقات المناسبة لتلقي الإشعارات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">وضع عدم الإزعاج</h4>
              <p className="text-sm text-muted-foreground">
                إيقاف الإشعارات خلال ساعات معينة
              </p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">إشعارات نهاية الأسبوع</h4>
              <p className="text-sm text-muted-foreground">
                تلقي إشعارات خلال عطلة نهاية الأسبوع
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
