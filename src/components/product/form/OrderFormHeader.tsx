import React from 'react';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OrderFormHeaderProps {
  showIcon?: boolean;
  className?: string;
}

const OrderFormHeader: React.FC<OrderFormHeaderProps> = ({
  showIcon = true,
  className = ''
}) => {
  const { t } = useTranslation();

  return (
    <div className={`elegant-header flex items-center gap-4 ${className}`}>
      {showIcon && (
        <div className="premium-icon-wrapper">
          <FileText className="w-6 h-6 text-primary relative z-10" />
        </div>
      )}
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-foreground mb-2 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
          {t('orderForm.heroTitle', 'أكمل طلبك الآن')}
        </h2>
        <p className="text-sm text-muted-foreground/90 leading-relaxed">
          {t('orderForm.heroDescription', 'املأ البيانات التالية لإتمام طلبك بسهولة وأمان')}
        </p>
      </div>
    </div>
  );
};

export default OrderFormHeader;
