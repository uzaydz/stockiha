import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InvoiceItemData {
  id?: string;
  name: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  unitPriceHT: number;
  unitPriceTTC: number;
  tvaRate: number;
  discountAmount: number;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  productId?: string;
  type: 'product' | 'service' | 'fee' | 'discount' | 'other';
}

interface InvoiceItemsTableProps {
  items: InvoiceItemData[];
  onUpdateItem: (index: number, item: InvoiceItemData) => void;
  onRemoveItem: (index: number) => void;
  tvaRate?: number;
}

const InvoiceItemsTable = ({
  items,
  onUpdateItem,
  onRemoveItem,
  tvaRate = 19,
}: InvoiceItemsTableProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<InvoiceItemData | null>(null);

  // بدء تعديل عنصر
  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingItem({ ...items[index] });
  };

  // إلغاء التعديل
  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingItem(null);
  };

  // حفظ التعديل
  const saveEditing = () => {
    if (editingIndex !== null && editingItem) {
      onUpdateItem(editingIndex, editingItem);
      setEditingIndex(null);
      setEditingItem(null);
    }
  };

  // تحديث حقل في العنصر المعدل
  const updateEditingField = (field: keyof InvoiceItemData, value: any) => {
    if (!editingItem) return;

    const updated = { ...editingItem, [field]: value };

    // إعادة حساب القيم تلقائياً
    if (field === 'quantity' || field === 'unitPriceTTC' || field === 'tvaRate' || field === 'discountAmount') {
      const qty = field === 'quantity' ? value : updated.quantity;
      const priceTTC = field === 'unitPriceTTC' ? value : updated.unitPriceTTC;
      const tva = field === 'tvaRate' ? value : updated.tvaRate;
      const discount = field === 'discountAmount' ? value : updated.discountAmount;

      // حساب السعر قبل الضريبة
      updated.unitPriceHT = priceTTC / (1 + tva / 100);
      
      // حساب الإجماليات
      updated.totalHT = updated.unitPriceHT * qty;
      updated.totalTVA = updated.totalHT * (tva / 100);
      updated.totalTTC = updated.totalHT + updated.totalTVA - discount;
    }

    setEditingItem(updated);
  };

  // حساب الإجماليات
  const totals = items.reduce(
    (acc, item) => ({
      totalHT: acc.totalHT + item.totalHT,
      totalTVA: acc.totalTVA + item.totalTVA,
      totalTTC: acc.totalTTC + item.totalTTC,
    }),
    { totalHT: 0, totalTVA: 0, totalTTC: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right w-[50px]">#</TableHead>
                <TableHead className="text-right min-w-[200px]">المنتج</TableHead>
                <TableHead className="text-right w-[100px]">SKU</TableHead>
                <TableHead className="text-right w-[80px]">الكمية</TableHead>
                <TableHead className="text-right w-[120px]">السعر TTC</TableHead>
                <TableHead className="text-right w-[80px]">TVA %</TableHead>
                <TableHead className="text-right w-[120px]">الإجمالي HT</TableHead>
                <TableHead className="text-right w-[120px]">TVA</TableHead>
                <TableHead className="text-right w-[120px]">الإجمالي TTC</TableHead>
                <TableHead className="text-center w-[100px]">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    لم يتم إضافة منتجات بعد
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => {
                  const isEditing = editingIndex === index;
                  const displayItem = isEditing && editingItem ? editingItem : item;

                  return (
                    <TableRow key={index} className={cn(isEditing && 'bg-primary/5')}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      
                      {/* اسم المنتج */}
                      <TableCell>
                        <div>
                          <p className="font-medium">{displayItem.name}</p>
                          {displayItem.barcode && (
                            <code className="text-xs text-muted-foreground">
                              {displayItem.barcode}
                            </code>
                          )}
                        </div>
                      </TableCell>

                      {/* SKU */}
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {displayItem.sku || '-'}
                        </code>
                      </TableCell>

                      {/* الكمية */}
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            min="1"
                            value={displayItem.quantity}
                            onChange={(e) =>
                              updateEditingField('quantity', parseInt(e.target.value) || 1)
                            }
                            className="w-20"
                          />
                        ) : (
                          <Badge variant="secondary">{displayItem.quantity}</Badge>
                        )}
                      </TableCell>

                      {/* السعر TTC */}
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={displayItem.unitPriceTTC.toFixed(2)}
                            onChange={(e) =>
                              updateEditingField('unitPriceTTC', parseFloat(e.target.value) || 0)
                            }
                            className="w-28"
                          />
                        ) : (
                          <span className="font-medium">
                            {displayItem.unitPriceTTC.toFixed(2)} دج
                          </span>
                        )}
                      </TableCell>

                      {/* TVA % */}
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={displayItem.tvaRate}
                            onChange={(e) =>
                              updateEditingField('tvaRate', parseFloat(e.target.value) || 0)
                            }
                            className="w-20"
                          />
                        ) : (
                          <Badge variant="outline">{displayItem.tvaRate}%</Badge>
                        )}
                      </TableCell>

                      {/* الإجمالي HT */}
                      <TableCell className="text-muted-foreground">
                        {displayItem.totalHT.toFixed(2)} دج
                      </TableCell>

                      {/* TVA */}
                      <TableCell className="text-muted-foreground">
                        {displayItem.totalTVA.toFixed(2)} دج
                      </TableCell>

                      {/* الإجمالي TTC */}
                      <TableCell className="font-bold text-primary">
                        {displayItem.totalTTC.toFixed(2)} دج
                      </TableCell>

                      {/* الإجراءات */}
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={saveEditing}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={cancelEditing}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => startEditing(index)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => onRemoveItem(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ملخص الإجماليات */}
      {items.length > 0 && (
        <div className="flex justify-end">
          <div className="w-full max-w-md space-y-2 border rounded-lg p-4 bg-muted/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الإجمالي قبل الضريبة (HT):</span>
              <span className="font-medium">{totals.totalHT.toFixed(2)} دج</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الضريبة (TVA):</span>
              <span className="font-medium">{totals.totalTVA.toFixed(2)} دج</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>الإجمالي شامل الضريبة (TTC):</span>
              <span className="text-primary">{totals.totalTTC.toFixed(2)} دج</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceItemsTable;
