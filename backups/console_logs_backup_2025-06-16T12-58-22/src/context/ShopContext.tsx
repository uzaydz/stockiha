import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useTenant } from './TenantContext';
import { v4 as uuidv4 } from 'uuid';
import { withCache, DEFAULT_CACHE_TTL, SHORT_CACHE_TTL } from '@/lib/cache/storeCache';
import { OptimizedStoreService } from '@/services/OptimizedStoreService';

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
  
  // Flag to prevent multiple initialization
  const isInitialized = useRef(false);
  const loadingProducts = useRef(false);

  // حساب المجموع الكلي للسلة
  const cartTotal = cartService.calculateCartTotal(cart);

  const tenant = useTenant();

  // وظيفة محسنة لجلب المنتجات باستخدام OptimizedStoreService
  const fetchProducts = useCallback(async (organizationId: string) => {
    if (loadingProducts.current) {
      return [];
    }
    
    loadingProducts.current = true;
    
    // إنشاء وقت انتهاء مهلة للاستعلام
    const timeoutPromise = new Promise<Product[]>((_, reject) => {
      setTimeout(() => {
        reject(new Error('انتهت مهلة جلب المنتجات'));
      }, 30000);
    });
    
    try {
      // استخدام OptimizedStoreService بدلاً من الطلبات المنفصلة
      const productsPromise = withCache<Product[]>(
        `shop_products:${organizationId}`,
        async () => {
          console.log('🔄 ShopContext - جلب المنتجات باستخدام الطريقة القديمة المحسنة...');
          
          // استخدام استعلام مباشر محسن مع الألوان والأحجام
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select(`
              *,
              product_colors(
                *,
                product_sizes(*)
              )
            `)
            .eq('organization_id', organizationId)
            .eq('is_active', true);
            
          if (productsError) {
            console.error('❌ خطأ في جلب المنتجات:', productsError);
            return [];
          }

          console.log('✅ ShopContext - تم جلب المنتجات بنجاح:', productsData.length);
          
          // تحويل البيانات مع الألوان والأحجام المحملة مسبقاً
          return (productsData || []).map(product => ({
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: product.price,
            compareAtPrice: product.compare_at_price || undefined,
            sku: product.sku,
            barcode: product.barcode || undefined,
            category: 'accessories' as any,
            category_id: product.category_id || undefined,
            subcategory: undefined,
            brand: product.brand || undefined,
            images: product.images || [],
            thumbnailImage: product.thumbnail_image || '',
            stockQuantity: product.stock_quantity,
            stock_quantity: product.stock_quantity,
            features: product.features || undefined,
            specifications: product.specifications as Record<string, string> || {},
            isDigital: product.is_digital,
            isNew: product.is_new || undefined,
            isFeatured: product.is_featured || undefined,
            createdAt: new Date(product.created_at),
            updatedAt: new Date(product.updated_at),
            has_variants: product.has_variants || false,
            use_sizes: product.use_sizes || false,
            colors: (product.product_colors || []).map((color: any) => ({
              id: color.id,
              product_id: color.product_id,
              name: color.name,
              color_code: color.color_code,
              image_url: color.image_url,
              quantity: color.quantity,
              is_default: color.is_default,
              barcode: color.barcode,
              has_sizes: color.has_sizes,
              price: color.price,
              created_at: color.created_at,
              updated_at: color.updated_at,
              sizes: (color.product_sizes || []).map((size: any) => ({
                id: size.id,
                product_id: size.product_id,
                color_id: size.color_id,
                size_name: size.size_name,
                quantity: size.quantity,
                price: size.price,
                barcode: size.barcode,
                is_default: size.is_default,
                created_at: size.created_at,
                updated_at: size.updated_at
              }))
            }))
          }));
        },
        SHORT_CACHE_TTL // تخزين مؤقت لمدة 5 دقائق
      );
      
      // استخدام Race بين الاستعلام والمهلة الزمنية
      return await Promise.race([productsPromise, timeoutPromise]);
    } catch (error) {
      console.error('❌ ShopContext - خطأ في جلب المنتجات:', error);
      return [];
    } finally {
      loadingProducts.current = false;
    }
  }, []);

  // وظيفة محسنة لجلب الطلبات
  const fetchOrders = useCallback(async (organizationId: string) => {

    // إنشاء وقت انتهاء مهلة للاستعلام
    const timeoutPromise = new Promise<Order[]>((_, reject) => {
      setTimeout(() => {
        reject(new Error('انتهت مهلة جلب الطلبات'));
      }, 30000); // زيادة المهلة إلى 30 ثانية
    });
    
    try {
      // استخدام التخزين المؤقت لتحسين الأداء
      const ordersPromise = withCache<Order[]>(
        `shop_orders:${organizationId}`,
        async () => {

          // استخدام استعلام مباشر وبسيط
          const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });
            
          if (ordersError) {
            return [];
          }

          // تحويل البيانات - معالجة الوعود بشكل صحيح
          const orderPromises = ordersData.map(order => mapSupabaseOrderToOrder(order, false));
          return Promise.all(orderPromises);
        },
        SHORT_CACHE_TTL // تخزين مؤقت لمدة 5 دقائق
      );
      
      // استخدام Race بين الاستعلام والمهلة الزمنية
      return await Promise.race([ordersPromise, timeoutPromise]);
    } catch (error) {
      return [];
    }
  }, []);

  // وظيفة لجلب الخدمات
  const fetchServices = useCallback(async (organizationId: string) => {
    
    // إنشاء وقت انتهاء مهلة للاستعلام
    const timeoutPromise = new Promise<Service[]>((_, reject) => {
      setTimeout(() => {
        reject(new Error('انتهت مهلة جلب الخدمات'));
      }, 30000);
    });
    
    try {
      // Use cache system to prevent duplicate requests
      const servicesPromise = withCache<Service[]>(
        `shop_services:${organizationId}`,
        async () => {
          
          // أولاً، دعنا نتحقق من العدد الكلي للخدمات في هذه المنظمة
          const { data: allServicesData, error: allServicesError } = await supabase
            .from('services')
            .select('*')
            .eq('organization_id', organizationId);
          
          if (allServicesError) {
          }
          
          // ثم نجلب الخدمات المتاحة فقط
          const { data: servicesData, error: servicesError } = await supabase
            .from('services')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_available', true);
            
          if (servicesError) {
            return [];
          }

          return (servicesData || []).map(service => mapSupabaseServiceToService(service));
        },
        SHORT_CACHE_TTL // تخزين مؤقت لمدة 5 دقائق
      );
      
      // استخدام Race بين الاستعلام والمهلة الزمنية
      return await Promise.race([servicesPromise, timeoutPromise]);
    } catch (error) {
      return [];
    }
  }, []);

  // وظيفة لجلب البيانات بشكل متوازي
  const fetchData = useCallback(async () => {
    try {
      // Skip if already initialized and data is loaded
      if (isInitialized.current && products.length > 0 && orders.length > 0) {
        
        return;
      }

      setIsLoading(true);
      
      // الحصول على معرف المنظمة
      const organizationId = await getOrganizationId(currentUser);
          
      if (!organizationId) {
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
      }
      
      // تنفيذ عمليات الجلب بشكل متوازي لتسريع التحميل - إضافة جلب الخدمات
      const [fetchedProducts, fetchedOrders, fetchedServices] = await Promise.allSettled([
        fetchProducts(organizationId),
        fetchOrders(organizationId),
        fetchServices(organizationId)
      ]);
      
      // معالجة نتائج المنتجات
      if (fetchedProducts.status === 'fulfilled') {
        setProducts(fetchedProducts.value);
        
      } else {
      }
      
      // معالجة نتائج الطلبات
      if (fetchedOrders.status === 'fulfilled') {
        setOrders(fetchedOrders.value);
        
      } else {
      }
      
      // معالجة نتائج الخدمات
      if (fetchedServices.status === 'fulfilled') {
        setServices(fetchedServices.value);
      } else {
      }
      
      // جلب المستخدمين بشكل منفصل (لا نستخدم Promise.allSettled لأننا نحتاج إلى معالجة الخطأ مباشرة)
      try {
        
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .eq('organization_id', organizationId);
          
        if (usersError) {
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
            
            // حفظ المستخدمين في التخزين المحلي
            try {
              localStorage.setItem('bazaar_users', JSON.stringify(mergedUsers));
            } catch (storageError) {
            }
            
            return mergedUsers;
          });
        }
      } catch (usersError) {
      }

      isInitialized.current = true;
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, fetchProducts, fetchOrders, fetchServices]);

  // Use useEffect with proper dependencies
  useEffect(() => {
    if (!tenant.isLoading && tenant.currentOrganization?.id) {
      // تحديد الصفحات التي تحتاج ShopContext فقط
      const currentPath = window.location.pathname;
      const needsShopContext = 
        currentPath === '/dashboard/pos' || // POS فقط يحتاج ShopContext
        currentPath === '/' || 
        currentPath.startsWith('/products/') || 
        currentPath.startsWith('/category/');
      
      if (needsShopContext) {
        // تحميل البيانات فقط في الصفحات المحددة
        fetchData();
        console.log('✅ ShopContext - تم تحميل البيانات في:', currentPath);
      } else {
        console.log('🚫 ShopContext - تم تجنب التحميل التلقائي في:', currentPath, '- سيتم استخدام DashboardDataContext');
        setIsLoading(false); // تعيين حالة التحميل false لمنع انتظار البيانات
      }
    }
  }, [tenant.isLoading, tenant.currentOrganization?.id, fetchData]);
  
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
    return false;
    }
  };
  
  const logout = async () => {
    try {
      await userService.logout();
    setCurrentUser(null);
    } catch (error) {
    }
  };
  
  // وظائف المنتجات
  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newProduct = await productService.addProduct(product);
      setProducts([...products, newProduct]);
      return newProduct;
    } catch (error) {
      throw error;
    }
  };
  
  const updateProduct = async (product: Product) => {
    try {
      const updatedProduct = await productService.updateProduct(product);
      setProducts(products.map(p => p.id === product.id ? updatedProduct : p));
      return updatedProduct;
    } catch (error) {
      throw error;
    }
  };
  
  const deleteProduct = async (productId: string) => {
    try {
      await productService.deleteProduct(productId);
    setProducts(products.filter(p => p.id !== productId));
      return true;
    } catch (error) {
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
      throw error;
    }
  };
  
  const updateService = async (service: Service) => {
    try {
      const updatedService = await serviceService.updateService(service);
      setServices(services.map(s => s.id === service.id ? updatedService : s));
      return updatedService;
    } catch (error) {
      throw error;
    }
  };
  
  const deleteService = async (serviceId: string) => {
    try {
      await serviceService.deleteService(serviceId);
      setServices(services.filter(s => s.id !== serviceId));
      return true;
    } catch (error) {
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
      throw error;
    }
  };
  
  const getServiceBookings = async () => {
    try {
      return await serviceService.getServiceBookings(currentOrganization?.id);
    } catch (error) {
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
