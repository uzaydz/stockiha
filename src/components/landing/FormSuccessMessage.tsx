import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormSuccessMessageProps {
  backgroundColor?: string;
  advancedSettings: Record<string, any>;
  customMessage?: string;
}

/**
 * Componente optimizado para mostrar mensaje de éxito
 * Utiliza React.memo para evitar renderizados innecesarios
 */
export const FormSuccessMessage: React.FC<FormSuccessMessageProps> = React.memo(({
  backgroundColor = '#f9f9f9',
  advancedSettings,
  customMessage
}) => {
  return (
    <section className="py-8" style={{ backgroundColor: backgroundColor }}>
      <div className="container mx-auto px-4">
        <Card className={cn(
            "max-w-md mx-auto border",
            advancedSettings.cardStyle?.shadow,
          )}
          style={{
            borderRadius: advancedSettings.cardStyle?.borderRadius || '0.5rem',
            borderWidth: advancedSettings.cardStyle?.borderWidth || '1px',
            borderColor: advancedSettings.cardStyle?.borderColor || '#e2e8f0'
          }}
        >
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-primary" />
              <h2 className="text-2xl font-bold">تم الإرسال بنجاح</h2>
              <p className="text-muted-foreground">
                {customMessage || 'شكراً لك! تم استلام طلبك وسنتواصل معك قريباً.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}); 