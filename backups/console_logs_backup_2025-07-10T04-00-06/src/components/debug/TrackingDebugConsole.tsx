import React from 'react';

export interface TrackingEvent {
  type: string;
  data: any;
  timestamp: number;
}

interface TrackingDebugConsoleProps {
  productId: string;
  organizationId: string;
}

export const TrackingDebugConsole: React.FC<TrackingDebugConsoleProps> = ({
  productId,
  organizationId
}) => {
  // مكون مؤقت فارغ
  return null;
};

export default TrackingDebugConsole; 