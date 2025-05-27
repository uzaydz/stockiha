import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  User,
  Palette,
  ShieldCheck,
  Bell,
  Building,
  CreditCard,
  Link2,
  Settings2,
  BookOpen,
  Globe
} from 'lucide-react';

// تعريف نوع البيانات للعلامات التبويب
export interface SettingsTab {
  id: string;
  label: string;
  icon: string;
  description?: string;
}

interface SettingsNavProps {
  tabs: SettingsTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  enhanced?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  User: <User className="mr-2 h-4 w-4" />,
  Palette: <Palette className="mr-2 h-4 w-4" />,
  ShieldCheck: <ShieldCheck className="mr-2 h-4 w-4" />,
  Bell: <Bell className="mr-2 h-4 w-4" />,
  Building: <Building className="mr-2 h-4 w-4" />,
  CreditCard: <CreditCard className="mr-2 h-4 w-4" />,
  Link2: <Link2 className="mr-2 h-4 w-4" />,
  Settings2: <Settings2 className="mr-2 h-4 w-4" />,
  BookOpen: <BookOpen className="mr-2 h-4 w-4" />,
  Globe: <Globe className="mr-2 h-4 w-4" />
};

const SettingsNav: React.FC<SettingsNavProps> = ({
  tabs,
  activeTab,
  onTabChange,
  enhanced = false
}) => {
  return (
    <div className="space-y-1">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant={activeTab === tab.id ? 'secondary' : 'ghost'}
          className={cn(
            'w-full justify-start',
            enhanced ? 'h-auto p-3 flex-col items-start' : '',
            activeTab === tab.id
              ? 'bg-secondary text-secondary-foreground'
              : 'hover:bg-muted'
          )}
          onClick={() => onTabChange(tab.id)}
          asChild
        >
          <Link to={`/dashboard/settings/${tab.id}`}>
            <div className={cn('flex items-center', enhanced ? 'w-full' : '')}>
              {iconMap[tab.icon]}
              <span className={enhanced ? 'font-medium' : ''}>{tab.label}</span>
            </div>
            {enhanced && tab.description && (
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {tab.description}
              </p>
            )}
          </Link>
        </Button>
      ))}
    </div>
  );
};

export default SettingsNav;
