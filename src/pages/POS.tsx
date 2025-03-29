import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from "@/components/ui/use-toast"
import { Product, Order, User } from '@/types';
import { useShop } from '@/context/ShopContext';

const POS = () => {
  const { products, orders, addOrder, currentUser } = useShop();
  const [cartItems, setCartItems] = useState<{ product: Product; quantity: number; }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [isTransactionComplete, setIsTransactionComplete] = useState<boolean>(false);

  // Calculate subtotal, tax, and total
  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const taxRate = 0.07; // 7% tax rate
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Add item to cart
  const addItemToCart = (product: Product) => {
    const existingItem = cartItems.find(item => item.product.id === product.id);
    if (existingItem) {
      const updatedCart = cartItems.map(item =>
        item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
      setCartItems(updatedCart);
    } else {
      setCartItems([...cartItems, { product: product, quantity: 1 }]);
    }
  };

  // Remove item from cart
  const removeItemFromCart = (productId: string) => {
    const updatedCart = cartItems.filter(item => item.product.id !== productId);
    setCartItems(updatedCart);
  };

  // Update item quantity in cart
  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    const updatedCart = cartItems.map(item =>
      item.product.id === productId ? { ...item, quantity: quantity } : item
    );
    setCartItems(updatedCart);
  };

  // Clear cart
  const clearCart = () => {
    setCartItems([]);
  };

  // Handle payment method selection
  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethod(method);
  };

  // Complete transaction
  const completeTransaction = () => {
    // Transaction logic here
  };

  // Submit order
  const submitOrder = async () => {
    if (cartItems.length === 0) {
      toast({
        title: "السلة فارغة",
        description: "الرجاء إضافة منتجات إلى السلة قبل إتمام العملية.",
        variant: "destructive",
      });
      return;
    }

    setIsTransactionComplete(true);

    const newOrder: Omit<Order, "id" | "createdAt" | "updatedAt"> = {
      customerId: selectedCustomer?.id || "guest",
      items: cartItems.map(item => ({
        id: uuidv4(),
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        totalPrice: item.product.price * item.quantity,
        isDigital: item.product.isDigital
      })),
      subtotal: subtotal,
      tax: tax,
      total: total,
      status: "completed",
      paymentMethod: paymentMethod,
      paymentStatus: "paid", // Fixed: Use the correct literal type
      isOnline: false,
      employeeId: currentUser?.id || ""
    };

    try {
      await addOrder(newOrder);
      toast({
        description: "تم إتمام العملية بنجاح!",
      });
      clearCart();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إتمام العملية.",
        variant: "destructive",
      });
    } finally {
      setIsTransactionComplete(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">نقطة البيع</h1>

      {/* Product Selection */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">المنتجات</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(product => (
            <div key={product.id} className="border rounded p-2 cursor-pointer" onClick={() => addItemToCart(product)}>
              <img src={product.thumbnailImage} alt={product.name} className="w-full h-32 object-cover mb-2" />
              <p className="text-sm font-medium">{product.name}</p>
              <p className="text-xs text-gray-500">{product.price} ر.س</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">السلة</h2>
        {cartItems.length === 0 ? (
          <p>السلة فارغة.</p>
        ) : (
          <div className="space-y-2">
            {cartItems.map(item => (
              <div key={item.product.id} className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center">
                  <img src={item.product.thumbnailImage} alt={item.product.name} className="w-16 h-16 object-cover rounded mr-2" />
                  <div>
                    <p className="text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-gray-500">{item.product.price} ر.س</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => updateItemQuantity(item.product.id, item.quantity - 1)}>-</button>
                  <span className="mx-2">{item.quantity}</span>
                  <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => updateItemQuantity(item.product.id, item.quantity + 1)}>+</button>
                  <button className="ml-2 px-2 py-1 bg-red-500 text-white rounded" onClick={() => removeItemFromCart(item.product.id)}>إزالة</button>
                </div>
              </div>
            ))}
            <div className="text-right">
              <p>المجموع الجزئي: {subtotal.toFixed(2)} ر.س</p>
              <p>الضريبة ({taxRate * 100}%): {tax.toFixed(2)} ر.س</p>
              <p className="font-semibold">المجموع الكلي: {total.toFixed(2)} ر.س</p>
            </div>
            <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={submitOrder}>
              إتمام العملية
            </button>
          </div>
        )}
      </div>

      {/* Payment */}
      <div>
        <h2 className="text-xl font-semibold mb-2">الدفع</h2>
        <div>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="mr-2"
              value="cash"
              checked={paymentMethod === 'cash'}
              onChange={() => handlePaymentMethodChange('cash')}
            />
            <span>نقداً</span>
          </label>
          <label className="inline-flex items-center ml-4">
            <input
              type="radio"
              className="mr-2"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={() => handlePaymentMethodChange('card')}
            />
            <span>بطاقة</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default POS;
