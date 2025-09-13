import {
  getBoundingClientRectOptimized,
  getComputedStyleOptimized,
  isElementVisibleOptimized,
  scheduleWrite
} from '@/utils/domOptimizer';

// Secondary checks (copied/adapted from ProductActions.tsx)
const isElementFormLike = async (element: Element): Promise<boolean> => {
  if (!element) return false;
  try {
    const [rect, isVisible] = await Promise.all([
      getBoundingClientRectOptimized(element),
      isElementVisibleOptimized(element)
    ]);
    const tagName = element.tagName?.toLowerCase();
    const isForm = tagName === 'form';
    const hasFormData = element.hasAttribute('data-form') || element.hasAttribute('data-purchase');
    const hasFormClass = (element as HTMLElement).className?.includes('form') || (element as HTMLElement).className?.includes('purchase');
    const hasFormRole = element.getAttribute('role') === 'form';
    const hasInputs = element.querySelector('input, button, select, textarea') !== null;
    const hasReasonableSize = rect.width > 100 && rect.height > 50;
    return (isForm || hasFormData || hasFormClass || hasFormRole) && (hasInputs || hasReasonableSize) && isVisible;
  } catch {
    return false;
  }
};

const isFormElementValid = async (element: Element): Promise<boolean> => {
  if (!element) return false;
  try {
    const [rect, computedStyle, isVisible] = await Promise.all([
      getBoundingClientRectOptimized(element),
      getComputedStyleOptimized(element),
      isElementVisibleOptimized(element)
    ]);
    if (!document.contains(element)) return false;
    if (!isVisible) return false;
    const opacity = parseFloat(computedStyle.opacity || '1');
    if (opacity < 0.1) return false;
    const hasAnyDimensions = rect.width > 0 && rect.height > 0;
    const hasValidDimensions = rect.width > 10 && rect.height > 10;
    const isOnScreen = rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;
    const hasInteractiveElements = element.querySelector('input, button, select, textarea, [role="button"]') !== null;
    const isValid = hasValidDimensions && isOnScreen;
    return isValid || (hasAnyDimensions && hasInteractiveElements);
  } catch {
    return false;
  }
};

// Find the purchase form element (same selectors used in ProductActions)
const findPurchaseFormElement = async (): Promise<Element | null> => {
  const prioritySelectors = [
    '#product-purchase-form',
    '#purchase-form',
    '[data-form="product-form"]',
    '[data-form="purchase"]',
    'form[data-purchase]',
    'form[data-product]'
  ];
  const secondarySelectors = [
    '#order-form',
    '[data-form="order"]',
    '[data-testid="purchase-form"]',
    '[data-testid="product-form"]',
    '.product-form',
    '.purchase-form',
    '.order-form'
  ];
  const fallbackSelectors = ['form', '[role="form"]', '.form'];
  const allSelectors = [...prioritySelectors, ...secondarySelectors, ...fallbackSelectors];

  for (const selector of allSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (element && await isFormElementValid(element)) {
          return element;
        }
      }
    } catch {}
  }

  // More lenient second pass
  for (const selector of allSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (element && await isElementFormLike(element)) {
          return element;
        }
      }
    } catch {}
  }

  // Search common containers
  const containers = ['.container', '.main', '#app', '#root', 'body'];
  for (const containerSelector of containers) {
    try {
      const container = document.querySelector(containerSelector);
      if (container) {
        const forms = container.querySelectorAll('form, [data-form], [role="form"]');
        for (let i = 0; i < forms.length; i++) {
          const form = forms[i];
          if (form && await isFormElementValid(form)) {
            return form;
          }
        }
      }
    } catch {}
  }
  return null;
};

export const scrollToPurchaseForm = async (): Promise<boolean> => {
  // Try multiple attempts to tolerate delayed rendering
  let formElement = await findPurchaseFormElement();
  let attempts = 0;
  const maxAttempts = 5;
  while (!formElement && attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 120));
    formElement = await findPurchaseFormElement();
    attempts++;
  }

  if (!formElement) return false;

  try {
    const rect = await getBoundingClientRectOptimized(formElement);
    const windowHeight = window.innerHeight;
    let targetPosition = window.scrollY + rect.top - 150;
    if (rect.height < 100) {
      targetPosition = window.scrollY + rect.top - (windowHeight / 2) + (rect.height / 2);
    }
    targetPosition = Math.max(0, targetPosition);

    scheduleWrite(() => {
      window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      setTimeout(() => {
        if (formElement instanceof HTMLElement) {
          formElement.focus({ preventScroll: true });
        }
      }, 800);
    });
  } catch (e) {
    // Fallback
    (formElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  return true;
};

export default scrollToPurchaseForm;

