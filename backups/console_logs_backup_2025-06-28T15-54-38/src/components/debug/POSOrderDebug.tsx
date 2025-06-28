import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createPOSOrder } from '@/context/shop/posOrderService';
import { v4 as uuidv4 } from 'uuid';

interface POSOrderDebugProps {
  organizationId?: string;
  employeeId?: string;
}

export const POSOrderDebug: React.FC<POSOrderDebugProps> = ({ 
  organizationId, 
  employeeId 
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [testProductId, setTestProductId] = useState('');
  const [testProductName, setTestProductName] = useState('منتج تجريبي');
  const [testQuantity, setTestQuantity] = useState(1);
  const [testPrice, setTestPrice] = useState(1000);
  const [debugLog, setDebugLog] = useState('');

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => `${prev}[${timestamp}] ${message}\n`);
  };

  const createTestOrder = async () => {
    if (!organizationId) {
      toast.error('Organization ID مطلوب');
      return;
    }

    if (!testProductId.trim()) {
      toast.error('Product ID مطلوب');
      return;
    }

    setIsCreating(true);
    setDebugLog('');
    addToLog('🚀 بدء إنشاء طلبية تجريبية...');

    try {
      // إنشاء بيانات الطلبية التجريبية
      const testOrder = {
        customerId: 'walk-in',
        employeeId: employeeId || '',
        items: [{
          id: uuidv4(),
          productId: testProductId,
          productName: testProductName,
          name: testProductName,
          quantity: testQuantity,
          unitPrice: testPrice,
          totalPrice: testPrice * testQuantity,
          isDigital: false,
          isWholesale: false,
          originalPrice: testPrice,
          slug: `test-item-${Date.now()}`,
          variant_info: null
        }],
        services: [],
        subtotal: testPrice * testQuantity,
        tax: 0,
        discount: 0,
        total: testPrice * testQuantity,
        status: 'completed' as const,
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        notes: 'طلبية تجريبية من أداة التشخيص',
        isOnline: false
      };

      addToLog(`📝 بيانات الطلبية: ${JSON.stringify(testOrder, null, 2)}`);

      // إنشاء الطلبية
      const createdOrder = await createPOSOrder(testOrder, organizationId);
      
      addToLog(`✅ تم إنشاء الطلبية بنجاح!`);
      addToLog(`🆔 معرف الطلبية: ${createdOrder.id}`);
      addToLog(`📋 رقم الطلبية: ${(createdOrder as any).customer_order_number}`);
      addToLog(`💰 المجموع: ${createdOrder.total} د.ج.`);

      toast.success(`تم إنشاء الطلبية التجريبية بنجاح! ID: ${createdOrder.id}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      addToLog(`❌ فشل في إنشاء الطلبية: ${errorMessage}`);
      toast.error(`فشل في إنشاء الطلبية: ${errorMessage}`);
      console.error('خطأ في إنشاء الطلبية التجريبية:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🔧 أداة تشخيص طلبيات نقطة البيع</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="productId">معرف المنتج *</Label>
            <Input
              id="productId"
              value={testProductId}
              onChange={(e) => setTestProductId(e.target.value)}
              placeholder="أدخل معرف المنتج"
              className="font-mono text-sm"
            />
          </div>
          <div>
            <Label htmlFor="productName">اسم المنتج</Label>
            <Input
              id="productName"
              value={testProductName}
              onChange={(e) => setTestProductName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="quantity">الكمية</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={testQuantity}
              onChange={(e) => setTestQuantity(parseInt(e.target.value) || 1)}
            />
          </div>
          <div>
            <Label htmlFor="price">السعر (د.ج.)</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={testPrice}
              onChange={(e) => setTestPrice(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <p><strong>Organization ID:</strong> {organizationId || 'غير محدد'}</p>
          <p><strong>Employee ID:</strong> {employeeId || 'غير محدد'}</p>
        </div>

        <Button 
          onClick={createTestOrder} 
          disabled={isCreating || !testProductId.trim()}
          className="w-full"
        >
          {isCreating ? '⏳ جاري الإنشاء...' : '🧪 إنشاء طلبية تجريبية'}
        </Button>

        {debugLog && (
          <div>
            <Label>سجل التشخيص:</Label>
            <Textarea
              value={debugLog}
              readOnly
              className="h-40 font-mono text-xs"
              placeholder="سيظهر هنا سجل العمليات..."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 