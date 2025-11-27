/**
 * LabelTemplateSelector - اختيار قوالب الملصقات الجاهزة
 * 
 * ⚡ المميزات:
 * - قوالب شائعة للطابعات الحرارية
 * - معاينة مصغرة لكل قالب
 * - أحجام مخصصة
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Tag, Barcode, QrCode, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LabelTemplate {
  id: string;
  name: string;
  nameAr: string;
  width: number; // mm
  height: number; // mm
  description: string;
  icon: React.ReactNode;
  popular?: boolean;
  thermal?: boolean;
}

export const LABEL_TEMPLATES: LabelTemplate[] = [
  {
    id: 'jewelry-small',
    name: 'Jewelry Small',
    nameAr: 'مجوهرات صغير',
    width: 22,
    height: 10,
    description: 'للخواتم والأساور الصغيرة',
    icon: <Sparkles className="h-4 w-4" />,
    thermal: true
  },
  {
    id: 'price-tag',
    name: 'Price Tag',
    nameAr: 'بطاقة سعر',
    width: 30,
    height: 20,
    description: 'بطاقة سعر قياسية',
    icon: <Tag className="h-4 w-4" />,
    popular: true,
    thermal: true
  },
  {
    id: 'product-label',
    name: 'Product Label',
    nameAr: 'ملصق منتج',
    width: 50,
    height: 30,
    description: 'ملصق منتج متوسط',
    icon: <Barcode className="h-4 w-4" />,
    popular: true,
    thermal: true
  },
  {
    id: 'shelf-label',
    name: 'Shelf Label',
    nameAr: 'ملصق رف',
    width: 60,
    height: 40,
    description: 'لأرفف المتاجر',
    icon: <Barcode className="h-4 w-4" />,
    thermal: true
  },
  {
    id: 'shipping-label',
    name: 'Shipping Label',
    nameAr: 'ملصق شحن',
    width: 100,
    height: 150,
    description: 'للطرود والشحن',
    icon: <QrCode className="h-4 w-4" />
  },
  {
    id: 'a4-sheet',
    name: 'A4 Sheet',
    nameAr: 'ورقة A4',
    width: 210,
    height: 297,
    description: 'طباعة متعددة على A4',
    icon: <Barcode className="h-4 w-4" />
  }
];

interface LabelTemplateSelectorProps {
  selectedId: string;
  onSelect: (template: LabelTemplate) => void;
  className?: string;
}

const LabelTemplateSelector: React.FC<LabelTemplateSelectorProps> = ({
  selectedId,
  onSelect,
  className
}) => {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-3", className)}>
      {LABEL_TEMPLATES.map((template) => {
        const isSelected = selectedId === template.id;
        
        return (
          <Card
            key={template.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md",
              isSelected && "ring-2 ring-primary border-primary"
            )}
            onClick={() => onSelect(template)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className={cn(
                  "p-1.5 rounded-md",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  {template.icon}
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              
              <h4 className="font-medium text-sm mb-1">{template.nameAr}</h4>
              <p className="text-[10px] text-muted-foreground mb-2">
                {template.description}
              </p>
              
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                  {template.width}×{template.height} مم
                </Badge>
                {template.popular && (
                  <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-amber-500">
                    شائع
                  </Badge>
                )}
                {template.thermal && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    حراري
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default LabelTemplateSelector;
