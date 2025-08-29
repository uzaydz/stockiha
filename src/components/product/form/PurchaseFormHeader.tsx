import React from 'react';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PurchaseFormHeaderProps {
  title?: string;
  description?: string;
  showIcon?: boolean;
  className?: string;
}

const PurchaseFormHeader: React.FC<PurchaseFormHeaderProps> = ({
  title,
  description,
  showIcon = true,
  className = ''
}) => {
  const { t } = useTranslation();

  // النص الافتراضي إذا لم يتم تمرير عنوان أو وصف
  const defaultTitle = title || t('form.fillFormToOrder', 'ملء النموذج للطلب');
  const defaultDescription = description || t('orderForm.fillDetails', 'املأ البيانات التالية لإتمام طلبك بعناية');

  return (
    <div className={`elegant-header flex items-center gap-4 ${className}`}>
      {showIcon && (
        <div className="premium-icon-wrapper">
          <FileText className="w-6 h-6 text-primary relative z-10" />
        </div>
      )}
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-foreground mb-2 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
          {defaultTitle}
        </h2>
        <p className="text-sm text-muted-foreground/90 leading-relaxed">
          {defaultDescription}
        </p>
      </div>
    </div>
  );
};

export default PurchaseFormHeader;
