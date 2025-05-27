import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { verifyDomainDNS, verifyAndUpdateDomainStatus } from '@/api/domain-verification-api';
import { Loader2, Check, X, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DomainVerificationStatus } from '@/types/domain-verification';

interface DomainVerificationDetailsProps {
  domain: string;
  onVerificationComplete?: (status: DomainVerificationStatus) => void;
}

const DomainVerificationDetails: React.FC<DomainVerificationDetailsProps> = ({ 
  domain,
  onVerificationComplete
}) => {
  const { organization } = useTenant();
  const { toast } = useToast();
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [dnsResults, setDnsResults] = useState<{
    name: string;
    type: string;
    value: string;
    status: 'valid' | 'invalid' | 'pending';
    expected: string;
  }[] | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string>('');
  
  // تحديث قيمة السجلات
  const INTERMEDIATE_DOMAIN = 'connect.ktobi.online';
  
  // التحقق من سجلات DNS
  const handleVerifyDNS = async () => {
    if (!domain) return;
    
    setIsVerifying(true);
    setVerificationMessage('');
    
    try {
      const results = await verifyDomainDNS(domain);
      setDnsResults(results.records);
      setVerificationMessage(results.message || '');
      
      // عرض رسالة نتيجة التحقق
      toast({
        title: results.success ? 'تم التحقق من DNS' : 'فشل التحقق من DNS',
        description: results.message,
        variant: results.success ? 'default' : 'destructive',
      });
    } catch (error) {
      setVerificationMessage('حدث خطأ أثناء التحقق من سجلات DNS');
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء التحقق من سجلات DNS',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  // التحقق الكامل من النطاق وتحديث حالته
  const handleCompleteVerification = async () => {
    if (!domain || !organization?.id) return;
    
    setIsVerifying(true);
    
    try {
      const result = await verifyAndUpdateDomainStatus(organization.id, domain);
      
      // عرض رسالة نتيجة التحقق
      toast({
        title: result.success ? 'تم التحقق من النطاق' : 'فشل التحقق من النطاق',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
      
      // استدعاء الوظيفة التي يتم تمريرها لتحديث حالة النطاق في المكون الأب
      if (onVerificationComplete) {
        onVerificationComplete(result.status);
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء التحقق الكامل من النطاق',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  // حالة كل سجل DNS
  const renderDNSRecordStatus = (status: 'valid' | 'invalid' | 'pending') => {
    switch (status) {
      case 'valid':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'invalid':
        return <X className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return null;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>التحقق من صحة النطاق</CardTitle>
        <CardDescription>
          تحقق من صحة سجلات DNS وإعدادات النطاق المخصص
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-medium">النطاق المخصص: <span className="font-bold text-primary">{domain}</span></h3>
              {verificationMessage && (
                <p className={`text-sm mt-1 ${
                  dnsResults?.every(r => r.status === 'valid') 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {verificationMessage}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleVerifyDNS}
                disabled={isVerifying || !domain}
              >
                {isVerifying ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <RefreshCw className="w-4 h-4 ml-2" />}
                فحص سجلات DNS
              </Button>
              <Button 
                size="sm" 
                onClick={handleCompleteVerification}
                disabled={isVerifying || !domain}
              >
                {isVerifying ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
                التحقق الكامل من النطاق
              </Button>
            </div>
          </div>
          
          {/* جدول سجلات DNS */}
          {dnsResults && dnsResults.length > 0 && (
            <div className="border rounded-md overflow-hidden mt-4">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      النوع
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الاسم
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      القيمة الحالية
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      القيمة المتوقعة
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dnsResults.map((record, index) => (
                    <tr key={index} className={record.status === 'valid' ? 'bg-green-50' : record.status === 'invalid' ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {record.value}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {record.expected}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          {renderDNSRecordStatus(record.status)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* رسالة إذا لم يتم التحقق بعد */}
          {!dnsResults && (
            <div className="bg-gray-50 p-4 rounded-md text-center">
              <p className="text-sm text-gray-600">
                انقر على زر "فحص سجلات DNS" للتحقق من صحة إعدادات النطاق المخصص.
              </p>
            </div>
          )}
          
          {/* إرشادات حول كيفية تكوين DNS */}
          <div className="mt-4 bg-blue-50 p-4 rounded-md border border-blue-200">
            <h3 className="font-medium text-blue-700 text-sm">كيفية إعداد سجلات DNS</h3>
            <p className="text-sm text-blue-600 mt-1">
              للاستفادة من النطاق المخصص، يجب عليك إعداد سجلات DNS التالية:
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-200">
                    <th className="py-2 px-2 text-right">النوع</th>
                    <th className="py-2 px-2 text-right">الاسم</th>
                    <th className="py-2 px-2 text-right">القيمة</th>
                  </tr>
                </thead>
                <tbody className="text-blue-800">
                  <tr>
                    <td className="py-1 px-2">CNAME</td>
                    <td className="py-1 px-2">@</td>
                    <td className="py-1 px-2 font-mono">{INTERMEDIATE_DOMAIN}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2">CNAME</td>
                    <td className="py-1 px-2">www</td>
                    <td className="py-1 px-2 font-mono">{INTERMEDIATE_DOMAIN}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              ملاحظة: قد تأخذ تغييرات DNS ما يصل إلى 48 ساعة حتى تنتشر عالمياً.
            </p>
            <p className="text-xs text-blue-600 mt-1">
              قريباً: سنقوم بتحديث النظام لاستخدام نطاق خاص بمنصتنا بدلاً من cname.vercel-dns.com، مشابه لمنصات مثل Webflow وShopify.
            </p>
          </div>
          
          <Alert className="mt-4 bg-amber-50 border border-amber-200">
            <AlertTitle className="text-amber-800 font-medium text-sm">ملاحظة هامة</AlertTitle>
            <AlertDescription className="text-amber-700 text-sm">
              <p>نستخدم نطاقاً وسيطاً خاصاً بنا (<strong>{INTERMEDIATE_DOMAIN}</strong>) بدلاً من النطاق الافتراضي لـ Vercel، مما يعطينا مزيداً من التحكم ويبرز علامتنا التجارية بدلاً من الاعتماد على أسماء نطاقات الطرف الثالث.</p>
            </AlertDescription>
          </Alert>
          
          <div className="flex justify-end mt-4">
            <a 
              href="https://docs.bazaar.com/domains/verification" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center"
            >
              قراءة المزيد حول التحقق من النطاقات
              <ExternalLink className="w-3 h-3 mr-1" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DomainVerificationDetails;
