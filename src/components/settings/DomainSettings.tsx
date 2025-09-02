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
import CloudflareDomainSettings from './CloudflareDomainSettings';
import { hasCloudflareConfig } from '@/lib/api/cloudflare-config';

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
  const [useCloudflare, setUseCloudflare] = useState<boolean>(false);
  
  // الحصول على معلومات النطاق مباشرة من قاعدة البيانات
  const fetchDomainInfoDirect = async () => {
    if (!organization?.id) return;
    
    setIsLoading(true);
    
    try {

      const result = await getDomainInfo(organization.id);
      
      if (result.success && result.data) {

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
        toast({
          title: "خطأ",
          description: result.error || "حدث خطأ أثناء جلب معلومات النطاق",
          variant: "destructive",
        });
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };
  
  // الحصول على معلومات التحقق من النطاق من قاعدة البيانات
  const fetchDomainVerificationInfo = async () => {
    if (!organization?.id || !actualDomain) return;
    
    try {
      const supabase = getSupabaseClient();
      
      // التحقق من صحة عميل Supabase قبل الاستخدام
      if (!supabase) {
        return;
      }
      
      const { data, error } = await supabase
        .from('domain_verifications' as any)
        .select('*')
        .eq('organization_id', organization.id)
        .eq('domain', actualDomain)
        .maybeSingle();
        
      if (error) {
        return;
      }
      
      if (data && typeof data === 'object') {
        const domainVerification = data as any;
        setDomainStatus((domainVerification.status as DomainStatusType) || 'pending');
        setStatusMessage(domainVerification.error_message || '');
        setLastChecked(domainVerification.updated_at || '');
      }
    } catch (error) {
    }
  };
  
  // تحميل النطاق الحالي إذا كان موجودًا
  useEffect(() => {
    if (organization?.id) {
      fetchDomainInfoDirect();
    }
  }, [organization?.id]);

  // التحقق من توفر Cloudflare وتحديد النظام الافتراضي
  useEffect(() => {
    const cloudflareAvailable = hasCloudflareConfig();
    setUseCloudflare(cloudflareAvailable);
    
    if (cloudflareAvailable) {
      toast({
        title: "تم اكتشاف Cloudflare",
        description: "سيتم استخدام Cloudflare Pages لإدارة النطاقات المخصصة.",
        variant: "default",
      });
    }
  }, [toast]);
  
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
        const result = await removeDomain(organization.domain, organization.id);
        
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
  
  // إذا كان Cloudflare متاح، استخدم مكون Cloudflare المخصص
  if (useCloudflare) {
    return <CloudflareDomainSettings />;
  }

  // إذا لم يكن Cloudflare متاحاً، اعرض رسالة تحذيرية
  return (
    <div className="space-y-6">
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
            <AlertTitle>إعدادات Cloudflare مطلوبة</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p>لاستخدام النطاقات المخصصة، يجب تكوين متغيرات البيئة التالية:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><code>CLOUDFLARE_API_TOKEN</code> - رمز الوصول لـ Cloudflare API</li>
                  <li><code>CLOUDFLARE_PROJECT_NAME</code> - اسم مشروع Cloudflare Pages (مثل: stockiha)</li>
                  <li><code>CLOUDFLARE_ZONE_ID</code> - معرف المنطقة في Cloudflare</li>
                </ul>
                <p className="text-sm mt-2">
                  يرجى إضافة هذه المتغيرات في إعدادات البيئة الخاصة بك وإعادة تحميل الصفحة.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default DomainSettings;
