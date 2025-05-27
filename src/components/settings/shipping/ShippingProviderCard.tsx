import React from 'react';
import { motion } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Truck } from 'lucide-react';
import { ShippingProviderWithClones } from '@/api/shippingCloneService';

interface ShippingProviderCardProps {
  provider: ShippingProviderWithClones;
  isSelected: boolean;
  onSelect: (provider: ShippingProviderWithClones) => void;
  onClone: (provider: ShippingProviderWithClones) => void;
}

const ShippingProviderCard: React.FC<ShippingProviderCardProps> = ({
  provider,
  isSelected,
  onSelect,
  onClone
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelect(provider)}
    >
      <Card 
        className={`cursor-pointer h-full transition-all duration-200 ${
          isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:border-primary/30'
        }`}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="flex items-center text-xl font-bold">
              <div className="bg-primary/10 p-2 rounded-full mr-3">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              {provider.name}
            </CardTitle>
            <Badge variant={provider.is_active ? "success" : "destructive"}>
              {provider.is_active ? 'مفعل' : 'غير مفعل'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{provider.code}</p>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">النسخ المستنسخة:</span>
              <span className="font-bold">{provider.clones?.length || 0}</span>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full group"
            onClick={(e) => {
              e.stopPropagation();
              onClone(provider);
            }}
          >
            <Copy className="mr-2 h-4 w-4 group-hover:text-primary" />
            <span className="group-hover:text-primary">استنساخ</span>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default ShippingProviderCard;
