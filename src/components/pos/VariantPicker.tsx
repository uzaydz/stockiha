import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface VariantPickerProps {
  product: any;
  onConfirm: (sel: { colorId: string; sizeId?: string | null; quantity: number; mode: 'set' | 'delta' }) => void;
}

export const VariantPicker: React.FC<VariantPickerProps> = ({ product, onConfirm }) => {
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [mode, setMode] = useState<'set' | 'delta'>('set');

  const colors = (product?.colors || product?.product_colors || []) as any[];
  const hasVariants = Array.isArray(colors) && colors.length > 0;
  const selectedColor = hasVariants ? colors.find((c: any) => c.id === selectedColorId) : null;
  const canConfirm = hasVariants
    ? Boolean(selectedColorId && quantity && (mode === 'delta' ? Math.abs(Number(quantity)) > 0 : Number(quantity) > 0) && (!selectedColor?.has_sizes || selectedSizeId))
    : Boolean(quantity && (mode === 'delta' ? Math.abs(Number(quantity)) > 0 : Number(quantity) > 0));

  const handleConfirm = () => {
    if (!canConfirm) return;
    if (hasVariants) {
      onConfirm({ colorId: selectedColorId!, sizeId: selectedSizeId, quantity: Number(quantity), mode });
    } else {
      onConfirm({ colorId: '' as any, sizeId: null, quantity: Number(quantity), mode });
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div>
        <h4 className="text-sm font-medium mb-1">📦 {product?.name}</h4>
        {product?.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
      </div>

      {hasVariants && (
        <div className="space-y-2">
          <label className="text-sm font-medium">🎨 اختر اللون:</label>
          <div className="grid grid-cols-2 gap-2">
            {colors.map((color: any) => (
            <Button
              key={color.id}
              variant={selectedColorId === color.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setSelectedColorId(color.id); setSelectedSizeId(null); }}
              type="button"
              className="justify-between"
            >
                <span>{color.name || color.color_name}</span>
                <Badge variant="secondary" className="ml-2">{color.quantity ?? 0}</Badge>
              </Button>
            ))}
          </div>
        </div>
      )}

      {selectedColor && selectedColor.has_sizes && (selectedColor.sizes?.length || selectedColor.product_sizes?.length)}
      {hasVariants && selectedColor && selectedColor.has_sizes && (
        <div className="space-y-2">
          <label className="text-sm font-medium">📏 اختر المقاس:</label>
          <div className="grid grid-cols-3 gap-2">
            {(selectedColor.sizes || selectedColor.product_sizes || []).map((sz: any) => (
              <Button
                key={sz.id}
                variant={selectedSizeId === sz.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSizeId(sz.id)}
                type="button"
                className="justify-between flex-col h-auto py-2"
              >
                <span className="text-xs">{sz.name || sz.size_name}</span>
                <Badge variant="secondary" className="mt-1 text-xs">{sz.quantity ?? 0}</Badge>
              </Button>
            ))}
          </div>
        </div>
      )}

      {(!hasVariants || (selectedColorId && (!selectedColor?.has_sizes || selectedSizeId))) && (
        <div className="space-y-2">
          <label className="text-sm font-medium">🔢 الكمية:</label>
          <div className="flex gap-2">
            <div className="flex gap-1">
              <Button variant={mode === 'set' ? 'default' : 'outline'} size="sm" onClick={() => setMode('set')}>تعيين</Button>
              <Button variant={mode === 'delta' ? 'default' : 'outline'} size="sm" onClick={() => setMode('delta')}>تغيير ±</Button>
            </div>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={mode === 'set' ? 'مثال: 50' : 'مثال: -5 أو 10'}
              className="flex-1 rounded-md border px-2 text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground">{mode === 'set' ? 'ستصبح' : 'سيتغير'} المخزون: {quantity || 0}</p>
        </div>
      )}

      {canConfirm && (
        <Button type="button" onClick={handleConfirm} className="w-full" size="sm">✅ تأكيد</Button>
      )}
    </div>
  );
};
