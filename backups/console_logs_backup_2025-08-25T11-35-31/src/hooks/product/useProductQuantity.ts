import { useState, useCallback, useEffect } from 'react';

interface UseProductQuantityProps {
  initialQuantity?: number;
  maxQuantity: number;
  minQuantity?: number;
  step?: number;
  onQuantityChange?: (quantity: number) => void;
}

interface ProductQuantityState {
  quantity: number;
  canIncrease: boolean;
  canDecrease: boolean;
  isValidQuantity: boolean;
  quantityError?: string;
}

interface ProductQuantityActions {
  setQuantity: (quantity: number) => void;
  increaseQuantity: () => void;
  decreaseQuantity: () => void;
  resetQuantity: () => void;
  validateQuantity: (quantity: number) => boolean;
}

/**
 * Hook لإدارة كمية المنتج - محسن للأداء
 * - يدير زيادة ونقصان الكمية
 * - يتحقق من صحة الكمية
 * - يمنع الكميات غير الصحيحة
 * - يستخدم useCallback لتحسين الأداء
 */
export const useProductQuantity = ({
  initialQuantity = 1,
  maxQuantity,
  minQuantity = 1,
  step = 1,
  onQuantityChange
}: UseProductQuantityProps): [ProductQuantityState, ProductQuantityActions] => {
  
  const [quantity, setQuantityState] = useState(initialQuantity);
  const [quantityError, setQuantityError] = useState<string | undefined>();

  // حساب إمكانية زيادة الكمية
  const canIncrease = quantity < maxQuantity;

  // حساب إمكانية نقصان الكمية
  const canDecrease = quantity > minQuantity;

  // التحقق من صحة الكمية
  const isValidQuantity = quantity >= minQuantity && quantity <= maxQuantity;

  // التحقق من صحة كمية محددة
  const validateQuantity = useCallback((qty: number): boolean => {
    if (qty < minQuantity) {
      setQuantityError(`الكمية يجب أن تكون ${minQuantity} على الأقل`);
      return false;
    }
    
    if (qty > maxQuantity) {
      setQuantityError(`الكمية يجب أن تكون ${maxQuantity} كحد أقصى`);
      return false;
    }
    
    if (qty % step !== 0) {
      setQuantityError(`الكمية يجب أن تكون من مضاعفات ${step}`);
      return false;
    }
    
    setQuantityError(undefined);
    return true;
  }, [minQuantity, maxQuantity, step]);

  // تعيين الكمية مع التحقق من الصحة
  const setQuantity = useCallback((newQuantity: number) => {
    if (validateQuantity(newQuantity)) {
      setQuantityState(newQuantity);
      onQuantityChange?.(newQuantity);
    }
  }, [validateQuantity, onQuantityChange]);

  // زيادة الكمية
  const increaseQuantity = useCallback(() => {
    if (canIncrease) {
      const newQuantity = Math.min(quantity + step, maxQuantity);
      setQuantity(newQuantity);
    }
  }, [canIncrease, quantity, step, maxQuantity, setQuantity]);

  // نقصان الكمية
  const decreaseQuantity = useCallback(() => {
    if (canDecrease) {
      const newQuantity = Math.max(quantity - step, minQuantity);
      setQuantity(newQuantity);
    }
  }, [canDecrease, quantity, step, minQuantity, setQuantity]);

  // إعادة تعيين الكمية
  const resetQuantity = useCallback(() => {
    setQuantity(minQuantity);
  }, [minQuantity, setQuantity]);

  // تحديث الكمية عند تغيير الحدود
  useEffect(() => {
    if (quantity > maxQuantity) {
      setQuantity(maxQuantity);
    } else if (quantity < minQuantity) {
      setQuantity(minQuantity);
    }
  }, [maxQuantity, minQuantity, quantity, setQuantity]);

  // التحقق من صحة الكمية الحالية عند تغيير الحدود
  useEffect(() => {
    validateQuantity(quantity);
  }, [quantity, validateQuantity]);

  const state: ProductQuantityState = {
    quantity,
    canIncrease,
    canDecrease,
    isValidQuantity,
    quantityError
  };

  const actions: ProductQuantityActions = {
    setQuantity,
    increaseQuantity,
    decreaseQuantity,
    resetQuantity,
    validateQuantity
  };

  return [state, actions];
};
