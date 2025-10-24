import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Shield, Code, Zap, AlertTriangle, Trash2 } from 'lucide-react';
import { getSafeCustomScript } from '@/utils/customScriptValidator';

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
  const [jsValidationError, setJsValidationError] = React.useState<string | null>(null);
  const [isCleaning, setIsCleaning] = React.useState(false);

  // تسجيل محتوى الإعدادات للمساعدة في تشخيص المشاكل
  React.useEffect(() => {
    if (settings?.custom_js) {
      try {
        const trimmed = settings.custom_js.trim();
        
        // فحص سريع للبحث عن JSON أو محتوى تالف
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          console.warn('🚨 تم اكتشاف JSON في custom_js - سيتم مسحه تلقائياً');
          updateSetting('custom_js', '');
          setJsValidationError('تم اكتشاف JSON في custom_js وتم مسحه تلقائياً. يرجى إضافة كود JavaScript صالح.');
          return;
        }

        if (trimmed.includes('fNcqSfPLFxu') || trimmed.includes('Unexpected identifier')) {
          console.warn('🚨 تم اكتشاف محتوى تالف في custom_js - سيتم مسحه تلقائياً');
          updateSetting('custom_js', '');
          setJsValidationError('تم اكتشاف محتوى تالف في custom_js وتم مسحه تلقائياً.');
          return;
        }

        console.log('🔍 AdvancedSettings: محتوى custom_js:', {
          length: settings.custom_js.length,
          preview: settings.custom_js.substring(0, 100) + (settings.custom_js.length > 100 ? '...' : ''),
          containsJson: settings.custom_js.trim().startsWith('{') || settings.custom_js.trim().startsWith('[')
        });

        // التحقق من صحة الكود عند التحميل - مع تجنب الخطأ
        if (trimmed) {
          const validatedCode = getSafeCustomScript(settings.custom_js, { context: 'AdvancedSettings:initial_validation' });
          if (validatedCode === null) {
            setJsValidationError('الكود الحالي يحتوي على أخطاء في التركيب. يرجى مراجعته أو مسحه.');
          } else {
            setJsValidationError(null);
          }
        }
      } catch (error) {
        console.warn('AdvancedSettings: خطأ في معالجة custom_js:', error);
        setJsValidationError('الكود الحالي يحتوي على أخطاء خطيرة. يرجى مسحه فوراً.');
        // محاولة مسح المحتوى التالف
        updateSetting('custom_js', '');
      }
    } else {
      // إذا لم يكن هناك custom_js، تأكد من مسح أي أخطاء سابقة
      setJsValidationError(null);
    }
  }, [settings?.custom_js, updateSetting]);

  // دالة للتحقق من صحة كود JavaScript
  const validateAndUpdateJS = (value: string) => {
    try {
      if (value.trim()) {
        const validatedCode = getSafeCustomScript(value, { context: 'AdvancedSettings:user_input' });
        if (validatedCode === null) {
          setJsValidationError('الكود يحتوي على أخطاء في التركيب. تحقق من وجود أقواس مفقودة أو فواصل منقوطة.');
          // لا نحفظ الكود إذا كان غير صالح
          return;
        } else {
          setJsValidationError(null);
        }
      } else {
        setJsValidationError(null);
      }
      updateSetting('custom_js', value);
    } catch (error) {
      console.warn('AdvancedSettings: خطأ في التحقق من صحة الكود:', error);
      setJsValidationError('خطأ في التحقق من صحة الكود. يرجى مراجعة الكود أو مسحه.');
    }
  };

  // دالة لتنظيف البيانات التالفة
  const handleCleanCorruptedData = async () => {
    setIsCleaning(true);
    try {
      // مسح المحتوى التالف محلياً
      if (settings.custom_js && settings.custom_js.includes('fNcqSfPLFxu')) {
        updateSetting('custom_js', '');
        console.log('تم مسح custom_js التالف');
      }
      if (settings.custom_css && settings.custom_css.includes('fNcqSfPLFxu')) {
        updateSetting('custom_css', '');
        console.log('تم مسح custom_css التالف');
      }
      setJsValidationError(null);
    } catch (error) {
      console.warn('AdvancedSettings: خطأ في تنظيف البيانات التالفة:', error);
    } finally {
      setIsCleaning(false);
    }
  };

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
              onChange={(e) => validateAndUpdateJS(e.target.value)}
              placeholder="// أضف أكواد JavaScript مخصصة هنا\n\n/**\n * مثال للكود الآمن الذي يتجنب المشاكل الشائعة\n */\n(function() {\n  // انتظر حتى يتم تحميل الصفحة بالكامل\n  if (document.readyState === 'complete') {\n    initCustomCode();\n  } else {\n    window.addEventListener('load', initCustomCode);\n  }\n  \n  function initCustomCode() {\n    // استخدم محددات الفئات بدلاً من معرّفات مخصصة\n    var productButtons = document.querySelectorAll('.product-button');\n    \n    // تكرار على جميع العناصر بأمان\n    Array.from(productButtons).forEach(function(button) {\n      button.addEventListener('click', function(event) {\n        \n      });\n    });\n    \n    // إضافة سلوكيات مخصصة للمتجر\n    addCustomBehaviors();\n  }\n  \n  function addCustomBehaviors() {\n    // يمكنك إضافة وظائف إضافية هنا\n    \n  }\n})();"
              className={`min-h-[200px] font-mono text-sm ${jsValidationError ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {jsValidationError && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {jsValidationError}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => validateAndUpdateJS('')}
                      className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
                    >
                      مسح الكود
                    </button>
                    <button
                      onClick={handleCleanCorruptedData}
                      disabled={isCleaning}
                      className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded hover:bg-orange-200 disabled:opacity-50"
                    >
                      {isCleaning ? 'جاري التنظيف...' : 'تنظيف البيانات التالفة'}
                    </button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            <p className="text-sm text-muted-foreground">أضف كود JavaScript مخصص لإضافة وظائف خاصة للمتجر. الكود يتم التحقق من صحته قبل الحفظ.</p>
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
