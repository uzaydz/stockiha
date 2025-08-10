import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Wand2, Sparkles, Globe, FileText, Loader2, CheckCircle, AlertCircle, Languages, Lightbulb, Tag, Link, Truck, Eye, Brain, Zap, Star, Crown } from 'lucide-react';
import { ImageAnalyzer } from './ImageAnalyzer';

interface ProductInfoGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInfoGenerated: (info: {
    name: string;
    description: string;
    brand: string;
    shippingName: string;
    slug: string;
  }) => void;
}

interface GenerationState {
  isGenerating: boolean;
  currentStep: 'idle' | 'analyzing' | 'generating-name' | 'generating-description' | 'generating-brand' | 'generating-shipping' | 'generating-slug' | 'complete';
  error: string | null;
  generatedInfo: {
    name: string;
    description: string;
    brand: string;
    shippingName: string;
    slug: string;
  } | null;
}

const LANGUAGES = [
  { value: 'ar', label: 'العربية', flag: '🇸🇦' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
];

// دالة تنظيف النص من علامات Markdown
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // **bold**
    .replace(/\*(.*?)\*/g, '$1')       // *italic*
    .replace(/__(.*?)__/g, '$1')         // __bold__
    .replace(/_(.*?)_/g, '$1')           // _italic_
    .replace(/`([^`]*)`/g, '$1')         // `code`
    .replace(/\n{2,}/g, '\n')          // multiple newlines
    .trim();
}

export function ProductInfoGenerator({
  open,
  onOpenChange,
  onInfoGenerated
}: ProductInfoGeneratorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('ar');
  const [productDetails, setProductDetails] = useState('');
  const [imageAnalyzerOpen, setImageAnalyzerOpen] = useState(false);
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    currentStep: 'idle',
    error: null,
    generatedInfo: null
  });

  const generateProductInfo = async () => {
    if (!productDetails.trim()) {
      setGenerationState(prev => ({ ...prev, error: 'يرجى إدخال تفاصيل المنتج أولاً' }));
      return;
    }

    setGenerationState(prev => ({ ...prev, isGenerating: true, currentStep: 'analyzing', error: null }));

    // محاكاة الخطوات المختلفة
    const simulateSteps = async () => {
      setTimeout(() => setGenerationState(prev => ({ ...prev, currentStep: 'generating-name' })), 1000);
      setTimeout(() => setGenerationState(prev => ({ ...prev, currentStep: 'generating-description' })), 3000);
      setTimeout(() => setGenerationState(prev => ({ ...prev, currentStep: 'generating-brand' })), 5000);
      setTimeout(() => setGenerationState(prev => ({ ...prev, currentStep: 'generating-shipping' })), 7000);
      setTimeout(() => setGenerationState(prev => ({ ...prev, currentStep: 'generating-slug' })), 9000);
    };

    simulateSteps();

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer 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",
          "HTTP-Referer": window.location.origin,
          "X-Title": "Bazaar Console",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "qwen/qwen3-235b-a22b:free",
          "messages": [
            {
              "role": "system",
              "content": `أنت خبير متخصص في كتابة المحتوى التجاري والوصف الاحترافي للمنتجات. مهمتك هي إنشاء معلومات شاملة ومحترافية للمنتج باللغة المطلوبة.

🎯 المتطلبات الأساسية:

📝 اسم المنتج:
- احترافي وإبداعي ومقنع
- يعكس هوية المنتج وخصائصه المميزة
- يستخدم كلمات جذابة ومقنعة
- مناسب للعرض في المتجر الإلكتروني
- يجمع بين الوضوح والإبداع
- يستخدم مصطلحات تجارية احترافية
- يبرز القيمة المضافة للمنتج
- يستخدم صفات إيجابية ومقنعة
- يخلق شعوراً بالتميز والجودة
- أمثلة على الأسماء الاحترافية: "قميص أنيق من القطن الممتاز" بدلاً من "قميص أزرق"
- استخدم صفات مثل: ممتاز، أنيق، فاخر، مريح، عصري، كلاسيكي، احترافي

📄 وصف المنتج (مفصل وطويل):
- وصف شامل ومفصل يتكون من 3-4 فقرات
- يبدأ بفقرة تمهيدية جذابة
- يتضمن مميزات المنتج الرئيسية والثانوية
- يشرح الاستخدامات والفوائد
- يختتم بفقرة تلخيصية مقنعة
- يستخدم إيموجي مناسبة ومتناسقة (2-3 إيموجي لكل فقرة)
- تنسيق احترافي مع مسافات مناسبة بين الفقرات
- لغة تجارية احترافية ومقنعة

🏷️ العلامة التجارية:
- اسم الشركة المصنعة أو الموزع
- واضح ومقنع

📦 اسم المنتج للشحن:
- مختصر ومختلف قليلاً عن الاسم الأصلي
- مناسب للاستخدام في الشحنات
- يتجنب الكلمات المحظورة

🔗 رابط المنتج (Slug):
- باللغة الإنجليزية
- قصير وواضح
- يستخدم الشرطات بدلاً من المسافات
- مناسب للـ SEO

قم بإرجاع النتيجة بالتنسيق التالي مع الحفاظ على التنسيق والمسافات:

اسم المنتج: [الاسم]

وصف المنتج: 
[فقرة تمهيدية مع إيموجي]

[فقرة المميزات الرئيسية مع إيموجي]

[فقرة الاستخدامات والفوائد مع إيموجي]

[فقرة تلخيصية مقنعة مع إيموجي]

العلامة التجارية: [العلامة]

اسم المنتج للشحن: [الاسم للشحن]

رابط المنتج: [slug]`
            },
            {
              "role": "user",
              "content": `قم بتوليد معلومات شاملة ومحترافية للمنتج التالي باللغة ${LANGUAGES.find(lang => lang.value === selectedLanguage)?.label || 'العربية'}:

تفاصيل المنتج: ${productDetails}

تأكد من أن اسم المنتج احترافي وإبداعي ومقنع، وأن الوصف طويل ومفصل ومقنع مع تنسيق احترافي ومسافات مناسبة بين الفقرات.`
            }
          ],
          "temperature": 0.7,
          "max_tokens": 2000
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let generatedText = data.choices?.[0]?.message?.content?.trim();

      if (!generatedText) {
        throw new Error('لم يتم توليد معلومات صحيحة');
      }

      // تنظيف النص مع الحفاظ على التنسيق
      generatedText = generatedText
        .replace(/<think>.*?<\/think>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();

      // تحليل النص المولد مع الحفاظ على التنسيق
      const lines = generatedText.split('\n');
      const generatedInfo = {
        name: '',
        description: '',
        brand: '',
        shippingName: '',
        slug: ''
      };

      let currentSection = '';
      let descriptionLines: string[] = [];

      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('اسم المنتج:')) {
          currentSection = 'name';
          generatedInfo.name = cleanMarkdown(trimmedLine.replace('اسم المنتج:', '').trim());
        } else if (trimmedLine.startsWith('وصف المنتج:')) {
          currentSection = 'description';
          // لا نضيف هذا السطر للوصف
        } else if (trimmedLine.startsWith('العلامة التجارية:')) {
          currentSection = 'brand';
          generatedInfo.brand = cleanMarkdown(trimmedLine.replace('العلامة التجارية:', '').trim());
        } else if (trimmedLine.startsWith('اسم المنتج للشحن:')) {
          currentSection = 'shippingName';
          generatedInfo.shippingName = cleanMarkdown(trimmedLine.replace('اسم المنتج للشحن:', '').trim());
        } else if (trimmedLine.startsWith('رابط المنتج:')) {
          currentSection = 'slug';
          generatedInfo.slug = cleanMarkdown(trimmedLine.replace('رابط المنتج:', '').trim());
        } else if (currentSection === 'description' && trimmedLine) {
          // إضافة السطر للوصف مع الحفاظ على التنسيق
          descriptionLines.push(cleanMarkdown(trimmedLine));
        }
      });

      // دمج أسطر الوصف مع الحفاظ على التنسيق
      generatedInfo.description = descriptionLines.join('\n\n');

      if (!generatedInfo.name || !generatedInfo.description) {
        throw new Error('لم يتم توليد جميع المعلومات المطلوبة');
      }

      setGenerationState(prev => ({
        ...prev,
        isGenerating: false,
        currentStep: 'complete',
        generatedInfo,
        error: null
      }));

    } catch (error) {
      setGenerationState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'حدث خطأ أثناء توليد المعلومات'
      }));
    }
  };

  const handleApplyInfo = () => {
    if (generationState.generatedInfo) {
      onInfoGenerated(generationState.generatedInfo);
      onOpenChange(false);
      setProductDetails('');
      setGenerationState({
        isGenerating: false,
        currentStep: 'idle',
        error: null,
        generatedInfo: null
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setProductDetails('');
    setGenerationState({
      isGenerating: false,
      currentStep: 'idle',
      error: null,
      generatedInfo: null
    });
  };

  const handleImageAnalysisComplete = (description: string) => {
    setProductDetails(description);
    setImageAnalyzerOpen(false);
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-3">
                              <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2.5 rounded-xl shadow-sm">
                  <Wand2 className="h-5 w-5 text-primary dark:text-primary-foreground" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold text-foreground">
                    توليد معلومات المنتج الشاملة
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    استخدم الذكاء الاصطناعي لإنشاء جميع معلومات المنتج الأساسية مع وصف مفصل واحترافي
                  </p>
                </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Language Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                لغة المحتوى
              </Label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="h-12 bg-background/60 border-border/60 focus:border-primary/50 focus:ring-primary/20">
                  <SelectValue placeholder="اختر لغة المحتوى" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {LANGUAGES.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{language.flag}</span>
                        <span>{language.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  تفاصيل المنتج
                  <span className="text-destructive">*</span>
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setImageAnalyzerOpen(true)}
                      className="gap-2 text-xs"
                    >
                      <Brain className="w-3 h-3" />
                      تحليل الصورة
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>تحليل المنتج التجاري في الصورة وتوليد وصف مختصر، ثم إرساله تلقائياً لتوليد المعلومات الكاملة</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                placeholder="أدخل وصفاً مفصلاً للمنتج يشمل نوعه، مميزاته، استخدامه، المواد المصنوع منها، الألوان المتوفرة، الأحجام، وغيرها من التفاصيل المهمة... أو استخدم زر تحليل الصورة أعلاه"
                value={productDetails}
                onChange={(e) => setProductDetails(e.target.value)}
                className="min-h-[150px] bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
              />
            </div>

            {/* Generate Button */}
            <div className="flex justify-center">
              <Button
                onClick={generateProductInfo}
                disabled={generationState.isGenerating || !productDetails.trim()}
                className="gap-3 px-8 py-3 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                {generationState.isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري التوليد...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    توليد معلومات المنتج
                  </>
                )}
              </Button>
            </div>

            {/* Generation Steps */}
            {generationState.isGenerating && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-gradient-to-br from-primary/20 to-primary/10 p-2 rounded-lg">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">جاري توليد معلومات المنتج</h3>
                        <p className="text-sm text-muted-foreground">نقوم بإنشاء محتوى احترافي ومقنع</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Step 1: Analyzing */}
                      <div className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                        generationState.currentStep === 'analyzing' ? 'bg-primary/10 border border-primary/30' : 'bg-background/50'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          generationState.currentStep === 'analyzing' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          {generationState.currentStep === 'analyzing' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">تحليل تفاصيل المنتج</p>
                          <p className="text-xs text-muted-foreground">فهم المتطلبات والخصائص</p>
                        </div>
                      </div>

                      {/* Step 2: Generating Name */}
                      <div className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                        generationState.currentStep === 'generating-name' ? 'bg-primary/10 border border-primary/30' : 'bg-background/50'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          ['generating-name', 'generating-description', 'generating-brand', 'generating-shipping', 'generating-slug', 'complete'].includes(generationState.currentStep) 
                            ? 'bg-primary text-white' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {generationState.currentStep === 'generating-name' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">توليد اسم المنتج</p>
                          <p className="text-xs text-muted-foreground">إنشاء اسم احترافي وإبداعي</p>
                        </div>
                      </div>

                      {/* Step 3: Generating Description */}
                      <div className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                        generationState.currentStep === 'generating-description' ? 'bg-primary/10 border border-primary/30' : 'bg-background/50'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          ['generating-description', 'generating-brand', 'generating-shipping', 'generating-slug', 'complete'].includes(generationState.currentStep) 
                            ? 'bg-primary text-white' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {generationState.currentStep === 'generating-description' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">كتابة الوصف المفصل</p>
                          <p className="text-xs text-muted-foreground">إنشاء وصف شامل ومقنع</p>
                        </div>
                      </div>

                      {/* Step 4: Generating Brand */}
                      <div className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                        generationState.currentStep === 'generating-brand' ? 'bg-primary/10 border border-primary/30' : 'bg-background/50'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          ['generating-brand', 'generating-shipping', 'generating-slug', 'complete'].includes(generationState.currentStep) 
                            ? 'bg-primary text-white' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {generationState.currentStep === 'generating-brand' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">تحديد العلامة التجارية</p>
                          <p className="text-xs text-muted-foreground">اختيار اسم العلامة التجارية</p>
                        </div>
                      </div>

                      {/* Step 5: Generating Shipping Name */}
                      <div className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                        generationState.currentStep === 'generating-shipping' ? 'bg-primary/10 border border-primary/30' : 'bg-background/50'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          ['generating-shipping', 'generating-slug', 'complete'].includes(generationState.currentStep) 
                            ? 'bg-primary text-white' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {generationState.currentStep === 'generating-shipping' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">إنشاء اسم الشحن</p>
                          <p className="text-xs text-muted-foreground">توليد اسم مناسب للشحنات</p>
                        </div>
                      </div>

                      {/* Step 6: Generating Slug */}
                      <div className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                        generationState.currentStep === 'generating-slug' ? 'bg-primary/10 border border-primary/30' : 'bg-background/50'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          ['generating-slug', 'complete'].includes(generationState.currentStep) 
                            ? 'bg-primary text-white' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {generationState.currentStep === 'generating-slug' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">إنشاء رابط المنتج</p>
                          <p className="text-xs text-muted-foreground">توليد slug مناسب للـ SEO</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
            {generationState.error && (
              <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">خطأ في التوليد</p>
                      <p className="text-xs text-red-600 dark:text-red-400">{generationState.error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated Info */}
            {generationState.generatedInfo && (
              <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 p-2 rounded-lg">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">تم توليد معلومات المنتج بنجاح!</p>
                      <p className="text-xs text-green-600 dark:text-green-400">تم إنشاء محتوى احترافي ومقنع</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <Label className="text-sm font-medium text-green-700 dark:text-green-300">اسم المنتج</Label>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{generationState.generatedInfo.name}</p>
                    </div>

                    <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <Label className="text-sm font-medium text-green-700 dark:text-green-300">وصف المنتج</Label>
                      </div>
                      <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {generationState.generatedInfo.description}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <Label className="text-sm font-medium text-green-700 dark:text-green-300">العلامة التجارية</Label>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{generationState.generatedInfo.brand}</p>
                    </div>

                    <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <Label className="text-sm font-medium text-green-700 dark:text-green-300">اسم المنتج للشحن</Label>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{generationState.generatedInfo.shippingName}</p>
                    </div>

                    <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Link className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <Label className="text-sm font-medium text-green-700 dark:text-green-300">رابط المنتج (Slug)</Label>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-mono">{generationState.generatedInfo.slug}</p>
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button onClick={handleApplyInfo} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle className="w-4 h-4" />
                      تطبيق المعلومات
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

      {/* Image Analyzer Dialog */}
      <ImageAnalyzer
        open={imageAnalyzerOpen}
        onOpenChange={setImageAnalyzerOpen}
        onAnalysisComplete={handleImageAnalysisComplete}
      />
    </TooltipProvider>
  );
}
