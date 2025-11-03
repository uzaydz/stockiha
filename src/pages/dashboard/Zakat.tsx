import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import ZakatCalculator from '@/components/zakat/ZakatCalculator';
import ZakatIdeas from '@/components/zakat/ZakatIdeas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calculator,
  Lightbulb,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

interface ZakatProps extends POSSharedLayoutControls {}

const ZakatPage: React.FC<ZakatProps> = ({ useStandaloneLayout = true }) => {
  const perms = usePermissions();
  const [activeTab, setActiveTab] = useState('calculator');

  const content = (
      <div className="space-y-6">
        <div className="py-6 text-center">
          <h1 className="text-3xl md:text-4xl font-semibold mb-2">نظام الزكاة</h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            أدوات دقيقة لحساب الزكاة وتقارير مبسطة وفق الأحكام الشرعية
          </p>
        </div>

        {/* التبويبات الرئيسية */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 h-auto p-1 bg-muted/50 backdrop-blur-sm rounded-xl border border-border/50">
            <TabsTrigger
              value="calculator"
              className="flex items-center gap-2 h-14 rounded-lg font-medium transition-all duration-300
                        data-[state=active]:bg-background data-[state=active]:text-foreground
                        data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20
                        hover:bg-background/50 hover:text-foreground"
            >
              <Calculator className="h-5 w-5" />
              <span className="hidden sm:inline">حاسبة الزكاة</span>
              <span className="sm:hidden">الحاسبة</span>
            </TabsTrigger>
            <TabsTrigger
              value="ideas"
              className="flex items-center gap-2 h-14 rounded-lg font-medium transition-all duration-300
                        data-[state=active]:bg-background data-[state=active]:text-foreground
                        data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20
                        hover:bg-background/50 hover:text-foreground"
            >
              <Lightbulb className="h-5 w-5" />
              <span className="hidden sm:inline">أفكار مساعدة</span>
              <span className="sm:hidden">الأفكار</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-6">
            <ZakatCalculator />
          </TabsContent>

          <TabsContent value="ideas" className="space-y-6">
            <ZakatIdeas />
          </TabsContent>
        </Tabs>

        {/* معلومات إضافية */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                معلومات مهمة
              </CardTitle>
              <CardDescription>
                إرشادات هامة لاستخدام نظام الزكاة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="font-medium">الحساب الدقيق</h5>
                      <p className="text-sm text-muted-foreground">يتم الحساب بنسبة 2.5% من رأس المال وفق الضوابط الشرعية</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="font-medium">النصاب الشرعي</h5>
                      <p className="text-sm text-muted-foreground">تجب الزكاة عند بلوغ النصاب (ما يعادل 85 جرام ذهب)</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="font-medium">الاستشارة الشرعية</h5>
                      <p className="text-sm text-muted-foreground">استشر أهل العلم في المسائل المستجدة أو المعقدة</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="font-medium">التحديث المستمر</h5>
                      <p className="text-sm text-muted-foreground">راجع حساباتك بانتظام لضمان الدقة والتحديث</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
  );

  if (perms.ready && !perms.anyOf(['viewFinancialReports'])) {
    const node = (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>غير مصرح</AlertTitle>
          <AlertDescription>لا تملك صلاحية الوصول إلى نظام الزكاة.</AlertDescription>
        </Alert>
      </div>
    );
    return useStandaloneLayout ? <Layout>{node}</Layout> : node;
  }

  return useStandaloneLayout ? <Layout>{content}</Layout> : content;
};

export default ZakatPage;
