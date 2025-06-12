import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle, 
  Check, 
  X,
  RefreshCw,
  Search,
  Clock,
  Globe,
  Shield,
  Settings,
  ExternalLink,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';

interface TroubleshootingIssue {
  id: string;
  title: string;
  description: string;
  category: 'dns' | 'ssl' | 'domain' | 'general';
  severity: 'low' | 'medium' | 'high';
  symptoms: string[];
  causes: string[];
  solutions: Solution[];
  tools?: Tool[];
}

interface Solution {
  step: number;
  action: string;
  description: string;
  warning?: string;
  code?: string;
}

interface Tool {
  name: string;
  url: string;
  description: string;
}

const TroubleshootingGuide: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  const issues: TroubleshootingIssue[] = [
    {
      id: 'dns-not-propagated',
      title: 'سجلات DNS لم تنتشر بعد',
      description: 'النطاق لا يعمل لأن تغييرات DNS لم تنتشر عالمياً',
      category: 'dns',
      severity: 'medium',
      symptoms: [
        'النطاق لا يفتح في المتصفح',
        'رسالة خطأ "موقع غير موجود"',
        'يعمل أحياناً ولا يعمل أحياناً أخرى'
      ],
      causes: [
        'تغييرات DNS حديثة (أقل من 24 ساعة)',
        'مزود خدمة الإنترنت يستخدم cache قديم',
        'إعدادات TTL عالية'
      ],
      solutions: [
        {
          step: 1,
          action: 'فحص سجلات DNS',
          description: 'استخدم أدوات فحص DNS للتحقق من انتشار السجلات',
          code: 'nslookup yourdomain.com\ndig yourdomain.com'
        },
        {
          step: 2,
          action: 'الانتظار',
          description: 'انتظر 24-48 ساعة لانتشار التغييرات بالكامل'
        },
        {
          step: 3,
          action: 'تنظيف cache',
          description: 'امسح cache المتصفح و DNS المحلي',
          code: 'ipconfig /flushdns (Windows)\nsudo dscacheutil -flushcache (Mac)'
        }
      ],
      tools: [
        {
          name: 'DNS Checker',
          url: 'https://dnschecker.org',
          description: 'فحص انتشار DNS عالمياً'
        },
        {
          name: 'What\'s My DNS',
          url: 'https://whatsmydns.net',
          description: 'فحص سجلات DNS من مواقع مختلفة'
        }
      ]
    },
    {
      id: 'ssl-certificate-error',
      title: 'خطأ في شهادة SSL',
      description: 'المتصفح يظهر تحذير أمان أو شهادة غير صحيحة',
      category: 'ssl',
      severity: 'high',
      symptoms: [
        'تحذير "الاتصال غير آمن"',
        'رمز القفل مكسور أو أحمر',
        'خطأ SSL Certificate Error'
      ],
      causes: [
        'شهادة SSL لم يتم إصدارها بعد',
        'النطاق لا يشير للخادم الصحيح',
        'مشكلة في تكوين SSL'
      ],
      solutions: [
        {
          step: 1,
          action: 'التحقق من DNS',
          description: 'تأكد أن النطاق يشير للخادم الصحيح',
          code: 'A Record: 76.76.21.21\nCNAME Record: connect.ktobi.online'
        },
        {
          step: 2,
          action: 'الانتظار',
          description: 'انتظر 10-30 دقيقة لإصدار الشهادة تلقائياً'
        },
        {
          step: 3,
          action: 'إعادة المحاولة',
          description: 'في لوحة التحكم، انقر على "إعادة إصدار الشهادة"'
        }
      ],
      tools: [
        {
          name: 'SSL Labs Test',
          url: 'https://ssllabs.com/ssltest',
          description: 'فحص شامل لشهادة SSL'
        }
      ]
    },
    {
      id: 'domain-wrong-records',
      title: 'سجلات DNS خاطئة',
      description: 'السجلات المضافة غير صحيحة أو ناقصة',
      category: 'dns',
      severity: 'high',
      symptoms: [
        'النطاق لا يعمل نهائياً',
        'يتوجه لموقع آخر',
        'خطأ في التحقق من النطاق'
      ],
      causes: [
        'قيم خاطئة في سجلات DNS',
        'نوع سجل خاطئ',
        'سجلات متضاربة موجودة مسبقاً'
      ],
      solutions: [
        {
          step: 1,
          action: 'مراجعة السجلات',
          description: 'تأكد من صحة جميع القيم المطلوبة',
          code: 'A Record:\nType: A\nName: @\nValue: 76.76.21.21\n\nCNAME Record:\nType: CNAME\nName: www\nValue: connect.ktobi.online'
        },
        {
          step: 2,
          action: 'حذف السجلات المتضاربة',
          description: 'احذف أي سجلات A أو CNAME قديمة للنطاق نفسه'
        },
        {
          step: 3,
          action: 'إعادة الإضافة',
          description: 'احذف جميع السجلات وأضفها مرة أخرى بالقيم الصحيحة'
        }
      ]
    },
    {
      id: 'cloudflare-proxy-enabled',
      title: 'Cloudflare Proxy مفعل',
      description: 'إذا كنت تستخدم Cloudflare، السحابة البرتقالية مفعلة',
      category: 'dns',
      severity: 'medium',
      symptoms: [
        'النطاق لا يعمل رغم صحة DNS',
        'خطأ 522 أو 520',
        'تظهر صفحة Cloudflare بدلاً من موقعك'
      ],
      causes: [
        'السحابة البرتقالية (Proxied) مفعلة في Cloudflare',
        'إعدادات Cloudflare تتداخل مع النطاق'
      ],
      solutions: [
        {
          step: 1,
          action: 'تعطيل Proxy',
          description: 'في Cloudflare، اجعل السحابة رمادية (DNS only)',
          warning: 'تأكد أن جميع السجلات لها السحابة الرمادية'
        },
        {
          step: 2,
          action: 'الانتظار',
          description: 'انتظر 5-10 دقائق لتطبيق التغييرات'
        }
      ]
    },
    {
      id: 'subdomain-not-working',
      title: 'النطاق الفرعي لا يعمل',
      description: 'النطاق الرئيسي يعمل لكن www لا يعمل',
      category: 'domain',
      severity: 'medium',
      symptoms: [
        'example.com يعمل لكن www.example.com لا يعمل',
        'أو العكس'
      ],
      causes: [
        'سجل CNAME للـ www مفقود أو خاطئ',
        'إعدادات خاطئة في مزود النطاق'
      ],
      solutions: [
        {
          step: 1,
          action: 'إضافة سجل CNAME',
          description: 'تأكد من وجود سجل CNAME للـ www',
          code: 'Type: CNAME\nName: www\nValue: connect.ktobi.online'
        },
        {
          step: 2,
          action: 'فحص السجلات',
          description: 'استخدم أدوات DNS لفحص سجل www بشكل منفصل'
        }
      ]
    }
  ];

  const categories = [
    { id: 'all', label: 'جميع المشاكل', icon: <Settings className="w-4 h-4" /> },
    { id: 'dns', label: 'مشاكل DNS', icon: <Globe className="w-4 h-4" /> },
    { id: 'ssl', label: 'مشاكل SSL', icon: <Shield className="w-4 h-4" /> },
    { id: 'domain', label: 'مشاكل النطاق', icon: <Settings className="w-4 h-4" /> },
    { id: 'general', label: 'مشاكل عامة', icon: <Info className="w-4 h-4" /> }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'medium':
        return 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'low':
        return 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      default:
        return 'bg-gray-100 dark:bg-gray-950/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="w-4 h-4" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4" />;
      case 'low':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         issue.symptoms.some(symptom => symptom.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || issue.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">استكشاف الأخطاء وإصلاحها</h2>
        <p className="text-muted-foreground">دليل شامل لحل مشاكل النطاقات المخصصة</p>
      </div>

      {/* أدوات البحث والتصفية */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            البحث عن حل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="ابحث عن مشكلتك..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                }`}
              >
                {category.icon}
                {category.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* قائمة المشاكل */}
      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">لم يتم العثور على مشاكل تطابق بحثك</p>
            </CardContent>
          </Card>
        ) : (
          filteredIssues.map((issue) => (
            <Card key={issue.id} className="border border-border">
              <CardHeader 
                className="cursor-pointer"
                onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full border ${getSeverityColor(issue.severity)}`}>
                      {getSeverityIcon(issue.severity)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{issue.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {issue.severity === 'high' ? 'عاجل' : issue.severity === 'medium' ? 'متوسط' : 'منخفض'}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      {expandedIssue === issue.id ? '−' : '+'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedIssue === issue.id && (
                <CardContent className="space-y-6">
                  {/* الأعراض */}
                  <div>
                    <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      الأعراض
                    </h4>
                    <div className="space-y-1">
                      {issue.symptoms.map((symptom, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <X className="w-4 h-4 text-red-500 mt-0.5 ml-2" />
                          <p className="text-sm text-muted-foreground">{symptom}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* الأسباب */}
                  <div>
                    <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      الأسباب المحتملة
                    </h4>
                    <div className="space-y-1">
                      {issue.causes.map((cause, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 ml-2"></div>
                          <p className="text-sm text-muted-foreground">{cause}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* الحلول */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      خطوات الحل
                    </h4>
                    <div className="space-y-3">
                      {issue.solutions.map((solution) => (
                        <Card key={solution.step} className="bg-muted/30 border-border">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                {solution.step}
                              </span>
                              <div className="flex-1 space-y-2">
                                <h5 className="font-medium text-foreground">{solution.action}</h5>
                                <p className="text-sm text-muted-foreground">{solution.description}</p>
                                
                                {solution.code && (
                                  <div className="bg-card border border-border p-3 rounded-md">
                                    <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                                      {solution.code}
                                    </pre>
                                  </div>
                                )}
                                
                                {solution.warning && (
                                  <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    <AlertDescription className="text-amber-600 dark:text-amber-400 text-sm">
                                      {solution.warning}
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* أدوات مفيدة */}
                  {issue.tools && (
                    <div>
                      <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        أدوات مفيدة
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {issue.tools.map((tool, index) => (
                          <a
                            key={index}
                            href={tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 text-primary" />
                            <div>
                              <p className="font-medium text-foreground text-sm">{tool.name}</p>
                              <p className="text-xs text-muted-foreground">{tool.description}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* معلومات إضافية */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-lg text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <Info className="w-5 h-5" />
            نصائح عامة لاستكشاف الأخطاء
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-1 ml-2" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>الصبر مطلوب:</strong> معظم مشاكل DNS تحل نفسها خلال 24-48 ساعة
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-1 ml-2" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>امسح Cache:</strong> احرص على مسح cache المتصفح و DNS عند استكشاف الأخطاء
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-1 ml-2" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>تحقق من القيم:</strong> راجع دائماً قيم DNS للتأكد من صحتها قبل البحث عن حلول معقدة
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-1 ml-2" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>اختبر من أماكن مختلفة:</strong> استخدم أدوات فحص DNS للتحقق من انتشار التغييرات عالمياً
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TroubleshootingGuide; 