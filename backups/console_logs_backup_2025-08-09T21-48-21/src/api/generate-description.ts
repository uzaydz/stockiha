import type { NextApiRequest, NextApiResponse } from 'next';

interface GenerateDescriptionRequest {
  productName: string;
  language: string;
  additionalDetails?: string;
}

interface GenerateDescriptionResponse {
  success: boolean;
  description?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateDescriptionResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { productName, language, additionalDetails } = req.body as GenerateDescriptionRequest;

    // التحقق من البيانات المدخلة
    if (!productName || !productName.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'اسم المنتج مطلوب' 
      });
    }

    if (!language) {
      return res.status(400).json({ 
        success: false, 
        error: 'اللغة مطلوبة' 
      });
    }

    // قائمة اللغات المدعومة
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

    const selectedLanguage = LANGUAGES.find(lang => lang.value === language);
    if (!selectedLanguage) {
      return res.status(400).json({ 
        success: false, 
        error: 'اللغة غير مدعومة' 
      });
    }

    // استدعاء OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer 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",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://stockiha.com",
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
             "content": `اكتب وصفاً احترافياً ومقنعاً ومنظماً للمنتج التالي باللغة ${selectedLanguage.label}:

اسم المنتج: ${productName.trim()}
${additionalDetails ? `تفاصيل إضافية: ${additionalDetails.trim()}` : ''}

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
      console.error('OpenRouter API error:', response.status, response.statusText);
      return res.status(500).json({ 
        success: false, 
        error: `خطأ في الاتصال بالخدمة: ${response.status}` 
      });
    }

    const data = await response.json();
    let generatedDescription = data.choices?.[0]?.message?.content?.trim();

    if (!generatedDescription) {
      return res.status(500).json({ 
        success: false, 
        error: 'لم يتم توليد وصف صحيح' 
      });
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
    if (language === 'ar') {
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

    // إرجاع النتيجة
    return res.status(200).json({
      success: true,
      description: generatedDescription
    });

  } catch (error) {
    console.error('Error generating description:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'حدث خطأ أثناء توليد الوصف' 
    });
  }
} 