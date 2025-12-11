import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Package, RefreshCw, Ruler, Scale, Box } from 'lucide-react';
import type { Loss, LossItem } from '@/types/losses';

interface LossDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLoss: Loss | null;
  selectedLossItems: LossItem[];
  loadingLossItems: boolean;
  formatCurrency: (amount: number) => string;
  getTypeLabel: (type: string) => string;
  getTypeIcon: (type: string) => React.ComponentType<{ className?: string }>;
  getStatusBadge: (status: string) => React.ReactNode;
}

const LossDetailsDialog: React.FC<LossDetailsDialogProps> = ({
  open,
  onOpenChange,
  selectedLoss,
  selectedLossItems,
  loadingLossItems,
  formatCurrency,
  getTypeLabel,
  getTypeIcon,
  getStatusBadge
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="details-dialog-description">
        <DialogHeader>
          <DialogTitle>تفاصيل تصريح الخسارة</DialogTitle>
          <div id="details-dialog-description" className="sr-only">
            عرض تفاصيل تصريح الخسارة والمنتجات المرتبطة به
          </div>
        </DialogHeader>

        {selectedLoss && (
          <div className="space-y-6">
            {/* معلومات التصريح */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  معلومات التصريح
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label>رقم التصريح</Label>
                  <p className="font-medium">{selectedLoss.loss_number}</p>
                </div>
                <div>
                  <Label>نوع الخسارة</Label>
                  <p className="font-medium">{getTypeLabel(selectedLoss.loss_type)}</p>
                </div>
                <div>
                  <Label>تاريخ الحادثة</Label>
                  <p className="font-medium">{new Date(selectedLoss.incident_date).toLocaleDateString('ar')}</p>
                </div>
                <div>
                  <Label>الحالة</Label>
                  <div>{getStatusBadge(selectedLoss.status)}</div>
                </div>
                <div>
                  <Label>قيمة التكلفة الإجمالية</Label>
                  <p className="font-medium text-red-600">{formatCurrency(selectedLoss.total_cost_value)}</p>
                </div>
                <div>
                  <Label>قيمة البيع الإجمالية</Label>
                  <p className="font-medium text-red-600">{formatCurrency(selectedLoss.total_selling_value)}</p>
                </div>
                <div className="col-span-2">
                  <Label>وصف الحادثة</Label>
                  <p className="mt-1 p-2 bg-muted rounded">{selectedLoss.loss_description}</p>
                </div>
                {selectedLoss.notes && (
                  <div className="col-span-2">
                    <Label>ملاحظات</Label>
                    <p className="mt-1 p-2 bg-muted rounded">{selectedLoss.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* المنتجات المفقودة */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  المنتجات المفقودة ({selectedLossItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLossItems ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                  </div>
                ) : selectedLossItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>المنتج</TableHead>
                          <TableHead>الكمية المفقودة</TableHead>
                          <TableHead>تكلفة الوحدة</TableHead>
                          <TableHead>سعر البيع</TableHead>
                          <TableHead>إجمالي التكلفة</TableHead>
                          <TableHead>إجمالي البيع</TableHead>
                          <TableHead>حالة الخسارة</TableHead>
                          <TableHead>المخزون قبل/بعد</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedLossItems.map((item) => {
                          // تحديد الكمية والوحدة حسب نوع البيع
                          const sellingUnit = item.selling_unit_type || 'piece';
                          let quantityDisplay = '';
                          let unitIcon = <Package className="h-3.5 w-3.5 inline ml-1" />;

                          switch (sellingUnit) {
                            case 'meter':
                              quantityDisplay = `${item.meters_lost || item.quantity_lost} متر`;
                              unitIcon = <Ruler className="h-3.5 w-3.5 inline ml-1 text-purple-600" />;
                              break;
                            case 'weight':
                              quantityDisplay = `${item.weight_lost || item.quantity_lost} ${item.weight_unit || 'كجم'}`;
                              unitIcon = <Scale className="h-3.5 w-3.5 inline ml-1 text-emerald-600" />;
                              break;
                            case 'box':
                              const boxQty = item.boxes_lost || item.quantity_lost;
                              const unitsInfo = item.units_per_box ? ` (${item.units_per_box} وحدة)` : '';
                              quantityDisplay = `${boxQty} علبة${unitsInfo}`;
                              unitIcon = <Box className="h-3.5 w-3.5 inline ml-1 text-blue-600" />;
                              break;
                            case 'piece':
                            default:
                              quantityDisplay = `${item.quantity_lost} قطعة`;
                              unitIcon = <Package className="h-3.5 w-3.5 inline ml-1 text-slate-600" />;
                          }

                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.product_name}</p>
                                  <p className="text-sm text-muted-foreground">{item.product_sku}</p>
                                  {item.variant_display_name && (
                                    <p className="text-xs text-blue-600">
                                      {item.variant_display_name}
                                    </p>
                                  )}
                                  {(item.color_name || item.size_name) && (
                                    <div className="text-xs text-muted-foreground">
                                      {item.color_name && <span>اللون: {item.color_name}</span>}
                                      {item.color_name && item.size_name && <span> | </span>}
                                      {item.size_name && <span>المقاس: {item.size_name}</span>}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-1">
                                  {unitIcon}
                                  <span>{quantityDisplay}</span>
                                </div>
                              </TableCell>
                              <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                              <TableCell>{formatCurrency(item.unit_selling_price)}</TableCell>
                              <TableCell className="text-red-600 font-medium">
                                {formatCurrency(item.total_cost_value || (item.quantity_lost * item.unit_cost))}
                              </TableCell>
                              <TableCell className="text-red-600 font-medium">
                                {formatCurrency(item.total_selling_value || (item.quantity_lost * item.unit_selling_price))}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {item.loss_condition === 'completely_damaged' ? 'تالف بالكامل' :
                                    item.loss_condition === 'partially_damaged' ? 'تالف جزئياً' :
                                      item.loss_condition === 'expired' ? 'منتهي الصلاحية' :
                                        item.loss_condition === 'missing' ? 'مفقود' :
                                          item.loss_condition === 'stolen' ? 'مسروق' :
                                            item.loss_condition === 'defective' ? 'معيب' :
                                              item.loss_condition === 'contaminated' ? 'ملوث' :
                                                item.loss_condition}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>قبل: {item.stock_before_loss || item.variant_stock_before || 0}</div>
                                  <div>بعد: {item.stock_after_loss || item.variant_stock_after || 0}</div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد منتجات مرتبطة بهذا التصريح
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LossDetailsDialog;














