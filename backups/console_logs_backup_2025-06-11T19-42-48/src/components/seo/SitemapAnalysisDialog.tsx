import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  BarChart3,
  Settings,
  Play,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { sitemapAnalysisService, PageAnalysis, SitemapGenerationOptions } from '@/api/sitemapAnalysisService';

interface SitemapAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function SitemapAnalysisDialog({ open, onOpenChange, onComplete }: SitemapAnalysisDialogProps) {
  const [step, setStep] = useState<'config' | 'analysis' | 'review' | 'generation'>('config');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState<PageAnalysis[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [config, setConfig] = useState<SitemapGenerationOptions>({
    includeProducts: true,
    includeCategories: true,
    includeLandingPages: true,
    includeCustomPages: true,
    includeServices: true,
    baseUrl: window.location.origin,
    maxUrls: 1000,
    minPriority: 0.3
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setStep('config');
      setProgress(0);
      setAnalysis([]);
      setStatistics(null);
    }
  }, [open]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setStep('analysis');
      setProgress(10);

      toast({
        title: 'بدء التحليل',
        description: 'جاري تحليل بنية الموقع...'
      });

      setProgress(30);
      const analysisResult = await sitemapAnalysisService.analyzeSiteStructure(config.baseUrl);
      setAnalysis(analysisResult);
      
      setProgress(60);
      const stats = await sitemapAnalysisService.getContentStatistics();
      setStatistics(stats);

      setProgress(100);
      setStep('review');

      toast({
        title: 'تم التحليل',
        description: `تم العثور على ${analysisResult.length} صفحة`
      });

    } catch (error: any) {
      toast({
        title: 'خطأ في التحليل',
        description: error.message,
        variant: 'destructive'
      });
      setStep('config');
    } finally {
      setLoading(false);
    }
  };

  const generateSitemap = async () => {
    try {
      setLoading(true);
      setStep('generation');
      setProgress(0);

      toast({
        title: 'توليد Sitemap',
        description: 'جاري إنشاء خريطة الموقع...'
      });

      setProgress(50);
      await sitemapAnalysisService.generateSitemapFromAnalysis(analysis, config);
      
      setProgress(100);
      
      toast({
        title: 'تم بنجاح',
        description: 'تم إنشاء خريطة الموقع بنجاح'
      });

      onComplete();
      onOpenChange(false);

    } catch (error: any) {
      toast({
        title: 'خطأ في التوليد',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (currentStep: string) => {
    if (step === currentStep && loading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (['analysis', 'review', 'generation'].includes(step) && ['config'].includes(currentStep)) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (['review', 'generation'].includes(step) && currentStep === 'analysis') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (step === 'generation' && currentStep === 'review') return <CheckCircle className="h-4 w-4 text-green-500" />;
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            معالج التوليد التلقائي لـ Sitemap
          </DialogTitle>
          <DialogDescription>
            تحليل الموقع وإنشاء خريطة موقع محسّنة تلقائياً
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStepIcon('config')}
              <span className={step === 'config' ? 'font-medium' : ''}>الإعدادات</span>
            </div>
            <div className="flex-1 mx-4">
              <Progress value={step === 'config' ? 25 : step === 'analysis' ? 50 : step === 'review' ? 75 : 100} />
            </div>
            <div className="flex items-center gap-2">
              {getStepIcon('analysis')}
              <span className={step === 'analysis' ? 'font-medium' : ''}>التحليل</span>
            </div>
            <div className="flex-1 mx-4">
              <Progress value={step === 'analysis' ? progress : step === 'review' ? 100 : step === 'generation' ? 100 : 0} />
            </div>
            <div className="flex items-center gap-2">
              {getStepIcon('review')}
              <span className={step === 'review' ? 'font-medium' : ''}>المراجعة</span>
            </div>
            <div className="flex-1 mx-4">
              <Progress value={step === 'generation' ? progress : 0} />
            </div>
            <div className="flex items-center gap-2">
              {getStepIcon('generation')}
              <span className={step === 'generation' ? 'font-medium' : ''}>التوليد</span>
            </div>
          </div>

          <Tabs value={step} className="w-full">
            {/* Configuration */}
            <TabsContent value="config" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    إعدادات التوليد
                  </CardTitle>
                  <CardDescription>
                    تخصيص خيارات تحليل وتوليد خريطة الموقع
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="baseUrl">رابط الموقع الأساسي</Label>
                    <Input
                      id="baseUrl"
                      value={config.baseUrl}
                      onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                      placeholder="https://example.com"
                      dir="ltr"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxUrls">الحد الأقصى للصفحات</Label>
                      <Input
                        id="maxUrls"
                        type="number"
                        value={config.maxUrls}
                        onChange={(e) => setConfig({ ...config, maxUrls: parseInt(e.target.value) })}
                        min="10"
                        max="50000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minPriority">الحد الأدنى للأولوية</Label>
                      <Input
                        id="minPriority"
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="1.0"
                        value={config.minPriority}
                        onChange={(e) => setConfig({ ...config, minPriority: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>أنواع المحتوى المتضمن</Label>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="includeProducts">المنتجات</Label>
                        <Switch
                          id="includeProducts"
                          checked={config.includeProducts}
                          onCheckedChange={(checked) => setConfig({ ...config, includeProducts: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="includeCategories">الفئات</Label>
                        <Switch
                          id="includeCategories"
                          checked={config.includeCategories}
                          onCheckedChange={(checked) => setConfig({ ...config, includeCategories: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="includeServices">الخدمات</Label>
                        <Switch
                          id="includeServices"
                          checked={config.includeServices}
                          onCheckedChange={(checked) => setConfig({ ...config, includeServices: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="includeLandingPages">صفحات الهبوط</Label>
                        <Switch
                          id="includeLandingPages"
                          checked={config.includeLandingPages}
                          onCheckedChange={(checked) => setConfig({ ...config, includeLandingPages: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="includeCustomPages">الصفحات المخصصة</Label>
                        <Switch
                          id="includeCustomPages"
                          checked={config.includeCustomPages}
                          onCheckedChange={(checked) => setConfig({ ...config, includeCustomPages: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  <Button onClick={runAnalysis} disabled={loading} className="w-full">
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <Play className="h-4 w-4 ml-2" />
                    )}
                    بدء التحليل
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analysis */}
            <TabsContent value="analysis" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>جاري التحليل...</CardTitle>
                  <CardDescription>
                    يتم الآن تحليل بنية الموقع واكتشاف الصفحات
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Progress value={progress} />
                    <div className="text-center text-sm text-muted-foreground">
                      {progress < 30 && 'فحص الإعدادات...'}
                      {progress >= 30 && progress < 60 && 'تحليل المحتوى...'}
                      {progress >= 60 && progress < 100 && 'إنشاء الإحصائيات...'}
                      {progress >= 100 && 'تم التحليل بنجاح!'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Review */}
            <TabsContent value="review" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">إجمالي الصفحات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analysis.length}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">متوسط الأولوية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analysis.length > 0 
                        ? (analysis.reduce((sum, page) => sum + page.priority, 0) / analysis.length).toFixed(2)
                        : '0.00'
                      }
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">أعلى أولوية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analysis.length > 0 
                        ? Math.max(...analysis.map(p => p.priority)).toFixed(1)
                        : '0.0'
                      }
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>توزيع أنواع الصفحات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(
                      analysis.reduce((acc, page) => {
                        const type = page.pageType === 'homepage' ? 'الرئيسية' :
                                   page.pageType === 'product' ? 'منتجات' :
                                   page.pageType === 'category' ? 'فئات' :
                                   page.pageType === 'service' ? 'خدمات' :
                                   page.pageType === 'landing' ? 'صفحات هبوط' :
                                   page.pageType === 'content' ? 'محتوى' : 'أخرى';
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span>{type}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('config')}>
                  العودة للإعدادات
                </Button>
                <Button onClick={generateSitemap} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 ml-2" />
                  )}
                  إنشاء Sitemap
                </Button>
              </div>
            </TabsContent>

            {/* Generation */}
            <TabsContent value="generation" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>جاري إنشاء Sitemap...</CardTitle>
                  <CardDescription>
                    يتم الآن إنشاء خريطة الموقع وحفظها في قاعدة البيانات
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Progress value={progress} />
                    <div className="text-center text-sm text-muted-foreground">
                      {progress < 50 && 'معالجة البيانات...'}
                      {progress >= 50 && progress < 100 && 'حفظ النتائج...'}
                      {progress >= 100 && 'تم الإنشاء بنجاح!'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}