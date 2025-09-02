import React from 'react';
import { Type, Palette, AlertCircle } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ColorPicker from '../ColorPicker';

interface ColorInputSectionProps {
  form: UseFormReturn<any>;
  duplicateError?: {
    hasError: boolean;
    message: string;
  };
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  className?: string;
}

const ColorInputSection: React.FC<ColorInputSectionProps> = ({
  form,
  duplicateError,
  onNameChange,
  onColorChange,
  className = '',
}) => {
  const currentColor = form.watch('color_code') || '#6366f1';
  const currentName = form.watch('name') || '';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* تحذير الأخطاء */}
      {duplicateError?.hasError && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/30">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            {duplicateError.message}
          </AlertDescription>
        </Alert>
      )}

      {/* المعلومات الأساسية */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-lg">
            <Type className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            المعلومات الأساسية
          </h3>
          <div className="h-px bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700 flex-1" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* اسم اللون */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  اسم اللون
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder="مثال: أزرق سماوي" 
                      {...field} 
                      className="h-12 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-primary focus:ring-primary/20 transition-all duration-200"
                      onChange={(e) => {
                        field.onChange(e);
                        onNameChange(e.target.value);
                      }}
                    />
                    {/* خط ملون تحت الحقل */}
                    <div 
                      className="absolute bottom-0 left-0 h-0.5 transition-all duration-300 rounded-full"
                      style={{ 
                        width: currentName ? '100%' : '0%',
                        backgroundColor: currentColor 
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* كود اللون */}
          <FormField
            control={form.control}
            name="color_code"
            render={({ field }) => (
              <FormItem className="space-y-3">
                                              <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Palette className="h-4 w-4" />
                                كود اللون
                              </FormLabel>
                              <FormControl>
                                <ColorPicker 
                                  value={field.value} 
                                  onChange={(color) => {
                                    field.onChange(color);
                                    onColorChange(color);
                                  }}
                                />
                              </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default ColorInputSection;
