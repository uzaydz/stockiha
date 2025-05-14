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

        // 3. استدعاء API مباشر لربط النطاق
        const linkResult = await linkDomain(newDomain, organizationId);

        if (!linkResult.success) {
          throw new Error(linkResult.error || 'فشل في ربط النطاق');
        }

        // 4. استدعاء onDomainUpdate إذا كان موجودًا
        if (onDomainUpdate) {
          onDomainUpdate(newDomain);
        }

        // تحديد الرسالة بناءً على الاستجابة من الـ API
        const successMessage = linkResult.data?.message?.includes('بالفعل')
          ? 'النطاق كان مرتبطًا بالفعل! يرجى التحقق من إعدادات DNS الخاصة بك.'
          : 'تم ربط النطاق بنجاح! يرجى إعداد سجلات DNS الخاصة بك.';

        toast.success(successMessage);
        return newDomain;
      } catch (err) {
        console.error('خطأ في إضافة النطاق:', err);
        const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء إضافة النطاق';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    }
  });

  // التحقق من حالة النطاق
  const verifyDomainMutation = useMutation({
    mutationFn: async () => {
      if (!currentDomain) return null;
      
      setVerifying(true);
      try {
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
        console.error('خطأ في التحقق من النطاق:', err);
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
        // استدعاء API مباشر لإزالة النطاق
        const result = await removeDomain(currentDomain, organizationId);

        if (!result.success) {
          throw new Error(result.error || 'فشل في إزالة النطاق');
        }

        // استدعاء onDomainUpdate إذا كان موجودًا
        if (onDomainUpdate) {
          onDomainUpdate(null);
        }

        // إعادة تعيين النطاق المحلي
        setDomain('');
        
        toast.success('تم إزالة النطاق بنجاح');
        return true;
      } catch (err) {
        console.error('خطأ في إزالة النطاق:', err);
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
          {currentDomain 
            ? 'عرض وإدارة النطاق المخصص الخاص بمنصتك'
            : 'أضف نطاقًا مخصصًا لمنصتك لتوفير تجربة متكاملة للمستخدمين'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {currentDomain ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{currentDomain}</span>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => verifyDomainMutation.mutate()}
                  disabled={verifying}
                >
                  {verifying ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      جارٍ التحقق...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      تحديث الحالة
                    </>
                  )}
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          if (window.confirm('هل أنت متأكد من رغبتك في إزالة هذا النطاق؟')) {
                            removeDomainMutation.mutate();
                          }
                        }}
                        disabled={removeDomainMutation.isPending}
                      >
                        {removeDomainMutation.isPending ? (
                          <Icons.spinner className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>إزالة النطاق</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {verificationMessage && verificationStatus !== 'active' && (
              <Alert variant="default" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {verificationMessage}
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground">
              آخر تحقق: {getLastCheckedTime()}
            </div>

            {verificationStatus !== 'active' && (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-medium">تكوين سجلات DNS</h4>
                <p className="mb-4 text-sm text-muted-foreground">
                  أضف سجلات DNS التالية إلى مزود النطاق الخاص بك لإكمال تكوين النطاق المخصص:
                </p>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>النوع</TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead>القيمة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dnsInstructions.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{record.type}</TableCell>
                        <TableCell>{record.name}</TableCell>
                        <TableCell>{record.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-3 text-xs text-muted-foreground">
                  ملاحظة: قد تستغرق التغييرات في DNS ما يصل إلى 48 ساعة للانتشار.
                </div>
              </div>
            )}

            {verificationStatus === 'active' && (
              <div className="mt-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    النطاق المخصص الخاص بك نشط ويعمل بشكل صحيح.
                  </AlertDescription>
                </Alert>
                <div className="mt-3">
                  <a 
                    href={`https://${currentDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    زيارة الموقع
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="أدخل نطاقك (مثل: example.com)"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={loading || !isAdmin}
                dir="ltr"
                className="text-left"
              />
              <Button 
                onClick={() => addDomainMutation.mutate(domain)} 
                disabled={!domain || loading || !isAdmin}
              >
                {loading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    جارٍ الإضافة...
                  </>
                ) : (
                  'إضافة'
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="rounded-md bg-muted p-4">
              <h4 className="mb-2 text-sm font-medium">استخدام النطاقات المخصصة</h4>
              <p className="text-sm text-muted-foreground">
                النطاق المخصص يتيح لمستخدميك الوصول إلى منصتك من خلال نطاق مخصص خاص بك، بدلاً من استخدام النطاق الافتراضي.
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                مثال: <span className="font-mono">app.yourcompany.com</span> بدلاً من <span className="font-mono">{organizationId}.{INTERMEDIATE_DOMAIN}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      {!currentDomain && (
        <CardFooter className="flex justify-between border-t px-6 py-4">
          <p className="text-xs text-muted-foreground">
            تأكد من أن لديك حق الوصول للتحكم في سجلات DNS للنطاق الذي تضيفه.
          </p>
        </CardFooter>
      )}
    </Card>
  );
} 