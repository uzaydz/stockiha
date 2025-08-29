import React, { memo, useCallback, useMemo, useEffect, useState, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import { 
  CheckIcon, 
  ArrowDownIcon,
  ShoppingCartIcon,
  SparklesIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ProductActionsProps {
  totalPrice: number;
  deliveryFee?: number;
  canPurchase: boolean;
  buyingNow: boolean;
  onBuyNow: () => void;
  currency?: string;
  isCalculatingDelivery?: boolean;
  className?: string;
  productName?: string;
  discountPercentage?: number;
  originalPrice?: number;
  isOnSale?: boolean;
  estimatedDeliveryTime?: string;
  availableStock?: number;
}

// Enhanced animation variants for modern design
const floatingVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 0.8
    }
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
};

// Gentle pulse animation for call-to-action
const pulseVariants: Variants = {
  initial: { scale: 1 },
  animate: { 
    scale: [1, 1.02, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Button interaction variants
const buttonVariants: Variants = {
  hover: { scale: 1.02 },
  tap: { scale: 0.98 }
};

// Enhanced form detection with immediate and comprehensive search
const findPurchaseFormElement = (): Element | null => {
  // Priority selectors - most likely to match
  const prioritySelectors = [
    '#product-purchase-form',
    '#purchase-form',
    '[data-form="product-form"]',
    '[data-form="purchase"]',
    'form[data-purchase]',
    'form[data-product]'
  ];

  // Secondary selectors - fallback options
  const secondarySelectors = [
    '#order-form',
    '[data-form="order"]',
    '[data-testid="purchase-form"]',
    '[data-testid="product-form"]',
    '.product-form',
    '.purchase-form',
    '.order-form'
  ];

  // Last resort - very general selectors
  const fallbackSelectors = [
    'form',
    '[role="form"]',
    '.form'
  ];

  const allSelectors = [...prioritySelectors, ...secondarySelectors, ...fallbackSelectors];



  // First pass: try all selectors with validation
  for (const selector of allSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (element && isFormElementValid(element)) {

          return element;
        }
      }
    } catch (error) {

    }
  }

  // Second pass: be even more lenient - accept any form-like element
  for (const selector of allSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (element && isElementFormLike(element)) {

          return element;
        }
      }
    } catch (error) {

    }
  }

  // Third pass: search in common containers
  const containers = ['.container', '.main', '#app', '#root', 'body'];
  for (const containerSelector of containers) {
    try {
      const container = document.querySelector(containerSelector);
      if (container) {
        const forms = container.querySelectorAll('form, [data-form], [role="form"]');
        for (let i = 0; i < forms.length; i++) {
          const form = forms[i];
          if (form && isFormElementValid(form)) {
            return form;
          }
        }
      }
    } catch (error) {
      // Ignore errors in container search
    }
  }
  return null;
};

// Additional check for form-like elements (more lenient)
const isElementFormLike = (element: Element): boolean => {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  const tagName = element.tagName?.toLowerCase();

  // Check if it's a form element or has form-like attributes
  const isForm = tagName === 'form';
  const hasFormData = element.hasAttribute('data-form') || element.hasAttribute('data-purchase');
  const hasFormClass = element.className?.includes('form') || element.className?.includes('purchase');
  const hasFormRole = element.getAttribute('role') === 'form';

  // Check if it has interactive elements
  const hasInputs = element.querySelector('input, button, select, textarea') !== null;

  // Check if it has reasonable dimensions
  const hasReasonableSize = rect.width > 100 && rect.height > 50;

  // Check if it's visible
  const isVisible = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';

  const isFormLike = (isForm || hasFormData || hasFormClass || hasFormRole) &&
                    (hasInputs || hasReasonableSize) &&
                    isVisible;

  return isFormLike;
};

// Enhanced form validation that checks multiple conditions with ultra-lenient approach
const isFormElementValid = (element: Element): boolean => {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  const parentStyle = element.parentElement ? window.getComputedStyle(element.parentElement) : null;

  // Check if element is visible in the DOM
  const isInDOM = document.contains(element);

  // Check basic visibility
  const isVisible = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';

  // Check opacity (including parent opacity)
  const opacity = parseFloat(computedStyle.opacity || '1');
  const parentOpacity = parentStyle ? parseFloat(parentStyle.opacity || '1') : 1;
  const effectiveOpacity = opacity * parentOpacity;

  // Check if element is animating or transitioning
  const isTransforming = computedStyle.transform !== 'none';
  const hasTransition = computedStyle.transition && computedStyle.transition !== 'none';
  const isAnimating = isTransforming || hasTransition;

  // Ultra-lenient dimension checking - accept even very small forms
  const hasAnyDimensions = rect.width > 0 && rect.height > 0;
  const hasValidDimensions = rect.width > 10 && rect.height > 10;
  const hasReasonableDimensions = rect.width > 50 && rect.height > 20;

  // Check if element is positioned off-screen
  const isOnScreen = rect.top < window.innerHeight && rect.bottom > 0 &&
                   rect.left < window.innerWidth && rect.right > 0;

  // Special cases for different form states
  const isValidAnimating = isAnimating && hasAnyDimensions;
  const isValidLoading = hasAnyDimensions && isVisible && effectiveOpacity > 0.1;
  const isValidInteractive = hasReasonableDimensions && isVisible;

  // Check if form has interactive elements (inputs, buttons) - be more lenient
  const hasInteractiveElements = element.querySelector('input, button, select, textarea, [role="button"]') !== null;

  // Primary validation - accept forms that have ANY dimensions and are visible
  const isValid = isInDOM && isVisible && effectiveOpacity > 0.1 &&
                 (hasValidDimensions || isValidAnimating || isValidLoading) && isOnScreen;

  // Secondary check - if form has interactive elements, be even more lenient
  const isAcceptablyValid = isValid || (hasAnyDimensions && hasInteractiveElements && isVisible);

  return isAcceptablyValid;
};

// العثور على أقرب حاوية قابلة للتمرير (للصفحات التي تستخدم حاوية scroll غير window)
const getScrollableAncestor = (el: Element | null): Element | Window => {
  if (!el || typeof window === 'undefined') return window;
  let parent: HTMLElement | null = el.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const overflow = style.overflow;
    if (/(auto|scroll|overlay)/.test(overflowY) || /(auto|scroll|overlay)/.test(overflow)) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return window;
};

    // Enhanced scroll function with better targeting
const scrollElementIntoView = (el: Element, preferSmooth = true) => {
  // Calculate the position to scroll to
  const rect = el.getBoundingClientRect();
  const absoluteTop = window.scrollY + rect.top;
  const offset = 120; // Offset to ensure form is well in view
  const targetPosition = Math.max(0, absoluteTop - offset);

  // Perform the scroll
  window.scrollTo({
    top: targetPosition,
    behavior: preferSmooth ? 'smooth' : 'auto'
  });

  // Focus the form for accessibility
  setTimeout(() => {
    if (el instanceof HTMLElement) {
      el.focus({ preventScroll: true });
    }
  }, preferSmooth ? 500 : 100);
};





const ProductActions = memo(({
  totalPrice,
  deliveryFee = 0,
  canPurchase,
  buyingNow,
  onBuyNow,
  currency = 'دج',
  isCalculatingDelivery = false,
  className,
  productName,
  discountPercentage,
  originalPrice,
  isOnSale = false,
  estimatedDeliveryTime,
  availableStock = 0
}: ProductActionsProps) => {

  // Combined state management for better performance
  const [uiState, setUiState] = useState({
    isVisible: true,
    isAtForm: false,
    hasForm: false,
    isHovered: false,
    orderSuccess: false
  });
  
  const prefersReducedMotion = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isInitialMount = useRef(true);
  
  // Translation hook
  const { t } = useTranslation();

  // Simple calculations for component state
  const componentData = useMemo(() => {
    const hasDiscount = isOnSale && originalPrice && originalPrice > totalPrice;
    const isOutOfStock = availableStock <= 0;
    const canProceed = canPurchase && !isOutOfStock && !buyingNow;
    
    return {
      hasDiscount,
      isOutOfStock,
      canProceed,
      discountPercentage: discountPercentage || 0
    };
  }, [totalPrice, originalPrice, isOnSale, availableStock, canPurchase, buyingNow, discountPercentage]);

  // Device detection for optimizations
  const deviceInfo = useMemo(() => ({
    isMobile: typeof window !== 'undefined' && (window.innerWidth < 768 || 'ontouchstart' in window),
    shouldReduceAnimations: prefersReducedMotion || (typeof window !== 'undefined' && window.innerWidth < 768)
  }), [prefersReducedMotion]);

  // Enhanced form monitoring with better intersection detection and error handling
  useEffect(() => {
    let cancelled = false;
    let retryId: number | null = null;
    let domObserver: MutationObserver | null = null;

    const attachObserver = () => {
      if (cancelled) return false;

      try {
        const formElement = findPurchaseFormElement();
        if (!formElement) return false;

        // Clean up previous observer
        if (observerRef.current) {
          observerRef.current.disconnect();
        }

        const rootCandidate = getScrollableAncestor(formElement);

        // Create IntersectionObserver with better threshold detection for forms below other components
        observerRef.current = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry || cancelled) return;

            const rect = entry.boundingClientRect;
            const computedStyle = window.getComputedStyle(formElement);

            // Ultra-lenient dimension checking - accept even very small forms
            const hasAnyDimensions = rect.width > 0 && rect.height > 0;
            const hasValidDimensions = rect.width > 10 && rect.height > 10;
            const isVisible = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
            const opacity = parseFloat(computedStyle.opacity || '1');

            // If form has ANY dimensions and is visible, process it
            if (!hasAnyDimensions || !isVisible || opacity < 0.1) {
              return;
            }

            // For forms positioned below other components, use very lenient visibility detection
            const isFormVisible = entry.isIntersecting && entry.intersectionRatio > 0.05; // Very low threshold
            const isFormInLowerViewport = rect.top < window.innerHeight * 0.9 && rect.bottom > 10; // Very low threshold

            // Update state based on visibility - hide button when form becomes visible
            setUiState(prev => {
              const shouldHide = isFormVisible || isFormInLowerViewport;
              const shouldShow = !shouldHide;

              if (prev.isVisible !== shouldShow) {
                return {
                  ...prev,
                  isAtForm: shouldHide,
                  isVisible: shouldShow,
                  hasForm: true
                };
              }
              return prev;
            });
          },
          {
            threshold: [0, 0.1, 0.2, 0.3, 0.5], // Multiple thresholds for better detection
            root: rootCandidate === window ? null : (rootCandidate as Element),
            rootMargin: '0px 0px -200px 0px' // Hide button when form is 200px from bottom of viewport
          }
        );

        observerRef.current.observe(formElement);
        setUiState(prev => ({ ...prev, hasForm: true }));
        return true;
      } catch (error) {
        return false;
      }
    };

    const boot = () => {
      // Immediate attempt
      if (attachObserver()) return;

      // Retry with intervals for slow loading
      let attempts = 0;
      const maxAttempts = 30; // Increased attempts
      const delay = 200; // Shorter delay for faster detection
      
      retryId = window.setInterval(() => {
        if (cancelled) return;

        if (attachObserver()) {
          if (retryId) clearInterval(retryId);
          if (domObserver) domObserver.disconnect();
          retryId = null;
          domObserver = null;
        } else if (++attempts >= maxAttempts) {
          if (retryId) clearInterval(retryId);
          retryId = null;
        }
      }, delay);

      // Watch for DOM changes to start observer when form appears
      domObserver = new MutationObserver(() => {
        if (attachObserver() && retryId) {
          clearInterval(retryId);
          retryId = null;
        }
      });
      domObserver.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['id', 'class', 'data-form']
      });
    };

    boot();

    return () => {
      cancelled = true;
      if (retryId) clearInterval(retryId);
      if (observerRef.current) observerRef.current.disconnect();
      if (domObserver) domObserver.disconnect();
    };
  }, []);

  // Enhanced scroll-based detection with better form position handling
  useEffect(() => {
    const checkFormPosition = () => {
      try {
        const formElement = findPurchaseFormElement();
        if (!formElement) {
          return;
        }

        const rect = formElement.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Enhanced dimension checking with computed styles
        const computedStyle = window.getComputedStyle(formElement);
        const isVisible = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
        const opacity = parseFloat(computedStyle.opacity || '1');

        // Ultra-lenient dimension checking - accept even very small forms
        const hasAnyDimensions = rect.width > 0 && rect.height > 0;
        const hasValidDimensions = rect.width > 10 && rect.height > 10;

        // Consider form ready if it has ANY dimensions and is visible
        const isFormReady = (hasAnyDimensions || hasValidDimensions) && isVisible && opacity > 0.1;

        if (!isFormReady) {
          return;
        }

        // Since form is positioned below quantity selector, we need to detect when it comes into view
        // Form is visible when it's in the lower portion of the viewport - reduced thresholds
        const isFormVisible = rect.top < windowHeight * 0.9 && rect.bottom > 20;
        // Form is prominently visible when it's well within viewport
        const isFormProminentlyVisible = rect.top < windowHeight * 0.7 && rect.bottom > windowHeight * 0.1;

        // Hide button when form becomes visible as user scrolls down
        if ((isFormVisible || isFormProminentlyVisible) && uiState.isVisible) {
          setUiState(prev => ({
            ...prev,
            isVisible: false,
            isAtForm: true
          }));
        }
        // Show button when user scrolls back up and form is no longer visible
        else if (!isFormVisible && !uiState.isVisible && uiState.hasForm) {
          setUiState(prev => ({
            ...prev,
            isVisible: true,
            isAtForm: false
          }));
        }
      } catch (error) {
        // Ignore scroll position errors
      }
    };

    // Throttled scroll handler
    let scrollTimeout: number | null = null;
    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(checkFormPosition, 100);
    };

    // Initial check after page loads
    const initialCheck = setTimeout(checkFormPosition, 1000);
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      if (initialCheck) clearTimeout(initialCheck);
    };
  }, [uiState.isVisible, uiState.hasForm]);

  // Enhanced initial check for form position when component mounts
  useLayoutEffect(() => {
    // Wait for DOM to be fully rendered before checking form position
    const checkInitialFormPosition = () => {
      try {
        const formElement = findPurchaseFormElement();
        if (!formElement) {
          return;
        }

        const rect = formElement.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const computedStyle = window.getComputedStyle(formElement);

        // Enhanced checks for form readiness with more lenient criteria
        const isVisible = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
        const opacity = parseFloat(computedStyle.opacity || '1');
        const hasValidDimensions = rect.width > 10 && rect.height > 10;
        const isFormPresent = hasValidDimensions && isVisible && opacity > 0.1;

        if (!isFormPresent) {
          // Still mark form as found for future detection
          setUiState(prev => ({ ...prev, hasForm: true }));
          return;
        }

        // Since form is below product quantity selector, it should initially be below viewport
        // Only hide button if form is currently visible in viewport - reduced threshold
        const isFormCurrentlyVisible = rect.top < windowHeight * 0.8 && rect.bottom > 50;

        setUiState(prev => ({
          ...prev,
          hasForm: true,
          isVisible: !isFormCurrentlyVisible, // Hide if form is visible, show if not
          isAtForm: isFormCurrentlyVisible
        }));
      } catch (error) {
        // Fallback: assume form exists but is not visible initially
        setUiState(prev => ({ ...prev, hasForm: true, isVisible: true, isAtForm: false }));
      }
    };

    // Check immediately and with progressive delays to handle animations
    checkInitialFormPosition();
    const delayedCheck1 = setTimeout(checkInitialFormPosition, 200); // Reduced delay
    const delayedCheck2 = setTimeout(checkInitialFormPosition, 600);
    const delayedCheck3 = setTimeout(checkInitialFormPosition, 1200);
    const finalCheck = setTimeout(checkInitialFormPosition, 2000);

    return () => {
      clearTimeout(delayedCheck1);
      clearTimeout(delayedCheck2);
      clearTimeout(delayedCheck3);
      clearTimeout(finalCheck);
    };
  }, []);

  // Enhanced action handler with immediate and comprehensive form detection
  const handleAction = useCallback(async () => {
    if (!buttonRef.current) return;

    // Visual feedback for button press
    if (!deviceInfo.shouldReduceAnimations) {
      buttonRef.current.style.transform = 'scale(0.96)';
      requestAnimationFrame(() => {
        if (buttonRef.current) {
          buttonRef.current.style.transform = '';
        }
      });
    }

    // Try multiple times to find the form with increasing leniency
    let formElement = findPurchaseFormElement();
    let attempts = 0;
    const maxAttempts = 3;

    while (!formElement && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between attempts
      formElement = findPurchaseFormElement();
      attempts++;
    }

    if (formElement) {
      // Navigate to form with enhanced scrolling
      // Enhanced scroll function that works even with small forms
      const enhancedScrollToForm = (element: Element) => {
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Calculate optimal scroll position
        let targetPosition = window.scrollY + rect.top - 150; // 150px offset from top

        // If form is very small, scroll to center it better
        if (rect.height < 100) {
          targetPosition = window.scrollY + rect.top - (windowHeight / 2) + (rect.height / 2);
        }

        // Ensure we don't scroll above the page
        targetPosition = Math.max(0, targetPosition);

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });

        // Focus the form for accessibility
        setTimeout(() => {
          if (element instanceof HTMLElement) {
            element.focus({ preventScroll: true });
          }
        }, 800);
      };

      enhancedScrollToForm(formElement);

      // Immediately hide the button since we're navigating to form
      setUiState(prev => ({
        ...prev,
        isVisible: false,
        isAtForm: true,
        hasForm: true
      }));

    } else {
      // Last resort: try to find any form-like element in the page
      const allForms = document.querySelectorAll('form, [data-form], [role="form"]');
      for (let i = 0; i < allForms.length; i++) {
        const potentialForm = allForms[i];
        if (potentialForm && isElementFormLike(potentialForm)) {
          formElement = potentialForm;
          break;
        }
      }

      if (formElement) {
        // Use the same enhanced scroll function
        const enhancedScrollToForm = (element: Element) => {
          const rect = element.getBoundingClientRect();
          const targetPosition = Math.max(0, window.scrollY + rect.top - 150);

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });

          setTimeout(() => {
            if (element instanceof HTMLElement) {
              element.focus({ preventScroll: true });
            }
          }, 800);
        };

        enhancedScrollToForm(formElement);

        setUiState(prev => ({
          ...prev,
          isVisible: false,
          isAtForm: true,
          hasForm: true
        }));
        return;
      }

      // Only proceed with direct purchase if no form is found at all
      if (!buyingNow && canPurchase) {
        try {
          await onBuyNow();
          setUiState(prev => ({ ...prev, orderSuccess: true }));
          setTimeout(() => {
            setUiState(prev => ({ ...prev, orderSuccess: false }));
          }, 3000);
        } catch (error) {
          // Ignore purchase errors
        }
      }
    }
  }, [buyingNow, canPurchase, onBuyNow, deviceInfo, uiState]);

  const handleMouseEnter = useCallback(() => {
    if (!deviceInfo.isMobile) {
      setUiState(prev => ({ ...prev, isHovered: true }));
    }
  }, [deviceInfo.isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (!deviceInfo.isMobile) {
      setUiState(prev => ({ ...prev, isHovered: false }));
    }
  }, [deviceInfo.isMobile]);

  // Enhanced animation variants based on device capabilities
  const computedFloatingVariants: Variants = useMemo(() => {
    if (deviceInfo.shouldReduceAnimations) {
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } },
        exit: { opacity: 0, transition: { duration: 0.15 } }
      };
    }
    return floatingVariants;
  }, [deviceInfo.shouldReduceAnimations]);

  return (
    <AnimatePresence mode="wait">
      {uiState.isVisible && !uiState.isAtForm && (
        <motion.div 
          className={cn(
            "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm pb-[env(safe-area-inset-bottom)]",
            "md:max-w-md",
            "pointer-events-none",
            className
          )}
          variants={computedFloatingVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{ willChange: 'transform, opacity' }}
          role="region"
          aria-label={t('productActions.productActions')}
        >
          {/* Compact modern container */}
          <div className={cn(
            "relative pointer-events-auto rounded-xl border overflow-hidden",
            "bg-white/96 dark:bg-gray-900/96 backdrop-blur-sm",
            "border-gray-200/50 dark:border-gray-700/50",
            "shadow-md shadow-black/8 dark:shadow-black/30"
          )}>
            
            {/* Compact offer badge */}
            {componentData.hasDiscount && componentData.discountPercentage > 0 && (
              <motion.div
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                className="absolute -top-1 -right-1 z-10"
              >
                <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-0.5 text-xs font-bold shadow-md">
                  -{componentData.discountPercentage}%
                </Badge>
              </motion.div>
            )}

            {/* Compact main button */}
            <div className="p-3">
              <motion.div
                variants={componentData.canProceed && !deviceInfo.shouldReduceAnimations ? pulseVariants : {}}
                initial="initial"
                animate={componentData.canProceed && !deviceInfo.shouldReduceAnimations ? "animate" : "initial"}
              >
                <Button
                  ref={buttonRef}
                  onClick={handleAction}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  disabled={!componentData.canProceed && !uiState.hasForm}
                  className={cn(
                    "relative w-full h-12 rounded-lg font-semibold text-sm",
                    "bg-gradient-to-r from-primary to-primary/90",
                    "hover:from-primary/90 hover:to-primary",
                    "shadow-md hover:shadow-lg transition-all duration-200",
                    "border-0 focus:ring-2 focus:ring-primary/30",
                    uiState.orderSuccess && "bg-gradient-to-r from-green-500 to-green-600",
                    componentData.isOutOfStock && "opacity-50 cursor-not-allowed"
                  )}
                  aria-label={
                    componentData.isOutOfStock ? t('productActions.outOfStock') :
                    buyingNow ? t('productActions.calculating') :
                    uiState.hasForm ? t('productActions.scrollToForm') :
                    t('productActions.buyNow')
                  }
                >
                  {/* Compact icon and text */}
                  <div className="flex items-center gap-2.5 w-full">
                    <motion.div 
                      className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center backdrop-blur-sm flex-shrink-0"
                      animate={uiState.orderSuccess ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <AnimatePresence mode="wait">
                        {uiState.orderSuccess ? (
                          <motion.div
                            key="success"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0 }}
                            transition={{ duration: 0.3, type: "spring" }}
                          >
                            <CheckIcon className="h-5 w-5 text-white" />
                          </motion.div>
                        ) : buyingNow || isCalculatingDelivery ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-6 h-6"
                          >
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          </motion.div>
                        ) : componentData.isOutOfStock ? (
                          <motion.div
                            key="outofstock"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <HeartIcon className="h-5 w-5 text-white/80" />
                          </motion.div>
                        ) : uiState.hasForm ? (
                          <motion.div
                            key="form"
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 10, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ArrowDownIcon className="h-5 w-5 text-white" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="purchase"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0 }}
                            transition={{ duration: 0.3, type: "spring" }}
                          >
                            <ShoppingCartIcon className="h-5 w-5 text-white" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    
                    {/* Compact button text */}
                    <div className="flex-1 text-center">
                      <motion.div 
                        className="text-base font-bold leading-tight"
                        animate={uiState.orderSuccess ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        {uiState.orderSuccess ? t('productActions.success') :
                         componentData.isOutOfStock ? t('productActions.outOfStock') :
                         buyingNow ? t('productActions.calculating') :
                         isCalculatingDelivery ? t('productActions.calculatingCost') :
                         uiState.hasForm ? t('productActions.orderNow') :
                         t('productActions.buyNow')}
                      </motion.div>
                      
                      {/* Compact subtitle */}
                      <div className="text-xs opacity-75 mt-0.5">
                        {uiState.orderSuccess ? t('productActions.thankYou') :
                         componentData.isOutOfStock ? t('productActions.willNotify') :
                         buyingNow || isCalculatingDelivery ? t('productActions.pleaseWait') :
                         uiState.hasForm ? t('productActions.clickToGo') :
                         t('productActions.completeRequest')}
                      </div>
                    </div>
                  </div>
                </Button>
              </motion.div>
            </div>

            {/* Compact info section */}
            {componentData.hasDiscount && !uiState.orderSuccess && !componentData.isOutOfStock && (
              <motion.div
                className="px-3 pb-3"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-center p-2 bg-gradient-to-r from-green-50/60 to-emerald-50/60 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200/40 dark:border-green-800/40">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <SparklesIcon className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{t('productActions.saving')} {componentData.discountPercentage}%</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Compact out of stock message */}
            {componentData.isOutOfStock && !uiState.orderSuccess && (
              <motion.div
                className="px-3 pb-3"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center justify-center p-2.5 bg-gradient-to-r from-amber-50/60 to-orange-50/60 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                      <HeartIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-center">
                      <span className="font-medium text-xs">{t('productActions.currentlyUnavailable')}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ProductActions.displayName = 'ProductActions';

export { ProductActions };
