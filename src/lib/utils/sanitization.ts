/**
 * Input Sanitization Utility
 * Protects against XSS attacks by sanitizing user input
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param dirty - The potentially unsafe HTML string
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize text content - strips all HTML tags
 * @param text - The potentially unsafe text string
 * @returns Plain text with all HTML removed
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';

  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize organization name - allows minimal formatting
 * @param name - Organization name
 * @returns Sanitized organization name
 */
export function sanitizeOrganizationName(name: string | null | undefined): string {
  if (!name) return '';

  // Remove all HTML tags but keep content
  const cleaned = DOMPurify.sanitize(name, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  // Trim and remove excessive whitespace
  return cleaned.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 * @param url - The URL to sanitize
 * @returns Safe URL or empty string if invalid
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '';

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    console.warn('[Sanitization] Blocked dangerous URL protocol:', url);
    return '';
  }

  return url.trim();
}

/**
 * Sanitize email address
 * @param email - Email address to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';

  // Remove HTML and trim
  const cleaned = DOMPurify.sanitize(email, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  }).trim();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) {
    return '';
  }

  return cleaned;
}

/**
 * Sanitize search query input
 * @param query - Search query string
 * @returns Sanitized search query
 */
export function sanitizeSearchQuery(query: string | null | undefined): string {
  if (!query) return '';

  // Remove HTML tags
  const cleaned = DOMPurify.sanitize(query, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  // Trim and limit length
  return cleaned.trim().substring(0, 100);
}

/**
 * Sanitize user input for display in React components
 * Use this for any user-generated content that needs to be displayed
 * @param input - User input string
 * @param allowBasicFormatting - Whether to allow basic HTML formatting (b, i, em, strong)
 * @returns Sanitized string safe for display
 */
export function sanitizeUserInput(
  input: string | null | undefined,
  allowBasicFormatting: boolean = false
): string {
  if (!input) return '';

  if (allowBasicFormatting) {
    return sanitizeHtml(input);
  }

  return sanitizeText(input);
}

/**
 * Create a sanitized object from user input
 * Sanitizes all string values in an object
 * @param obj - Object with potentially unsafe values
 * @returns Object with sanitized values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeText(sanitized[key]) as any;
    } else if (sanitized[key] && typeof sanitized[key] === 'object' && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }

  return sanitized;
}
