import React, { memo } from 'react';

interface PriceDisplayRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  loading?: boolean;
}

const PriceDisplayRow = memo<PriceDisplayRowProps>(({ icon, label, value, loading }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/30">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    <div className="text-left">
      {loading ? (
        <span className="text-sm text-muted-foreground animate-pulse flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          جاري الحساب...
        </span>
      ) : value}
    </div>
  </div>
));

PriceDisplayRow.displayName = 'PriceDisplayRow';

export default PriceDisplayRow;
