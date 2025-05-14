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
import { DomainSettingsCard } from './DomainSettingsCard';
import { generateCustomDomainDnsInstructions } from '@/api/domain-verification-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { INTERMEDIATE_DOMAIN } from '@/lib/api/domain-verification';
import { getDomainInfo } from '@/api/get-domain-direct';
import { linkDomain } from '@/api/link-domain-direct';
import { removeDomain } from '@/api/remove-domain-direct';

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

const DomainSettings: React.FC = () => {
  const { organization, refreshTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [domain, setDomain] = useState<string>('');
  const [domainStatus, setDomainStatus] = useState<DomainStatusType>('unconfigured');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isValidFormat, setIsValidFormat] = useState<boolean>(true);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [verificationData, setVerificationData] = useState<Record<string, any> | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [actualDomain, setActualDomain] = useState<string | null>(null);
  
  // الحصول على معلومات النطاق مباشرة من قاعدة البيانات
  const fetchDomainInfoDirect = async () => {
    if (!organization?.id) return;
    
    setIsLoading(true);
    
    try {
      console.log('جلب معلومات النطاق مباشرة من قاعدة البيانات...');
      
      const result = await getDomainInfo(organization.id);
      
      if (result.success && result.data) {
        console.log('تم جلب معلومات النطاق بنجاح:', result.data);
        
        if (result.data.domain) {
          setActualDomain(result.data.domain);
          setDomain(result.data.domain);
          
          // إذا كانت معلومات التحقق موجودة
          if (result.data.verification) {
            setDomainStatus(result.data.verification.status as DomainStatusType || 'pending');
            setStatusMessage(result.data.verification.error_message || '');
            setLastChecked(result.data.verification.updated_at || '');
            setVerificationData(result.data.verification);
          } else {
            setDomainStatus('pending');
          }
        } else {
          setActualDomain(null);
          setDomainStatus('unconfigured');
        }
      } else {
        console.error('فشل في جلب معلومات النطاق:', result.error);
        toast({
          title: "خطأ",
          description: result.error || "حدث خطأ أثناء جلب معلومات النطاق",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('خطأ أثناء جلب معلومات النطاق:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // الحصول على معلومات التحقق من النطاق من قاعدة البيانات
  const fetchDomainVerificationInfo = async () => {
    if (!organization?.id || !actualDomain) return;
    
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('domain_verifications' as any)
        .select('*')
        .eq('organization_id', organization.id)
        .eq('domain', actualDomain)
        .maybeSingle();
        
      if (error) {
        console.error('خطأ في استعلام معلومات التحقق من النطاق:', error);
        return;
      }
      
      if (data && typeof data === 'object') {
        const domainVerification = data as any;
        setDomainStatus((domainVerification.status as DomainStatusType) || 'pending');
        setStatusMessage(domainVerification.error_message || '');
        setLastChecked(domainVerification.updated_at || '');
      }
    } catch (error) {
      console.error('خطأ في جلب معلومات التحقق من النطاق:', error);
    }
  };
  
  // تحميل النطاق الحالي إذا كان موجودًا
  useEffect(() => {
    if (organization?.id) {
      fetchDomainInfoDirect();
    }
  }, [organization?.id]);
  
  // جلب معلومات التحقق عند تغيير النطاق الفعلي
  useEffect(() => {
    if (actualDomain) {
      fetchDomainVerificationInfo();
    }
  }, [actualDomain]);
  
  // تحميل معلومات النطاق من المنظمة
  useEffect(() => {
    if (organization?.domain && !actualDomain) {
      setActualDomain(organization.domain);
      setDomain(organization.domain);
    }
  }, [organization?.domain, actualDomain]);
  
  // التحقق من حالة النطاق الحالي عبر Vercel API
  const checkDomainStatusMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id || !organization?.domain) return null;
      
      setIsChecking(true);
      try {
        const response = await fetch(`/api/check-domain-status?domain=${organization.domain}&organizationId=${organization.id}`);
        const result = await response.json();
        
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'فشل في التحقق من حالة النطاق');
        }
        
        // تحديث الحالة والمعلومات
        setDomainStatus(result.data.verified ? 'active' : 'pending');
        setStatusMessage(result.data.message || '');
        setLastChecked(new Date().toISOString());
        
        return result.data;
      } catch (error) {
        console.error('خطأ في التحقق من حالة النطاق:', error);
        setDomainStatus('error');
        setStatusMessage('حدث خطأ أثناء التحقق من حالة النطاق');
        throw error;
      } finally {
        setIsChecking(false);
      }
    },
    onSuccess: () => {
      // تحديث ذاكرة التخزين المؤقت للاستعلام
      queryClient.invalidateQueries({ queryKey: ['organization', organization?.id] });
    }
  });
  
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
  
  // حفظ النطاق باستخدام Vercel API
  const addDomainMutation = useMutation({
    mutationFn: async (newDomain: string) => {
      if (!organization?.id) return null;
      
      setIsSaving(true);
      try {
        // 1. التحقق من تنسيق النطاق
        if (!DOMAIN_REGEX.test(newDomain)) {
          throw new Error('يرجى إدخال نطاق صالح (مثل example.com)');
        }
        
        // 2. ربط النطاق بـ Vercel
        const result = await linkDomain(organization.id, newDomain);
        
        if (!result.success) {
          throw new Error(result.error || 'فشل في ربط النطاق بـ Vercel');
        }
        
        // 3. تحديث النطاق في قاعدة البيانات (استمر في استخدام الوظيفة الحالية للتوافق)
        const updateResult = await updateOrganizationDomain(organization.id, newDomain);
        
        if (!updateResult.success) {
          throw new Error(updateResult.message || 'فشل في تحديث النطاق في قاعدة البيانات');
        }
        
        // 4. تحديث الحالة والمعلومات
        setDomainStatus('pending');
        setStatusMessage('تم ربط النطاق بنجاح! يرجى إعداد سجلات DNS الخاصة بك.');
        setVerificationData(result.data?.verification || null);
        setLastChecked(new Date().toISOString());
        
        // 5. تحديث بيانات المستأجر
        await refreshTenant();
        
        toast({
          title: "تم تحديث النطاق",
          description: "تم ربط النطاق بنجاح! يرجى إعداد سجلات DNS الخاصة بك.",
        });
        
        return newDomain;
      } catch (error) {
        console.error('خطأ في إضافة النطاق:', error);
        toast({
          title: "فشل تحديث النطاق",
          description: error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث النطاق',
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsSaving(false);
      }
    }
  });
  
  // إزالة النطاق باستخدام Vercel API
  const removeDomainMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id || !organization?.domain) return null;
      
      if (!confirm('هل أنت متأكد من أنك تريد إزالة النطاق المخصص؟')) {
        return null;
      }
      
      setIsSaving(true);
      try {
        // 1. إزالة النطاق من Vercel
        const result = await removeDomain(organization.id, organization.domain);
        
        if (!result.success) {
          throw new Error(result.error || 'فشل في إزالة النطاق من Vercel');
        }
        
        // 2. تحديث الحالة والمعلومات
        setDomain('');
        setDomainStatus('unconfigured');
        setStatusMessage('');
        setVerificationData(null);
        setLastChecked(null);
        
        // 3. تحديث بيانات المستأجر
        await refreshTenant();
        
        toast({
          title: "تم إزالة النطاق",
          description: "تم إزالة النطاق المخصص بنجاح",
        });
        
        return true;
      } catch (error) {
        console.error('خطأ في إزالة النطاق:', error);
        toast({
          title: "فشل إزالة النطاق",
          description: error instanceof Error ? error.message : 'حدث خطأ أثناء إزالة النطاق',
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsSaving(false);
      }
    }
  });
  
  // معاينة المتجر على النطاق المخصص
  const handlePreviewStore = () => {
    if (!organization?.domain) return;
    
    window.open(`https://${organization.domain}`, '_blank');
  };
  
  // الحصول على سجلات DNS الموصى بها
  const dnsInstructions = organization?.domain 
    ? generateCustomDomainDnsInstructions(organization.domain) 
    : [];
  
  const checkCurrentDomainStatus = () => {
    checkDomainStatusMutation.mutate();
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
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="mr-3">جار تحميل معلومات النطاق...</span>
            </div>
          ) : (
            <Tabs defaultValue="setup" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="setup">إعداد النطاق</TabsTrigger>
                <TabsTrigger value="verification">التحقق من النطاق</TabsTrigger>
                <TabsTrigger value="help">إرشادات المساعدة</TabsTrigger>
              </TabsList>
              
              <TabsContent value="setup">
                <div className="space-y-6">
                  {/* استخدام المكون الجديد إذا كان متاحًا، وإلا استخدم المكون القديم */}
                  {typeof DomainSettingsCard !== 'undefined' ? (
                    <DomainSettingsCard
                      organizationId={organization?.id || ''}
                      currentDomain={actualDomain || null}
                      verificationStatus={domainStatus}
                      verificationData={verificationData}
                      lastChecked={lastChecked}
                      verificationMessage={statusMessage}
                      isAdmin={true}
                      onDomainUpdate={async (newDomain) => {
                        if (newDomain) {
                          setActualDomain(newDomain);
                          setDomain(newDomain);
                          setDomainStatus('pending');
                        } else {
                          setActualDomain(null);
                          setDomain('');
                          setDomainStatus('unconfigured');
                        }
                        
                        // إعادة تحميل معلومات النطاق بعد التحديث
                        setTimeout(() => {
                          fetchDomainInfoDirect();
                        }, 1000);
                        
                        await refreshTenant();
                      }}
                    />
                  ) : (
                    <>
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
                              onClick={checkCurrentDomainStatus} 
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
                              onClick={() => removeDomainMutation.mutate()} 
                              disabled={isSaving || isChecking}
                            >
                              {isSaving && <Loader2 className="animate-spin w-4 h-4 ml-2" />}
                              إزالة النطاق
                            </Button>
                          )}
                          
                          <Button 
                            onClick={() => addDomainMutation.mutate(domain)} 
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
                    </>
                  )}
                  
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
                {actualDomain ? (
                  <>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">سجلات DNS المطلوبة</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        أضف سجلات DNS التالية إلى مزود النطاق الخاص بك لإكمال عملية التحقق:
                      </p>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-muted">
                              <th className="px-4 py-2 text-right font-medium">النوع</th>
                              <th className="px-4 py-2 text-right font-medium">الاسم</th>
                              <th className="px-4 py-2 text-right font-medium">القيمة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dnsInstructions.map((record, index) => (
                              <tr key={index} className="border-b">
                                <td className="px-4 py-2">{record.type}</td>
                                <td className="px-4 py-2">{record.name}</td>
                                <td className="px-4 py-2 font-mono">{record.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        ملاحظة: قد تستغرق التغييرات في DNS ما يصل إلى 48 ساعة للانتشار.
                      </p>
                    </div>
                    
                    <DomainVerificationDetails 
                      domain={actualDomain} 
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
                  </>
                ) : (
                  <div className="flex items-center justify-center h-40 text-center p-4 border rounded-md bg-muted">
                    <p>يرجى إعداد نطاق مخصص أولاً قبل إجراء التحقق</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="help">
                <CustomDomainHelp domain={domain || actualDomain} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DomainSettings; 