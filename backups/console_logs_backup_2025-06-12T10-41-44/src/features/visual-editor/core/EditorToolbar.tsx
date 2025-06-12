import React from 'react';
import { motion } from 'framer-motion';
import { 
  Save, 
  Eye, 
  Undo, 
  Redo, 
  Smartphone, 
  Tablet, 
  Monitor,
  Settings,
  Download,
  Upload,
  Share2,
  Moon,
  Sun
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import useEditorStore from '../hooks/useEditorStore';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';

interface EditorToolbarProps {
  onSave: () => void;
  isSaving?: boolean;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ onSave, isSaving }) => {
  const {
    mode,
    setMode,
    deviceView,
    setDeviceView,
    undo,
    redo,
    history,
    historyIndex,
    isDirty,
  } = useEditorStore();

  const { theme, setTheme } = useTheme();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const devices = [
    { id: 'mobile', icon: Smartphone, label: 'جوال', width: '375px' },
    { id: 'tablet', icon: Tablet, label: 'تابلت', width: '768px' },
    { id: 'desktop', icon: Monitor, label: 'سطح المكتب', width: '100%' },
  ];

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-card border-b"
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left section - Title and save status */}
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold">محرر المتجر المرئي</h2>
              <p className="text-sm text-muted-foreground">
                {isSaving && <span className="animate-pulse">جاري الحفظ...</span>}
                {!isSaving && isDirty && 'لديك تغييرات غير محفوظة'}
                {!isSaving && !isDirty && 'تم حفظ جميع التغييرات'}
              </p>
            </div>
          </div>

          {/* Center section - Device preview */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {devices.map((device) => {
              const Icon = device.icon;
              const isActive = deviceView === device.id;
              
              return (
                <Button
                  key={device.id}
                  size="sm"
                  variant={isActive ? 'default' : 'ghost'}
                  onClick={() => setDeviceView(device.id as any)}
                  className={cn(
                    "gap-2 transition-all",
                    isActive && "shadow-sm"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{device.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'تفعيل وضع الإضاءة' : 'تفعيل وضع الظلام'}
              className="mr-1"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-yellow-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </Button>

            {/* History controls */}
            <div className="flex items-center gap-1 mr-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={undo}
                disabled={!canUndo}
                title="تراجع (Ctrl+Z)"
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={redo}
                disabled={!canRedo}
                title="إعادة (Ctrl+Y)"
              >
                <Redo className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Mode toggle */}
            <Button
              size="sm"
              variant={mode === 'preview' ? 'default' : 'outline'}
              onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {mode === 'edit' ? 'معاينة' : 'تحرير'}
            </Button>

            {/* Save button */}
            <Button
              size="sm"
              onClick={onSave}
              disabled={!isDirty || isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              حفظ التغييرات
            </Button>

            {/* More actions */}
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                title="تصدير"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="استيراد"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="مشاركة"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EditorToolbar;
