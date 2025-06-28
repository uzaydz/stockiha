import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { getSupabaseClient } from '@/lib/supabase';
import { INTERMEDIATE_DOMAIN } from '@/lib/api/domain-verification';
import { generateCustomDomainDnsInstructions } from '@/api/domain-verification-api';
import { linkDomain } from '@/api/link-domain-direct';
import { checkDomainStatus } from '@/api/check-domain-status-direct';
import { removeDomain } from '@/api/remove-domain-direct';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';

interface DomainSettingsCardProps {
  organizationId: string;
  currentDomain?: string | null;
  verificationStatus?: string;
  verificationData?: Record<string, any> | null;
  lastChecked?: string | null;
  verificationMessage?: string | null;
  isAdmin: boolean;
  onDomainUpdate?: (domain: string | null) => void;
}

const Icons = {
  spinner: Loader2
};

export function DomainSettingsCard({
  organizationId,
  currentDomain,
  verificationStatus = 'pending',
  verificationData,
  lastChecked,
  verificationMessage,
  isAdmin,
  onDomainUpdate
}: DomainSettingsCardProps) {
  const [domain, setDomain] = useState<string>(currentDomain || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  // توليد تعليمات DNS مباشرة من النطاق
  const dnsInstructions = domain ? generateCustomDomainDnsInstructions(domain) : [];

  // إضافة نطاق مخصص
  const addDomainMutation = useMutation({
    mutationFn: async (newDomain: string) => {
      setLoading(true);
      setError(null);

      try {
        // 1. التحقق من تنسيق النطاق
        if (!isValidDomain(newDomain)) {
          throw new Error('يرجى إدخال نطاق صالح (مثل example.com)');
        }

        // 2. التحقق من توفر النطاق
        const { data: existingDomains, error: checkError } = await supabase
          .from('organizations')
          .select('id, domain')
          .eq('domain', newDomain);

        if (checkError) throw checkError;

        if (existingDomains && existingDomains.length > 0 && existingDomains[0].id !== organizationId) {
          throw new Error('هذا النطاق قيد الاستخدام بالفعل من قبل مؤسسة أخرى');
        }

        // حذف أي تخزين مؤقت قبل إضافة النطاق
        clearCaches(organizationId);

        // 3. استدعاء API مباشر لربط النطاق
        const linkResult = await linkDomain(newDomain, organizationId);

        if (!linkResult.success) {
          throw new Error(linkResult.error || 'فشل في ربط النطاق');
        }

        // تحديث حالة النطاق في المكون محلياً
        setDomain(linkResult.data.domain);
        
        // 4. استدعاء onDomainUpdate إذا كان موجودًا
        if (onDomainUpdate) {
          onDomainUpdate(linkResult.data.domain);
        }

        // المزيد من تنظيف التخزين المؤقت بعد إضافة النطاق
        clearCaches(organizationId);

        // ضرورة إعادة تحميل المؤسسة لضمان عرض النطاق المحدّث
        setTimeout(() => {
          // حذف المزيد من التخزين المؤقت قبل التحديث
          Object.keys(localStorage).forEach(key => {
            if (key.includes('organization') || key.includes('tenant') || key.includes('domain')) {
              localStorage.removeItem(key);
            }
          });
          
          // إضافة معلمة عشوائية لمنع التخزين المؤقت للمتصفح
          window.location.href = `${window.location.pathname}?cache=${Date.now()}`;
        }, 1000);

        // تحديد الرسالة بناءً على الاستجابة من الـ API
        const successMessage = linkResult.data?.message?.includes('بالفعل')
          ? 'النطاق كان مرتبطًا بالفعل! يرجى التحقق من إعدادات DNS الخاصة بك.'
          : 'تم ربط النطاق بنجاح! يرجى إعداد سجلات DNS الخاصة بك.';

        // إذا كان هناك خطأ CSP، نعرض تعليمات إضافية
        if (linkResult.data?.cspError && linkResult.data?.instructions) {
          toast.success(linkResult.data.message);
          
          // عرض dialog مع التعليمات التفصيلية
          setTimeout(() => {
            const instructionsText = linkResult.data.instructions.join('\n');
            if (window.confirm(`${linkResult.data.message}\n\n${instructionsText}\n\nهل تريد فتح لوحة تحكم Vercel الآن؟`)) {
              window.open('https://vercel.com/dashboard', '_blank');
            }
          }, 1000);
        } else {
          toast.success(successMessage);
        }
        return linkResult.data.domain;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء إضافة النطاق';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    }
  });

  // وظيفة مساعدة لمسح التخزين المؤقت
  const clearCaches = (orgId: string) => {
    // مسح أي تخزين مؤقت للمؤسسة
    if (orgId) {
      localStorage.removeItem(`organization:${orgId}`);
      
      // مسح التخزين المؤقت المتعلق بالنطاق والمستأجر
      Object.keys(localStorage).forEach(key => {
        if (key.includes(orgId) || key.includes('tenant:') || key.includes('domain:')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    // إلغاء تخزين الاستعلامات المؤقتة بشكل محدود - فقط إذا لم تكن قيد التنفيذ
    const currentQueries = queryClient.getQueriesData({ queryKey: ['organization'] });
    if (currentQueries.length === 0 || !queryClient.isFetching({ queryKey: ['organization'] })) {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    }
    
    // تجنب إبطال استعلامات النطاق إذا كانت قيد التنفيذ
    if (!queryClient.isFetching({ queryKey: ['domain'] })) {
      queryClient.invalidateQueries({ queryKey: ['domain'] });
    }
  };

  // التحقق من حالة النطاق
  const verifyDomainMutation = useMutation({
    mutationFn: async () => {
      if (!currentDomain) return null;
      
      setVerifying(true);
      try {
        // حذف التخزين المؤقت قبل التحقق
        clearCaches(organizationId);
        
        // استدعاء API مباشر للتحقق من حالة النطاق
        const result = await checkDomainStatus(currentDomain, organizationId);
        
        if (!result.success) {
          throw new Error(result.error || 'فشل في التحقق من حالة النطاق');
        }
        
        // تحديث ذاكرة التخزين المؤقت للاستعلام
        queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
        
        if (result.data.verified) {
          toast.success('تم التحقق من النطاق بنجاح!');
        } else {
          toast.info(`حالة النطاق: ${result.data.message || 'قيد التحقق'}`);
        }
        
        return result.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء التحقق من النطاق';
        toast.error(errorMessage);
        throw err;
      } finally {
        setVerifying(false);
      }
    }
  });

  // حذف النطاق
  const removeDomainMutation = useMutation({
    mutationFn: async () => {
      if (!currentDomain) return null;
      
      try {
        // إظهار تأكيد حذف النطاق
        const confirmed = window.confirm('هل أنت متأكد من أنك تريد حذف النطاق المخصص؟ سيصبح متجرك متاحًا فقط على النطاق الفرعي الافتراضي.');
        if (!confirmed) {
          return null;
        }

        // استدعاء API مباشر لإزالة النطاق
        const result = await removeDomain(currentDomain, organizationId);

        if (!result.success) {
          throw new Error(result.error || 'فشل في إزالة النطاق');
        }

        // إعادة تعيين النطاق المحلي أولاً
        setDomain('');
        
        // استدعاء onDomainUpdate إذا كان موجودًا
        if (onDomainUpdate) {
          onDomainUpdate(null);
        }

        // حذف التخزين المؤقت بعد العملية الناجحة فقط
        if (organizationId) {
          localStorage.removeItem(`organization:${organizationId}`);
          
          // مسح التخزين المؤقت المتعلق بالنطاق والمستأجر
          Object.keys(localStorage).forEach(key => {
            if (key.includes(organizationId) || key.includes('tenant:') || key.includes('domain:')) {
              localStorage.removeItem(key);
            }
          });
        }
        
        // إلغاء تخزين الاستعلامات المؤقتة بشكل محدود
        queryClient.removeQueries({ queryKey: ['organization'] });
        queryClient.removeQueries({ queryKey: ['domain'] });
        
        toast.success('تم إزالة النطاق بنجاح');
        
        // إعادة تحميل الصفحة بعد فترة قصيرة فقط إذا لم يتم استدعاء onDomainUpdate
        if (!onDomainUpdate) {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
        
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء إزالة النطاق';
        toast.error(errorMessage);
        throw err;
      }
    }
  });

  // تحديث حالة النطاق عند تحميل المكون
  useEffect(() => {
    setDomain(currentDomain || '');
  }, [currentDomain]);

  // التحقق من صحة تنسيق النطاق
  const isValidDomain = (domain: string): boolean => {
    const domainRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,}$/;
    return domainRegex.test(domain);
  };

  // تحويل حالة التحقق إلى بطاقة حالة
  const getStatusBadge = () => {
    switch (verificationStatus) {
      case 'active':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle size={14} />
            <span>مفعّل</span>
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle size={14} />
            <span>خطأ</span>
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <RefreshCw size={14} />
            <span>قيد التحقق</span>
          </Badge>
        );
    }
  };

  // حساب وقت آخر تحقق
  const getLastCheckedTime = () => {
    if (!lastChecked) return 'لم يتم التحقق بعد';
    
    try {
      const checkedDate = new Date(lastChecked);
      const now = new Date();
      const diffMs = now.getTime() - checkedDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'منذ لحظات';
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `منذ ${diffDays} يوم`;
    } catch (e) {
      return 'تاريخ غير صالح';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>النطاق المخصص</CardTitle>
        <CardDescription>
          ربط نطاقك المخصص بمتجرك الإلكتروني
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* إذا كان لديه نطاق مخصص بالفعل، نعرض معلوماته */}
        {currentDomain ? (
          <>
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{currentDomain}</h3>
                    {getStatusBadge()}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {verificationMessage || 'النطاق المخصص الخاص بمتجرك'}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://${currentDomain}`, '_blank')}
                        >
                          <ExternalLink size={16} className="mr-1" />
                          <span>فتح المتجر</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>معاينة المتجر بالنطاق المخصص</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => verifyDomainMutation.mutate()}
                    disabled={verifying}
                  >
                    {verifying ? (
                      <>
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        جاري التحقق...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} className="mr-1" />
                        <span>تحديث الحالة</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <span>آخر تحديث: </span>
                <span>{getLastCheckedTime()}</span>
              </div>

              {/* في حالة وجود خطأ في تكوين النطاق، نعرض تحذيرًا */}
              {(verificationStatus === 'error' || verificationStatus === 'pending') && (
                <Alert variant={verificationStatus === 'error' ? 'destructive' : 'default'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {verificationStatus === 'error'
                      ? (verificationMessage || 'هناك مشكلة في تكوين النطاق. يرجى مراجعة إعدادات DNS الخاصة بك.')
                      : 'النطاق قيد التحقق. قد يستغرق هذا حتى 24 ساعة، لكن عادة يتم في غضون دقائق.'}
                  </AlertDescription>
                </Alert>
              )}

              {/* جدول تعليمات DNS */}
              <div className="mt-6">
                <h3 className="text-base font-medium mb-2">سجلات DNS المطلوبة:</h3>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>النوع</TableHead>
                        <TableHead>المضيف</TableHead>
                        <TableHead>القيمة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dnsInstructions.map((instruction, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{instruction.type}</TableCell>
                          <TableCell>{instruction.name}</TableCell>
                          <TableCell>{instruction.value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* حذف النطاق */}
              <div className="mt-6 border-t pt-4">
                <h3 className="text-base font-medium mb-2">حذف النطاق المخصص</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  سيؤدي هذا إلى إزالة النطاق المخصص من متجرك، وسيصبح متجرك متاحًا فقط على النطاق الفرعي الافتراضي.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    // منع الضغط المتكرر
                    if (removeDomainMutation.isPending) {
                      return;
                    }
                    removeDomainMutation.mutate();
                  }}
                  disabled={removeDomainMutation.isPending}
                >
                  {removeDomainMutation.isPending ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      جاري الحذف...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} className="mr-1" />
                      <span>حذف النطاق</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          // إذا لم يكن لديه نطاق مخصص، نعرض نموذج إضافة النطاق
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  disabled={loading || !isAdmin}
                  id="domain-input"
                />
                <p className="text-xs text-muted-foreground">
                  أدخل اسم النطاق بدون http:// أو www.
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={() => addDomainMutation.mutate(domain)}
                disabled={loading || !domain || !isAdmin}
              >
                {loading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    جاري الإضافة...
                  </>
                ) : (
                  'إضافة النطاق'
                )}
              </Button>
            </div>

            <div className="mt-6">
              <h3 className="text-base font-medium mb-2">قبل إضافة النطاق المخصص:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                <li>تأكد من امتلاكك للنطاق وأنه مسجل لديك.</li>
                <li>تأكد من أن النطاق فعال ويمكن الوصول إليه.</li>
                <li>ستحتاج إلى إضافة سجلات DNS بعد ربط النطاق.</li>
                <li>قد يستغرق تفعيل النطاق بالكامل حتى 24 ساعة.</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
