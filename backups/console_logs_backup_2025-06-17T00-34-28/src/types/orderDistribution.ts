export interface DistributionPlan {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'round_robin' | 'smart' | 'availability' | 'priority' | 'expert';
  settings?: Record<string, any>;
  isActive: boolean;
  lastModified: Date;
}

export interface DistributionSettings {
  maxOpenOrders?: number;
  responseTimeMinutes?: number;
  enablePeakTimeOverride?: boolean;
  rotationSchedule?: {
    type: 'daily' | 'weekly';
    assignments: Record<string, string[]>;
  };
  locationRadius?: number;
  expertiseMapping?: Record<string, string[]>;
  selectedEmployees?: string[];
  employeeProducts?: Record<string, string[]>; // employeeId -> productIds[]
}

export interface SimulationResult {
  employeeName: string;
  employeeId: string;
  reason: string;
}
