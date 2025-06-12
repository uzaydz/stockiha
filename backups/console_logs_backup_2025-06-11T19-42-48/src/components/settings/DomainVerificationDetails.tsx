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
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
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
            <div className="border border-border rounded-lg overflow-hidden mt-4 bg-card">
              <table className="w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      النوع
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      الاسم
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      القيمة الحالية
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      القيمة المتوقعة
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      الحالة
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {dnsResults.map((record, index) => (
                    <tr key={index} className={`transition-colors ${
                      record.status === 'valid' 
                        ? 'bg-green-50 dark:bg-green-950/20' 
                        : record.status === 'invalid' 
                        ? 'bg-red-50 dark:bg-red-950/20' 
                        : 'hover:bg-muted/50'
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {record.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {record.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-muted-foreground">
                        {record.value}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
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
            <div className="bg-muted/30 p-4 rounded-lg text-center border border-border">
              <p className="text-sm text-muted-foreground">
                انقر على زر "فحص سجلات DNS" للتحقق من صحة إعدادات النطاق المخصص.
              </p>
            </div>
          )}
          
          {/* إرشادات حول كيفية تكوين DNS */}
          <div className="mt-4 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-medium text-blue-700 dark:text-blue-300 text-sm">كيفية إعداد سجلات DNS</h3>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              للاستفادة من النطاق المخصص، يجب عليك إعداد سجلات DNS التالية:
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm border border-blue-200 dark:border-blue-800 rounded-md overflow-hidden">
                <thead>
                  <tr className="bg-blue-100 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800">
                    <th className="py-2 px-3 text-right font-medium text-blue-700 dark:text-blue-300">النوع</th>
                    <th className="py-2 px-3 text-right font-medium text-blue-700 dark:text-blue-300">الاسم</th>
                    <th className="py-2 px-3 text-right font-medium text-blue-700 dark:text-blue-300">القيمة</th>
                  </tr>
                </thead>
                <tbody className="text-blue-800 dark:text-blue-200">
                  <tr className="border-b border-blue-100 dark:border-blue-800/50">
                    <td className="py-2 px-3 font-medium">A</td>
                    <td className="py-2 px-3">@</td>
                    <td className="py-2 px-3 font-mono bg-blue-100 dark:bg-blue-900/20 rounded px-2">76.76.21.21</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">CNAME</td>
                    <td className="py-2 px-3">www</td>
                    <td className="py-2 px-3 font-mono bg-blue-100 dark:bg-blue-900/20 rounded px-2">connect.ktobi.online</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 flex items-center">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full ml-2"></span>
              ملاحظة: قد تأخذ تغييرات DNS ما يصل إلى 48 ساعة حتى تنتشر عالمياً.
            </p>
          </div>
          

          
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
