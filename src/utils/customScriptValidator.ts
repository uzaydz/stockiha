export interface CustomScriptValidationOptions {
  context?: string;
}

const RANDOM_TOKEN_REGEX = /^[A-Za-z0-9+/=_-]+$/;
const KNOWN_CORRUPTED_IDENTIFIERS = new Set([
  'fNcqSfPLFxu',
  'v3dgr0fYIuAp9Xf7'
]);

const buildContextLabel = (context?: string) =>
  context ? `[${context}] ` : '';

const logWarning = (message: string, context: string, payload: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  console.warn(`${buildContextLabel(context)}${message}`, payload);
};

const looksLikeRandomToken = (value: string): boolean => {
  const compact = value.replace(/\s+/g, '');
  if (KNOWN_CORRUPTED_IDENTIFIERS.has(compact)) {
    return true;
  }

  if (compact.length >= 12 && compact.length <= 256 && RANDOM_TOKEN_REGEX.test(compact)) {
    // إذا كان النص لا يحتوي على أي محارف JavaScript معروفة، فمن المحتمل أنه معرف تالف
    return !/[;()[\]{}.=]/.test(compact);
  }

  return false;
};

export const isCorruptedCustomScript = (rawScript?: string | null): boolean => {
  if (!rawScript) return false;
  const trimmed = rawScript.trim();
  if (!trimmed) return false;

  if (looksLikeRandomToken(trimmed)) return true;
  if (trimmed.includes('Unexpected identifier') || trimmed.includes('SyntaxError')) return true;

  return false;
};

/**
 * Validates raw script before injection to avoid crashing the page with syntax errors.
 * Returns a sanitized string that can be injected safely, or null when content is invalid.
 */
export const getSafeCustomScript = (
  rawScript?: string | null,
  options: CustomScriptValidationOptions = {}
): string | null => {
  try {
    if (!rawScript) {
      return null;
    }

    const trimmed = rawScript.trim();
    if (!trimmed) {
      return null;
    }

    const context = options.context ?? '';

    // فحص JSON في البداية - هذا هو السبب الرئيسي للمشكلة
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      logWarning(
        'تم اكتشاف JSON في custom_js بدلاً من JavaScript - سيتم تجاهله:',
        context,
        {
          context,
          jsonSnippet: trimmed.substring(0, 200) + (trimmed.length > 200 ? '...' : '')
        }
      );
      return null;
    }

    if (isCorruptedCustomScript(trimmed)) {
      logWarning(
        'تم اكتشاف معرف أو محتوى تالف في custom_js - سيتم تجاهله:',
        context,
        {
          context,
          corruptedSnippet: trimmed.substring(0, 200) + (trimmed.length > 200 ? '...' : '')
        }
      );
      return null;
    }

    // Extract inline content when users provide full <script> tags.
    const scriptTagMatch = trimmed.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const content = scriptTagMatch ? scriptTagMatch[1].trim() : trimmed;

    if (!content) {
      return null;
    }

    try {
      // Attempt to compile the script without executing it.
      // This catches syntax errors like stray identifiers or JSON blobs.
      // eslint-disable-next-line no-new-func
      new Function(content);
      return content;
    } catch (error) {
      logWarning(
        'تم تجاهل كود JavaScript مخصص بسبب خطأ في التركيب:',
        context,
        {
          error: error instanceof Error ? error.message : error,
          context,
          codeSnippet: content.substring(0, 200) + (content.length > 200 ? '...' : '')
        }
      );
      return null;
    }
  } catch (error) {
    console.warn('خطأ عام في التحقق من صحة الكود:', error);
    return null;
  }
};

export const cleanupCustomScriptValue = (rawScript?: string | null): string | null => {
  const safe = getSafeCustomScript(rawScript);
  return safe ?? null;
};
