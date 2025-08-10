import React from 'react';
import { motion } from 'framer-motion';
import { Package, CreditCard, Phone, DollarSign } from 'lucide-react';
import ProgressChart from './ProgressChart';
import { StatusBreakdownItem } from './types';

interface ChartsGridProps {
  statusBreakdown: StatusBreakdownItem[];
  paymentStatusBreakdown: StatusBreakdownItem[];
  callConfirmationBreakdown: StatusBreakdownItem[];
  paymentMethodBreakdown: StatusBreakdownItem[];
  isLoading?: boolean;
}

const ChartsGrid: React.FC<ChartsGridProps> = ({
  statusBreakdown,
  paymentStatusBreakdown,
  callConfirmationBreakdown,
  paymentMethodBreakdown,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-80 bg-muted/50 animate-pulse rounded-xl border"></div>
        ))}
      </div>
    );
  }

  const charts = [
    {
      title: "حالة الطلبات",
      data: statusBreakdown,
      icon: <Package className="h-5 w-5" />,
      showAmounts: false
    },
    {
      title: "حالة الدفع",
      data: paymentStatusBreakdown,
      icon: <CreditCard className="h-5 w-5" />,
      showAmounts: true
    },
    {
      title: "تأكيد المكالمة",
      data: callConfirmationBreakdown,
      icon: <Phone className="h-5 w-5" />,
      showAmounts: false
    },
    {
      title: "طرق الدفع",
      data: paymentMethodBreakdown,
      icon: <DollarSign className="h-5 w-5" />,
      showAmounts: true
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      {charts.map((chart, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <ProgressChart
            title={chart.title}
            data={chart.data}
            icon={chart.icon}
            showAmounts={chart.showAmounts}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default ChartsGrid;
