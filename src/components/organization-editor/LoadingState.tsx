import React from 'react';
import { LoadingStateProps } from './types';

const LoadingState: React.FC<LoadingStateProps> = ({
  message = "جاري تحميل إعدادات المكونات...",
  description = "يرجى الانتظار لحظات"
}) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <h3 className="text-lg font-semibold">{message}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

export default React.memo(LoadingState);
