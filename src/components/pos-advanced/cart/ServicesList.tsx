import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Trash2 } from 'lucide-react';

interface Service {
  name?: string;
  price?: number;
  description?: string;
}

interface ServicesListProps {
  selectedServices: Service[];
  removeService: (index: number) => void;
}

const ServicesList: React.FC<ServicesListProps> = ({
  selectedServices,
  removeService
}) => {
  if (selectedServices.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex items-center gap-2 px-1">
        <CreditCard className="h-4 w-4" />
        <h4 className="font-semibold text-sm">
          الخدمات ({selectedServices.length})
        </h4>
      </div>

      <div className="space-y-2">
        {selectedServices.map((service, index) => (
          <Card key={`service-${index}`} className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h5 className="font-medium text-sm text-foreground">
                    {String(service.name || '')}
                  </h5>
                  {service.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {String(service.description)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <div className="text-sm font-bold text-blue-600">
                    {service.price?.toLocaleString()} دج
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeService(index)}
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default React.memo(ServicesList);
