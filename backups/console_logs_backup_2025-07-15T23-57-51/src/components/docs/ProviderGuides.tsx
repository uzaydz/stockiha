import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  AlertTriangle,
  Monitor,
  Clock,
  Globe,
  Shield
} from 'lucide-react';

interface DNSRecord {
  type: string;
  name: string;
  value: string;
  ttl: string;
  priority?: string;
}

interface ProviderStep {
  step: number;
  title: string;
  description: string;
  image?: string;
  code?: string;
  warning?: string;
}

const ProviderGuides: React.FC = () => {
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);

  const dnsRecords: DNSRecord[] = [
    {
      type: 'A',
      name: '@',
      value: '76.76.21.21',
      ttl: '3600'
    },
    {
      type: 'CNAME',
      name: 'www',
      value: 'connect.ktobi.online',
      ttl: '3600'
    }
  ];

  const copyToClipboard = (text: string, recordType: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRecord(recordType);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  const godaddySteps: ProviderStep[] = [
    {
      step: 1,
      title: 'تسجيل الدخول إلى GoDaddy',
      description: 'سجل دخول إلى حسابك في GoDaddy وانتقل إلى قسم "My Products"'
    },
    {
      step: 2,
      title: 'الوصول إلى إدارة DNS',
      description: 'اعثر على نطاقك وانقر على "DNS" أو "Manage DNS"'
    },
    {
      step: 3,
      title: 'إضافة سجل A',
      description: 'انقر على "Add" واختر نوع السجل "A"',
      code: `النوع: A
الاسم: @
القيمة: 76.76.21.21
TTL: 1 Hour (3600)`
    },
    {
      step: 4,
      title: 'إضافة سجل CNAME',
      description: 'أضف سجل CNAME جديد للـ www',
      code: `النوع: CNAME
الاسم: www
يشير إلى: connect.ktobi.online
TTL: 1 Hour (3600)`
    },
    {
      step: 5,
      title: 'حفظ التغييرات',
      description: 'انقر على "Save" لحفظ جميع التغييرات',
      warning: 'قد يستغرق انتشار التغييرات حتى 48 ساعة'
    }
  ];

  const namecheapSteps: ProviderStep[] = [
    {
      step: 1,
      title: 'تسجيل الدخول إلى Namecheap',
      description: 'سجل دخول إلى حسابك وانتقل إلى "Domain List"'
    },
    {
      step: 2,
      title: 'إدارة النطاق',
      description: 'انقر على "Manage" بجانب النطاق المطلوب'
    },
    {
      step: 3,
      title: 'الوصول إلى Advanced DNS',
      description: 'انقر على تبويب "Advanced DNS"'
    },
    {
      step: 4,
      title: 'إضافة سجل A',
      description: 'انقر على "Add New Record" واختر "A Record"',
      code: `Type: A Record
Host: @
Value: 76.76.21.21
TTL: Automatic`
    },
    {
      step: 5,
      title: 'إضافة سجل CNAME',
      description: 'أضف سجل CNAME للـ www',
      code: `Type: CNAME Record
Host: www
Value: connect.ktobi.online
TTL: Automatic`
    },
    {
      step: 6,
      title: 'حفظ جميع التغييرات',
      description: 'تأكد من النقر على علامة ✓ لحفظ كل سجل',
      warning: 'تأكد من حذف أي سجلات A أو CNAME موجودة مسبقاً تتعارض مع الإعدادات الجديدة'
    }
  ];

  const cloudflarSteps: ProviderStep[] = [
    {
      step: 1,
      title: 'تسجيل الدخول إلى Cloudflare',
      description: 'سجل دخول إلى حسابك وحدد النطاق المطلوب'
    },
    {
      step: 2,
      title: 'الوصول إلى DNS Records',
      description: 'انقر على تبويب "DNS" في القائمة الجانبية'
    },
    {
      step: 3,
      title: 'إضافة سجل A',
      description: 'انقر على "Add record" واختر نوع "A"',
      code: `Type: A
Name: @
IPv4 address: 76.76.21.21
Proxy status: DNS only (gray cloud)
TTL: Auto`
    },
    {
      step: 4,
      title: 'إضافة سجل CNAME',
      description: 'أضف سجل CNAME للـ www',
      code: `Type: CNAME
Name: www
Target: connect.ktobi.online
Proxy status: DNS only (gray cloud)
TTL: Auto`
    },
    {
      step: 5,
      title: 'تعطيل Proxy',
      description: 'تأكد من أن السحابة رمادية (DNS only) وليست برتقالية',
      warning: 'السحابة البرتقالية (Proxied) ستمنع النطاق من العمل بشكل صحيح'
    }
  ];

  const renderSteps = (steps: ProviderStep[]) => (
    <div className="space-y-4">
      {steps.map((step) => (
        <Card key={step.step} className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                {step.step}
              </span>
              {step.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{step.description}</p>
            
            {step.code && (
              <div className="bg-muted/50 p-3 rounded-lg border border-border">
                <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                  {step.code}
                </pre>
              </div>
            )}
            
            {step.warning && (
              <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <AlertTitle className="text-amber-700 dark:text-amber-300 text-sm">تحذير</AlertTitle>
                <AlertDescription className="text-amber-600 dark:text-amber-400 text-sm">
                  {step.warning}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">دليل مزودي النطاقات</h2>
        <p className="text-muted-foreground">إرشادات مفصلة لكل مزود نطاق</p>
      </div>

      {/* سجلات DNS المطلوبة */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-lg text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            سجلات DNS المطلوبة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dnsRecords.map((record, index) => (
              <div key={index} className="bg-white dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="grid grid-cols-4 gap-4 flex-1">
                    <div>
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400">النوع</p>
                      <p className="font-mono text-sm font-bold text-foreground">{record.type}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400">الاسم</p>
                      <p className="font-mono text-sm text-foreground">{record.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400">القيمة</p>
                      <p className="font-mono text-sm text-foreground">{record.value}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400">TTL</p>
                      <p className="font-mono text-sm text-foreground">{record.ttl}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(record.value, record.type)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                    title="نسخ القيمة"
                  >
                    {copiedRecord === record.type ? 
                      <CheckCircle className="w-4 h-4" /> : 
                      <Copy className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* دليل المزودين */}
      <Tabs defaultValue="godaddy" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="godaddy" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            GoDaddy
          </TabsTrigger>
          <TabsTrigger value="namecheap" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Namecheap
          </TabsTrigger>
          <TabsTrigger value="cloudflare" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Cloudflare
          </TabsTrigger>
        </TabsList>

        <TabsContent value="godaddy" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                إعداد DNS في GoDaddy
                <Badge variant="secondary">الأكثر شيوعاً</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderSteps(godaddySteps)}
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    وقت الانتشار المتوقع: 1-6 ساعات
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="namecheap" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                إعداد DNS في Namecheap
                <Badge variant="secondary">مُوصى به</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderSteps(namecheapSteps)}
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    وقت الانتشار المتوقع: 30 دقيقة - 2 ساعة
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cloudflare" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                إعداد DNS في Cloudflare
                <Badge variant="secondary">الأسرع</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderSteps(cloudflarSteps)}
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    وقت الانتشار المتوقع: 2-10 دقائق
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* روابط مفيدة */}
      <Card className="bg-muted/30 border-border">
        <CardHeader>
          <CardTitle className="text-base">روابط مفيدة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <a 
              href="https://dcc.godaddy.com/control" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Monitor className="w-4 h-4" />
              <span className="text-sm">لوحة تحكم GoDaddy</span>
              <ExternalLink className="w-3 h-3 ml-auto" />
            </a>
            <a 
              href="https://ap.www.namecheap.com/domains/list" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span className="text-sm">لوحة تحكم Namecheap</span>
              <ExternalLink className="w-3 h-3 ml-auto" />
            </a>
            <a 
              href="https://dash.cloudflare.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm">لوحة تحكم Cloudflare</span>
              <ExternalLink className="w-3 h-3 ml-auto" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProviderGuides;
