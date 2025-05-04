import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { BanknotesIcon, ReceiptPercentIcon } from '@heroicons/react/24/outline';

interface DebtsSummaryProps {
  data: {
    totalDebts: number;
    totalPartialPayments: number;
  };
}

const DebtsSummary: React.FC<DebtsSummaryProps> = ({ data }) => {
  const { theme } = useTheme();
  
  return (
    <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
      <h2 className="text-xl font-bold mb-4 text-foreground">ملخص الديون</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* إجمالي الديون */}
        <div className="flex items-start space-x-4 rtl:space-x-reverse">
          <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-red-900/20' : 'bg-red-100'}`}>
            <BanknotesIcon className={`w-8 h-8 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">إجمالي الديون المستحقة</p>
            <h3 className="text-2xl font-bold text-foreground">{data.totalDebts.toFixed(2)} دج</h3>
            <p className="text-xs text-muted-foreground mt-1">
              المبالغ المتبقية من الدفعات الجزئية والتي تعتبر ديون مستحقة
            </p>
          </div>
        </div>
        
        {/* عدد الدفعات الجزئية */}
        <div className="flex items-start space-x-4 rtl:space-x-reverse">
          <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-amber-900/20' : 'bg-amber-100'}`}>
            <ReceiptPercentIcon className={`w-8 h-8 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">عدد الطلبات بدفع جزئي</p>
            <h3 className="text-2xl font-bold text-foreground">{data.totalPartialPayments}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              إجمالي عدد الطلبات التي تم دفعها بشكل جزئي ومتبقي عليها مبالغ مستحقة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebtsSummary; 