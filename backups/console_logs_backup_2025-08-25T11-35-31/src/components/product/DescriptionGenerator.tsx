import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Wand2, Sparkles, Globe, FileText, Loader2, CheckCircle, AlertCircle, Languages, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DescriptionGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onDescriptionGenerated: (description: string) => void;
}

interface GenerationState {
  isGenerating: boolean;
  error: string | null;
  generatedDescription: string | null;
}

const LANGUAGES = [
  { value: 'ar', label: 'العربية', flag: '🇸🇦' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  { value: 'pt', label: 'Português', flag: '🇵🇹' },
  { value: 'ru', label: 'Русский', flag: '🇷🇺' },
  { value: 'zh', label: '中文', flag: '🇨🇳' },
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
  { value: 'ko', label: '한국어', flag: '🇰🇷' },
  { value: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { value: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { value: 'fa', label: 'فارسی', flag: '🇮🇷' },
  { value: 'ur', label: 'اردو', flag: '🇵🇰' },
];

export function DescriptionGenerator({
  open,
  onOpenChange,
  productName,
  onDescriptionGenerated
}: DescriptionGeneratorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('ar');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    error: null,
    generatedDescription: null
  });

  const generateDescription = async () => {
    if (!productName.trim()) {
      setGenerationState(prev => ({ ...prev, error: 'يرجى إدخال اسم المنتج أولاً' }));
      return;
    }

    setGenerationState(prev => ({ ...prev, isGenerating: true, error: null }));

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
                "content": `أنت كاتب محترف متخصص في كتابة أوصاف المنتجات التجارية. مهمتك هي كتابة وصف احترافي ومقنع ومنظم للمنتج باللغة المطلوبة.

🎯 مبادئ الكتابة الاحترافية:

📝 التنظيم والهيكلة:
- قسم الوصف إلى فقرات واضحة ومنظمة
- استخدم مسافات مناسبة بين الفقرات
- ابدأ بفقرة تمهيدية جذابة
- اتبع بفقرة للمميزات والفوائد
- اختم بفقرة تحفيزية للشراء

💎 المحتوى واللغة:
- استخدم لغة تجارية احترافية ومقنعة
- ركز على مميزات المنتج وفوائده للعميل
- استخدم إيموجي مناسبة لتحسين المظهر (2-3 إيموجي كحد أقصى)
- اكتب فقرات قصيرة ومقروءة (3-4 جمل لكل فقرة)
- استخدم كلمات مفتاحية مناسبة للبحث
- اجعل الوصف يتراوح بين 120-180 كلمة

🚫 تجنب:
- كلمات مثل "مثالي" أو "ممتاز" بشكل مفرط
- التكرار والكلمات المبتذلة
- الجمل الطويلة والمعقدة
- اللغة الرسمية المفرطة
- أي tags أو markup مثل <think> أو <think> أو أي كود HTML
- استخدام كلمات من لغات أخرى غير المطلوبة
- الخلط بين اللغات في نفس النص

✅ النتيجة المطلوبة:
- وصف منظم ومقسم بشكل احترافي
- مسافات مناسبة بين الفقرات
- لغة طبيعية ومقنعة
- إيموجي مناسبة ومتوازنة
- نص خالص بدون أي tags أو markup
- استخدام اللغة المطلوبة فقط بدون خلط مع لغات أخرى
- اكتب الوصف فقط بدون أي تفكير أو شرح إضافي`
              },
              {
                "role": "user",
                "content": `اكتب وصفاً احترافياً ومقنعاً ومنظماً للمنتج التالي باللغة ${LANGUAGES.find(lang => lang.value === selectedLanguage)?.label || 'العربية'}:

اسم المنتج: ${productName}
${additionalDetails ? `تفاصيل إضافية: ${additionalDetails}` : ''}

📋 المطلوب:
- وصف منظم ومقسم إلى فقرات واضحة
- مسافات مناسبة بين الفقرات
- إيموجي مناسبة ومتوازنة (2-3 إيموجي كحد أقصى)
- لغة تجارية احترافية ومقنعة
- طول مناسب (120-180 كلمة)
- نص خالص بدون أي tags أو markup
- استخدم اللغة المطلوبة فقط - لا تضع أي كلمات إنجليزية أو لغات أخرى

اكتب الوصف فقط بدون أي تفكير أو شرح إضافي.`
              }
            ],
            "temperature": 0.8,
            "max_tokens": 600
          })
        });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let generatedDescription = data.choices?.[0]?.message?.content?.trim();

      if (!generatedDescription) {
        throw new Error('لم يتم توليد وصف صحيح');
      }

      // تنظيف النص من أي tags غير مرغوب فيها
      generatedDescription = generatedDescription
        .replace(/<think>.*?<\/think>/gi, '') // إزالة think tags
        .replace(/<think>/gi, '') // إزالة think tags غير مكتملة
        .replace(/<\/think>/gi, '') // إزالة think tags إغلاق
        .replace(/<[^>]*>/g, '') // إزالة أي HTML tags أخرى
        .replace(/\n\s*\n/g, '\n\n') // تنظيف المسافات الزائدة
        .trim();

      // إذا كانت اللغة العربية، تأكد من عدم وجود كلمات إنجليزية
      if (selectedLanguage === 'ar') {
        // قائمة بالكلمات الإنجليزية الشائعة التي يجب تجنبها
        const englishWords = [
          'instinct', 'perfect', 'ideal', 'best', 'amazing', 'wonderful', 'fantastic',
          'excellent', 'superb', 'outstanding', 'premium', 'quality', 'design',
          'feature', 'benefit', 'advantage', 'solution', 'choice', 'option'
        ];
        
        // استبدال الكلمات الإنجليزية بكلمات عربية مناسبة
        englishWords.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          generatedDescription = generatedDescription.replace(regex, '');
        });
      }

      setGenerationState(prev => ({
        ...prev,
        isGenerating: false,
        generatedDescription,
        error: null
      }));

    } catch (error) {
      setGenerationState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'حدث خطأ أثناء توليد الوصف'
      }));
    }
  };

  const handleApplyDescription = () => {
    if (generationState.generatedDescription) {
      onDescriptionGenerated(generationState.generatedDescription);
      onOpenChange(false);
      // Reset state
      setAdditionalDetails('');
      setGenerationState({
        isGenerating: false,
        error: null,
        generatedDescription: null
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state
    setAdditionalDetails('');
    setGenerationState({
      isGenerating: false,
      error: null,
      generatedDescription: null
    });
  };

  const selectedLanguageInfo = LANGUAGES.find(lang => lang.value === selectedLanguage);

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2.5 rounded-xl shadow-sm">
                <Wand2 className="h-5 w-5 text-primary dark:text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-foreground">
                  توليد وصف المنتج
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  استخدم الذكاء الاصطناعي لإنشاء وصف احترافي للمنتج
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Product Name Display */}
            <Card className="border-border/50 shadow-sm bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/60 dark:to-blue-800/60 p-2 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      اسم المنتج
                    </Label>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {productName || 'لم يتم تحديد اسم المنتج'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Language Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                لغة الوصف
                <Badge variant="secondary" className="text-xs">اختياري</Badge>
              </Label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="h-12 bg-background/60 border-border/60 focus:border-primary/50 focus:ring-primary/20">
                  <SelectValue placeholder="اختر لغة الوصف" />
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
              {selectedLanguageInfo && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Languages className="w-3 h-3" />
                  <span>سيتم إنشاء الوصف باللغة: {selectedLanguageInfo.flag} {selectedLanguageInfo.label}</span>
                </div>
              )}
            </div>

            {/* Additional Details */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                تفاصيل إضافية لتحسين الوصف
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center"
                      onClick={(e) => e.preventDefault()}
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                    side="top"
                    sideOffset={5}
                  >
                    <p className="text-xs">أضف معلومات إضافية مثل المميزات، المواصفات، أو أي تفاصيل مهمة لتحسين جودة الوصف المولد.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Textarea
                placeholder="مثال: منتج عالي الجودة، مناسب للاستخدام اليومي، يحتوي على ميزات متقدمة، سهل الاستخدام..."
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                className="min-h-[100px] resize-none text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
              />
              <div className="text-xs text-muted-foreground">
                {additionalDetails.length} حرف • 
                {additionalDetails.length > 0 ? (
                  <span className="text-green-600 dark:text-green-400 mr-1">✓ ستساعد هذه التفاصيل في تحسين الوصف</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 mr-1">(اختياري - إضافة تفاصيل تحسن جودة الوصف)</span>
                )}
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-center">
              <Button
                onClick={generateDescription}
                disabled={generationState.isGenerating || !productName.trim()}
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
                    توليد الوصف
                  </>
                )}
              </Button>
            </div>

            {/* Error Display */}
            {generationState.error && (
              <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">
                        خطأ في التوليد
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {generationState.error}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated Description */}
            {generationState.generatedDescription && (
              <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        تم توليد الوصف بنجاح
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        باللغة: {selectedLanguageInfo?.flag} {selectedLanguageInfo?.label}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {generationState.generatedDescription}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                    <span className="text-xs text-green-600 dark:text-green-400">
                      {generationState.generatedDescription.length} حرف
                    </span>
                    <Button
                      onClick={handleApplyDescription}
                      className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4" />
                      تطبيق الوصف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
