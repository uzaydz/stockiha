/**
 * نظام بحث ومطابقة متقدم (Hybrid Algorithm)
 * يجمع بين عدة تقنيات لتحسين دقة البحث
 *
 * @version 1.0.0
 */

/**
 * حساب Levenshtein distance (للأخطاء الإملائية)
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // مصفوفة البرمجة الديناميكية
  const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  // تهيئة الصف والعمود الأول
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  // ملء المصفوفة
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // حذف
        matrix[i][j - 1] + 1,      // إضافة
        matrix[i - 1][j - 1] + cost // استبدال
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * تحويل Levenshtein distance إلى نسبة تشابه (0-1)
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);

  return 1 - (distance / maxLen);
}

/**
 * حساب Dice Coefficient (للتشابه البنيوي)
 */
export function diceCoefficient(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  // توليد bigrams
  const bigrams1 = getBigrams(str1);
  const bigrams2 = getBigrams(str2);

  if (bigrams1.size === 0 || bigrams2.size === 0) return 0;

  // حساب التقاطع
  let intersection = 0;
  for (const bigram of bigrams1) {
    if (bigrams2.has(bigram)) {
      intersection++;
    }
  }

  // Dice coefficient = 2 * |A ∩ B| / (|A| + |B|)
  return (2 * intersection) / (bigrams1.size + bigrams2.size);
}

/**
 * توليد bigrams من نص
 */
function getBigrams(str: string): Set<string> {
  const bigrams = new Set<string>();
  const padded = ` ${str} `;

  for (let i = 0; i < padded.length - 1; i++) {
    bigrams.add(padded.substring(i, i + 2));
  }

  return bigrams;
}

/**
 * تطبيع النص العربي
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';

  let normalized = text.toLowerCase();

  // إزالة التشكيل
  normalized = normalized.replace(/[\u064B-\u0652\u0670\u0640]/g, '');

  // توحيد الألفات
  normalized = normalized.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627'); // أ، إ، آ → ا

  // توحيد الواو
  normalized = normalized.replace(/\u0624/g, '\u0648'); // ؤ → و

  // توحيد الياء
  normalized = normalized.replace(/\u0626/g, '\u064a'); // ئ → ي

  // توحيد التاء المربوطة والهاء
  normalized = normalized.replace(/\u0629/g, '\u0647'); // ة → ه

  // توحيد الألف المقصورة
  normalized = normalized.replace(/\u0649/g, '\u064a'); // ى → ي

  // إزالة الحروف الخاصة والأرقام (اختياري)
  normalized = normalized.replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ');

  // توحيد المسافات
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * تطبيع نص لاتيني (إنجليزي/فرنسي)
 */
export function normalizeLatin(text: string): string {
  if (!text) return '';

  let normalized = text.toLowerCase();

  // إزالة علامات التشكيل اللاتينية
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // توحيد المسافات
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * تطبيع ذكي يكتشف اللغة تلقائياً
 */
export function smartNormalize(text: string): string {
  if (!text) return '';

  // كشف إذا كان النص يحتوي على عربي
  const hasArabic = /[\u0600-\u06FF]/.test(text);

  if (hasArabic) {
    return normalizeArabic(text);
  } else {
    return normalizeLatin(text);
  }
}

/**
 * قاموس المترادفات (Synonyms)
 */
const SYNONYMS_DICT: Record<string, string[]> = {
  // عربي
  'هاتف': ['تيليفون', 'موبايل', 'جوال', 'phone', 'mobile'],
  'حاسوب': ['كمبيوتر', 'لابتوب', 'pc', 'laptop', 'computer'],
  'تلفاز': ['تلفزيون', 'tv', 'television'],
  'ثلاجة': ['براد', 'refrigerator', 'fridge'],
  'غسالة': ['washing machine', 'washer'],

  // إنجليزي
  'phone': ['mobile', 'smartphone', 'cellphone', 'هاتف', 'تيليفون'],
  'computer': ['pc', 'laptop', 'حاسوب', 'كمبيوتر'],
  'tv': ['television', 'تلفاز', 'تلفزيون'],

  // ماركات شهيرة
  'samsung': ['سامسونج', 'سمسنغ', 'سامسنج'],
  'iphone': ['آيفون', 'ايفون', 'أيفون'],
  'huawei': ['هواوي', 'هوا'],
  'xiaomi': ['شاومي', 'زياومي'],
  'lg': ['إل جي', 'ال جي'],
};

/**
 * البحث عن مترادفات
 */
export function getSynonyms(word: string): string[] {
  const normalized = word.toLowerCase().trim();

  // ابحث مباشرة
  if (SYNONYMS_DICT[normalized]) {
    return SYNONYMS_DICT[normalized];
  }

  // ابحث في القيم
  for (const [key, synonyms] of Object.entries(SYNONYMS_DICT)) {
    if (synonyms.includes(normalized)) {
      return [key, ...synonyms.filter(s => s !== normalized)];
    }
  }

  return [];
}

/**
 * مطابقة صوتية (Phonetic Matching) مبسطة للعربية
 */
export function phoneticMatchArabic(str1: string, str2: string): number {
  // تحويل إلى شكل صوتي مبسط
  const phonetic1 = arabicToPhonetic(str1);
  const phonetic2 = arabicToPhonetic(str2);

  return diceCoefficient(phonetic1, phonetic2);
}

/**
 * تحويل عربي إلى تمثيل صوتي
 */
function arabicToPhonetic(text: string): string {
  let phonetic = normalizeArabic(text);

  // توحيد الأصوات المتشابهة
  phonetic = phonetic.replace(/[ثس]/g, 'س');  // ث، س → س
  phonetic = phonetic.replace(/[ذظز]/g, 'ز');  // ذ، ظ، ز → ز
  phonetic = phonetic.replace(/[طت]/g, 'ت');   // ط، ت → ت
  phonetic = phonetic.replace(/[صض]/g, 'ص');   // ص، ض → ص
  phonetic = phonetic.replace(/[قك]/g, 'ك');   // ق، ك → ك
  phonetic = phonetic.replace(/[دض]/g, 'د');   // د، ض → د

  return phonetic;
}

/**
 * الخوارزمية المركبة (Hybrid Algorithm)
 */
export interface MatchScore {
  score: number;
  breakdown: {
    exact: number;
    levenshtein: number;
    dice: number;
    phonetic: number;
    synonym: number;
    final: number;
  };
}

/**
 * حساب نتيجة مركبة مع تفاصيل
 */
export function hybridMatch(query: string, target: string, weights?: {
  exact?: number;
  levenshtein?: number;
  dice?: number;
  phonetic?: number;
  synonym?: number;
}): MatchScore {
  // الأوزان الافتراضية
  const w = {
    exact: weights?.exact ?? 1.0,
    levenshtein: weights?.levenshtein ?? 0.4,
    dice: weights?.dice ?? 0.3,
    phonetic: weights?.phonetic ?? 0.2,
    synonym: weights?.synonym ?? 0.5
  };

  const normQuery = smartNormalize(query);
  const normTarget = smartNormalize(target);

  // إذا كان الهدف فارغ، لا مطابقة
  if (!normTarget || normTarget.length === 0) {
    return {
      score: 0,
      breakdown: {
        exact: 0,
        levenshtein: 0,
        dice: 0,
        phonetic: 0,
        synonym: 0,
        final: 0
      }
    };
  }

  // 1. مطابقة دقيقة
  const exactScore = normQuery === normTarget ? 1.0 :
                     normTarget.includes(normQuery) ? 0.95 :
                     normQuery.includes(normTarget) ? 0.92 : 0;

  // 2. Levenshtein similarity
  const levenScore = levenshteinSimilarity(normQuery, normTarget);

  // 3. Dice coefficient
  const diceScore = diceCoefficient(normQuery, normTarget);

  // 4. Phonetic matching (للعربية فقط)
  const hasArabic = /[\u0600-\u06FF]/.test(query);
  const phoneticScore = hasArabic ? phoneticMatchArabic(query, target) : 0;

  // 5. Synonym matching
  let synonymScore = 0;
  const queryWords = normQuery.split(/\s+/);
  const targetWords = normTarget.split(/\s+/);

  for (const qWord of queryWords) {
    const synonyms = getSynonyms(qWord);
    if (synonyms.length > 0) {
      for (const tWord of targetWords) {
        if (synonyms.includes(tWord)) {
          synonymScore = 1.0;
          break;
        }
      }
    }
    if (synonymScore > 0) break;
  }

  // حساب النتيجة النهائية (weighted average)
  const totalWeight = w.exact + w.levenshtein + w.dice + (hasArabic ? w.phonetic : 0) + w.synonym;

  const finalScore = (
    exactScore * w.exact +
    levenScore * w.levenshtein +
    diceScore * w.dice +
    (hasArabic ? phoneticScore * w.phonetic : 0) +
    synonymScore * w.synonym
  ) / totalWeight;

  const calculatedScore = Math.min(1.0, Math.max(0, finalScore));

  return {
    score: calculatedScore,
    breakdown: {
      exact: exactScore,
      levenshtein: levenScore,
      dice: diceScore,
      phonetic: phoneticScore,
      synonym: synonymScore,
      final: finalScore
    }
  };
}

/**
 * بحث متقدم في مصفوفة
 */
export function fuzzySearch<T>(
  query: string,
  items: T[],
  accessor: (item: T) => string,
  options?: {
    threshold?: number;
    limit?: number;
    weights?: {
      exact?: number;
      levenshtein?: number;
      dice?: number;
      phonetic?: number;
      synonym?: number;
    };
  }
): Array<T & { _score: number; _breakdown?: any }> {
  const threshold = options?.threshold ?? 0.4; // خفضنا من 0.5 إلى 0.4
  const limit = options?.limit ?? 10;

  const results = items
    .map(item => {
      const text = accessor(item);
      const match = hybridMatch(query, text, options?.weights);

      return {
        ...item,
        _score: match.score,
        _breakdown: match.breakdown
      };
    })
    .filter(item => item._score >= threshold)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);

  return results;
}

/**
 * بحث متعدد الحقول
 */
export function multiFieldSearch<T>(
  query: string,
  items: T[],
  fields: Array<{
    accessor: (item: T) => string;
    weight: number;
  }>,
  options?: {
    threshold?: number;
    limit?: number;
  }
): Array<T & { _score: number }> {
  const threshold = options?.threshold ?? 0.3;
  const limit = options?.limit ?? 10;

  const scoredItems = items.map((item) => {
      let totalScore = 0;
      let totalWeight = 0;

      for (const field of fields) {
        const text = field.accessor(item);

        // تجاهل الحقول الفارغة تماماً - لا تؤثر على الدرجة
        if (!text || text.trim().length === 0) {
          continue;
        }

        const match = hybridMatch(query, text);
        totalScore += match.score * field.weight;
        totalWeight += field.weight;
      }

      const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

      return {
        ...item,
        _score: finalScore
      };
    });

  const results = scoredItems
    .filter(item => item._score >= threshold)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);

  return results;
}

/**
 * تصحيح إملائي بسيط
 */
export function suggestCorrection(query: string, dictionary: string[]): string | null {
  const normQuery = smartNormalize(query);

  // ابحث عن أفضل مطابقة
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const word of dictionary) {
    const score = levenshteinSimilarity(normQuery, smartNormalize(word));

    // إذا كان التشابه عالي جداً (> 0.75) ولكن ليس دقيق، اقترح التصحيح
    if (score > 0.75 && score < 1.0 && score > bestScore) {
      bestScore = score;
      bestMatch = word;
    }
  }

  return bestMatch;
}
