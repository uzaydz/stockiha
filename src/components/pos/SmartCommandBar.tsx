import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { AssistantOrchestrator } from '@/services/assistant/AssistantOrchestrator';
import { UnifiedMutationService } from '@/services/assistant/UnifiedMutationService';
import { computeAvailableStock } from '@/lib/stock';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VariantPicker } from './VariantPicker';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export const SmartCommandBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [variantDialog, setVariantDialog] = useState<{ open: boolean; product: any | null }>(() => ({ open: false, product: null }));
  const { toast } = useToast();
  const { organizationId } = useOptimizedAuth();

  const handleSubmit = async () => {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    try {
      const res = await AssistantOrchestrator.process(q, { organizationId: organizationId || undefined });
      // إذا كانت استجابة تفاعلية لاختيار المتغير
      try {
        const parsed = JSON.parse(res.answer);
        if (parsed?.type === 'product_with_variants' && parsed.product) {
          setVariantDialog({ open: true, product: parsed.product });
          return;
        }
      } catch {}

      toast({ title: 'نتيجة', description: res.answer });
    } catch (e) {
      toast({ title: 'خطأ', description: 'تعذّر تنفيذ الأمر', variant: 'destructive' });
    } finally {
      setLoading(false);
      setQuery('');
    }
  };

  const handleVariantConfirm = async (sel: { colorId: string; sizeId?: string | null; quantity: number; mode: 'set' | 'delta' }) => {
    if (!variantDialog.product || !organizationId) return;
    setLoading(true);
    try {
      const prod = variantDialog.product;
      const updated = await UnifiedMutationService.adjustInventory({
        organizationId,
        productId: prod.id,
        colorId: sel.colorId || null,
        sizeId: sel.sizeId || null,
        mode: sel.mode,
        quantity: sel.quantity
      });
      const available = computeAvailableStock(updated || prod);
      toast({ title: 'تم', description: `تم التحديث: ${prod.name} • المتاح الآن: ${available}` });
    } catch {
      toast({ title: 'خطأ', description: 'تعذّر تحديث المخزون', variant: 'destructive' });
    } finally {
      setLoading(false);
      setVariantDialog({ open: false, product: null });
    }
  };

  return (
    <div className="flex items-center gap-2 w-full max-w-xl">
      <div className="relative flex-1">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="اكتب أمراً… مثال: كم بلغت مبيعات الأمس؟ أو عدّل مخزون منتج X +10"
          disabled={loading}
          className="pr-10"
        />
        <Sparkles className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
      </div>
      <Button onClick={handleSubmit} size="sm" disabled={loading || !query.trim()}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تنفيذ'}
      </Button>

      <Dialog open={variantDialog.open} onOpenChange={(o) => setVariantDialog({ open: o, product: o ? variantDialog.product : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>اختر اللون/المقاس والكمية</DialogTitle>
          </DialogHeader>
          {variantDialog.product && (
            <VariantPicker product={variantDialog.product} onConfirm={handleVariantConfirm} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
