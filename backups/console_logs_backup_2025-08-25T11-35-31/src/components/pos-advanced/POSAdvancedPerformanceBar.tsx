import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Activity } from 'lucide-react';

interface POSAdvancedPerformanceBarProps {
  executionTime?: number;
}

export const POSAdvancedPerformanceBar: React.FC<POSAdvancedPerformanceBarProps> = ({
  executionTime
}) => {
  if (!executionTime) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
        <Activity className="h-3 w-3 mr-1" />
        {executionTime}ms
      </Badge>
    </div>
  );
};
