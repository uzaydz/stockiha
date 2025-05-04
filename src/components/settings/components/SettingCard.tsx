import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface SettingCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}

const SettingCard: React.FC<SettingCardProps> = ({
  title,
  description,
  icon: Icon,
  children,
}) => {
  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          <CardTitle>{title}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default SettingCard; 