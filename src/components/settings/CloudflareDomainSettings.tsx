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
import { Loader2, Check, Globe, AlertCircle, ExternalLink, Copy, Cloud } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { linkDomainCloudflare, removeDomainCloudflare } from '@/api/link-domain-cloudflare';
import { getCloudflareDnsInstructions, getUserIntermediateDomain } from '@/api/cloudflare-domain-api';
import { hasCloudflareConfig } from '@/lib/api/cloudflare-config';

// نمط للتحقق من صحة تنسيق النطاق
const DOMAIN_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(([a-zA-Z]{2,})|(xn--[a-zA-Z0-9]+))$/;

// حالات واجهة المستخدم
export type DomainStatusType = 'unconfigured' | 'pending' | 'active' | 'error' | 'verified';

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

const CloudflareDomainSettings: React.FC = () => {
  const { organization, refreshTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [domain, setDomain] = useState<string>('');
  const [domainStatus, setDomainStatus] = useState<DomainStatusType>('unconfigured');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isValidFormat, setIsValidFormat] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [verificationData, setVerificationData] = useState<Record<string, any> | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [actualDomain, setActualDomain] = useState<string | null>(null);
  const [isCloudflareAvailable, setIsCloudflareAvailable] = useState<boolean>(false);
  
  // التحقق من توفر إعدادات Cloudflare
  useEffect(() => {
    const hasConfig = hasCloudflareConfig();
    setIsCloudflareAvailable(hasConfig);
    
    if (!hasConfig) {
      toast({
        title: "تحذير",
        description: "لم يتم تكوين إعدادات Cloudflare. يرجى إضافة متغيرات البيئة المطلوبة.",
        variant: "destructive",
      });
    }
  }, [toast]);
  
  // الحصول على معلومات النطاق مباشرة من قاعدة البيانات
  const fetchDomainInfoDirect = async () => {
    if (!organization?.id) return;
    
    setIsLoading(true);
    
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      // الحصول على معلومات النطاق من المؤسسة
      const { data: orgData } = await supabase
        .from('organizations')
        .select('domain')
        .eq('id', organization.id)
        .single();

      if (orgData?.domain) {
        setActualDomain(orgData.domain);
        setDomain(orgData.domain);
        
        // الحصول على معلومات التحقق
        const { data: verificationData } = await supabase
          .from('domain_verifications')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('domain', orgData.domain)
          .maybeSingle();

        if (verificationData) {
          setDomainStatus(verificationData.status as DomainStatusType || 'pending');
          setStatusMessage(verificationData.error_message || '');
          setLastChecked(verificationData.updated_at || '');
          // التحقق من وجود verification_data قبل محاولة تحليلها
          const verificationDataField = (verificationData as any).verification_data;
          setVerificationData(verificationDataField ? JSON.parse(verificationDataField) : null);
        } else {
          setDomainStatus('pending');
        }
      } else {
        setActualDomain(null);
        setDomainStatus('unconfigured');
      }
    } catch (error) {
      console.error('خطأ في جلب معلومات النطاق:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // تحميل النطاق الحالي إذا كان موجودًا
  useEffect(() => {
    if (organization?.id) {
      fetchDomainInfoDirect();
    }
  }, [organization?.id]);
  
  // التحقق من صحة تنسيق النطاق
  const handleDomainChange = (value: string) => {
    setDomain(value);
    
    // التحقق من صحة تنسيق النطاق
    const isValid = value === '' || DOMAIN_REGEX.test(value);
    setIsValidFormat(isValid);
  };
  
  // حفظ النطاق باستخدام Cloudflare API
  const addDomainMutation = useMutation({
    mutationFn: async (newDomain: string) => {
      if (!organization?.id) return null;
      
      setIsSaving(true);
      try {
        // 1. التحقق من تنسيق النطاق
        if (!DOMAIN_REGEX.test(newDomain)) {
          throw new Error('يرجى إدخال نطاق صالح (مثل example.com)');
        }
        
        // 2. ربط النطاق بـ Cloudflare
        const result = await linkDomainCloudflare(organization.id, newDomain);
        
        if (!result.success) {
          throw new Error(result.error || 'فشل في ربط النطاق بـ Cloudflare');
        }
        
        // 3. تحديث الحالة والمعلومات
        setDomainStatus('pending');
        setStatusMessage('تم ربط النطاق بنجاح! يرجى إعداد سجلات DNS الخاصة بك.');
        setVerificationData(result.data?.verification || null);
        setLastChecked(new Date().toISOString());
        setActualDomain(newDomain);
        
        // 4. تحديث بيانات المستأجر
        await refreshTenant();
        
        toast({
          title: "تم تحديث النطاق",
          description: "تم ربط النطاق بنجاح! يرجى إعداد سجلات DNS الخاصة بك.",
        });
        
        return newDomain;
      } catch (error) {
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
  
  // إزالة النطاق باستخدام Cloudflare API
  const removeDomainMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id || !organization?.domain) return null;
      
      if (!confirm('هل أنت متأكد من أنك تريد إزالة النطاق المخصص؟')) {
        return null;
      }
      
      setIsSaving(true);
      try {
        // 1. إزالة النطاق من Cloudflare
        const result = await removeDomainCloudflare(organization.domain, organization.id);
        
        if (!result.success) {
          throw new Error(result.error || 'فشل في إزالة النطاق من Cloudflare');
        }
        
        // 2. تحديث الحالة والمعلومات
        setDomain('');
        setDomainStatus('unconfigured');
        setStatusMessage('');
        setVerificationData(null);
        setLastChecked(null);
        setActualDomain(null);
        
        // 3. تحديث بيانات المستأجر
        await refreshTenant();
        
        toast({
          title: "تم إزالة النطاق",
          description: "تم إزالة النطاق المخصص بنجاح",
        });
        
        return true;
      } catch (error) {
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
    ? getCloudflareDnsInstructions(organization.domain, organization.id) 
    : [];
    
  // الحصول على النطاق الوسيط للمستخدم
  const userIntermediateDomain = organization?.id ? getUserIntermediateDomain(organization.id) : '';
  
  if (!isCloudflareAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            النطاق المخصص - Cloudflare
          </CardTitle>
          <CardDescription>
            استخدم نطاقك الخاص مع Cloudflare Pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>إعدادات Cloudflare غير متوفرة</AlertTitle>
            <AlertDescription>
              لم يتم تكوين متغيرات البيئة اللازمة للاتصال بـ Cloudflare API.
              يرجى إضافة CLOUDFLARE_API_TOKEN و CLOUDFLARE_PROJECT_NAME و CLOUDFLARE_ZONE_ID.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            النطاق المخصص - Cloudflare
          </CardTitle>
          <CardDescription>
            استخدم نطاقك الخاص مع Cloudflare Pages بدلاً من النطاق الفرعي (subdomain) لمتجرك الإلكتروني
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
                  {/* حالة النطاق الحالي */}
                  {(organization?.domain || domainStatus !== 'unconfigured') && (
                    <div className="p-4 border rounded-md bg-gray-50">
                      <DomainStatus 
                        status={domainStatus} 
                        message={statusMessage} 
                        domain={organization?.domain} 
                      />
                      
                      <div className="mt-4 flex gap-2">
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
                      <p className="text-xs text-gray-500">
                        أدخل النطاق بدون http:// أو https:// (مثال: yourdomain.com)
                      </p>
                    </div>
                    
                    <div className="flex gap-2 justify-end">
                      {organization?.domain && (
                        <Button 
                          variant="outline" 
                          onClick={() => removeDomainMutation.mutate()} 
                          disabled={isSaving}
                        >
                          {isSaving && <Loader2 className="animate-spin w-4 h-4 ml-2" />}
                          إزالة النطاق
                        </Button>
                      )}
                      
                      <Button 
                        onClick={() => addDomainMutation.mutate(domain)} 
                        disabled={!isValidFormat || isSaving || domain === organization?.domain}
                      >
                        {isSaving && <Loader2 className="animate-spin w-4 h-4 ml-2" />}
                        حفظ النطاق
                      </Button>
                    </div>
                  </div>
                  
                  {/* معلومات سجل CNAME */}
                  <div className="space-y-4">
                    <div className="p-4 border rounded-md bg-blue-50">
                      <h4 className="font-semibold text-blue-900 mb-2">النطاق الوسيط الخاص بك:</h4>
                      <div className="relative">
                        <Input
                          value={userIntermediateDomain}
                          readOnly
                          className="pr-20 font-mono text-sm bg-white"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="absolute right-1 top-1 h-7"
                          onClick={() => {
                            navigator.clipboard.writeText(userIntermediateDomain);
                            toast({
                              title: "تم النسخ",
                              description: "تم نسخ النطاق الوسيط إلى الحافظة",
                              variant: "default",
                            });
                          }}
                        >
                          <Copy className="h-4 w-4 ml-2" />
                          نسخ
                        </Button>
                      </div>
                      <p className="text-sm text-blue-700 mt-2">
                        هذا هو النطاق الوسيط الفريد الخاص بك. استخدمه في إعدادات CNAME.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>مثال على إعداد DNS:</Label>
                      <div className="p-3 bg-gray-50 rounded-md font-mono text-sm">
                        <div className="space-y-1">
                          <div><span className="text-blue-600">النوع:</span> CNAME</div>
                          <div><span className="text-blue-600">الاسم:</span> {domain || 'yourdomain.com'}</div>
                          <div><span className="text-blue-600">القيمة:</span> {userIntermediateDomain}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* نصائح سريعة */}
                  <Alert>
                    <AlertTitle>نصائح لإعداد النطاق مع Cloudflare</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                        <li>تأكد من أنك تمتلك النطاق وتستطيع إدارة إعدادات DNS الخاصة به.</li>
                        <li>بعد تكوين النطاق هنا، يجب عليك تكوين سجلات CNAME على النطاق.</li>
                        <li>قد يستغرق انتشار التغييرات على DNS حتى 48 ساعة.</li>
                        <li>Cloudflare سيقوم بإصدار شهادة SSL تلقائياً.</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
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
                  </>
                ) : (
                  <div className="flex items-center justify-center h-40 text-center p-4 border rounded-md bg-muted">
                    <p>يرجى إعداد نطاق مخصص أولاً قبل إجراء التحقق</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="help">
                <div className="space-y-4">
                  <Alert>
                    <AlertTitle>دليل إعداد النطاق مع Cloudflare</AlertTitle>
                    <AlertDescription>
                      <div className="space-y-2 text-sm">
                        <p><strong>1. إضافة النطاق:</strong> أدخل نطاقك في الحقل أعلاه واضغط "حفظ النطاق"</p>
                        <p><strong>2. إعداد DNS:</strong> أضف سجلات CNAME كما هو موضح في تبويب "التحقق من النطاق"</p>
                        <p><strong>3. انتظار التحقق:</strong> قد يستغرق التحقق حتى 24-48 ساعة</p>
                        <p><strong>4. SSL تلقائي:</strong> Cloudflare سيقوم بإصدار شهادة SSL تلقائياً</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <AlertTitle>مزودي DNS المدعومين</AlertTitle>
                    <AlertDescription>
                      <div className="space-y-1 text-sm">
                        <p>• Cloudflare DNS</p>
                        <p>• GoDaddy</p>
                        <p>• Namecheap</p>
                        <p>• Google Domains</p>
                        <p>• أي مزود DNS آخر يدعم سجلات CNAME</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CloudflareDomainSettings;
