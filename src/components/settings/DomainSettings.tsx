import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useTenant } from '@/context/TenantContext';
import { getSupabaseClient } from '@/lib/supabase';
import { getDomainInfo } from '@/api/get-domain-direct';
import {
  autoSetupDomain,
  checkCustomHostnameStatus,
  checkDomainDelegation,
  getStockihaNameservers,
  removeCustomHostname,
  type CloudflareNameservers,
  type CloudflareSaaSResponse,
  type CustomHostnameResponse,
  type DomainDelegationStatus
} from '@/api/cloudflare-saas-api';
import { DomainVerificationStatus } from '@/types/domain-verification';
import {
  Globe,
  Loader2,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Zap,
  Trash2,
  Info,
  BookOpen,
  ExternalLink,
  Clock
} from 'lucide-react';

const DOMAIN_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(([a-zA-Z]{2,})|(xn--[a-zA-Z0-9]+))$/;
const DEFAULT_NAMESERVERS = ['marty.ns.cloudflare.com', 'sue.ns.cloudflare.com'];

interface VerificationRecord {
  id?: string;
  status: DomainVerificationStatus;
  error_message?: string | null;
  updated_at?: string | null;
  verified_at?: string | null;
}

type HostnameState = 'pending' | 'active' | 'moved' | 'error' | 'not_found';

interface HostnameStatusDisplay {
  hostname: string;
  status: HostnameState;
  sslStatus?: 'pending' | 'active' | 'error';
  verificationErrors?: string[];
  id?: string;
  message?: string;
}

const cleanDomain = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\s+/g, '')
    .replace(/\/$/, '')
    .replace(/:.*$/, '')
    .replace(/^www\./, '')
    .replace(/\.$/, '');

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'حدث خطأ غير متوقع';

const normalizeHostnameStatus = (hostname: string, result: CloudflareSaaSResponse): HostnameStatusDisplay => {
  if (!result.success) {
    const message = result.error || result.message || 'لم يتم العثور على معلومات النطاق';
    const normalizedMessage = message.toLowerCase();
    const isMissing = normalizedMessage.includes('لم يتم العثور') || normalizedMessage.includes('not found');

    return {
      hostname,
      status: isMissing ? 'not_found' : 'error',
      message
    };
  }

  const data = result.data as CustomHostnameResponse;

  return {
    hostname,
    status: data.status,
    sslStatus: data.ssl?.status,
    verificationErrors: data.verification_errors,
    id: data.id
  };
};

const statusBadge = (status: HostnameState | DomainDelegationStatus['status'] | 'unconfigured') => {
  const config: Record<string, { label: string; className: string }> = {
    active: { label: 'نشط', className: 'bg-emerald-100 text-emerald-800' },
    pending: { label: 'قيد التفعيل', className: 'bg-amber-100 text-amber-800' },
    moved: { label: 'تم النقل', className: 'bg-blue-100 text-blue-800' },
    error: { label: 'خطأ', className: 'bg-red-100 text-red-800' },
    not_found: { label: 'غير مكوَّن', className: 'bg-gray-100 text-gray-700' },
    unconfigured: { label: 'غير مكوَّن', className: 'bg-gray-100 text-gray-700' }
  };

  const { label, className } = config[status] ?? config.unconfigured;
  return <Badge className={className}>{label}</Badge>;
};

const statusIcon = (status: HostnameState | DomainDelegationStatus['status'] | 'unconfigured') => {
  switch (status) {
    case 'active':
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case 'pending':
      return <Clock className="w-5 h-5 text-amber-500" />;
    case 'error':
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    case 'moved':
      return <Shield className="w-5 h-5 text-blue-500" />;
    default:
      return <Globe className="w-5 h-5 text-muted-foreground" />;
  }
};

const DomainSettings: React.FC = () => {
  const { organization, refreshTenant } = useTenant();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const [domainInput, setDomainInput] = useState('');
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationRecord | null>(null);
  const [nameservers, setNameservers] = useState<string[]>(DEFAULT_NAMESERVERS);
  const [delegation, setDelegation] = useState<DomainDelegationStatus | null>(null);
  const [hostnames, setHostnames] = useState<HostnameStatusDisplay[]>([]);

  const supabase = useMemo(() => getSupabaseClient(), []);

  const loadDomainStatus = useCallback(
    async (domainOverride?: string, nameserverOverride?: string[]) => {
      if (!organization?.id) {
        return;
      }

      const normalizedDomain = cleanDomain(domainOverride ?? currentDomain ?? '');
      if (!normalizedDomain) {
        setDelegation(null);
        setHostnames([]);
        return;
      }

      const expectedNameservers = (nameserverOverride && nameserverOverride.length > 0)
        ? nameserverOverride
        : nameservers;

      setIsCheckingStatus(true);
      try {
        const [delegationStatus, rootHostname, wwwHostname] = await Promise.all([
          checkDomainDelegation(normalizedDomain, expectedNameservers),
          checkCustomHostnameStatus(normalizedDomain),
          checkCustomHostnameStatus(`www.${normalizedDomain}`)
        ]);

        setDelegation(delegationStatus);
        setHostnames([
          normalizeHostnameStatus(normalizedDomain, rootHostname),
          normalizeHostnameStatus(`www.${normalizedDomain}`, wwwHostname)
        ]);

        const latestInfo = await getDomainInfo(organization.id);
        if (latestInfo.success && latestInfo.data) {
          setVerification(latestInfo.data.verification || null);
        }
      } catch (error) {
        console.error('Domain status check failed', error);
        toast({
          title: 'فشل التحقق',
          description: 'تعذر فحص حالة النطاق حالياً. حاول مجدداً بعد لحظات.',
          variant: 'destructive'
        });
      } finally {
        setIsCheckingStatus(false);
      }
    },
    [currentDomain, nameservers, organization?.id, toast]
  );

  const loadInitialData = useCallback(async () => {
    if (!organization?.id) {
      return;
    }

    setIsLoading(true);
    try {
      const [domainInfo, nameserverInfo] = await Promise.all([
        getDomainInfo(organization.id),
        getStockihaNameservers().catch(() => null)
      ]);

      let resolvedNameservers = DEFAULT_NAMESERVERS;

      if (nameserverInfo && nameserverInfo.success && (nameserverInfo.data as CloudflareNameservers)?.nameservers) {
        resolvedNameservers = (nameserverInfo.data as CloudflareNameservers).nameservers;
        setNameservers(resolvedNameservers);
      } else {
        setNameservers(DEFAULT_NAMESERVERS);
      }

      if (domainInfo.success && domainInfo.data) {
        const existingDomain = domainInfo.data.domain ? cleanDomain(domainInfo.data.domain) : '';
        setCurrentDomain(existingDomain || null);
        setDomainInput(existingDomain);
        setVerification(domainInfo.data.verification || null);

        if (existingDomain) {
          await loadDomainStatus(existingDomain, resolvedNameservers);
        } else {
          setDelegation(null);
          setHostnames([]);
        }
      } else {
        setCurrentDomain(null);
        setDomainInput('');
        setVerification(null);
        setDelegation(null);
        setHostnames([]);
      }
    } catch (error) {
      console.error('Failed to load custom domain data', error);
      toast({
        title: 'خطأ في التحميل',
        description: 'لم نتمكن من تحميل بيانات النطاق الآن. حاول لاحقاً.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, loadDomainStatus, toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleCopy = useCallback(
    async (value: string, label: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopiedValue(label);
        toast({ title: 'تم النسخ', description: `${label} أُضيف إلى الحافظة` });
        setTimeout(() => setCopiedValue(null), 2000);
      } catch (error) {
        toast({ title: 'تعذر النسخ', description: getErrorMessage(error), variant: 'destructive' });
      }
    },
    [toast]
  );

  const handleSaveDomain = useCallback(async () => {
    if (!organization?.id) {
      toast({ title: 'خطأ', description: 'لم يتم العثور على المؤسسة الحالية.', variant: 'destructive' });
      return;
    }

    const cleanValue = cleanDomain(domainInput);
    if (!cleanValue) {
      toast({ title: 'أدخل النطاق', description: 'يرجى إدخال نطاق صالح قبل الحفظ.' });
      return;
    }

    if (!DOMAIN_REGEX.test(cleanValue)) {
      toast({ title: 'نطاق غير صالح', description: 'اكتب نطاقاً بدون http أو مسارات (مثل example.com).', variant: 'destructive' });
      return;
    }

    if (!supabase) {
      toast({ title: 'Supabase', description: 'فشل الاتصال بقاعدة البيانات.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ domain: cleanValue, updated_at: now })
        .eq('id', organization.id);

      if (updateError) {
        throw new Error(updateError.message || 'تعذر تحديث النطاق في المؤسسة');
      }

      const { data: existingVerification, error: verificationSelectError } = await supabase
        .from('domain_verifications')
        .select('id')
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (verificationSelectError) {
        throw new Error(verificationSelectError.message || 'تعذر قراءة حالة التحقق من النطاق');
      }

      if (existingVerification) {
        const { error: verificationUpdateError } = await supabase
          .from('domain_verifications')
          .update({
            domain: cleanValue,
            status: 'pending',
            error_message: null,
            updated_at: now,
            verified_at: null
          })
          .eq('id', existingVerification.id);

        if (verificationUpdateError) {
          throw new Error(verificationUpdateError.message || 'تعذر تحديث سجل التحقق');
        }
      } else {
        const { error: verificationInsertError } = await supabase
          .from('domain_verifications')
          .insert({
            organization_id: organization.id,
            domain: cleanValue,
            status: 'pending',
            created_at: now,
            updated_at: now
          });

        if (verificationInsertError) {
          throw new Error(verificationInsertError.message || 'تعذر إنشاء سجل التحقق');
        }
      }

      setCurrentDomain(cleanValue);
      setVerification({ status: 'pending' });
      toast({
        title: 'تم حفظ النطاق',
        description: 'قم بتحديث الـ Nameservers ثم استخدم زر التحقق لإكمال الإعداد.'
      });

      await refreshTenant();
      await loadDomainStatus(cleanValue);
    } catch (error) {
      console.error('Save domain failed', error);
      toast({ title: 'فشل الحفظ', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [domainInput, organization?.id, supabase, toast, refreshTenant, loadDomainStatus]);

  const handleRemoveDomain = useCallback(async () => {
    if (!organization?.id || !currentDomain) {
      return;
    }

    const confirmed = window.confirm('هل أنت متأكد من حذف النطاق المخصص وإيقاف العمل به؟');
    if (!confirmed) {
      return;
    }

    if (!supabase) {
      toast({ title: 'Supabase', description: 'فشل الاتصال بقاعدة البيانات.', variant: 'destructive' });
      return;
    }

    setIsRemoving(true);
    try {
      const [rootHostname, wwwHostname] = await Promise.all([
        checkCustomHostnameStatus(currentDomain),
        checkCustomHostnameStatus(`www.${currentDomain}`)
      ]);

      const hostnamesToRemove = [rootHostname, wwwHostname]
        .filter(response => response.success && (response.data as CustomHostnameResponse)?.id)
        .map(response => (response.data as CustomHostnameResponse).id);

      for (const id of hostnamesToRemove) {
        if (!id) continue;
        const removalResult = await removeCustomHostname(id);
        if (!removalResult.success) {
          console.warn('Failed to remove custom hostname', removalResult.error);
        }
      }

      const now = new Date().toISOString();
      const { error: orgUpdateError } = await supabase
        .from('organizations')
        .update({ domain: null, updated_at: now })
        .eq('id', organization.id);

      if (orgUpdateError) {
        throw new Error(orgUpdateError.message || 'تعذر تحديث المؤسسة بعد الإزالة');
      }

      const { error: verificationDeleteError } = await supabase
        .from('domain_verifications')
        .delete()
        .eq('organization_id', organization.id);

      if (verificationDeleteError) {
        console.warn('Failed to delete domain verification record', verificationDeleteError.message);
      }

      setCurrentDomain(null);
      setDomainInput('');
      setVerification(null);
      setDelegation(null);
      setHostnames([]);

      await refreshTenant();
      toast({ title: 'تمت الإزالة', description: 'تم حذف النطاق المخصص بنجاح.' });
    } catch (error) {
      console.error('Remove domain failed', error);
      toast({ title: 'فشل الإزالة', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsRemoving(false);
    }
  }, [currentDomain, organization?.id, supabase, toast, refreshTenant]);

  const handleAutoSetup = useCallback(async () => {
    if (!organization?.id || !currentDomain) {
      toast({ title: 'لا يوجد نطاق', description: 'أضف النطاق أولاً ثم حاول الإعداد التلقائي.' });
      return;
    }

    setIsCheckingStatus(true);
    try {
      const result = await autoSetupDomain(currentDomain, organization.id);
      if (result.success) {
        toast({
          title: 'تم الإعداد التلقائي',
          description: 'تم إنشاء Custom Hostnames وإعداد SSL. قد يستغرق التفعيل دقائق قليلة.'
        });
      } else {
        throw new Error(result.error || result.message || 'تعذر الإعداد التلقائي للنطاق');
      }
      await loadDomainStatus(currentDomain);
    } catch (error) {
      console.error('Auto setup failed', error);
      toast({ title: 'فشل الإعداد التلقائي', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsCheckingStatus(false);
    }
  }, [organization?.id, currentDomain, toast, loadDomainStatus]);

  const currentStatus = useMemo(() => {
    if (!currentDomain) return 'unconfigured' as const;
    if (delegation?.status === 'error') return 'error' as const;
    if (!delegation) return 'pending' as const;
    if (delegation.status === 'active') return 'active' as const;
    return delegation.status;
  }, [currentDomain, delegation]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p>جارٍ تحميل إعدادات النطاق...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            {statusIcon(currentStatus)}
            <div>
              <CardTitle className="text-lg">النطاق المخصص</CardTitle>
              <CardDescription>
                اربط نطاقك مع منصّة Stockiha باستخدام نظام Cloudflare for SaaS.
              </CardDescription>
            </div>
          </div>
          {statusBadge(currentStatus)}
        </CardHeader>
        <CardContent className="space-y-4">
          {currentDomain ? (
            <div className="flex flex-wrap items-center gap-2 text-base">
              <code className="rounded bg-muted px-3 py-1 text-sm font-medium">{currentDomain}</code>
              <Button variant="ghost" size="icon" onClick={() => handleCopy(currentDomain, 'النطاق')}>
                {copiedValue === 'النطاق' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          ) : (
            <Alert>
              <AlertTitle>لم يتم إعداد نطاق بعد</AlertTitle>
              <AlertDescription>
                أضف نطاقك الخاص في الخطوة التالية، ثم وجّه الـ Nameservers إلى Cloudflare ليعمل متجرك على نطاقك.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => loadDomainStatus()} disabled={!currentDomain || isCheckingStatus}>
              {isCheckingStatus && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              <RefreshCw className="ml-2 h-4 w-4" />
              تحقق من الحالة
            </Button>
            <Button variant="outline" onClick={handleAutoSetup} disabled={!currentDomain || isCheckingStatus}>
              {isCheckingStatus && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              <Zap className="ml-2 h-4 w-4" />
              إعداد تلقائي
            </Button>
            <Button variant="destructive" onClick={handleRemoveDomain} disabled={!currentDomain || isRemoving}>
              {isRemoving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              <Trash2 className="ml-2 h-4 w-4" />
              إزالة النطاق
            </Button>
          </div>

          {verification && (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span>آخر تحديث:</span>
                <span className="font-medium text-foreground">
                  {verification.updated_at ? new Date(verification.updated_at).toLocaleString('ar-SA') : '—'}
                </span>
                <Separator orientation="vertical" className="h-4" />
                <span>الحالة الحالية:</span>
                {statusBadge(verification.status)}
              </div>
              {verification.error_message && (
                <p className="mt-2 text-xs text-red-600">{verification.error_message}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>١. أضف نطاقك</CardTitle>
          <CardDescription>اكتب اسم النطاق الذي تملكه (بدون http). سيتم حفظه في حساب مؤسستك.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row">
            <Input
              placeholder="example.com"
              value={domainInput}
              onChange={(event) => setDomainInput(event.target.value)}
              className="md:flex-1"
            />
            <Button onClick={handleSaveDomain} disabled={isSaving}>
              {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حفظ النطاق
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            تأكد أن النطاق مُسجّل باسمك. إذا أردت استخدام نطاق فرعي (مثل shop.example.com) ثبّت النطاق الأساسي أولاً ثم أنشئ تحويلات من مزوّدك.
          </p>
        </CardContent>
      </Card>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>٢. حدّث الـ Nameservers</CardTitle>
          <CardDescription>
            سجّل الدخول إلى مزوّد النطاق (GoDaddy، Namecheap، OVH، ...) واستبدل الـ Nameservers بالقيم التالية:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {nameservers.map((nameserver, index) => (
              <div key={nameserver} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline">NS{index + 1}</Badge>
                  <code>{nameserver}</code>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(nameserver, `Nameserver ${index + 1}`)}
                >
                  {copiedValue === `Nameserver ${index + 1}` ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>

          <Alert className="border-blue-200 bg-blue-50 text-blue-900">
            <AlertTitle className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              كيف تغيّر الـ Nameservers؟
            </AlertTitle>
            <AlertDescription className="space-y-2 text-sm">
              <p>في أغلب المزودين ستجد الخيار داخل إعدادات DNS. اختر "Custom Nameservers" ثم ألصق القيم أعلاه.</p>
              <ul className="list-disc space-y-1 pr-4">
                <li>GoDaddy: My Products → DNS → Nameservers → Change → Custom</li>
                <li>Namecheap: Domain List → Manage → Nameservers → Custom DNS</li>
                <li>OVH: Domain → DNS servers → Modify</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>٣. تحقق من الحالة</CardTitle>
          <CardDescription>بعد نشر تغييرات الـ DNS قد يستغرق الانتشار من 15 دقيقة وحتى 24 ساعة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {delegation && (
            <div className="space-y-2 rounded-lg border px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                {statusIcon(delegation.status)}
                <span className="text-sm font-medium">تفويض النطاق</span>
                {statusBadge(delegation.status)}
                <span className="text-sm text-muted-foreground">{delegation.nameservers_configured ? 'Nameservers مكوّنة بشكل صحيح' : 'لم يتم اكتشاف Nameservers خاصة بـ Cloudflare بعد.'}</span>
              </div>
              {delegation.verification_errors && delegation.verification_errors.length > 0 && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTitle>أخطاء التحقق</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc space-y-1 pr-4 text-sm">
                      {delegation.verification_errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {hostnames.map((hostname) => (
              <div key={hostname.hostname} className="space-y-2 rounded-lg border px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {statusIcon(hostname.status)}
                  <span>{hostname.hostname}</span>
                  {statusBadge(hostname.status)}
                </div>
                {hostname.sslStatus && (
                  <div className="text-xs text-muted-foreground">
                    حالة SSL: <span className="font-medium text-foreground">{hostname.sslStatus === 'active' ? 'نشط' : hostname.sslStatus === 'pending' ? 'قيد الإصدار' : 'خطأ'}</span>
                  </div>
                )}
                {hostname.message && (
                  <p className="text-xs text-muted-foreground">{hostname.message}</p>
                )}
                {hostname.verificationErrors && hostname.verificationErrors.length > 0 && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTitle>أخطاء SSL</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc space-y-1 pr-4 text-xs">
                        {hostname.verificationErrors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </div>

          {!delegation && (
            <Alert>
              <AlertTitle>انتظر اكتمال التكوين</AlertTitle>
              <AlertDescription>
                بمجرد أن يشير مزود النطاق إلى Cloudflare ستتحول الحالة إلى "نشط" وسيتم تفعيل SSL تلقائياً.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-muted/40">
        <CardHeader>
          <CardTitle>موارد إضافية</CardTitle>
          <CardDescription>تعليمات ودروس تساعدك على إنهاء الربط بدون أخطاء.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <a
            className="flex items-center gap-2 text-primary hover:underline"
            href="https://developers.cloudflare.com/pages/platform/custom-domains/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
            دليل Cloudflare الرسمي للنطاقات المخصصة
          </a>
          <a
            className="flex items-center gap-2 text-primary hover:underline"
            href="/docs/custom-domains"
            target="_blank"
            rel="noopener noreferrer"
          >
            <BookOpen className="h-4 w-4" />
            وثائق Stockiha: خطوات مفصلة لضبط النطاق
          </a>
        </CardContent>
      </Card>
    </div>
  );
};

export default DomainSettings;
