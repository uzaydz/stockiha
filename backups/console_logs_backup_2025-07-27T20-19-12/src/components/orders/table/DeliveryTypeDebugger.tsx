import { memo } from "react";
import { Order } from "./OrderTableTypes";

interface DeliveryTypeDebuggerProps {
  orders: Order[];
  maxOrders?: number;
}

const DeliveryTypeDebugger = memo(({ orders, maxOrders = 3 }: DeliveryTypeDebuggerProps) => {
  const ordersToCheck = orders.slice(0, maxOrders);

  const analyzeDeliveryType = (order: Order) => {
    return {
      orderId: order.id?.substring(0, 8) || 'N/A',
      customerOrderNumber: order.customer_order_number,
      // Primary fields
      shipping_option: order.shipping_option,
      'form_data.deliveryOption': order.form_data?.deliveryOption,
      stop_desk_id: order.stop_desk_id,
      'form_data.stopDeskId': order.form_data?.stopDeskId,
      // Metadata fields
      'metadata.shipping_details.delivery_type': order.metadata?.shipping_details?.delivery_type,
      'metadata.shipping_details.delivery_option': order.metadata?.shipping_details?.delivery_option,
      'metadata.shipping_details.stop_desk_id': order.metadata?.shipping_details?.stop_desk_id,
      // Legacy fields
      'form_data.delivery_type': order.form_data?.delivery_type,
      'form_data.shipping_type': order.form_data?.shipping_type,
      // Full form_data for inspection
      form_data_keys: order.form_data ? Object.keys(order.form_data) : [],
      metadata_keys: order.metadata ? Object.keys(order.metadata) : [],
    };
  };

  console.group('🔍 Delivery Type Analysis (First 3 Orders)');
  ordersToCheck.forEach((order, index) => {
    const analysis = analyzeDeliveryType(order);
    console.log(`Order ${index + 1}:`, analysis);
  });
  console.groupEnd();

  return (
    <div className="p-4 border rounded-md bg-yellow-50 border-yellow-200">
      <h4 className="font-semibold mb-2 text-yellow-800">🔍 تحليل نوع التوصيل</h4>
      <p className="text-sm text-yellow-700 mb-2">
        تم تحليل أول {ordersToCheck.length} طلبيات. تحقق من console المتصفح للتفاصيل.
      </p>
      <div className="text-xs space-y-1">
        {ordersToCheck.map((order, index) => {
          const analysis = analyzeDeliveryType(order);
          const hasDeliveryData = Object.values(analysis).some(v => v === 'desk' || (typeof v === 'string' && v.includes('desk')));
          
          return (
            <div key={order.id} className={`p-2 rounded ${hasDeliveryData ? 'bg-green-100' : 'bg-red-100'}`}>
              <span className="font-medium">
                الطلب #{analysis.customerOrderNumber}: 
              </span>
              <span className={hasDeliveryData ? 'text-green-700' : 'text-red-700'}>
                {hasDeliveryData ? 'يحتوي على بيانات مكتب' : 'لا يحتوي على بيانات مكتب'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

DeliveryTypeDebugger.displayName = "DeliveryTypeDebugger";

export default DeliveryTypeDebugger; 