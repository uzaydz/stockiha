import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useTenant } from '@/context/TenantContext';
import {
  setupCustomDomain,
  removeCustomDomain,
  getDomainStatusWithWww,
  refreshDomainStatus,
  getDomainVerificationStatus,
  VERCEL_IP,
  VERCEL_CNAME,
  type DomainStatus,
  type DnsInstructions
} from '@/api/vercel-domains-api';
import {
  Globe,
  Loader2,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Trash2,
  Info,
  BookOpen,
  ExternalLink,
  Clock,
  Zap,
  Server
} from 'lucide-react';

const DOMAIN_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(([a-zA-Z]{2,})|(xn--[a-zA-Z0-9]+))$/;

type DomainState = 'unconfigured' | 'pending' | 'active' | 'error' | 'misconfigured';

interface DomainStatusDisplay {
  apex: DomainStatus | null;
  www: DomainStatus | null;
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

const statusBadge = (status: DomainState) => {
  const config: Record<DomainState, { label: string; className: string }> = {
    active: { label: 'نشط', className: 'bg-emerald-100 text-emerald-800' },
    pending: { label: 'قيد التفعيل', className: 'bg-amber-100 text-amber-800' },
    misconfigured: { label: 'خطأ في DNS', className: 'bg-orange-100 text-orange-800' },
    error: { label: 'خطأ', className: 'bg-red-100 text-red-800' },
    unconfigured: { label: 'غير مكوَّن', className: 'bg-gray-100 text-gray-700' }
  };

  const { label, className } = config[status] ?? config.unconfigured;
  return <Badge className={className}>{label}</Badge>;
};

const statusIcon = (status: DomainState) => {
  switch (status) {
    case 'active':
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case 'pending':
      return <Clock className="w-5 h-5 text-amber-500" />;
    case 'error':
    case 'misconfigured':
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
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
  const [domainStatus, setDomainStatus] = useState<DomainStatusDisplay | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed' | null>(null);

  const loadDomainStatus = useCallback(
    async (domainOverride?: string) => {
      if (!organization?.id) return;

      const normalizedDomain = cleanDomain(domainOverride ?? currentDomain ?? '');
      if (!normalizedDomain) {
        setDomainStatus(null);
        return;
      }

      setIsCheckingStatus(true);
      try {
        const status = await getDomainStatusWithWww(organization.id, normalizedDomain);
        setDomainStatus(status);
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
    [currentDomain, organization?.id, toast]
  );

  const loadInitialData = useCallback(async () => {
    if (!organization?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const verifyStatus = await getDomainVerificationStatus(organization.id);

      if (verifyStatus?.domain) {
        const existingDomain = cleanDomain(verifyStatus.domain);
        setCurrentDomain(existingDomain);
        setDomainInput(existingDomain);
        setVerificationStatus(verifyStatus.status);

        if (existingDomain) {
          await loadDomainStatus(existingDomain);
        }
      } else {
        setCurrentDomain(null);
        setDomainInput('');
        setVerificationStatus(null);
        setDomainStatus(null);
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

    setIsSaving(true);
    try {
      const result = await setupCustomDomain(organization.id, cleanValue);

      if (result.success) {
        setCurrentDomain(cleanValue);
        setVerificationStatus('pending');
        toast({
          title: 'تم حفظ النطاق',
          description: 'قم بإضافة سجلات DNS ثم استخدم زر التحقق لإكمال الإعداد.'
        });
        await refreshTenant();
        await loadDomainStatus(cleanValue);
      } else {
        throw new Error(result.error || 'فشل في إعداد النطاق');
      }
    } catch (error) {
      console.error('Save domain failed', error);
      toast({ title: 'فشل الحفظ', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [domainInput, organization?.id, toast, refreshTenant, loadDomainStatus]);

  const handleRemoveDomain = useCallback(async () => {
    if (!organization?.id || !currentDomain) {
      return;
    }

    const confirmed = window.confirm('هل أنت متأكد من حذف النطاق المخصص وإيقاف العمل به؟');
    if (!confirmed) {
      return;
    }

    setIsRemoving(true);
    try {
      const result = await removeCustomDomain(organization.id, currentDomain);

      if (result.success) {
        setCurrentDomain(null);
        setDomainInput('');
        setVerificationStatus(null);
        setDomainStatus(null);
        await refreshTenant();
        toast({ title: 'تمت الإزالة', description: 'تم حذف النطاق المخصص بنجاح.' });
      } else {
        throw new Error(result.error || 'فشل في إزالة النطاق');
      }
    } catch (error) {
      console.error('Remove domain failed', error);
      toast({ title: 'فشل الإزالة', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsRemoving(false);
    }
  }, [currentDomain, organization?.id, toast, refreshTenant]);

  const handleRefreshStatus = useCallback(async () => {
    if (!organization?.id || !currentDomain) {
      toast({ title: 'لا يوجد نطاق', description: 'أضف النطاق أولاً ثم حاول التحقق.' });
      return;
    }

    setIsCheckingStatus(true);
    try {
      const cleanedDomain = cleanDomain(currentDomain);
      const status = await refreshDomainStatus(organization.id, cleanedDomain);
      if (status?.verified) {
        setVerificationStatus('verified');
        toast({
          title: 'تم التحقق بنجاح!',
          description: 'النطاق جاهز للاستخدام. متجرك يعمل الآن على نطاقك الخاص.'
        });
      } else {
        toast({
          title: 'لم يكتمل التحقق بعد',
          description: 'تأكد من إضافة سجلات DNS بشكل صحيح وانتظر حتى ينتشر التحديث.'
        });
      }
      await loadDomainStatus(cleanedDomain);
    } catch (error) {
      console.error('Refresh status failed', error);
      toast({ title: 'فشل التحقق', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsCheckingStatus(false);
    }
  }, [organization?.id, currentDomain, toast, loadDomainStatus]);

  const currentState = useMemo((): DomainState => {
    if (!currentDomain) return 'unconfigured';
    if (!domainStatus) return 'pending';

    const { apex, www } = domainStatus;

    if (apex?.verified && www?.verified) return 'active';
    if (apex?.misconfigured || www?.misconfigured) return 'misconfigured';
    if (apex?.verified || www?.verified) return 'pending';

    return 'pending';
  }, [currentDomain, domainStatus]);

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
      {/* Status Card */}
      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            {statusIcon(currentState)}
            <div>
              <CardTitle className="text-lg">النطاق المخصص</CardTitle>
              <CardDescription>
                اربط نطاقك بمتجرك - يعمل مع جميع مزودي DNS بما في ذلك GoDaddy.
              </CardDescription>
            </div>
          </div>
          {statusBadge(currentState)}
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
                أضف نطاقك الخاص في الخطوة التالية، ثم أضف سجلات DNS ليعمل متجرك على نطاقك.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleRefreshStatus} disabled={!currentDomain || isCheckingStatus}>
              {isCheckingStatus && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              <RefreshCw className="ml-2 h-4 w-4" />
              تحقق من الحالة
            </Button>
            <Button variant="destructive" onClick={handleRemoveDomain} disabled={!currentDomain || isRemoving}>
              {isRemoving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              <Trash2 className="ml-2 h-4 w-4" />
              إزالة النطاق
            </Button>
          </div>

          {verificationStatus && (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span>حالة التحقق:</span>
                {statusBadge(verificationStatus === 'verified' ? 'active' : verificationStatus === 'failed' ? 'error' : 'pending')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 1: Add Domain */}
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
            سيتم تفعيل النطاق الأساسي (example.com) و www (www.example.com) تلقائياً.
          </p>
        </CardContent>
      </Card>

      {/* Step 2: DNS Records */}
      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            ٢. أضف سجلات DNS
          </CardTitle>
          <CardDescription>
            سجّل الدخول إلى مزوّد النطاق (GoDaddy، Namecheap، OVH، ...) وأضف السجلات التالية:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* A Record for Apex */}
          <div className="rounded-lg border bg-emerald-50/50 px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-emerald-600">A Record</Badge>
              <span className="text-sm font-medium">للنطاق الأساسي ({currentDomain || 'example.com'})</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center justify-between rounded border bg-white px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Name:</span>
                  <code className="font-bold">@</code>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy('@', 'Name')}
                >
                  {copiedValue === 'Name' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between rounded border bg-white px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Value:</span>
                  <code className="font-bold">{VERCEL_IP}</code>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(VERCEL_IP, 'A Record IP')}
                >
                  {copiedValue === 'A Record IP' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* CNAME Record for www */}
          <div className="rounded-lg border bg-blue-50/50 px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-blue-600">CNAME Record</Badge>
              <span className="text-sm font-medium">للـ www (www.{currentDomain || 'example.com'})</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center justify-between rounded border bg-white px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Name:</span>
                  <code className="font-bold">www</code>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy('www', 'www Name')}
                >
                  {copiedValue === 'www Name' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between rounded border bg-white px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Value:</span>
                  <code className="font-bold">{VERCEL_CNAME}</code>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(VERCEL_CNAME, 'CNAME Value')}
                >
                  {copiedValue === 'CNAME Value' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Provider-specific instructions */}
          <Alert className="border-blue-200 bg-blue-50 text-blue-900">
            <AlertTitle className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              تعليمات حسب مزود النطاق
            </AlertTitle>
            <AlertDescription className="space-y-3 text-sm">
              <div className="rounded bg-white/50 p-3">
                <p className="font-semibold mb-1">GoDaddy:</p>
                <ol className="list-decimal pr-5 space-y-1">
                  <li>اذهب إلى My Products → DNS</li>
                  <li>اضغط "Add" لإضافة سجل جديد</li>
                  <li>اختر Type: A، واكتب @ في Name، وألصق {VERCEL_IP} في Value</li>
                  <li>اضغط "Add" مرة أخرى واختر CNAME</li>
                  <li>اكتب www في Name، وألصق {VERCEL_CNAME} في Value</li>
                  <li>اضغط Save</li>
                </ol>
              </div>

              <div className="rounded bg-white/50 p-3">
                <p className="font-semibold mb-1">Namecheap:</p>
                <ol className="list-decimal pr-5 space-y-1">
                  <li>Domain List → Manage → Advanced DNS</li>
                  <li>أضف A Record: Host = @, Value = {VERCEL_IP}</li>
                  <li>أضف CNAME: Host = www, Value = {VERCEL_CNAME}</li>
                </ol>
              </div>

              <div className="rounded bg-white/50 p-3">
                <p className="font-semibold mb-1">Cloudflare:</p>
                <ol className="list-decimal pr-5 space-y-1">
                  <li>DNS → Records → Add Record</li>
                  <li>A Record: Name = @, IPv4 = {VERCEL_IP}, Proxy = OFF (DNS Only)</li>
                  <li>CNAME: Name = www, Target = {VERCEL_CNAME}, Proxy = OFF</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>

          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">مهم: أوقف Proxy في Cloudflare</AlertTitle>
            <AlertDescription className="text-amber-700 text-sm">
              إذا كنت تستخدم Cloudflare، تأكد من إيقاف Proxy (السحابة البرتقالية) وجعلها رمادية (DNS Only).
              هذا ضروري ليعمل SSL بشكل صحيح.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Step 3: Verify Status */}
      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>٣. تحقق من الحالة</CardTitle>
          <CardDescription>بعد إضافة سجلات DNS، انتظر من 5 دقائق إلى ساعة ثم اضغط "تحقق من الحالة".</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {domainStatus && (
            <div className="grid gap-3 md:grid-cols-2">
              {/* Apex Domain Status */}
              <div className="space-y-2 rounded-lg border px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {domainStatus.apex?.verified ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : domainStatus.apex?.misconfigured ? (
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-500" />
                  )}
                  <span>{currentDomain}</span>
                  {statusBadge(domainStatus.apex?.verified ? 'active' : domainStatus.apex?.misconfigured ? 'misconfigured' : 'pending')}
                </div>
                <div className="text-xs text-muted-foreground">
                  <span>التكوين: </span>
                  <span className="font-medium">
                    {domainStatus.apex?.configuredBy === 'A' ? 'A Record ✓' :
                     domainStatus.apex?.configuredBy === 'CNAME' ? 'CNAME' :
                     'غير مكتشف'}
                  </span>
                </div>
                {domainStatus.apex?.conflicts && domainStatus.apex.conflicts.length > 0 && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTitle>تعارض في DNS</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pr-4 text-xs">
                        {domainStatus.apex.conflicts.map((conflict, i) => (
                          <li key={i}>{conflict.reason}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* WWW Domain Status */}
              <div className="space-y-2 rounded-lg border px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {domainStatus.www?.verified ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : domainStatus.www?.misconfigured ? (
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-500" />
                  )}
                  <span>www.{currentDomain}</span>
                  {statusBadge(domainStatus.www?.verified ? 'active' : domainStatus.www?.misconfigured ? 'misconfigured' : 'pending')}
                </div>
                <div className="text-xs text-muted-foreground">
                  <span>التكوين: </span>
                  <span className="font-medium">
                    {domainStatus.www?.configuredBy === 'CNAME' ? 'CNAME ✓' :
                     domainStatus.www?.configuredBy === 'A' ? 'A Record' :
                     'غير مكتشف'}
                  </span>
                </div>
                {domainStatus.www?.conflicts && domainStatus.www.conflicts.length > 0 && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTitle>تعارض في DNS</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pr-4 text-xs">
                        {domainStatus.www.conflicts.map((conflict, i) => (
                          <li key={i}>{conflict.reason}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {!domainStatus && currentDomain && (
            <Alert>
              <AlertTitle>انتظر اكتمال التكوين</AlertTitle>
              <AlertDescription>
                اضغط "تحقق من الحالة" بعد إضافة سجلات DNS. قد يستغرق انتشار التحديث من 5 دقائق إلى ساعة.
              </AlertDescription>
            </Alert>
          )}

          {currentState === 'active' && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-emerald-800">النطاق جاهز!</AlertTitle>
              <AlertDescription className="text-emerald-700 text-sm">
                متجرك يعمل الآن على{' '}
                <a
                  href={`https://${currentDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  {currentDomain}
                </a>
                {' '}و{' '}
                <a
                  href={`https://www.${currentDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  www.{currentDomain}
                </a>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Resources */}
      <Card className="border border-border/70 bg-muted/40">
        <CardHeader>
          <CardTitle>موارد إضافية</CardTitle>
          <CardDescription>تعليمات ودروس تساعدك على إنهاء الربط بدون أخطاء.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <a
            className="flex items-center gap-2 text-primary hover:underline"
            href="https://vercel.com/docs/projects/domains/add-a-domain"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
            دليل Vercel الرسمي للنطاقات المخصصة
          </a>
          <a
            className="flex items-center gap-2 text-primary hover:underline"
            href="https://vercel.com/docs/projects/domains/troubleshooting"
            target="_blank"
            rel="noopener noreferrer"
          >
            <BookOpen className="h-4 w-4" />
            استكشاف مشاكل DNS وإصلاحها
          </a>
        </CardContent>
      </Card>
    </div>
  );
};

export default DomainSettings;
