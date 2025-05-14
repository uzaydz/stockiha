import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTenant } from '@/context/TenantContext';
import { useToast } from '@/components/ui/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { getSupabaseClient } from '@/lib/supabase';
import { Loader2, Check, Globe, AlertCircle, ExternalLink, Copy } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { checkDomainStatus, updateOrganizationDomain, checkDomainAvailability } from '@/lib/api/domain-verification';
import CustomDomainHelp from './CustomDomainHelp';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DomainVerificationDetails from './DomainVerificationDetails';
import { Link } from 'react-router-dom';
import { DomainVerificationStatus } from '@/types/domain-verification';

// نمط للتحقق من صحة تنسيق النطاق
const DOMAIN_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(([a-zA-Z]{2,})|(xn--[a-zA-Z0-9]+))$/;

// حالات واجهة المستخدم (امتداد للحالات الموجودة في DomainVerificationStatus)
export type DomainStatusType = 'unconfigured' | DomainVerificationStatus;

interface DomainStatusProps {
  status: DomainStatusType;
  message?: string;
  domain?: string;
}

const DomainStatusBadge: React.FC<{ status: DomainStatusType }> = ({ status }) => {
  const statusConfig = {
    'unconfigured': { color: 'bg-gray-100 text-gray-700', label: 'غير مكوّن' },
    'pending': { color: 'bg-amber-100 text-amber-700', label: 'قيد المعالجة' },
    'active': { color: 'bg-green-100 text-green-700', label: 'نشط' },
    'error': { color: 'bg-red-100 text-red-700', label: 'خطأ' },
    'verified': { color: 'bg-blue-100 text-blue-700', label: 'متحقق' },
  };
  
  const config = statusConfig[status];
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

const DomainStatus: React.FC<DomainStatusProps> = ({ status, message, domain }) => {
  const statusIcons = {
    'unconfigured': <Globe className="w-5 h-5 text-gray-500" />,
    'pending': <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />,
    'active': <Check className="w-5 h-5 text-green-500" />,
    'error': <AlertCircle className="w-5 h-5 text-red-500" />,
    'verified': <Check className="w-5 h-5 text-blue-500" />,
  };
  
  const statusMessages = {
    'unconfigured': 'لم يتم تكوين نطاق مخصص بعد. قم بإضافة نطاق لمتجرك.',
    'pending': message || 'النطاق قيد المعالجة. قد يستغرق هذا حتى 24 ساعة.',
    'active': 'النطاق المخصص نشط ويعمل بشكل صحيح.',
    'error': message || 'حدث خطأ أثناء تكوين النطاق. يرجى مراجعة إعدادات DNS.',
    'verified': 'النطاق متحقق ويعمل بشكل صحيح.',
  };
  
  return (
    <div className="flex items-start space-x-4 space-x-reverse">
      <div className="mt-1">{statusIcons[status]}</div>
      <div>
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">{domain || 'النطاق المخصص'}</h4>
          <DomainStatusBadge status={status} />
        </div>
        <p className="text-sm text-gray-600">{statusMessages[status]}</p>
      </div>
    </div>
  );
};

// تغيير قيمة CNAME إلى نطاقنا الوسيط
const INTERMEDIATE_DOMAIN = 'connect.ktobi.online';

const DomainSettings: React.FC = () => {
  const { organization, refreshTenant } = useTenant();
  const { toast } = useToast();
  
  const [domain, setDomain] = useState<string>('');
  const [domainStatus, setDomainStatus] = useState<DomainStatusType>('unconfigured');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isValidFormat, setIsValidFormat] = useState<boolean>(true);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  
  // تحميل النطاق الحالي إذا كان موجودًا
  useEffect(() => {
    if (organization?.domain) {
      setDomain(organization.domain);
      checkCurrentDomainStatus();
    }
  }, [organization]);
  
  // التحقق من حالة النطاق الحالي
  const checkCurrentDomainStatus = async () => {
    if (!organization?.id || !organization?.domain) return;
    
    setIsChecking(true);
    try {
      const result = await checkDomainStatus(organization.id, organization.domain);
      setDomainStatus(result.status);
      setStatusMessage(result.message || '');
    } catch (error) {
      console.error('خطأ أثناء التحقق من حالة النطاق:', error);
      setDomainStatus('error');
      setStatusMessage('حدث خطأ أثناء التحقق من حالة النطاق');
    } finally {
      setIsChecking(false);
    }
  };
  
  // التحقق من صحة تنسيق النطاق وتوفره
  const handleDomainChange = (value: string) => {
    setDomain(value);
    
    // التحقق من صحة تنسيق النطاق
    const isValid = value === '' || DOMAIN_REGEX.test(value);
    setIsValidFormat(isValid);
    
    // إذا كان النطاق صحيحًا، تحقق من توفره
    if (isValid && value && value !== organization?.domain) {
      checkDomainAvailabilityDebounced(value);
    } else {
      setIsAvailable(true);
    }
  };
  
  // تأخير في التحقق من توفر النطاق لتجنب استعلامات كثيرة
  const checkDomainAvailabilityDebounced = async (value: string) => {
    setIsCheckingAvailability(true);
    
    try {
      // انتظر قليلاً لتجنب استعلامات كثيرة أثناء الكتابة
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = await checkDomainAvailability(value, organization?.id);
      setIsAvailable(result.available);
      
      if (!result.available) {
        toast({
          title: "النطاق غير متاح",
          description: result.message || "هذا النطاق مستخدم بالفعل من قبل متجر آخر.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('خطأ أثناء التحقق من توفر النطاق:', error);
      setIsAvailable(false);
    } finally {
      setIsCheckingAvailability(false);
    }
  };
  
  // حفظ النطاق
  const handleSaveDomain = async () => {
    if (!organization?.id) return;
    
    // التحقق من صحة النطاق
    if (domain && !DOMAIN_REGEX.test(domain)) {
      toast({
        title: "تنسيق النطاق غير صالح",
        description: "يرجى إدخال نطاق صالح بتنسيق مثل example.com",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const result = await updateOrganizationDomain(organization.id, domain);
      
      if (result.success) {
        toast({
          title: "تم تحديث النطاق",
          description: result.message,
        });
        
        // تحديث حالة المستأجر وبيانات المنظمة
        await refreshTenant();
        
        // إذا كان النطاق غير فارغ، تحقق من حالته
        if (domain) {
          setDomainStatus('pending');
          setStatusMessage('تم تحديث النطاق بنجاح. قد يستغرق التحقق حتى 24 ساعة.');
        } else {
          setDomainStatus('unconfigured');
          setStatusMessage('');
        }
      } else {
        toast({
          title: "فشل تحديث النطاق",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('خطأ أثناء تحديث النطاق:', error);
      toast({
        title: "حدث خطأ",
        description: "فشل تحديث النطاق، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // إزالة النطاق
  const handleRemoveDomain = async () => {
    if (!organization?.id || !organization?.domain) return;
    
    if (!confirm('هل أنت متأكد من أنك تريد إزالة النطاق المخصص؟')) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      const result = await updateOrganizationDomain(organization.id, null);
      
      if (result.success) {
        toast({
          title: "تم إزالة النطاق",
          description: "تم إزالة النطاق المخصص بنجاح",
        });
        
        // تحديث حالة المستأجر وبيانات المنظمة
        await refreshTenant();
        
        // إعادة تعيين الحالة
        setDomain('');
        setDomainStatus('unconfigured');
        setStatusMessage('');
      } else {
        toast({
          title: "فشل إزالة النطاق",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('خطأ أثناء إزالة النطاق:', error);
      toast({
        title: "حدث خطأ",
        description: "فشل إزالة النطاق، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // تحديث حالة النطاق
  const handleCheckStatus = async () => {
    await checkCurrentDomainStatus();
  };
  
  // معاينة المتجر على النطاق المخصص
  const handlePreviewStore = () => {
    if (!organization?.domain) return;
    
    window.open(`https://${organization.domain}`, '_blank');
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>النطاق المخصص</CardTitle>
          <CardDescription>
            استخدم نطاقك الخاص بدلاً من النطاق الفرعي (subdomain) لمتجرك الإلكتروني
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="setup">إعداد النطاق</TabsTrigger>
              <TabsTrigger value="verification">التحقق من النطاق</TabsTrigger>
              <TabsTrigger value="help">إرشادات المساعدة</TabsTrigger>
            </TabsList>
            
            <TabsContent value="setup">
              <div className="space-y-6">
                {/* حالة النطاق الحالي */}
                {(organization?.domain || domainStatus !== 'unconfigured') && (
                  <div className="p-4 border rounded-md bg-gray-50">
                    <DomainStatus 
                      status={isChecking ? 'pending' : domainStatus} 
                      message={statusMessage} 
                      domain={organization?.domain} 
                    />
                    
                    <div className="mt-4 flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCheckStatus} 
                        disabled={isChecking || !organization?.domain}
                      >
                        {isChecking && <Loader2 className="animate-spin w-4 h-4 ml-2" />}
                        تحديث الحالة
                      </Button>
                      
                      {domainStatus === 'active' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handlePreviewStore}
                        >
                          <ExternalLink className="w-4 h-4 ml-2" />
                          معاينة المتجر
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* نموذج إعداد النطاق */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="domain">النطاق المخصص</Label>
                    <Input
                      id="domain"
                      placeholder="example.com"
                      value={domain}
                      onChange={(e) => handleDomainChange(e.target.value)}
                      className={`${!isValidFormat ? 'border-red-300 focus:ring-red-500' : ''}`}
                    />
                    {!isValidFormat && (
                      <p className="text-sm text-red-500">يرجى إدخال نطاق صالح (مثل example.com)</p>
                    )}
                    {!isAvailable && isValidFormat && domain && (
                      <p className="text-sm text-red-500">هذا النطاق مستخدم بالفعل من قبل متجر آخر</p>
                    )}
                    {isCheckingAvailability && (
                      <p className="text-sm text-gray-500 flex items-center">
                        <Loader2 className="animate-spin w-3 h-3 ml-1" />
                        جاري التحقق من توفر النطاق...
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      أدخل النطاق بدون http:// أو https:// (مثال: yourdomain.com)
                    </p>
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    {organization?.domain && (
                      <Button 
                        variant="outline" 
                        onClick={handleRemoveDomain} 
                        disabled={isSaving || isChecking}
                      >
                        {isSaving && <Loader2 className="animate-spin w-4 h-4 ml-2" />}
                        إزالة النطاق
                      </Button>
                    )}
                    
                    <Button 
                      onClick={handleSaveDomain} 
                      disabled={!isValidFormat || !isAvailable || isSaving || isChecking || isCheckingAvailability || domain === organization?.domain}
                    >
                      {isSaving && <Loader2 className="animate-spin w-4 h-4 ml-2" />}
                      حفظ النطاق
                    </Button>
                  </div>
                </div>
                
                {/* معلومات سجل CNAME */}
                <div className="space-y-1">
                  <Label htmlFor="cname-value">قيمة سجل CNAME:</Label>
                  <div className="relative">
                    <Input
                      id="cname-value"
                      value={INTERMEDIATE_DOMAIN}
                      readOnly
                      className="pr-20 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="absolute right-1 top-1 h-7"
                      onClick={() => {
                        navigator.clipboard.writeText(INTERMEDIATE_DOMAIN);
                        toast({
                          title: "تم النسخ",
                          description: "تم نسخ قيمة CNAME إلى الحافظة",
                          variant: "default",
                        });
                      }}
                    >
                      <Copy className="h-4 w-4 ml-2" />
                      نسخ
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    قم بإضافة سجل CNAME في إعدادات DNS لنطاقك ليشير إلى النطاق الوسيط الخاص بنا.
                  </p>
                </div>
                
                {/* نصائح سريعة */}
                <Alert>
                  <AlertTitle>نصائح لإعداد النطاق</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                      <li>تأكد من أنك تمتلك النطاق وتستطيع إدارة إعدادات DNS الخاصة به.</li>
                      <li>بعد تكوين النطاق هنا، يجب عليك تكوين سجلات CNAME على النطاق.</li>
                      <li>قد يستغرق انتشار التغييرات على DNS حتى 48 ساعة.</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-muted-foreground mt-2">
                  يمكنك استخدام نطاق مخصص لمتجرك الإلكتروني لزيادة الاحترافية وتحسين تجربة العملاء.
                  <Link to="/docs/custom-domains" className="text-primary hover:underline mr-1">
                    اقرأ دليل النطاقات المخصصة
                  </Link>
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="verification">
              {organization?.domain ? (
                <DomainVerificationDetails 
                  domain={organization.domain} 
                  onVerificationComplete={(status) => {
                    setDomainStatus(status);
                    if (status === 'active') {
                      setStatusMessage('تم التحقق من النطاق بنجاح وهو نشط الآن');
                    } else if (status === 'pending') {
                      setStatusMessage('سجلات DNS صحيحة، لكن لم يتم إصدار شهادة SSL بعد. قد يستغرق الأمر حتى 24 ساعة.');
                    } else {
                      setStatusMessage('فشل التحقق من النطاق، يرجى مراجعة إعدادات DNS');
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-40 text-center p-4 border rounded-md bg-muted">
                  <p>يرجى إعداد نطاق مخصص أولاً قبل إجراء التحقق</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="help">
              <CustomDomainHelp domain={domain || organization?.domain} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* إضافة قسم تكوين الـ DNS إذا تم تحديد نطاق */}
      {organization?.domain && domainStatus === 'pending' && (
        <DomainVerificationDetails 
          domain={organization.domain}
          onVerificationComplete={(status) => {
            setDomainStatus(status);
            if (status === 'active') {
              setStatusMessage('تم التحقق من النطاق بنجاح وهو نشط الآن');
              toast({
                title: "تم تنشيط النطاق",
                description: "تم تنشيط النطاق المخصص بنجاح",
              });
            }
          }}
        />
      )}
    </div>
  );
};

export default DomainSettings; 