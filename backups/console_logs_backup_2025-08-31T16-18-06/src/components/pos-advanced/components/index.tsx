// =================================================================
// 🎯 POS Advanced Cart Components - مكونات مؤقتة للتوافق
// =================================================================

import React from 'react';
import { Product } from '@/types';

// أنواع البيانات المطلوبة
export interface CartItemData {
  product: Product;
  quantity: number;
  customPrice?: number;
  variantPrice?: number;
  variantInfo?: any;
}

export interface CartTab {
  id: string;
  name: string;
  customerId?: string;
  customerName?: string;
  discount?: number;
  discountAmount?: number;
  discountType?: 'percentage' | 'fixed';
}

// مكونات مؤقتة بسيطة
interface CartItemProps {
  item: CartItemData;
  index: number;
  isReturnMode?: boolean;
  onQuantityChange: (index: number, quantity: number) => void;
  onPriceChange: (index: number, price: number) => void;
  onRemove: (index: number) => void;
}

export const CartItem: React.FC<CartItemProps> = ({ item, index, isReturnMode, onQuantityChange, onPriceChange, onRemove }) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <h3 className="font-semibold">{item.product.name}</h3>
        <p className="text-sm text-gray-600">الكمية: {item.quantity}</p>
        <p className="text-sm font-bold">
          {item.customPrice || item.variantPrice || item.product.price} دج
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onQuantityChange(index, Math.max(0, item.quantity - 1))}
          className="px-2 py-1 bg-gray-200 rounded"
        >
          -
        </button>
        <span className="px-3 py-1">{item.quantity}</span>
        <button
          onClick={() => onQuantityChange(index, item.quantity + 1)}
          className="px-2 py-1 bg-gray-200 rounded"
        >
          +
        </button>
        <button
          onClick={() => onRemove(index)}
          className="px-2 py-1 bg-red-500 text-white rounded"
        >
          حذف
        </button>
      </div>
    </div>
  );
};

export const CartSummary: React.FC<{
  subtotal: number;
  total: number;
  discount?: number;
  onCheckout: () => void;
}> = ({ subtotal, total, discount, onCheckout }) => {
  return (
    <div className="p-4 border-t">
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>المجموع الفرعي:</span>
          <span>{subtotal} دج</span>
        </div>
        {discount && (
          <div className="flex justify-between text-green-600">
            <span>الخصم:</span>
            <span>-{discount} دج</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg">
          <span>المجموع الكلي:</span>
          <span>{total} دج</span>
        </div>
      </div>
      <button
        onClick={onCheckout}
        className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
      >
        الدفع
      </button>
    </div>
  );
};

export const CartTabs: React.FC<{
  tabs: CartTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onAddTab: () => void;
  onRemoveTab: (tabId: string) => void;
}> = ({ tabs, activeTabId, onTabChange, onAddTab, onRemoveTab }) => {
  return (
    <div className="flex items-center space-x-2 p-2 border-b">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex items-center px-3 py-1 rounded cursor-pointer ${
            tab.id === activeTabId ? 'bg-blue-100' : 'bg-gray-100'
          }`}
          onClick={() => onTabChange(tab.id)}
        >
          <span>{tab.name}</span>
          {tabs.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTab(tab.id);
              }}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onAddTab}
        className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
      >
        + تبويب جديد
      </button>
    </div>
  );
};

export const CustomerDiscountManager: React.FC<{
  customers: any[];
  selectedCustomerId?: string;
  selectedCustomerName?: string;
  discount: number;
  discountAmount: number;
  discountType: 'percentage' | 'fixed';
  notes: string;
  onCustomerChange: (customerId: string, customerName: string) => void;
  onDiscountChange: (discount: number, discountAmount: number, discountType: 'percentage' | 'fixed') => void;
  onNotesChange: (notes: string) => void;
  onClearCustomer?: () => void;
}> = ({
  customers,
  selectedCustomerId,
  selectedCustomerName,
  discount,
  discountAmount,
  discountType,
  notes,
  onCustomerChange,
  onDiscountChange,
  onNotesChange,
  onClearCustomer
}) => {
  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div>
        <label className="block text-sm font-medium mb-2">العميل:</label>
        <select
          value={selectedCustomerId || ''}
          onChange={(e) => {
            const customer = customers.find(c => c.id === e.target.value);
            if (customer) {
              onCustomerChange(customer.id, customer.name);
            }
          }}
          className="w-full p-2 border rounded"
        >
          <option value="">اختر عميل...</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
        {selectedCustomerId && onClearCustomer && (
          <button
            onClick={onClearCustomer}
            className="mt-2 text-sm text-red-600 hover:text-red-700"
          >
            إزالة العميل
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">الخصم:</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={discountType === 'percentage' ? discount : discountAmount}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (discountType === 'percentage') {
                onDiscountChange(value, discountAmount, discountType);
              } else {
                onDiscountChange(discount, value, discountType);
              }
            }}
            className="flex-1 p-2 border rounded"
            placeholder="0"
          />
          <select
            value={discountType}
            onChange={(e) => {
              const type = e.target.value as 'percentage' | 'fixed';
              onDiscountChange(discount, discountAmount, type);
            }}
            className="p-2 border rounded"
          >
            <option value="percentage">%</option>
            <option value="fixed">دج</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">ملاحظات:</label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="w-full p-2 border rounded"
          rows={3}
          placeholder="أضف ملاحظات..."
        />
      </div>
    </div>
  );
};
