import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { CustomerDebtsInfo } from '@/lib/api/debts';

interface DebtsPerEmployeeProps {
  data: CustomerDebtsInfo[];
}

const DebtsPerEmployee: React.FC<DebtsPerEmployeeProps> = ({ data }) => {
  const { theme } = useTheme();
  
  // حساب إجمالي الديون لحساب النسب المئوية
  const totalDebtsAmount = data.reduce((total, customer) => total + customer.totalDebts, 0);
  
  return (
    <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
      <h2 className="text-xl font-bold mb-4 text-foreground">الديون حسب العملاء</h2>
      
      {data.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          لا توجد ديون مسجلة للعملاء
        </div>
      ) : (
        <div className="space-y-6">
          {data.map((customer, index) => {
            // حساب النسبة المئوية من إجمالي الديون
            const percentageOfTotal = totalDebtsAmount > 0 
              ? (customer.totalDebts / totalDebtsAmount) * 100 
              : 0;
            
            return (
              <div key={customer.customerId} className="border-b border-border pb-4 last:border-none last:pb-0">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-medium text-foreground">{customer.customerName}</h3>
                    <p className="text-sm text-muted-foreground">{customer.ordersCount} طلب</p>
                  </div>
                  <div className="text-left rtl:text-right">
                    <p className="font-semibold text-foreground">{customer.totalDebts.toFixed(2)} دج</p>
                    <p className="text-xs text-muted-foreground">{percentageOfTotal.toFixed(1)}% من إجمالي الديون</p>
                  </div>
                </div>
                {/* شريط النسبة المئوية */}
                <div className={`w-full h-2 ${theme === 'dark' ? 'bg-muted' : 'bg-gray-200'} rounded-full`}>
                  <div 
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${percentageOfTotal}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DebtsPerEmployee;
