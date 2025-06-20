import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet-async';
import { 
  BookOpen, 
  Settings, 
  Globe, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react';

// استيراد المكونات الجديدة
import DomainSetupSteps from '@/components/docs/DomainSetupSteps';
import ProviderGuides from '@/components/docs/ProviderGuides';
import StockihaGuide from '@/components/docs/StockihaGuide';
import TroubleshootingGuide from '@/components/docs/TroubleshootingGuide';

const CustomDomainsDocPage: React.FC = () => {
  return (
    <Layout>
      <Helmet>
        <title>دليل إعداد النطاقات المخصصة الشامل | Bazaar</title>
        <meta name="description" content="دليل شامل لإعداد النطاقات المخصصة خطوة بخطوة مع إرشادات مفصلة لجميع مزودي النطاقات" />
      </Helmet>
      
      <div className="container py-6 max-w-6xl">
        <div className="space-y-6">
          {/* العنوان الرئيسي */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-foreground">دليل النطاقات المخصصة الشامل</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              كل ما تحتاجه لربط نطاقك المخصص بموقعك على منصة سطوكيها
            </p>
            <div className="flex justify-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                15-30 دقيقة
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                سهل التطبيق
              </Badge>
            </div>
          </div>

          {/* نظرة سريعة */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-xl text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                نظرة سريعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="bg-blue-600 text-white p-2 rounded-full">
                    <span className="text-sm font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-700 dark:text-blue-300">شراء النطاق</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400">من GoDaddy أو Namecheap</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="bg-blue-600 text-white p-2 rounded-full">
                    <span className="text-sm font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-700 dark:text-blue-300">إعداد DNS</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400">إضافة سجلات A و CNAME</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="bg-blue-600 text-white p-2 rounded-full">
                    <span className="text-sm font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-700 dark:text-blue-300">التفعيل</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400">في موقع سطوكيها</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* التبويبات الرئيسية */}
          <Tabs defaultValue="steps" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-auto p-1">
              <TabsTrigger value="steps" className="flex flex-col items-center gap-1 py-3">
                <CheckCircle className="w-5 h-5" />
                <span className="text-xs">الخطوات</span>
              </TabsTrigger>
              <TabsTrigger value="providers" className="flex flex-col items-center gap-1 py-3">
                <Globe className="w-5 h-5" />
                <span className="text-xs">المزودين</span>
              </TabsTrigger>
              <TabsTrigger value="stockiha" className="flex flex-col items-center gap-1 py-3">
                <Settings className="w-5 h-5" />
                <span className="text-xs">سطوكيها</span>
              </TabsTrigger>
              <TabsTrigger value="troubleshooting" className="flex flex-col items-center gap-1 py-3">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-xs">المشاكل</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="steps" className="mt-6">
              <DomainSetupSteps />
            </TabsContent>

            <TabsContent value="providers" className="mt-6">
              <ProviderGuides />
            </TabsContent>

            <TabsContent value="stockiha" className="mt-6">
              <StockihaGuide />
            </TabsContent>

            <TabsContent value="troubleshooting" className="mt-6">
              <TroubleshootingGuide />
            </TabsContent>
          </Tabs>

          {/* معلومات إضافية */}
          <Card className="bg-muted/30 border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                مزايا النطاق المخصص
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center space-y-2">
                  <div className="bg-blue-100 dark:bg-blue-950/30 p-3 rounded-full w-fit mx-auto">
                    <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-medium text-foreground">مظهر احترافي</h3>
                  <p className="text-sm text-muted-foreground">يظهر اسم شركتك في URL</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="bg-green-100 dark:bg-green-950/30 p-3 rounded-full w-fit mx-auto">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-medium text-foreground">ثقة العملاء</h3>
                  <p className="text-sm text-muted-foreground">يزيد من ثقة الزوار</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="bg-purple-100 dark:bg-purple-950/30 p-3 rounded-full w-fit mx-auto">
                    <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-medium text-foreground">تحسين SEO</h3>
                  <p className="text-sm text-muted-foreground">أفضل لمحركات البحث</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="bg-orange-100 dark:bg-orange-950/30 p-3 rounded-full w-fit mx-auto">
                    <Settings className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="font-medium text-foreground">تحكم كامل</h3>
                  <p className="text-sm text-muted-foreground">ملكية كاملة للنطاق</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default CustomDomainsDocPage;
