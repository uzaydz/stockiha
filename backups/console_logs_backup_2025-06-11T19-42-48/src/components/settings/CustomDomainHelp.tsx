import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, ExternalLink } from 'lucide-react';

interface CustomDomainHelpProps {
  domain?: string;
}

const CustomDomainHelp: React.FC<CustomDomainHelpProps> = ({ domain }) => {
  const displayDomain = domain || 'متجرك.example.com';
  
  return (
    <div className="space-y-4 mt-4">
      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <InfoIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
        <AlertTitle className="text-blue-700 dark:text-blue-300">إرشادات إعداد النطاق المخصص</AlertTitle>
        <AlertDescription className="text-blue-600 dark:text-blue-400">
          استخدم النطاق المخصص لتقديم متجرك تحت اسم نطاق شركتك بدلاً من استخدام النطاقات الفرعية.
        </AlertDescription>
      </Alert>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="dns-setup">
          <AccordionTrigger>كيفية إعداد سجلات DNS</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                لاستخدام النطاق المخصص الخاص بك مع متجرك، يجب عليك إنشاء سجلات DNS التالية في إعدادات النطاق:
              </p>
              
              <div className="bg-muted/30 border border-border p-4 rounded-lg overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-right py-3 px-4 font-medium text-foreground">النوع</th>
                      <th className="text-right py-3 px-4 font-medium text-foreground">الاسم</th>
                      <th className="text-right py-3 px-4 font-medium text-foreground">القيمة</th>
                      <th className="text-right py-3 px-4 font-medium text-foreground">TTL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 font-medium text-blue-600 dark:text-blue-400">A</td>
                      <td className="py-3 px-4 text-foreground">@</td>
                      <td className="py-3 px-4 font-mono bg-blue-100 dark:bg-blue-950/30 px-2 py-1 rounded text-foreground">76.76.21.21</td>
                      <td className="py-3 px-4 text-muted-foreground">3600</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-green-600 dark:text-green-400">CNAME</td>
                      <td className="py-3 px-4 text-foreground">www</td>
                      <td className="py-3 px-4 font-mono bg-green-100 dark:bg-green-950/30 px-2 py-1 rounded text-foreground">connect.ktobi.online</td>
                      <td className="py-3 px-4 text-muted-foreground">3600</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 ml-2"></div>
                <p className="text-sm text-muted-foreground">
                  ملاحظة: قد تختلف خطوات ضبط DNS حسب مزود استضافة النطاق الخاص بك.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="ssl-setup">
          <AccordionTrigger>تكوين شهادة SSL</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                يتم إصدار شهادات SSL تلقائيًا عند إعداد النطاق المخصص. بعد إكمال إعداد DNS وتحديث النطاق هنا، قد يستغرق إصدار الشهادة حتى 24 ساعة.
              </p>
              
              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 ml-2"></div>
                  <div>
                    <p className="font-medium text-amber-700 dark:text-amber-300 text-sm">ملاحظة مهمة</p>
                    <p className="text-amber-600 dark:text-amber-400 text-sm mt-1">يجب أن تكون سجلات DNS مكوّنة بشكل صحيح قبل أن يمكن إصدار شهادة SSL. يرجى التأكد من اكتمال تحديثات DNS قبل استخدام النطاق.</p>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="troubleshooting">
          <AccordionTrigger>استكشاف الأخطاء وإصلاحها</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">مشاكل شائعة وحلولها:</p>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 ml-2"></div>
                  <div>
                    <span className="font-medium text-red-700 dark:text-red-300 text-sm">النطاق لا يعمل بعد التكوين:</span>
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">تأكد من أن سجلات DNS تم تحديثها بشكل صحيح وانتظر فترة انتشار DNS (قد تستغرق حتى 48 ساعة).</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 ml-2"></div>
                  <div>
                    <span className="font-medium text-orange-700 dark:text-orange-300 text-sm">خطأ SSL:</span>
                    <p className="text-orange-600 dark:text-orange-400 text-sm mt-1">تأكد أن سجلات DNS تشير إلى الخوادم الصحيحة وانتظر إصدار الشهادة (حتى 24 ساعة).</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 ml-2"></div>
                  <div>
                    <span className="font-medium text-yellow-700 dark:text-yellow-300 text-sm">المتجر لا يظهر:</span>
                    <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">تأكد أن النطاق تم حفظه بشكل صحيح في إعدادات المؤسسة وأن التغييرات تم نشرها.</p>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        

      </Accordion>
      
      <div className="mt-6 p-4 bg-muted/30 border border-border rounded-lg">
        <p className="text-sm text-muted-foreground mb-3">للحصول على مساعدة إضافية، يرجى الاتصال بفريق الدعم الفني.</p>
        <a href="https://docs.bazaar.com/domains" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline transition-colors">
          <span className="text-sm">قراءة المزيد في الوثائق</span>
          <ExternalLink className="w-4 h-4 mr-2 inline-block" />
        </a>
      </div>
    </div>
  );
};

export default CustomDomainHelp;
