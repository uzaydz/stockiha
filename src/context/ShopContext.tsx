import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from './TenantContext';
import { v4 as uuidv4 } from 'uuid';

// استيراد الأنواع من الملفات المنفصلة
import { 
  ShopContextType, 
  CartItem 
} from './shop/types';

// استيراد الأنواع الأساسية
import { 
  Product, 
  Service, 
  User, 
  Order, 
  Transaction, 
  Expense, 
  OrderStatus, 
  ServiceStatus,
  ServiceBooking,
  OrderItem
} from '../types';

// استيراد دوال المساعدة
import { 
  mapSupabaseProductToProduct, 
  mapSupabaseServiceToService, 
  mapSupabaseUserToUser, 
  mapSupabaseOrderToOrder,
  isValidUUID 
} from './shop/mappers';

import { 
  getOrganizationId, 
  ensureGuestCustomer 
} from './shop/utils';

// استيراد خدمات الملفات المنفصلة
import * as productService from './shop/productService';
import * as serviceService from './shop/serviceService';
import * as userService from './shop/userService';
import * as orderService from './shop/orderService';
import * as cartService from './shop/cartService';

// إنشاء سياق المتجر
const ShopContext = createContext<ShopContextType | undefined>(undefined);

// مزود سياق المتجر
export const ShopProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // حالة المتجر
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentOrganization, setCurrentOrganization] = useState<{ id: string } | null>(null);

  // حساب المجموع الكلي للسلة
  const cartTotal = cartService.calculateCartTotal(cart);

  const tenant = useTenant();

  // وظيفة لجلب البيانات
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // الحصول على معرف المنظمة
      const organizationId = await getOrganizationId(currentUser);
          
          if (!organizationId) {
        console.error('لم يتم العثور على معرف المنظمة');
        setIsLoading(false);
            return;
          }
          
      setCurrentOrganization({ id: organizationId });
      
      // التأكد من وجود عميل زائر
      await ensureGuestCustomer();
      
      // محاولة استرداد المستخدمين من التخزين المحلي
    try {
      const storedUsers = localStorage.getItem('bazaar_users');
      if (storedUsers) {
        const parsedUsers = JSON.parse(storedUsers);
          setUsers(parsedUsers);
        }
      } catch (error) {
        console.error('Error parsing stored users:', error);
      }
      
      try {
        // جلب المنتجات مع بيانات الألوان والمقاسات
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            *,
            product_colors (
              *,
              product_sizes (*)
            )
          `)
          .eq('organization_id', organizationId)
          .eq('is_active', true);
          
        if (productsError) {
          console.error('Error fetching products:', productsError);
        } else {
          console.log('تم استرجاع المنتجات بنجاح. عدد المنتجات:', productsData.length);
          
          // تحويل البيانات وإضافة الألوان والمقاسات
          const mappedProducts = productsData.map(product => {
            const colors = product.product_colors?.map(color => {
              const sizes = color.product_sizes?.map(size => ({
                id: size.id,
                color_id: size.color_id,
                product_id: size.product_id,
                size_name: size.size_name,
                quantity: size.quantity,
                price: size.price,
                barcode: size.barcode || null,
                is_default: size.is_default
              })) || [];
              
              return {
                id: color.id,
                name: color.name,
                color_code: color.color_code,
                image_url: color.image_url,
                quantity: color.quantity || 0,
                price: color.price,
                is_default: color.is_default,
                barcode: color.barcode || null,
                has_sizes: color.has_sizes || false,
                sizes: sizes
              };
            }) || [];
            
            // المنتج مع الألوان والمقاسات
            return {
              ...mapSupabaseProductToProduct(product),
              colors: colors,
              has_variants: product.has_variants || false,
              use_sizes: product.use_sizes || false
            };
          });
          
          setProducts(mappedProducts);
        }
        
        // جلب الخدمات
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('organization_id', organizationId);
          
        if (servicesError) {
          console.error('Error fetching services:', servicesError);
        } else {
          const mappedServices = servicesData.map(mapSupabaseServiceToService);
          setServices(mappedServices);
        }
        
        // جلب المستخدمين
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .eq('organization_id', organizationId);
          
        if (usersError) {
          console.error('Error fetching users:', usersError);
        } else {
          const mappedUsers = usersData.map(mapSupabaseUserToUser);
          setUsers(prevUsers => {
            // دمج المستخدمين من API مع المستخدمين المخزنة محليًا
            const mergedUsers = [...mappedUsers];
            
            // إضافة المستخدمين المخزنة محليًا التي لا توجد في API
            for (const localUser of prevUsers) {
              const existingIndex = mergedUsers.findIndex(u => u.id === localUser.id);
              if (existingIndex >= 0) {
                // تحديث البيانات الموجودة إذا كانت البيانات المحلية أحدث
                if (localUser.updatedAt > mergedUsers[existingIndex].updatedAt) {
                  mergedUsers[existingIndex] = localUser;
                }
              } else {
                // إضافة المستخدم المحلي إذا لم يكن موجوداً
                mergedUsers.push(localUser);
              }
            }
            
            return mergedUsers;
          });
        }
        
        // جلب العملاء
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .eq('organization_id', organizationId);
          
        if (customersError) {
          console.error('Error fetching customers:', customersError);
        } else {
          // تحويل بيانات العملاء إلى نوع المستخدم وإضافتها إلى قائمة المستخدمين
          setUsers(prevUsers => {
            const mergedUsers = [...prevUsers];
            
            for (const customerData of customersData) {
              const customer = {
                id: customerData.id,
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                role: 'customer' as const, // تحديد النوع بشكل صريح
          isActive: true,
                createdAt: new Date(customerData.created_at),
                updatedAt: new Date(customerData.updated_at),
                organization_id: customerData.organization_id
              };
              
          const existingIndex = mergedUsers.findIndex(u => u.id === customer.id);
          if (existingIndex >= 0) {
            // تحديث البيانات الموجودة
            mergedUsers[existingIndex] = customer;
          } else {
            // إضافة العميل إذا لم يكن موجوداً
            mergedUsers.push(customer);
          }
        }
        
            return mergedUsers;
          });
        }
        
        // جلب الطلبات
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });
          
        if (ordersError) {
          console.error('Error fetching orders:', ordersError);
          } else {
          const mappedOrders = await Promise.all(ordersData.map(mapSupabaseOrderToOrder));
          setOrders(mappedOrders);
        }
        
        // جلب المعاملات المالية
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });
          
        if (transactionsError) {
          console.error('Error fetching transactions:', transactionsError);
        } else {
          const mappedTransactions = transactionsData.map(transaction => ({
            id: transaction.id,
            orderId: transaction.order_id,
            amount: transaction.amount,
            type: transaction.type,
            paymentMethod: transaction.payment_method,
            description: transaction.description,
            createdAt: new Date(transaction.created_at),
            employeeId: transaction.employee_id
          }));
          
          setTransactions(mappedTransactions);
        }
        
        // جلب المصاريف
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });
          
        if (expensesError) {
          console.error('Error fetching expenses:', expensesError);
        } else {
          const mappedExpenses = expensesData.map(expense => ({
            id: expense.id,
            title: expense.title,
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            date: new Date(expense.date),
            paymentMethod: expense.payment_method,
            paymentStatus: expense.payment_status,
            organizationId: expense.organization_id
          }));
          
          setExpenses(mappedExpenses);
        }
    } catch (error) {
      console.error('Error fetching data:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // تحديث البيانات عند بدء التطبيق أو تغيير المستخدم الحالي
  useEffect(() => {
    fetchData();
  }, [currentUser]);
  
  // دالة لتحديث البيانات
  const refreshData = async () => {
    await fetchData();
  };
  
  // وظائف المصادقة
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await userService.login(email, password);
      if (result.success && result.user) {
        setCurrentUser(result.user);
      return true;
    }
      return false;
    } catch (error) {
      console.error('Login error:', error);
    return false;
    }
  };
  
  const logout = async () => {
    try {
      await userService.logout();
    setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  // وظائف المنتجات
  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newProduct = await productService.addProduct(product);
      setProducts([...products, newProduct]);
      return newProduct;
    } catch (error) {
      console.error('Error in addProduct:', error);
      throw error;
    }
  };
  
  const updateProduct = async (product: Product) => {
    try {
      const updatedProduct = await productService.updateProduct(product);
      setProducts(products.map(p => p.id === product.id ? updatedProduct : p));
      return updatedProduct;
    } catch (error) {
      console.error('Error in updateProduct:', error);
      throw error;
    }
  };
  
  const deleteProduct = async (productId: string) => {
    try {
      await productService.deleteProduct(productId);
    setProducts(products.filter(p => p.id !== productId));
      return true;
    } catch (error) {
      console.error('Error in deleteProduct:', error);
      throw error;
    }
  };
  
  // وظائف الخدمات
  const addService = async (service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newService = await serviceService.addService(service);
      setServices([...services, newService]);
      return newService;
    } catch (error) {
      console.error('Error in addService:', error);
      throw error;
    }
  };
  
  const updateService = async (service: Service) => {
    try {
      const updatedService = await serviceService.updateService(service);
      setServices(services.map(s => s.id === service.id ? updatedService : s));
      return updatedService;
    } catch (error) {
      console.error('Error in updateService:', error);
      throw error;
    }
  };
  
  const deleteService = async (serviceId: string) => {
    try {
      await serviceService.deleteService(serviceId);
      setServices(services.filter(s => s.id !== serviceId));
      return true;
    } catch (error) {
      console.error('Error in deleteService:', error);
      throw error;
    }
  };
  
  // وظائف حجوزات الخدمات
  const updateServiceBookingStatus = async (
    orderId: string, 
    serviceBookingId: string, 
    status: ServiceStatus, 
    note?: string
  ) => {
    try {
      await serviceService.updateServiceBookingStatus(
        orderId, 
        serviceBookingId, 
        status, 
        note,
        currentUser?.id
      );
      await refreshData();
    } catch (error) {
      console.error('Error in updateServiceBookingStatus:', error);
      throw error;
    }
  };
  
  const assignServiceBooking = async (
    orderId: string, 
    serviceBookingId: string, 
    employeeId: string
  ) => {
    try {
      await serviceService.assignServiceBooking(orderId, serviceBookingId, employeeId);
      await refreshData();
    } catch (error) {
      console.error('Error in assignServiceBooking:', error);
      throw error;
    }
  };
  
  const getServiceBookings = async () => {
    try {
      return await serviceService.getServiceBookings(currentOrganization?.id);
    } catch (error) {
      console.error('Error in getServiceBookings:', error);
      throw error;
    }
  };
  
  // وظائف المستخدمين
  const addUser = (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newUser: User = {
      ...user,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setUsers([...users, newUser]);
    return newUser;
  };
  
  const updateUser = (user: User) => {
    const updatedUser = { ...user, updatedAt: new Date() };
    setUsers(users.map(u => u.id === user.id ? updatedUser : u));
    return updatedUser;
  };
  
  const deleteUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
  };
  
  // إنشاء عميل جديد
  const createCustomer = async (customerData: { name: string; email?: string; phone?: string }): Promise<User> => {
    try {
      const newCustomer = await userService.createCustomer(customerData);
      if (newCustomer) {
        setUsers(prevUsers => [
          ...prevUsers.filter(u => u.id !== newCustomer.id),
          newCustomer
        ]);
        return newCustomer;
      }
      throw new Error('فشل في إنشاء العميل');
        } catch (error) {
      console.error('Error creating customer:', error);
          throw error;
        }
  };
  
  // وظائف الطلبات
  const addOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newOrder = await orderService.addOrder(order, currentOrganization?.id);
      setOrders([newOrder, ...orders]);
      return newOrder;
     } catch (error) {
       console.error('Error in addOrder:', error);
       throw error;
     }
    };
   
   const updateOrder = (order: Order) => {
    const updatedOrder = { ...order, updatedAt: new Date() };
    setOrders(orders.map(o => o.id === order.id ? updatedOrder : o));
    return updatedOrder;
   };
   
   const deleteOrder = (orderId: string) => {
    try {
      orderService.deleteOrder(orderId);
     setOrders(orders.filter(o => o.id !== orderId));
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
   };
   
  // وظائف عربة التسوق
   const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prevCart => cartService.addToCart(prevCart, product, quantity));
   };
   
   const removeFromCart = (productId: string) => {
    setCart(prevCart => cartService.removeFromCart(prevCart, productId));
   };
   
   const updateCartItemQuantity = (productId: string, quantity: number) => {
    setCart(prevCart => cartService.updateCartItemQuantity(prevCart, productId, quantity));
   };
   
   const clearCart = () => {
    setCart(cartService.clearCart());
   };
   
  // وظائف المعاملات المالية
   const addTransaction = (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
     const newTransaction: Transaction = {
       ...transaction,
       id: Date.now().toString(),
      createdAt: new Date()
     };
    setTransactions([newTransaction, ...transactions]);
    return newTransaction;
   };
   
  // وظائف المصاريف
   const addExpense = (expense: Omit<Expense, 'id'>) => {
     const newExpense: Expense = {
       ...expense,
       id: Date.now().toString()
     };
    setExpenses([newExpense, ...expenses]);
    return newExpense;
   };
   
   const updateExpense = (expense: Expense) => {
     setExpenses(expenses.map(e => e.id === expense.id ? expense : e));
    return expense;
   };
   
   const deleteExpense = (expenseId: string) => {
     setExpenses(expenses.filter(e => e.id !== expenseId));
   };
   
  // إعداد قيمة السياق
  const contextValue: ShopContextType = {
     currentUser,
     login,
     logout,
     products,
     addProduct,
     updateProduct,
     deleteProduct,
     services,
     addService,
     updateService,
     deleteService,
     updateServiceBookingStatus,
     assignServiceBooking,
     getServiceBookings,
     users,
     addUser,
     updateUser,
     deleteUser,
     createCustomer,
     orders,
     addOrder,
     updateOrder,
     deleteOrder,
     cart,
     addToCart,
     removeFromCart,
     updateCartItemQuantity,
     clearCart,
     cartTotal,
     transactions,
     addTransaction,
     expenses,
     addExpense,
     updateExpense,
     deleteExpense,
     isLoading,
     refreshData
   };
   
  return (
    <ShopContext.Provider value={contextValue}>
      {children}
    </ShopContext.Provider>
  );
};

// دالة لاستخدام سياق المتجر في المكونات
 export const useShop = (): ShopContextType => {
   const context = useContext(ShopContext);
  
   if (context === undefined) {
     throw new Error('useShop must be used within a ShopProvider');
   }
  
   return context;
 };