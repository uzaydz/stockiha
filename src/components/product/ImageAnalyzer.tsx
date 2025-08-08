import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Eye, 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ImageIcon,
  Wand2,
  Brain,
  FileText,
  Zap,
  Star
} from 'lucide-react';
import ImageUploader, { ImageUploaderRef } from '@/components/ui/ImageUploader';

interface ImageAnalyzerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalysisComplete: (description: string) => void;
}

interface AnalysisState {
  isAnalyzing: boolean;
  currentStep: 'idle' | 'uploading' | 'processing' | 'analyzing' | 'generating' | 'complete';
  error: string | null;
  analysisResult: string | null;
  uploadedImageUrl: string | null;
}

export function ImageAnalyzer({
  open,
  onOpenChange,
  onAnalysisComplete
}: ImageAnalyzerProps) {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isAnalyzing: false,
    currentStep: 'idle',
    error: null,
    analysisResult: null,
    uploadedImageUrl: null
  });

  const imageUploaderRef = useRef<ImageUploaderRef>(null);

  // دالة لضغط الصورة للتحليل
  const compressImageForAnalysis = async (imageBase64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('فشل في إنشاء سياق الرسم'));
          return;
        }

        // تحديد أبعاد جديدة (أقصى 800x800)
        let { width, height } = img;
        const maxSize = 800;
        
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        
        // رسم الصورة المضغوطة
        ctx.drawImage(img, 0, 0, width, height);
        
        // تحويل إلى base64 بجودة منخفضة
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
      
      img.onerror = () => {
        reject(new Error('فشل في تحميل الصورة للضغط'));
      };
      
      img.src = imageBase64;
    });
  };

  const analyzeImage = async () => {
    if (!analysisState.uploadedImageUrl) {
      setAnalysisState(prev => ({ ...prev, error: 'يرجى رفع صورة أولاً' }));
      return;
    }

    setAnalysisState(prev => ({ 
      ...prev, 
      isAnalyzing: true, 
      error: null,
      currentStep: 'uploading'
    }));

    try {
      // تحويل الصورة إلى base64 إذا لم تكن كذلك
      let imageBase64 = analysisState.uploadedImageUrl;
      
      if (!imageBase64.startsWith('data:image/')) {
        // إذا كانت الصورة URL، نحتاج لتحويلها إلى base64
        try {
          const response = await fetch(imageBase64);
          if (!response.ok) {
            throw new Error('فشل في تحميل الصورة من الرابط');
          }
          const blob = await response.blob();
          imageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          throw new Error('فشل في تحويل الصورة إلى التنسيق المطلوب');
        }
      }

      // التحقق من أن الصورة صالحة
      if (!imageBase64 || imageBase64.length < 100) {
        throw new Error('الصورة غير صالحة أو فارغة');
      }

      // تحديث الخطوة إلى معالجة الصورة
      setAnalysisState(prev => ({ ...prev, currentStep: 'processing' }));
      
      // تأخير قصير لإظهار التقدم
      await new Promise(resolve => setTimeout(resolve, 500));

      // ضغط الصورة إذا كانت كبيرة جداً (أكثر من 1MB)
      if (imageBase64.length > 1000000) {
        console.log('ضغط الصورة قبل الإرسال...');
        imageBase64 = await compressImageForAnalysis(imageBase64);
      }

      // تحديث الخطوة إلى تحليل الصورة
      setAnalysisState(prev => ({ ...prev, currentStep: 'analyzing' }));
      
      // تأخير قصير لإظهار التقدم
      await new Promise(resolve => setTimeout(resolve, 300));

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer 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",
          "HTTP-Referer": window.location.origin,
          "X-Title": "Bazaar Console",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "mistralai/mistral-small-3.2-24b-instruct:free",
          "messages": [
            {
              "role": "user",
              "content": [
                {
                  "type": "text",
                  "text": "أنت خبير في تحليل الصور. مهمتك هي تحليل الصورة المرفوعة وتقديم وصف مختصر ومفيد للمنتج التجاري الموجود في الصورة باللغة العربية. ركز فقط على المنتج التجاري نفسه وليس الخلفية أو الأشياء الأخرى في الصورة. قم بتحليل هذه الصورة وقدم وصفاً قصيراً ومختصراً (سطرين أو ثلاثة أسطر فقط) يوضح نوع المنتج التجاري وخصائصه الأساسية. لا تقدم وصفاً مفصلاً، فقط وصف مختصر يوضح ما هو المنتج التجاري الموجود في الصورة."
                },
                {
                  "type": "image_url",
                  "image_url": {
                    "url": imageBase64
                  }
                }
              ]
            }
          ],
          "temperature": 0.7,
          "max_tokens": 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenRouter API Error:', errorData);
        console.error('Request payload size:', JSON.stringify({
          "model": "mistralai/mistral-small-3.2-24b-instruct:free",
          "messages": [
            {
              "role": "user",
              "content": [
                {
                  "type": "text",
                  "text": "أنت خبير في تحليل الصور..."
                },
                {
                  "type": "image_url",
                  "image_url": {
                    "url": imageBase64.substring(0, 100) + "..."
                  }
                }
              ]
            }
          ]
        }).length);
        
        if (response.status === 400) {
          const errorMessage = errorData.error?.message || 'خطأ في تنسيق البيانات';
          throw new Error(`خطأ في تنسيق البيانات المرسلة: ${errorMessage}. تأكد من أن الصورة صالحة وحجمها مناسب.`);
        } else if (response.status === 401) {
          throw new Error('خطأ في المصادقة. تأكد من صحة API key.');
        } else if (response.status === 429) {
          throw new Error('تم تجاوز حد الاستخدام. يرجى المحاولة لاحقاً.');
        } else {
          throw new Error(`خطأ في الخادم: ${response.status} - ${errorData.error?.message || 'خطأ غير معروف'}`);
        }
      }

      // تحديث الخطوة إلى توليد الوصف
      setAnalysisState(prev => ({ ...prev, currentStep: 'generating' }));
      
      // تأخير قصير لإظهار التقدم
      await new Promise(resolve => setTimeout(resolve, 200));

      const data = await response.json();
      let analysisText = data.choices?.[0]?.message?.content?.trim();

      if (!analysisText) {
        throw new Error('لم يتم تحليل الصورة بشكل صحيح');
      }

      // تنظيف النص
      analysisText = analysisText
        .replace(/<think>.*?<\/think>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();

      setAnalysisState(prev => ({
        ...prev,
        isAnalyzing: false,
        currentStep: 'complete',
        analysisResult: analysisText,
        error: null
      }));

      // إرسال الوصف تلقائياً بعد ثانيتين
      setTimeout(() => {
        handleAnalysisComplete(analysisText);
      }, 2000);

    } catch (error) {
      console.error('Error analyzing image:', error);
      let errorMessage = 'حدث خطأ أثناء تحليل الصورة';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setAnalysisState(prev => ({
        ...prev,
        isAnalyzing: false,
        currentStep: 'idle',
        error: errorMessage
      }));
    }
  };

  const handleImageUploaded = (imageUrl: string) => {
    setAnalysisState(prev => ({
      ...prev,
      uploadedImageUrl: imageUrl,
      analysisResult: null,
      error: null
    }));
  };

  const handleApplyAnalysis = () => {
    if (analysisState.analysisResult) {
      onAnalysisComplete(analysisState.analysisResult);
      onOpenChange(false);
      setAnalysisState({
        isAnalyzing: false,
        currentStep: 'idle',
        error: null,
        analysisResult: null,
        uploadedImageUrl: null
      });
    }
  };

  // إرسال الوصف تلقائياً عند اكتمال التحليل
  const handleAnalysisComplete = (description: string) => {
    onAnalysisComplete(description);
    onOpenChange(false);
    setAnalysisState({
      isAnalyzing: false,
      currentStep: 'idle',
      error: null,
      analysisResult: null,
      uploadedImageUrl: null
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setAnalysisState({
      isAnalyzing: false,
      currentStep: 'idle',
      error: null,
      analysisResult: null,
      uploadedImageUrl: null
    });
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2.5 rounded-xl shadow-sm">
                <Brain className="h-5 w-5 text-primary dark:text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-foreground">
                  تحليل المنتج التجاري في الصورة
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Image Upload Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-semibold">رفع صورة المنتج</h3>
                </div>
                <ImageUploader
                  ref={imageUploaderRef}
                  onImageUploaded={handleImageUploaded}
                  label="صورة المنتج"
                  folder="product-analysis"
                  maxSizeInMB={5}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Analyze Button */}
            <div className="flex justify-center">
              <Button
                onClick={analyzeImage}
                disabled={analysisState.isAnalyzing || !analysisState.uploadedImageUrl}
                className="gap-3 px-8 py-3 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                {analysisState.isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري تحليل الصورة...
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5" />
                    تحليل المنتج التجاري
                  </>
                )}
              </Button>
            </div>

            {/* Generation Steps */}
            {analysisState.isAnalyzing && (
              <Card className="border-primary/20 bg-primary/5 mt-4">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-gradient-to-br from-primary/20 to-primary/10 p-2 rounded-lg">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">جاري تحليل صورة المنتج</h3>
                        <p className="text-sm text-muted-foreground">نقوم بتحليل المنتج التجاري في الصورة</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Step 1: Uploading */}
                      <div className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                        analysisState.currentStep === 'uploading' ? 'bg-primary/10 border border-primary/30' : 'bg-background/50'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          analysisState.currentStep === 'uploading' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          {analysisState.currentStep === 'uploading' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">رفع الصورة</p>
                          <p className="text-xs text-muted-foreground">جاري رفع صورة المنتج</p>
                        </div>
                      </div>

                      {/* Step 2: Processing */}
                      <div className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                        analysisState.currentStep === 'processing' ? 'bg-primary/10 border border-primary/30' : 'bg-background/50'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          ['processing', 'analyzing', 'generating', 'complete'].includes(analysisState.currentStep)
                            ? 'bg-primary text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {analysisState.currentStep === 'processing' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">معالجة الصورة</p>
                          <p className="text-xs text-muted-foreground">ضغط الصورة وتجهيزها للتحليل</p>
                        </div>
                      </div>

                      {/* Step 3: Analyzing */}
                      <div className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                        analysisState.currentStep === 'analyzing' ? 'bg-primary/10 border border-primary/30' : 'bg-background/50'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          ['analyzing', 'generating', 'complete'].includes(analysisState.currentStep)
                            ? 'bg-primary text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {analysisState.currentStep === 'analyzing' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">تحليل المنتج في الصورة</p>
                          <p className="text-xs text-muted-foreground">استخلاص نوع المنتج وخصائصه</p>
                        </div>
                      </div>

                      {/* Step 4: Generating Description */}
                      <div className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                        analysisState.currentStep === 'generating' ? 'bg-primary/10 border border-primary/30' : 'bg-background/50'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          ['generating', 'complete'].includes(analysisState.currentStep)
                            ? 'bg-primary text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {analysisState.currentStep === 'generating' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">توليد الوصف المختصر</p>
                          <p className="text-xs text-muted-foreground">كتابة وصف مختصر للمنتج</p>
                        </div>
                      </div>

                      {/* Step 5: Complete */}
                      <div className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                        analysisState.currentStep === 'complete' ? 'bg-primary/10 border border-primary/30' : 'bg-background/50'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          analysisState.currentStep === 'complete'
                            ? 'bg-primary text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {analysisState.currentStep === 'complete' ? (
                            <Star className="w-4 h-4 animate-bounce" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">اكتمل التحليل</p>
                          <p className="text-xs text-muted-foreground">تم توليد وصف المنتج بنجاح</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
            {analysisState.error && (
              <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">خطأ في التحليل</p>
                      <p className="text-xs text-red-600 dark:text-red-400">{analysisState.error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analysis Result */}
            {analysisState.analysisResult && (
              <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">تم تحليل المنتج التجاري بنجاح</p>
                      <p className="text-xs text-green-600 dark:text-green-400">سيتم إرسال وصف المنتج المختصر تلقائياً لتوليد المعلومات الكاملة خلال ثانيتين...</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">وصف المنتج المُحلل</span>
                    </div>
                    <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {analysisState.analysisResult}
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button onClick={handleApplyAnalysis} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                      <Wand2 className="w-4 h-4" />
                      إرسال الآن
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
} 