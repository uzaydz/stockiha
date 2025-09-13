import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  ExternalLink, 
  RefreshCw,
  Globe,
  Shield,
  Zap,
  Clock,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/context/TenantContext';
import { 
  getStockihaNameservers,
  checkDomainDelegation,
  autoSetupDomain,
  checkCustomHostnameStatus,
  type DomainDelegationStatus,
  type CloudflareNameservers
} from '@/api/cloudflare-saas-api';

interface NameserverDomainSettingsProps {
  organizationId: string;
  currentDomain?: string | null;
  onDomainUpdate?: (domain: string | null) => void;
}

const NameserverDomainSettings: React.FC<NameserverDomainSettingsProps> = ({
  organizationId,
  currentDomain,
  onDomainUpdate
}) => {
  const { organization, refreshTenant } = useTenant();
  
  // حالات المكون
  const [domain, setDomain] = useState(currentDomain || '');
  const [newDomain, setNewDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [nameservers, setNameservers] = useState<string[]>([]);
  const [delegationStatus, setDelegationStatus] = useState<DomainDelegationStatus | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // تحميل Nameservers عند بدء المكون
  useEffect(() => {
    loadNameservers();
  }, []);

  // التحقق من حالة النطاق عند تغييره
  useEffect(() => {
    if (domain) {
      checkDomainStatus();
    }
  }, [domain]);

  const loadNameservers = async () => {
    try {
      const result = await getStockihaNameservers();
      if (result.success && result.data) {
        setNameservers(result.data.nameservers);
      } else {
        toast.error('فشل في تحميل Nameservers');
      }
    } catch (error) {
      console.error('Error loading nameservers:', error);
      toast.error('حدث خطأ أثناء تحميل Nameservers');
    }
  };

  const checkDomainStatus = async () => {
    if (!domain) return;
    
    setIsChecking(true);
    try {
      
      const status = await checkDomainDelegation(domain);
      setDelegationStatus(status);
      
      
      
      if (status.status === 'active') {
        toast.success('🎉 تم تكوين النطاق بنجاح! النطاق يعمل الآن.');
        
        // إضافة النطاق إلى Custom Hostnames تلقائياً
        try {
          
          const setupResult = await autoSetupDomain(domain, organizationId);
          if (setupResult.success) {
            toast.success('✅ تم إضافة النطاق إلى Custom Hostnames بنجاح!');
            await refreshTenant();
          } else {
            console.warn('⚠️ فشل في إضافة Custom Hostname:', setupResult.error);
            toast.warning('⚠️ النطاق يعمل لكن لم يتم إضافته لـ Custom Hostnames. استخدم زر "الإعداد التلقائي".');
          }
        } catch (error) {
          console.error('❌ خطأ في إضافة Custom Hostname:', error);
        }
        
      } else if (status.status === 'pending') {
        // تحقق إضافي من nameservers المحددة
        if (status.nameservers_configured) {
          toast.info('⏳ Nameservers محدثة بشكل صحيح، انتظر انتشار DNS (15 دقيقة - 48 ساعة)');
          
          // إضافة النطاق إلى Custom Hostnames حتى لو كان pending
          try {
            
            const setupResult = await autoSetupDomain(domain, organizationId);
            if (setupResult.success) {
              toast.success('✅ تم إضافة النطاق إلى Custom Hostnames! سيعمل عند انتشار DNS.');
              await refreshTenant();
            } else {
              console.warn('⚠️ فشل في إضافة Custom Hostname:', setupResult.error);
            }
          } catch (error) {
            console.error('❌ خطأ في إضافة Custom Hostname:', error);
          }
        } else {
          toast.warning('⚠️ يرجى تحديث Nameservers إلى: marty.ns.cloudflare.com و sue.ns.cloudflare.com');
        }
      } else if (status.status === 'error') {
        toast.error('❌ خطأ في تكوين النطاق: ' + (status.verification_errors?.join(', ') || 'خطأ غير محدد'));
      }
    } catch (error) {
      console.error('❌ Error checking domain status:', error);
      toast.error('حدث خطأ أثناء فحص حالة النطاق. جرب مرة أخرى.');
    } finally {
      setIsChecking(false);
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) {
      toast.error('يرجى إدخال النطاق');
      return;
    }

    // التحقق من صحة النطاق
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(([a-zA-Z]{2,})|(xn--[a-zA-Z0-9]+))$/;
    if (!domainRegex.test(newDomain)) {
      toast.error('يرجى إدخال نطاق صالح');
      return;
    }

    setIsLoading(true);
    try {
      // إضافة النطاق للنظام
      setDomain(newDomain);
      setNewDomain('');
      
      // التحقق من حالة النطاق
      await checkDomainStatus();
      
      // تحديث بيانات المؤسسة
      if (onDomainUpdate) {
        onDomainUpdate(newDomain);
      }
      
      toast.success('تم إضافة النطاق بنجاح');
    } catch (error) {
      console.error('Error adding domain:', error);
      toast.error('فشل في إضافة النطاق');
    } finally {
      setIsLoading(false);
    }
  };

  const setupDomainAutomatically = async () => {
    if (!domain) return;

    setIsLoading(true);
    try {
      const result = await autoSetupDomain(domain, organizationId);
      
      if (result.success) {
        toast.success('تم إعداد النطاق تلقائياً بنجاح!');
        await checkDomainStatus();
        await refreshTenant();
      } else {
        toast.error(result.error || 'فشل في الإعداد التلقائي للنطاق');
      }
    } catch (error) {
      console.error('Error setting up domain:', error);
      toast.error('حدث خطأ أثناء الإعداد التلقائي');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    toast.success(`تم نسخ ${label}`);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const getDomainStatusBadge = () => {
    if (!delegationStatus) return null;

    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'في انتظار التكوين' },
      active: { color: 'bg-green-100 text-green-800', label: 'نشط ومُكوّن' },
      error: { color: 'bg-red-100 text-red-800', label: 'خطأ في التكوين' }
    };

    const config = statusConfig[delegationStatus.status];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getDomainStatusIcon = () => {
    if (isChecking) return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    if (!delegationStatus) return <Globe className="w-5 h-5 text-gray-400" />;

    switch (delegationStatus.status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Globe className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* بطاقة معلومات النظام الجديد */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Zap className="w-5 h-5" />
            نظام Nameserver الجديد - أوتوماتيكي بالكامل
          </CardTitle>
          <CardDescription className="text-blue-700">
            تقنية متقدمة تجعل إعداد النطاق المخصص أسهل وأسرع من أي وقت مضى
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h4 className="font-semibold text-sm">SSL تلقائي</h4>
                <p className="text-xs text-gray-600">شهادات أمان فورية</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-green-600" />
              <div>
                <h4 className="font-semibold text-sm">إعداد فوري</h4>
                <p className="text-xs text-gray-600">بدون تعقيدات DNS</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-purple-600" />
              <div>
                <h4 className="font-semibold text-sm">دعم شامل</h4>
                <p className="text-xs text-gray-600">www + النطاق الجذري</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="setup">إعداد النطاق</TabsTrigger>
          <TabsTrigger value="status">حالة النطاق</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          {/* إضافة نطاق جديد */}
          {!domain && (
            <Card>
              <CardHeader>
                <CardTitle>إضافة نطاق مخصص</CardTitle>
                <CardDescription>
                  أدخل النطاق الذي تريد استخدامه لمتجرك (مثل: mystore.com)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="mystore.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value.toLowerCase().trim())}
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={addDomain}
                    disabled={isLoading || !newDomain.trim()}
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                    إضافة النطاق
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* عرض النطاق الحالي والـ Nameservers */}
          {domain && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getDomainStatusIcon()}
                  النطاق المخصص: {domain}
                  {getDomainStatusBadge()}
                </CardTitle>
                <CardDescription>
                  قم بتكوين الـ Nameservers في مزود النطاق الخاص بك
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Nameservers */}
                <div>
                  <h4 className="font-semibold mb-3">الخطوة 1: غيّر الـ Nameservers</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    اذهب إلى مزود النطاق الخاص بك (GoDaddy، Namecheap، إلخ) وغيّر الـ Nameservers إلى:
                  </p>
                  <div className="space-y-2">
                    {nameservers.map((ns, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">NS</Badge>
                          <code className="font-mono text-sm">{ns}</code>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(ns, `Nameserver ${index + 1}`)}
                        >
                          {copiedItem === `Nameserver ${index + 1}` ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* تعليمات مزودي النطاق */}
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertTitle>تعليمات سريعة</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2 mt-2">
                      <p><strong>GoDaddy:</strong> My Products → DNS → Nameservers → Change</p>
                      <p><strong>Namecheap:</strong> Domain List → Manage → Nameservers → Custom DNS</p>
                      <p><strong>Cloudflare:</strong> لا تحتاج تغيير - النطاق موجود بالفعل في Cloudflare</p>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* أزرار الإجراءات */}
                <div className="flex gap-2">
                  <Button 
                    onClick={checkDomainStatus}
                    variant="outline"
                    disabled={isChecking}
                  >
                    {isChecking && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                    <RefreshCw className="w-4 h-4 ml-2" />
                    تحقق من الحالة
                  </Button>
                  
                  {delegationStatus?.nameservers_configured && (
                    <Button 
                      onClick={setupDomainAutomatically}
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                      <Zap className="w-4 h-4 ml-2" />
                      إعداد تلقائي
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          {domain ? (
            <Card>
              <CardHeader>
                <CardTitle>حالة النطاق: {domain}</CardTitle>
                <CardDescription>
                  معلومات مفصلة حول حالة النطاق المخصص
                </CardDescription>
              </CardHeader>
              <CardContent>
                {delegationStatus ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-sm text-gray-600">حالة النطاق</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {getDomainStatusIcon()}
                          {getDomainStatusBadge()}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-600">Nameservers</h4>
                        <p className="text-sm mt-1">
                          {delegationStatus.nameservers_configured ? (
                            <span className="text-green-600">✅ مُكوّنة بشكل صحيح</span>
                          ) : (
                            <span className="text-red-600">❌ غير مُكوّنة</span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    {delegationStatus.ssl_status && (
                      <div>
                        <h4 className="font-semibold text-sm text-gray-600">حالة SSL</h4>
                        <Badge className={
                          delegationStatus.ssl_status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }>
                          {delegationStatus.ssl_status === 'active' ? 'نشط' : 'قيد الإعداد'}
                        </Badge>
                      </div>
                    )}
                    
                    {delegationStatus.verification_errors && delegationStatus.verification_errors.length > 0 && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <AlertTitle className="text-red-800">أخطاء التحقق</AlertTitle>
                        <AlertDescription className="text-red-700">
                          <ul className="list-disc list-inside space-y-1">
                            {delegationStatus.verification_errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      آخر فحص: {delegationStatus.last_checked ? new Date(delegationStatus.last_checked).toLocaleString('ar-SA') : 'غير محدد'}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">لا توجد معلومات حالة متاحة</p>
                    <Button 
                      onClick={checkDomainStatus}
                      variant="outline"
                      className="mt-4"
                      disabled={isChecking}
                    >
                      {isChecking && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                      تحقق من الحالة
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">لا يوجد نطاق مخصص</h3>
                <p className="text-gray-600 mb-4">قم بإضافة نطاق مخصص أولاً لمشاهدة حالته</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NameserverDomainSettings;
