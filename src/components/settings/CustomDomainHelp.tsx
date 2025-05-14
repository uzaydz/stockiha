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
      <Alert className="bg-blue-50 border-blue-200">
        <InfoIcon className="w-4 h-4 text-blue-500" />
        <AlertTitle className="text-blue-700">إرشادات إعداد النطاق المخصص</AlertTitle>
        <AlertDescription className="text-blue-600">
          استخدم النطاق المخصص لتقديم متجرك تحت اسم نطاق شركتك بدلاً من استخدام النطاقات الفرعية.
        </AlertDescription>
      </Alert>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="dns-setup">
          <AccordionTrigger>كيفية إعداد سجلات DNS</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                لاستخدام النطاق المخصص الخاص بك مع متجرك، يجب عليك إنشاء سجل CNAME في إعدادات DNS الخاصة بالنطاق:
              </p>
              
              <div className="bg-gray-100 p-3 rounded-md overflow-x-auto text-sm font-mono">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-right py-2 px-4 border-b">النوع</th>
                      <th className="text-right py-2 px-4 border-b">الاسم</th>
                      <th className="text-right py-2 px-4 border-b">القيمة</th>
                      <th className="text-right py-2 px-4 border-b">TTL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-4">CNAME</td>
                      <td className="py-2 px-4">@</td>
                      <td className="py-2 px-4">cname.vercel-dns.com</td>
                      <td className="py-2 px-4">3600</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4">CNAME</td>
                      <td className="py-2 px-4">www</td>
                      <td className="py-2 px-4">cname.vercel-dns.com</td>
                      <td className="py-2 px-4">3600</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <p className="text-sm text-gray-600 mt-2">
                ملاحظة: قد تختلف خطوات ضبط DNS حسب مزود استضافة النطاق الخاص بك.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="ssl-setup">
          <AccordionTrigger>تكوين شهادة SSL</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                يتم إصدار شهادات SSL تلقائيًا عند إعداد النطاق المخصص. بعد إكمال إعداد DNS وتحديث النطاق هنا، قد يستغرق إصدار الشهادة حتى 24 ساعة.
              </p>
              
              <div className="bg-amber-50 p-3 rounded-md border border-amber-200 text-amber-700 text-sm">
                <p className="font-medium">ملاحظة مهمة</p>
                <p>يجب أن تكون سجلات DNS مكوّنة بشكل صحيح قبل أن يمكن إصدار شهادة SSL. يرجى التأكد من اكتمال تحديثات DNS قبل استخدام النطاق.</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="troubleshooting">
          <AccordionTrigger>استكشاف الأخطاء وإصلاحها</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">مشاكل شائعة وحلولها:</p>
              
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 pr-4">
                <li>
                  <span className="font-medium">النطاق لا يعمل بعد التكوين:</span> تأكد من أن سجلات DNS تم تحديثها بشكل صحيح وانتظر فترة انتشار DNS (قد تستغرق حتى 48 ساعة).
                </li>
                <li>
                  <span className="font-medium">خطأ SSL:</span> تأكد أن سجل CNAME يشير إلى الخادم الصحيح وانتظر إصدار الشهادة (حتى 24 ساعة).
                </li>
                <li>
                  <span className="font-medium">المتجر لا يظهر:</span> تأكد أن النطاق تم حفظه بشكل صحيح في إعدادات المؤسسة وأن التغييرات تم نشرها.
                </li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="future-changes">
          <AccordionTrigger>التغييرات المستقبلية</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                حالياً، نستخدم <code className="bg-gray-100 px-1 py-0.5 rounded">cname.vercel-dns.com</code> كقيمة لسجلات CNAME.
              </p>
              
              <p className="text-sm text-gray-600">
                في المستقبل، سنقوم بتحديث نظام النطاقات المخصصة لاستخدام نطاق خاص بمنصتنا، مشابه لما تقدمه منصات أخرى:
              </p>
              
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 pr-4">
                <li>Webflow: يستخدم <code className="bg-gray-100 px-1 py-0.5 rounded">proxy-ssl.webflow.com</code></li>
                <li>Shopify: يستخدم <code className="bg-gray-100 px-1 py-0.5 rounded">shops.myshopify.com</code></li>
              </ul>
              
              <div className="bg-green-50 p-3 rounded-md border border-green-200 text-green-700 text-sm mt-2">
                <p className="font-medium">مزايا التحديث المستقبلي:</p>
                <ul className="list-disc list-inside mt-1 pr-2">
                  <li>تحسين الهوية التجارية لمنصتنا</li>
                  <li>تسهيل التعرف على مصدر الخدمة في سجلات DNS</li>
                  <li>تحسين إدارة شهادات SSL</li>
                </ul>
              </div>
              
              <p className="text-sm text-gray-600 mt-2">
                سنقوم بإخطار جميع المستخدمين عند توفر هذا التحديث والخطوات اللازمة لتحديث سجلات DNS.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>للحصول على مساعدة إضافية، يرجى الاتصال بفريق الدعم الفني.</p>
        <a href="https://docs.bazaar.com/domains" target="_blank" rel="noopener noreferrer" className="flex items-center text-primary mt-1 hover:underline">
          <span>قراءة المزيد في الوثائق</span>
          <ExternalLink className="w-3 h-3 mr-1 inline-block" />
        </a>
      </div>
    </div>
  );
};

export default CustomDomainHelp; 