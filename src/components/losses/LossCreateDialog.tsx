import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RefreshCw, Trash2 } from 'lucide-react';
import type { Product } from '@/types/losses';
import type { CreateLossFormState } from '@/hooks/useLossCreateForm';

interface LossCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createForm: CreateLossFormState;
  setCreateForm: React.Dispatch<React.SetStateAction<CreateLossFormState>>;
  updateLossItem: (productId: string, field: string, value: any) => void;
  removeProductFromLoss: (productId: string) => void;
  onCreate: () => void;
  products: Product[];
  searchingProducts: boolean;
  productSearchQuery: string;
  onProductSearchChange: (value: string) => void;
  onProductSelect: (product: Product) => void;
  formatCurrency: (amount: number) => string;
}

const LossCreateDialog: React.FC<LossCreateDialogProps> = ({
  open,
  onOpenChange,
  createForm,
  setCreateForm,
  updateLossItem,
  removeProductFromLoss,
  onCreate,
  products,
  searchingProducts,
  productSearchQuery,
  onProductSearchChange,
  onProductSelect,
  formatCurrency
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" aria-describedby="create-loss-description">
        <DialogHeader>
          <DialogTitle>إنشاء تصريح خسارة جديد</DialogTitle>
          <div id="create-loss-description" className="sr-only">
            نموذج إنشاء تصريح خسارة جديد يتضمن معلومات الحادثة والمنتجات المتضررة
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات أساسية */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>نوع الخسارة</Label>
              <Select
                value={createForm.lossType}
                onValueChange={(value: any) =>
                  setCreateForm(prev => ({ ...prev, lossType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damaged">تالف</SelectItem>
                  <SelectItem value="expired">منتهي الصلاحية</SelectItem>
                  <SelectItem value="theft">سرقة</SelectItem>
                  <SelectItem value="spoilage">تلف طبيعي</SelectItem>
                  <SelectItem value="breakage">كسر</SelectItem>
                  <SelectItem value="defective">معيب</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>تاريخ الحادثة</Label>
              <Input
                type="date"
                value={createForm.incidentDate}
                onChange={(e) => setCreateForm(prev => ({ ...prev, incidentDate: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>وصف الحادثة *</Label>
            <Textarea
              placeholder="اكتب تفاصيل الحادثة التي أدت إلى الخسارة..."
              value={createForm.lossDescription}
              onChange={(e) => setCreateForm(prev => ({ ...prev, lossDescription: e.target.value }))}
              className={!createForm.lossDescription.trim() ? 'border-red-300' : ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>مكان الحادثة</Label>
              <Input
                placeholder="أدخل موقع أو مكان الحادثة..."
                value={createForm.locationDescription}
                onChange={(e) => setCreateForm(prev => ({ ...prev, locationDescription: e.target.value }))}
              />
            </div>

            <div>
              <Label>اسم الشاهد</Label>
              <Input
                placeholder="اسم الشاهد على الحادثة (اختياري)..."
                value={createForm.witnessName}
                onChange={(e) => setCreateForm(prev => ({ ...prev, witnessName: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requiresManagerApproval"
                checked={createForm.requiresManagerApproval}
                onChange={(e) => setCreateForm(prev => ({ ...prev, requiresManagerApproval: e.target.checked }))}
              />
              <Label htmlFor="requiresManagerApproval">
                يتطلب موافقة المدير
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="insuranceClaim"
                checked={createForm.insuranceClaim}
                onChange={(e) => setCreateForm(prev => ({ ...prev, insuranceClaim: e.target.checked }))}
              />
              <Label htmlFor="insuranceClaim">
                مطالبة تأمين
              </Label>
            </div>
          </div>

          {createForm.insuranceClaim && (
            <div>
              <Label>رقم مرجع التأمين</Label>
              <Input
                placeholder="أدخل رقم مرجع التأمين..."
                value={createForm.insuranceReference}
                onChange={(e) => setCreateForm(prev => ({ ...prev, insuranceReference: e.target.value }))}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>المرجع الخارجي</Label>
              <Input
                placeholder="رقم تقرير شرطة أو مرجع خارجي (اختياري)..."
                value={createForm.externalReference}
                onChange={(e) => setCreateForm(prev => ({ ...prev, externalReference: e.target.value }))}
              />
            </div>

            <div>
              <Label>ملاحظات عامة</Label>
              <Input
                placeholder="ملاحظات إضافية (اختياري)..."
                value={createForm.notes}
                onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          {/* البحث عن المنتجات */}
          <div className="space-y-4">
            <Label>إضافة المنتجات المفقودة</Label>
            <div className="relative">
              <Input
                placeholder="البحث عن المنتجات بالاسم أو الرمز..."
                value={productSearchQuery}
                onChange={(e) => onProductSearchChange(e.target.value)}
              />
              {searchingProducts && (
                <RefreshCw className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
              )}
            </div>

            {/* نتائج البحث */}
            {products.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted"
                        onClick={() => onProductSelect(product)}
                      >
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                          {(product.has_colors || product.has_sizes) && (
                            <p className="text-xs text-blue-600">
                              {product.has_colors && product.has_sizes ? 'له ألوان ومقاسات' :
                                product.has_colors ? 'له ألوان' : 'له مقاسات'}
                            </p>
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-sm">المخزون: {product.stock_quantity}</p>
                          <p className="text-sm">التكلفة: {formatCurrency(product.purchase_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* عناصر الخسارة */}
          {createForm.lossItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>عناصر الخسارة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المنتج</TableHead>
                        <TableHead>الكمية المفقودة</TableHead>
                        <TableHead>تكلفة الوحدة</TableHead>
                        <TableHead>سعر البيع</TableHead>
                        <TableHead>حالة الخسارة</TableHead>
                        <TableHead>المخزون قبل/بعد</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {createForm.lossItems.map((item) => (
                        <TableRow key={item.product_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-sm text-muted-foreground">{item.product_sku}</p>
                              {item.variant_display_name && (
                                <p className="text-xs text-blue-600">
                                  {item.variant_display_name}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity_lost}
                              onChange={(e) => updateLossItem(item.product_id, 'quantity_lost', parseInt(e.target.value) || 0)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_cost}
                              onChange={(e) => updateLossItem(item.product_id, 'unit_cost', parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_selling_price}
                              onChange={(e) => updateLossItem(item.product_id, 'unit_selling_price', parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.loss_condition}
                              onValueChange={(value) => updateLossItem(item.product_id, 'loss_condition', value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="completely_damaged">تالف بالكامل</SelectItem>
                                <SelectItem value="partially_damaged">تالف جزئياً</SelectItem>
                                <SelectItem value="expired">منتهي الصلاحية</SelectItem>
                                <SelectItem value="missing">مفقود</SelectItem>
                                <SelectItem value="stolen">مسروق</SelectItem>
                                <SelectItem value="defective">معيب</SelectItem>
                                <SelectItem value="contaminated">ملوث</SelectItem>
                                <SelectItem value="other">أخرى</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>قبل: {item.stock_before_loss || item.variant_stock_before || 0}</div>
                              <div>بعد: {item.stock_after_loss || item.variant_stock_after || 0}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeProductFromLoss(item.product_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* إجمالي الخسارة */}
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>إجمالي قيمة التكلفة</Label>
                      <p className="text-xl font-bold text-red-600">
                        {formatCurrency(
                          createForm.lossItems.reduce((sum, item) =>
                            sum + (item.quantity_lost * item.unit_cost), 0
                          )
                        )}
                      </p>
                    </div>
                    <div>
                      <Label>إجمالي قيمة البيع</Label>
                      <p className="text-xl font-bold text-red-600">
                        {formatCurrency(
                          createForm.lossItems.reduce((sum, item) =>
                            sum + (item.quantity_lost * item.unit_selling_price), 0
                          )
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <Label>ملاحظات إضافية</Label>
            <Textarea
              placeholder="أي ملاحظات إضافية حول الحادثة..."
              value={createForm.notes}
              onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button
              onClick={onCreate}
              disabled={createForm.lossItems.length === 0}
            >
              إنشاء تصريح الخسارة
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LossCreateDialog;



















