import { useState, useEffect } from 'react';

interface UseStickyButtonLogicOptions {
  orderFormRef: React.RefObject<HTMLDivElement>;
}

interface UseStickyButtonLogicReturn {
  showStickyButton: boolean;
  scrollToOrderForm: () => void;
}

export const useStickyButtonLogic = ({
  orderFormRef
}: UseStickyButtonLogicOptions): UseStickyButtonLogicReturn => {
  const [showStickyButton, setShowStickyButton] = useState(false);

  // دالة للعثور على زر الإرسال الفعلي
  const findSubmitButton = (container: HTMLElement): HTMLElement | null => {
    // أولاً: البحث بالـ ID (الطريقة الأسرع والأدق)
    const submitButtonById = container.querySelector('#order-submit-button') as HTMLElement;
    if (submitButtonById) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Found submit button by ID');
      }
      return submitButtonById;
    }

    // ثانياً: البحث عن جميع الأزرار في النموذج
    const allButtons = container.querySelectorAll('button');

    for (const button of allButtons) {
      const buttonText = button.textContent?.trim() || '';
      const hasSubmitText = buttonText.includes('إرسال الطلب') ||
                           buttonText.includes('اطلب الآن') ||
                           buttonText.includes('تأكيد الطلب');

      // التحقق من وجود أيقونة CreditCard
      const hasCreditCardIcon = button.querySelector('svg') ||
                               button.innerHTML.includes('CreditCard');

      // التحقق من الكلاسات المتعلقة بالإرسال
      const hasSubmitClass = button.className.includes('submit') ||
                             button.className.includes('primary') ||
                             button.id.includes('submit');

      if (hasSubmitText || (hasCreditCardIcon && hasSubmitClass)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Found submit button by text/icon/class');
        }
        return button as HTMLElement;
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Submit button not found');
    }
    return null;
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!orderFormRef.current) return;

      // البحث عن زر الإرسال الفعلي
      const actualSubmitButton = findSubmitButton(orderFormRef.current);

      if (actualSubmitButton) {
        const submitButtonPosition = actualSubmitButton.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;

        // إخفاء الزر الثابت فور ظهور زر الإرسال الفعلي في الشاشة
        // استخدام windowHeight بدلاً من 0.7 ليختفي فور ظهور الزر
        const shouldShow = submitButtonPosition > windowHeight;

        // لتقليل عدد التحديثات، تحديث فقط عند تغيير الحالة
        if (showStickyButton !== shouldShow) {
          setShowStickyButton(shouldShow);
          if (process.env.NODE_ENV === 'development') {
            console.log('Sticky button visibility changed:', shouldShow);
          }
        }
      } else {
        // إذا لم نجد الزر الفعلي، نستخدم المنطق القديم كبديل
        const orderFormPosition = orderFormRef.current.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        const shouldShow = orderFormPosition > windowHeight;

        if (showStickyButton !== shouldShow) {
          setShowStickyButton(shouldShow);
        }
      }
    };

    // استخدام throttle للأداء الأفضل
    let ticking = false;
    const scrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
    handleScroll(); // تشغيل أولي

    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, [orderFormRef, showStickyButton]);

  const scrollToOrderForm = () => {
    if (orderFormRef.current) {
      // محاولة التمرير إلى زر الإرسال الفعلي أولاً
      const actualSubmitButton = findSubmitButton(orderFormRef.current);

      if (actualSubmitButton) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Scrolling to actual submit button');
        }
        actualSubmitButton.scrollIntoView({
          behavior: 'smooth',
          block: 'center' // وضع الزر في وسط الشاشة
        });
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('Scrolling to order form (fallback)');
        }
        // إذا لم نجد الزر، نتمرر إلى النموذج كبديل
        orderFormRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return { showStickyButton, scrollToOrderForm };
};
