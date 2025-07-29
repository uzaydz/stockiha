import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, TrendingUp, Target, Zap, Info } from 'lucide-react';

interface OptimizationFeature {
  name: string;
  description: string;
  impact: number;
  status: 'implemented' | 'available' | 'missing';
  details: string;
}

export const MatchQualityOptimizer: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  // قائمة التحسينات المطبقة وإمكانياتها
  const optimizations: OptimizationFeature[] = [
    {
      name: 'تقسيم الأسماء الذكي',
      description: 'تقسيم الاسم الكامل إلى الاسم الأول واسم العائلة',
      impact: 11,
      status: 'implemented',
      details: 'يتم تقسيم الأسماء العربية والإنجليزية بذكاء لتحسين مطابقة firstName و lastName'
    },
    {
      name: 'جلب عنوان IP التلقائي',
      description: 'جلب عنوان IP الحقيقي للعميل',
      impact: 22,
      status: 'implemented',
      details: 'يتم جلب عنوان IP من خدمة ipify.org لتحسين دقة الموقع الجغرافي'
    },
    {
      name: 'تحسين معرف النقر (fbc)',
      description: 'تحسين جلب وحفظ معرف النقر من Facebook',
      impact: 22,
      status: 'implemented',
      details: 'يتم البحث في URL، الكوكيز، localStorage، والـ referrer لضمان عدم فقدان fbc'
    },
    {
      name: 'معالجة البيانات الجغرافية',
      description: 'إرسال المدينة والولاية بأشكال مختلفة',
      impact: 5,
      status: 'implemented',
      details: 'إرسال البيانات كـ city/municipality و state/province لضمان التطابق'
    },
    {
      name: 'البريد الإلكتروني',
      description: 'جمع البريد الإلكتروني من العملاء',
      impact: 25,
      status: 'missing',
      details: 'إضافة حقل البريد الإلكتروني الاختياري يمكن أن يحسن المطابقة بشكل كبير'
    },
    {
      name: 'معرف تسجيل الدخول',
      description: 'استخدام معرف Facebook للمستخدمين المسجلين',
      impact: 12,
      status: 'available',
      details: 'يمكن جلبه إذا كان المستخدم مسجل دخول في Facebook'
    },
    {
      name: 'الرمز البريدي',
      description: 'جمع الرمز البريدي للعنوان',
      impact: 11,
      status: 'missing',
      details: 'إضافة حقل الرمز البريدي يمكن أن يحسن دقة الموقع'
    },
    {
      name: 'تاريخ الميلاد',
      description: 'جمع تاريخ الميلاد (اختياري)',
      impact: 11,
      status: 'missing',
      details: 'حقل اختياري لتحسين دقة المطابقة الديموغرافية'
    }
  ];

  const implementedOptimizations = optimizations.filter(opt => opt.status === 'implemented');
  const totalImplementedImpact = implementedOptimizations.reduce((sum, opt) => sum + opt.impact, 0);
  const totalPossibleImpact = optimizations.reduce((sum, opt) => sum + opt.impact, 0);
  const optimizationProgress = (totalImplementedImpact / totalPossibleImpact) * 100;

  if (!isVisible) {
    return (
      <div className="fixed bottom-20 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
          size="sm"
        >
          🎯 تحسينات المطابقة
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-96 max-h-[80vh] overflow-auto">
      <Card className="shadow-xl border-2 border-green-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                <Target className="w-5 h-5" />
                تحسينات جودة المطابقة
              </CardTitle>
              <CardDescription>التحسينات المطبقة على Facebook Conversion API</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* ملخص التقدم */}
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">ملخص التحسينات</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-green-700">التقدم الإجمالي</span>
                  <span className="font-medium text-green-800">
                    {Math.round(optimizationProgress)}%
                  </span>
                </div>
                <Progress value={optimizationProgress} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-green-800 text-lg">
                    +{totalImplementedImpact}%
                  </div>
                  <div className="text-green-600">تحسين مطبق</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-orange-600 text-lg">
                    +{totalPossibleImpact - totalImplementedImpact}%
                  </div>
                  <div className="text-orange-500">إمكانية إضافية</div>
                </div>
              </div>
            </div>
          </div>

          {/* قائمة التحسينات */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              التحسينات المتاحة
            </h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {optimizations.map((optimization, index) => (
                <div 
                  key={index} 
                  className={`border rounded-lg p-3 ${
                    optimization.status === 'implemented' 
                      ? 'bg-green-50 border-green-200' 
                      : optimization.status === 'available'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {optimization.status === 'implemented' && (
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{optimization.name}</div>
                        <div className="text-xs text-gray-600">{optimization.description}</div>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        optimization.status === 'implemented' 
                          ? 'default' 
                          : optimization.status === 'available'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="text-xs flex-shrink-0"
                    >
                      +{optimization.impact}%
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-gray-600 mt-2 flex items-start gap-1">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{optimization.details}</span>
                  </div>
                  
                  <div className="mt-2">
                    <Badge 
                      variant={
                        optimization.status === 'implemented' 
                          ? 'default' 
                          : optimization.status === 'available'
                          ? 'secondary'
                          : 'destructive'
                      }
                      className="text-xs"
                    >
                      {optimization.status === 'implemented' 
                        ? '✅ مطبق' 
                        : optimization.status === 'available'
                        ? '🔄 متاح'
                        : '❌ مفقود'
                      }
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* نصائح إضافية */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">نصائح للتحسين</span>
            </div>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• استخدم Facebook Click ID (fbc) عند القدوم من إعلانات Facebook</li>
              <li>• تأكد من تحميل Facebook Pixel قبل Conversion API</li>
              <li>• استخدم Event IDs منفصلة لتجنب التكرار</li>
              <li>• اختبر البيانات في وضع الاختبار أولاً</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
