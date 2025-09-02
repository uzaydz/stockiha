import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageSwitcher } from '@/hooks/useLanguageSwitcher';
import { 
  getDefaultHeroData,
  getButtonText,
  processText
} from './utils';
import { HeroData } from './types';

/**
 * Hook مخصص لإدارة بيانات البانر مع تحسينات الأداء
 * يتعامل مع الترجمة ومعالجة البيانات بطريقة محسّنة
 */
export const useBannerData = (heroData?: HeroData) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageSwitcher();

  const isRTL = currentLanguage.direction === 'rtl';

  // معالجة البيانات مع الترجمة باستخدام useMemo للأداء
  const processedData = useMemo(() => {
    const translatedDefaultData = getDefaultHeroData(t);
    const currentHeroData = heroData || translatedDefaultData;
    
    // استخراج النصوص والروابط
    const primaryButtonText = getButtonText(
      currentHeroData.primaryButton?.text || currentHeroData.primaryButtonText,
      translatedDefaultData.primaryButtonText
    );
    const primaryButtonLink = currentHeroData.primaryButton?.link || 
      currentHeroData.primaryButtonLink || 
      translatedDefaultData.primaryButtonLink;
    
    const secondaryButtonText = getButtonText(
      currentHeroData.secondaryButton?.text || currentHeroData.secondaryButtonText,
      translatedDefaultData.secondaryButtonText
    );
    const secondaryButtonLink = currentHeroData.secondaryButton?.link || 
      currentHeroData.secondaryButtonLink || 
      translatedDefaultData.secondaryButtonLink;
    
    const title = processText(currentHeroData.title, translatedDefaultData.title);
    const description = processText(currentHeroData.description, translatedDefaultData.description);
    
    return {
      imageUrl: currentHeroData.imageUrl,
      title,
      description,
      primaryButtonText,
      primaryButtonLink,
      secondaryButtonText,
      secondaryButtonLink,
      primaryButtonStyle: currentHeroData.primaryButtonStyle || 'primary',
      secondaryButtonStyle: currentHeroData.secondaryButtonStyle || 'outline',
      isRTL,
      // إضافة بيانات المنتجات مع قيم افتراضية
      selectedProducts: currentHeroData.selectedProducts || [],
      showProducts: currentHeroData.showProducts !== false, // افتراضي true
      productsDisplay: currentHeroData.productsDisplay || 'grid',
      productsLimit: currentHeroData.productsLimit || 6,
      productsType: (currentHeroData as any).productsType || 'featured'
    };
  }, [heroData, t, isRTL]);

  return processedData;
};
