import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationSettings } from '@/types/settings';
import { AlertCircle } from 'lucide-react';

// مكون محرر الشيفرة البرمجية
interface CodeEditorProps {
  id: string;
  value: string | null;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  helpText?: string;
  language?: 'css' | 'html' | 'javascript';
  minHeight?: string;
}

const CodeEditor = ({ 
  id, 
  value, 
  onChange, 
  label, 
  placeholder, 
  helpText,
  language = 'html',
  minHeight = '180px'
}: CodeEditorProps) => {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label htmlFor={id} className="text-base font-medium">{label}</Label>
        <div className="text-xs font-mono px-2 py-0.5 bg-muted rounded-md">
          {language.toUpperCase()}
        </div>
      </div>
      
      <div className="relative">
        <Textarea 
          id={id} 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`font-mono text-sm resize-y p-4 bg-zinc-950 text-zinc-100 dark:bg-zinc-900 border-zinc-800 focus-visible:ring-primary min-h-[${minHeight}]`}
          spellCheck="false"
        />
        
        {/* عدد الأحرف */}
        <div className="absolute bottom-2 left-2 text-xs text-zinc-500 bg-zinc-900/80 px-1.5 py-0.5 rounded">
          {value?.length || 0} حرف
        </div>
      </div>
      
      {helpText && (
        <p className="text-sm text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
};

interface AdvancedSettingsProps {
  settings: OrganizationSettings;
  updateSetting: (key: keyof OrganizationSettings, value: any) => void;
}

const AdvancedSettings = ({ settings, updateSetting }: AdvancedSettingsProps) => {
  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="bg-muted/30">
        <CardTitle>إعدادات متقدمة</CardTitle>
        <CardDescription>
          إعدادات متقدمة للمستخدمين ذوي الخبرة التقنية
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pt-6">
        {/* تنبيه */}
        <div className="flex p-4 border-2 border-orange-200 dark:border-orange-900/60 bg-orange-50 dark:bg-orange-950/30 rounded-lg text-orange-800 dark:text-orange-300">
          <AlertCircle className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-medium">تحذير - إعدادات متقدمة</h4>
            <p className="text-sm mt-1 text-orange-700 dark:text-orange-400">
              هذه الإعدادات مخصصة للمستخدمين المتقدمين ذوي الخبرة في البرمجة. الاستخدام الخاطئ قد يؤثر سلبًا على أداء متجرك.
            </p>
          </div>
        </div>
        
        {/* CSS مخصص */}
        <CodeEditor 
          id="custom_css" 
          value={settings.custom_css} 
          onChange={(value) => updateSetting('custom_css', value)}
          label="CSS مخصص"
          placeholder="/* أضف أكواد CSS مخصصة هنا */

.custom-heading {
  color: #333;
  font-size: 24px;
  font-weight: bold;
}

.product-card:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-5px);
}"
          helpText="أضف أكواد CSS مخصصة لتغيير مظهر المتجر. ستتم إضافة هذه الأكواد إلى جميع صفحات المتجر."
          language="css"
          minHeight="200px"
        />
        
        {/* شيفرة HTML مخصصة للرأس */}
        <CodeEditor 
          id="custom_header" 
          value={settings.custom_header} 
          onChange={(value) => updateSetting('custom_header', value)}
          label="شيفرة HTML مخصصة للرأس"
          placeholder="<!-- أضف شيفرة HTML لقسم الرأس (head) هنا -->

<meta name='description' content='وصف المتجر الإلكتروني' />
<meta name='keywords' content='كلمات مفتاحية، منتجات، متجر' />
<link rel='preconnect' href='https://fonts.googleapis.com' />
<link rel='stylesheet' href='https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap' />"
          helpText="أضف وسوم HTML مخصصة في رأس الصفحة (head). مفيد لإضافة وصف الموقع، والكلمات المفتاحية، وخطوط جوجل، وغيرها."
          language="html"
        />
        
        {/* شيفرة HTML مخصصة للتذييل */}
        <CodeEditor 
          id="custom_footer" 
          value={settings.custom_footer} 
          onChange={(value) => updateSetting('custom_footer', value)}
          label="شيفرة HTML مخصصة للتذييل"
          placeholder="<!-- أضف شيفرة HTML لنهاية الصفحة (قبل إغلاق وسم body) هنا -->

<script>

  // كود مخصص للتتبع أو إضافة ميزات خاصة
  document.addEventListener('DOMContentLoaded', function() {
    // قم بإضافة الكود الخاص بك هنا
  });
</script>"
          helpText="أضف وسوم HTML مخصصة في نهاية الصفحة (قبل إغلاق وسم body). مفيد لإضافة أكواد جافاسكريبت، نصوص تتبع، وأي عناصر أخرى تحتاج أن تكون في نهاية الصفحة."
          language="html"
        />
        
        {/* JavaScript مخصص */}
        <CodeEditor 
          id="custom_js" 
          value={settings.custom_js} 
          onChange={(value) => updateSetting('custom_js', value)}
          label="JavaScript مخصص"
          placeholder={`// أضف أكواد JavaScript مخصصة هنا

/**
 * مثال للكود الآمن الذي يتجنب المشاكل الشائعة
 */
(function() {
  // انتظر حتى يتم تحميل الصفحة بالكامل
  if (document.readyState === 'complete') {
    initCustomCode();
  } else {
    window.addEventListener('load', initCustomCode);
  }
  
  function initCustomCode() {
    // استخدم محددات الفئات بدلاً من معرّفات مخصصة
    var productButtons = document.querySelectorAll('.product-button');
    
    // تكرار على جميع العناصر بأمان
    Array.from(productButtons).forEach(function(button) {
      button.addEventListener('click', function(event) {
        
      });
    });
    
    // إضافة سلوكيات مخصصة للمتجر
    addCustomBehaviors();
  }
  
  function addCustomBehaviors() {
    // يمكنك إضافة وظائف إضافية هنا
    
  }
})();`}
          helpText="أضف أكواد JavaScript لإضافة وظائف تفاعلية للمتجر. ملاحظات هامة: (1) غلف الكود داخل IIFE (2) تجنب استخدام الرموز الخاصة مثل : في المحددات (3) انتظر تحميل DOM باستخدام أحداث load أو DOMContentLoaded (4) استخدم var بدلاً من let/const للتوافق الأفضل (5) استخدم وظائف الاختبار مثل if/else بدلاً من العوامل الثلاثية."
          language="javascript"
          minHeight="200px"
        />
        
        {/* مراجع سريعة */}
        <div className="p-5 border rounded-lg bg-muted/20 mt-6">
          <h3 className="font-medium text-base mb-3">مراجع سريعة</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="p-3 bg-background border rounded-md">
              <h4 className="text-sm font-medium mb-2">أمثلة لـ CSS المخصص</h4>
              <ul className="text-xs space-y-1.5 text-muted-foreground">
                <li><code className="px-1 py-0.5 bg-muted rounded text-[10px]">.header</code> - تنسيق رأس الصفحة</li>
                <li><code className="px-1 py-0.5 bg-muted rounded text-[10px]">.product-card</code> - تنسيق بطاقة المنتج</li>
                <li><code className="px-1 py-0.5 bg-muted rounded text-[10px]">.footer</code> - تنسيق تذييل الصفحة</li>
                <li><code className="px-1 py-0.5 bg-muted rounded text-[10px]">.btn-primary</code> - تنسيق الأزرار الرئيسية</li>
              </ul>
            </div>
            
            <div className="p-3 bg-background border rounded-md">
              <h4 className="text-sm font-medium mb-2">أمثلة لـ HTML المخصص</h4>
              <ul className="text-xs space-y-1.5 text-muted-foreground">
                <li><code className="px-1 py-0.5 bg-muted rounded text-[10px]">&lt;meta&gt;</code> - وسوم التعريف بالموقع</li>
                <li><code className="px-1 py-0.5 bg-muted rounded text-[10px]">&lt;link&gt;</code> - إضافة خطوط أو أنماط CSS</li>
                <li><code className="px-1 py-0.5 bg-muted rounded text-[10px]">&lt;script&gt;</code> - إضافة أكواد جافاسكريبت</li>
                <li><code className="px-1 py-0.5 bg-muted rounded text-[10px]">&lt;style&gt;</code> - إضافة أنماط CSS داخلية</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedSettings;
