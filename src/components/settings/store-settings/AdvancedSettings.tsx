import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Shield, Code, Zap } from 'lucide-react';

interface AdvancedSettingsProps {
  settings: {
    custom_css?: string;
    custom_js?: string;
    custom_header?: string;
    custom_footer?: string;
  };
  updateSetting: (key: string, value: string) => void;
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ settings, updateSetting }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          الإعدادات المتقدمة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* تحذير أمني */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            تحذير: استخدم هذه الإعدادات بحذر. إضافة أكواد خاطئة قد تؤثر على أداء المتجر أو أمانه.
          </AlertDescription>
        </Alert>

        {/* CSS مخصص */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">أنماط CSS مخصصة</Label>
            <Textarea
              value={settings.custom_css || ''}
              onChange={(e) => updateSetting('custom_css', e.target.value)}
              placeholder="/* أضف أنماط CSS مخصصة هنا */\n\n.custom-button {\n  background-color: #007cba;\n  color: white;\n  padding: 10px 20px;\n  border-radius: 5px;\n  border: none;\n  cursor: pointer;\n}\n\n.custom-button:hover {\n  background-color: #005a87;\n}\n\n/* تخصيص ألوان المتجر */\n:root {\n  --primary-color: #007cba;\n  --secondary-color: #f8f9fa;\n  --accent-color: #28a745;\n}"
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">أضف أنماط CSS مخصصة لتخصيص مظهر المتجر. سيتم تطبيق هذه الأنماط على جميع صفحات المتجر.</p>
          </div>
        </div>

        {/* JavaScript مخصص */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">كود JavaScript مخصص</Label>
            <Textarea
              value={settings.custom_js || ''}
              onChange={(e) => updateSetting('custom_js', e.target.value)}
              placeholder="// أضف أكواد JavaScript مخصصة هنا\n\n/**\n * مثال للكود الآمن الذي يتجنب المشاكل الشائعة\n */\n(function() {\n  // انتظر حتى يتم تحميل الصفحة بالكامل\n  if (document.readyState === 'complete') {\n    initCustomCode();\n  } else {\n    window.addEventListener('load', initCustomCode);\n  }\n  \n  function initCustomCode() {\n    // استخدم محددات الفئات بدلاً من معرّفات مخصصة\n    var productButtons = document.querySelectorAll('.product-button');\n    \n    // تكرار على جميع العناصر بأمان\n    Array.from(productButtons).forEach(function(button) {\n      button.addEventListener('click', function(event) {\n        \n      });\n    });\n    \n    // إضافة سلوكيات مخصصة للمتجر\n    addCustomBehaviors();\n  }\n  \n  function addCustomBehaviors() {\n    // يمكنك إضافة وظائف إضافية هنا\n    \n  }\n})();"
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">أضف كود JavaScript مخصص لإضافة وظائف خاصة للمتجر. تأكد من اختبار الكود قبل الحفظ.</p>
          </div>
        </div>

        {/* Header مخصص */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">شيفرة HTML مخصصة للرأس</Label>
            <Textarea
              value={settings.custom_header || ''}
              onChange={(e) => updateSetting('custom_header', e.target.value)}
              placeholder="أضف شيفرة HTML مخصصة لرأس الصفحة هنا..."
              className="min-h-[150px] font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">أضف وسوم HTML مخصصة في رأس الصفحة (داخل وسم head). مفيد لإضافة خطوط، وسوم تعريف، أكواد تتبع، وأي عناصر أخرى تحتاج أن تكون في رأس الصفحة.</p>
          </div>
          
          {/* معلومات مساعدة للـ Header */}
          <div className="bg-muted p-3 rounded-md">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              أمثلة على الاستخدامات الشائعة:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><code className="px-1 py-0.5 bg-muted rounded text-[10px]">{"<meta>"}</code> - وسوم التعريف بالموقع</li>
              <li><code className="px-1 py-0.5 bg-muted rounded text-[10px]">{"<link>"}</code> - إضافة خطوط أو أنماط CSS</li>
              <li><code className="px-1 py-0.5 bg-muted rounded text-[10px]">{"<script>"}</code> - إضافة أكواد جافاسكريبت</li>
              <li><code className="px-1 py-0.5 bg-muted rounded text-[10px]">{"<style>"}</code> - إضافة أنماط CSS داخلية</li>
            </ul>
          </div>
        </div>

        {/* Footer مخصص */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">شيفرة HTML مخصصة للتذييل</Label>
            <Textarea
              value={settings.custom_footer || ''}
              onChange={(e) => updateSetting('custom_footer', e.target.value)}
              placeholder="أضف شيفرة HTML مخصصة لتذييل الصفحة هنا..."
              className="min-h-[150px] font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">أضف وسوم HTML مخصصة في نهاية الصفحة (قبل إغلاق وسم body). مفيد لإضافة أكواد جافاسكريبت، نصوص تتبع، وأي عناصر أخرى تحتاج أن تكون في نهاية الصفحة.</p>
          </div>
        </div>

        {/* معلومات إضافية */}
        <Alert>
          <AlertDescription>
            <strong>نصائح مهمة:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>اختبر جميع الأكواد في بيئة آمنة قبل تطبيقها على المتجر الحقيقي</li>
              <li>تأكد من أن الأكواد متوافقة مع جميع المتصفحات</li>
              <li>احتفظ بنسخة احتياطية من الإعدادات قبل إجراء تغييرات كبيرة</li>
              <li>تجنب استخدام أكواد من مصادر غير موثوقة</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default AdvancedSettings;