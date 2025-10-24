import { clsx } from 'clsx';
import { Button } from '@/components/ui/button';

interface AgentShellTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface AgentShellProps {
  title: string;
  subtitle?: string;
  tabs: AgentShellTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const AgentShell: React.FC<AgentShellProps> = ({ title, subtitle, tabs, activeTab, onTabChange, actions, children }) => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>

          {tabs.length > 0 && (
            <nav className="flex items-center gap-2 overflow-x-auto">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  size="sm"
                  className={clsx(
                    'gap-2 rounded-full border border-border/60',
                    activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-background',
                  )}
                  onClick={() => onTabChange(tab.id)}
                >
                  {tab.icon}
                  {tab.label}
                </Button>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
};

export default AgentShell;
