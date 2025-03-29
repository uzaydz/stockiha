
import { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface DashboardHeaderProps {
  onTimeframeChange: (timeframe: 'daily' | 'weekly' | 'monthly' | 'annual') => void;
}

const DashboardHeader = ({ onTimeframeChange }: DashboardHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم</h1>
        <p className="text-muted-foreground">
          نظرة عامة على متجرك ومبيعاتك وطلباتك
        </p>
      </div>
      <Tabs defaultValue="monthly" className="w-[400px]">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="daily" onClick={() => onTimeframeChange('daily')}>يومي</TabsTrigger>
          <TabsTrigger value="weekly" onClick={() => onTimeframeChange('weekly')}>أسبوعي</TabsTrigger>
          <TabsTrigger value="monthly" onClick={() => onTimeframeChange('monthly')}>شهري</TabsTrigger>
          <TabsTrigger value="annual" onClick={() => onTimeframeChange('annual')}>سنوي</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default DashboardHeader;
