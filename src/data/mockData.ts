
import { 
  Product, 
  Service, 
  User, 
  Order, 
  OrderStatus, 
  Transaction,
  Expense,
  DashboardStats,
  ProductCategory,
  ServiceCategory
} from '../types';

// Products
export const products: Product[] = [
  {
    id: '1',
    name: 'جهاز إكس بوكس سيريس إكس',
    description: 'أحدث جهاز إكس بوكس من مايكروسوفت بأداء فائق وسرعة مذهلة مع دعم دقة 4K وتقنية الأشعة التتبعية.',
    price: 2299,
    sku: 'XSX-001',
    barcode: '123456789012',
    category: 'consoles',
    brand: 'Microsoft',
    images: ['/xbox-series-x.jpg', '/xbox-series-x-2.jpg'],
    thumbnailImage: '/xbox-series-x.jpg',
    stockQuantity: 15,
    features: [
      'معالج AMD Zen 2',
      'كرت شاشة AMD RDNA 2',
      'ذاكرة SSD بسعة 1 تيرابايت',
      'دعم دقة 4K ومعدل إطارات 120fps'
    ],
    specifications: {
      'المعالج': 'AMD Zen 2',
      'كرت الشاشة': 'AMD RDNA 2',
      'الذاكرة': '16GB GDDR6',
      'التخزين': '1TB SSD',
      'منافذ': 'HDMI 2.1, USB 3.2, Ethernet'
    },
    isDigital: false,
    isNew: true,
    isFeatured: true,
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2023-06-01')
  },
  {
    id: '2',
    name: 'سماعة إكس بوكس لاسلكية',
    description: 'سماعة رأس لاسلكية رسمية من مايكروسوفت لأجهزة إكس بوكس مع جودة صوت محيطي وميكروفون قابل للإزالة.',
    price: 349,
    sku: 'XBH-002',
    category: 'accessories',
    brand: 'Microsoft',
    images: ['/xbox-headset.jpg'],
    thumbnailImage: '/xbox-headset.jpg',
    stockQuantity: 25,
    features: [
      'لاسلكية بتقنية البلوتوث',
      'صوت محيطي',
      'بطارية تدوم لـ 15 ساعة',
      'ميكروفون قابل للإزالة'
    ],
    isDigital: false,
    createdAt: new Date('2023-06-02'),
    updatedAt: new Date('2023-06-02')
  },
  {
    id: '3',
    name: 'لعبة هالو إنفينيت',
    description: 'أحدث إصدار من سلسلة ألعاب هالو الشهيرة لأجهزة إكس بوكس والحاسب الشخصي.',
    price: 249,
    sku: 'HI-003',
    category: 'games_physical',
    brand: '343 Industries',
    images: ['/halo-infinite.jpg'],
    thumbnailImage: '/halo-infinite.jpg',
    stockQuantity: 30,
    isDigital: false,
    createdAt: new Date('2023-06-03'),
    updatedAt: new Date('2023-06-03')
  },
  {
    id: '4',
    name: 'بطاقة إكس بوكس لايف جولد - 3 أشهر',
    description: 'بطاقة اشتراك لخدمة إكس بوكس لايف جولد لمدة 3 أشهر للاستمتاع باللعب اونلاين.',
    price: 129,
    sku: 'XLG-004',
    category: 'games_digital',
    brand: 'Microsoft',
    images: ['/xbox-live-gold.jpg'],
    thumbnailImage: '/xbox-live-gold.jpg',
    stockQuantity: 100,
    isDigital: true,
    createdAt: new Date('2023-06-04'),
    updatedAt: new Date('2023-06-04')
  },
  {
    id: '5',
    name: 'يد تحكم إكس بوكس لاسلكية',
    description: 'يد تحكم لاسلكية رسمية من مايكروسوفت لأجهزة إكس بوكس بلون أسود كلاسيكي.',
    price: 289,
    sku: 'XBC-005',
    category: 'controllers',
    brand: 'Microsoft',
    images: ['/xbox-controller.jpg'],
    thumbnailImage: '/xbox-controller.jpg',
    stockQuantity: 20,
    features: [
      'اتصال لاسلكي',
      'بطارية تدوم لـ 40 ساعة',
      'اهتزاز مزدوج',
      'زر مشاركة مخصص'
    ],
    isDigital: false,
    isFeatured: true,
    createdAt: new Date('2023-06-05'),
    updatedAt: new Date('2023-06-05')
  },
  {
    id: '6',
    name: 'محرك قرص صلب SSD لإكس بوكس',
    description: 'توسعة تخزين SSD بسعة 1 تيرابايت لأجهزة إكس بوكس سيريس إكس وإس.',
    price: 899,
    sku: 'XSS-006',
    category: 'components',
    brand: 'Seagate',
    images: ['/xbox-ssd.jpg'],
    thumbnailImage: '/xbox-ssd.jpg',
    stockQuantity: 10,
    features: [
      'سعة 1 تيرابايت',
      'سرعة قراءة وكتابة فائقة',
      'متوافق مع أجهزة إكس بوكس سيريس إكس وإس',
      'سهل التركيب'
    ],
    isDigital: false,
    createdAt: new Date('2023-06-06'),
    updatedAt: new Date('2023-06-06')
  },
  {
    id: '7',
    name: 'تيشيرت هالو',
    description: 'تيشيرت رسمي من سلسلة ألعاب هالو بلون أسود مع شعار اللعبة.',
    price: 79,
    sku: 'HT-007',
    category: 'merchandise',
    brand: 'Xbox Gear',
    images: ['/halo-tshirt.jpg'],
    thumbnailImage: '/halo-tshirt.jpg',
    stockQuantity: 40,
    isDigital: false,
    createdAt: new Date('2023-06-07'),
    updatedAt: new Date('2023-06-07')
  },
  // يمكن إضافة المزيد من المنتجات هنا
];

// Services
export const services: Service[] = [
  {
    id: '1',
    name: 'إصلاح وحدة التغذية الكهربائية - إكس بوكس',
    description: 'إصلاح مشاكل وحدة التغذية الكهربائية لأجهزة إكس بوكس.',
    price: 150,
    estimatedTime: '1-3 أيام',
    category: 'repair',
    image: '/power-supply-repair.jpg',
    isAvailable: true,
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2023-06-01')
  },
  {
    id: '2',
    name: 'إصلاح محرك الأقراص - إكس بوكس',
    description: 'إصلاح مشاكل محرك الأقراص الضوئية في أجهزة إكس بوكس.',
    price: 199,
    estimatedTime: '2-4 أيام',
    category: 'repair',
    image: '/disc-drive-repair.jpg',
    isAvailable: true,
    createdAt: new Date('2023-06-02'),
    updatedAt: new Date('2023-06-02')
  },
  {
    id: '3',
    name: 'تنظيف وصيانة شاملة',
    description: 'تنظيف شامل للجهاز من الداخل والخارج مع تغيير معجون التبريد للمعالج.',
    price: 120,
    estimatedTime: '1 يوم',
    category: 'maintenance',
    image: '/console-cleaning.jpg',
    isAvailable: true,
    createdAt: new Date('2023-06-03'),
    updatedAt: new Date('2023-06-03')
  },
  {
    id: '4',
    name: 'تركيب محرك SSD',
    description: 'ترقية الجهاز بتركيب محرك SSD لتحسين الأداء وسرعة التحميل.',
    price: 150,
    estimatedTime: '1-2 ساعة',
    category: 'installation',
    image: '/ssd-installation.jpg',
    isAvailable: true,
    createdAt: new Date('2023-06-04'),
    updatedAt: new Date('2023-06-04')
  },
  {
    id: '5',
    name: 'إصلاح وحدة التحكم',
    description: 'إصلاح مشاكل وحدات التحكم لجميع أنواع أجهزة الألعاب.',
    price: 99,
    estimatedTime: '1-2 يوم',
    category: 'repair',
    image: '/controller-repair.jpg',
    isAvailable: true,
    createdAt: new Date('2023-06-05'),
    updatedAt: new Date('2023-06-05')
  },
  {
    id: '6',
    name: 'تخصيص وحدة التحكم',
    description: 'طلاء وتخصيص وحدات التحكم بألوان وتصاميم مخصصة.',
    price: 199,
    estimatedTime: '3-5 أيام',
    category: 'customization',
    image: '/controller-customization.jpg',
    isAvailable: true,
    createdAt: new Date('2023-06-06'),
    updatedAt: new Date('2023-06-06')
  },
  // يمكن إضافة المزيد من الخدمات هنا
];

// Users
export const users: User[] = [
  {
    id: '1',
    email: 'admin@gameshop.com',
    name: 'مدير النظام',
    phone: '0501234567',
    role: 'admin',
    permissions: {
      manageProducts: true,
      manageServices: true,
      manageOrders: true,
      manageUsers: true,
      manageEmployees: true,
      viewReports: true,
      accessPOS: true,
      processPayments: true
    },
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },
  {
    id: '2',
    email: 'employee1@gameshop.com',
    name: 'أحمد محمد',
    phone: '0502345678',
    role: 'employee',
    permissions: {
      manageProducts: false,
      manageServices: false,
      manageOrders: true,
      manageUsers: false,
      manageEmployees: false,
      viewReports: false,
      accessPOS: true,
      processPayments: true
    },
    isActive: true,
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2023-02-01')
  },
  {
    id: '3',
    email: 'customer1@example.com',
    name: 'سارة عبدالله',
    phone: '0503456789',
    role: 'customer',
    addresses: [
      {
        id: '1',
        userId: '3',
        name: 'المنزل',
        streetAddress: 'شارع الملك فهد، حي العليا',
        city: 'الرياض',
        state: 'منطقة الرياض',
        postalCode: '12345',
        country: 'المملكة العربية السعودية',
        phone: '0503456789',
        isDefault: true
      }
    ],
    isActive: true,
    createdAt: new Date('2023-03-01'),
    updatedAt: new Date('2023-03-01')
  },
  // يمكن إضافة المزيد من المستخدمين هنا
];

// Orders
export const orders: Order[] = [
  {
    id: '1',
    customerId: '3',
    items: [
      {
        id: '1',
        productId: '1',
        productName: 'جهاز إكس بوكس سيريس إكس',
        quantity: 1,
        unitPrice: 2299,
        totalPrice: 2299,
        isDigital: false
      },
      {
        id: '2',
        productId: '5',
        productName: 'يد تحكم إكس بوكس لاسلكية',
        quantity: 1,
        unitPrice: 289,
        totalPrice: 289,
        isDigital: false
      }
    ],
    subtotal: 2588,
    tax: 388.2,
    total: 2976.2,
    status: 'completed',
    paymentMethod: 'بطاقة ائتمان',
    paymentStatus: 'paid',
    shippingAddress: {
      id: '1',
      userId: '3',
      name: 'المنزل',
      streetAddress: 'شارع الملك فهد، حي العليا',
      city: 'الرياض',
      state: 'منطقة الرياض',
      postalCode: '12345',
      country: 'المملكة العربية السعودية',
      phone: '0503456789',
      isDefault: true
    },
    shippingMethod: 'توصيل سريع',
    shippingCost: 0,
    isOnline: true,
    createdAt: new Date('2023-06-10'),
    updatedAt: new Date('2023-06-11')
  },
  {
    id: '2',
    customerId: '3',
    items: [
      {
        id: '3',
        productId: '3',
        productName: 'لعبة هالو إنفينيت',
        quantity: 1,
        unitPrice: 249,
        totalPrice: 249,
        isDigital: false
      }
    ],
    services: [
      {
        id: '1',
        serviceId: '3',
        serviceName: 'تنظيف وصيانة شاملة',
        price: 120,
        scheduledDate: new Date('2023-06-15'),
        notes: 'الجهاز يحتاج إلى تنظيف من الغبار',
        status: 'pending'
      }
    ],
    subtotal: 369,
    tax: 55.35,
    total: 424.35,
    status: 'processing',
    paymentMethod: 'دفع عند الاستلام',
    paymentStatus: 'pending',
    shippingAddress: {
      id: '1',
      userId: '3',
      name: 'المنزل',
      streetAddress: 'شارع الملك فهد، حي العليا',
      city: 'الرياض',
      state: 'منطقة الرياض',
      postalCode: '12345',
      country: 'المملكة العربية السعودية',
      phone: '0503456789',
      isDefault: true
    },
    shippingMethod: 'شحن عادي',
    shippingCost: 15,
    isOnline: true,
    createdAt: new Date('2023-06-12'),
    updatedAt: new Date('2023-06-12')
  },
  {
    id: '3',
    customerId: '3',
    items: [
      {
        id: '4',
        productId: '4',
        productName: 'بطاقة إكس بوكس لايف جولد - 3 أشهر',
        quantity: 1,
        unitPrice: 129,
        totalPrice: 129,
        isDigital: true
      }
    ],
    subtotal: 129,
    tax: 19.35,
    total: 148.35,
    status: 'completed',
    paymentMethod: 'بطاقة ائتمان',
    paymentStatus: 'paid',
    isOnline: true,
    createdAt: new Date('2023-06-13'),
    updatedAt: new Date('2023-06-13')
  },
  {
    id: '4',
    customerId: '',
    items: [
      {
        id: '5',
        productId: '5',
        productName: 'يد تحكم إكس بوكس لاسلكية',
        quantity: 2,
        unitPrice: 289,
        totalPrice: 578,
        isDigital: false
      },
      {
        id: '6',
        productId: '7',
        productName: 'تيشيرت هالو',
        quantity: 1,
        unitPrice: 79,
        totalPrice: 79,
        isDigital: false
      }
    ],
    subtotal: 657,
    tax: 98.55,
    total: 755.55,
    status: 'completed',
    paymentMethod: 'نقدي',
    paymentStatus: 'paid',
    isOnline: false,
    employeeId: '2',
    createdAt: new Date('2023-06-14'),
    updatedAt: new Date('2023-06-14')
  },
  // يمكن إضافة المزيد من الطلبات هنا
];

// Transactions
export const transactions: Transaction[] = [
  {
    id: '1',
    orderId: '1',
    amount: 2976.2,
    type: 'sale',
    paymentMethod: 'بطاقة ائتمان',
    description: 'مبيعات عبر الإنترنت',
    createdAt: new Date('2023-06-11')
  },
  {
    id: '2',
    orderId: '3',
    amount: 148.35,
    type: 'sale',
    paymentMethod: 'بطاقة ائتمان',
    description: 'مبيعات منتج رقمي',
    createdAt: new Date('2023-06-13')
  },
  {
    id: '3',
    orderId: '4',
    amount: 755.55,
    type: 'sale',
    paymentMethod: 'نقدي',
    description: 'مبيعات في المتجر',
    employeeId: '2',
    createdAt: new Date('2023-06-14')
  },
  {
    id: '4',
    amount: 500,
    type: 'expense',
    paymentMethod: 'تحويل بنكي',
    description: 'إيجار المتجر',
    createdAt: new Date('2023-06-01')
  },
  {
    id: '5',
    amount: 300,
    type: 'expense',
    paymentMethod: 'نقدي',
    description: 'مصاريف خدمات (كهرباء، ماء، إنترنت)',
    createdAt: new Date('2023-06-05')
  },
  // يمكن إضافة المزيد من المعاملات هنا
];

// Expenses
export const expenses: Expense[] = [
  {
    id: '1',
    category: 'إيجار',
    amount: 500,
    description: 'إيجار المتجر لشهر يونيو',
    date: new Date('2023-06-01'),
    approvedBy: '1'
  },
  {
    id: '2',
    category: 'خدمات',
    amount: 200,
    description: 'فاتورة الكهرباء',
    date: new Date('2023-06-05'),
    approvedBy: '1'
  },
  {
    id: '3',
    category: 'خدمات',
    amount: 100,
    description: 'فاتورة المياه',
    date: new Date('2023-06-05'),
    approvedBy: '1'
  },
  {
    id: '4',
    category: 'خدمات',
    amount: 150,
    description: 'فاتورة الإنترنت',
    date: new Date('2023-06-05'),
    approvedBy: '1'
  },
  {
    id: '5',
    category: 'تسويق',
    amount: 300,
    description: 'إعلانات على مواقع التواصل الاجتماعي',
    date: new Date('2023-06-10'),
    approvedBy: '1'
  },
  // يمكن إضافة المزيد من المصاريف هنا
];

// Dashboard Stats
export const dashboardStats: DashboardStats = {
  sales: {
    daily: 3500,
    weekly: 24500,
    monthly: 98000,
    annual: 1200000
  },
  revenue: {
    daily: 3500,
    weekly: 24500,
    monthly: 98000,
    annual: 1200000
  },
  profits: {
    daily: 1750,
    weekly: 12250,
    monthly: 49000,
    annual: 600000
  },
  orders: {
    pending: 5,
    processing: 8,
    completed: 42,
    total: 55
  },
  inventory: {
    totalProducts: 120,
    lowStock: 15,
    outOfStock: 5
  },
  customers: {
    total: 250,
    new: 12
  }
};

// Helper functions
export const getCategoryName = (category: ProductCategory): string => {
  const categoryMap: Record<ProductCategory, string> = {
    consoles: 'أجهزة',
    accessories: 'إكسسوارات',
    games_physical: 'ألعاب فيزيائية',
    games_digital: 'ألعاب رقمية',
    controllers: 'وحدات تحكم',
    components: 'قطع غيار',
    merchandise: 'منتجات تذكارية'
  };
  return categoryMap[category];
};

export const getServiceCategoryName = (category: ServiceCategory): string => {
  const categoryMap: Record<ServiceCategory, string> = {
    repair: 'خدمات إصلاح',
    installation: 'خدمات تركيب',
    maintenance: 'خدمات صيانة',
    customization: 'خدمات تخصيص'
  };
  return categoryMap[category];
};

export const getOrderStatusName = (status: OrderStatus): string => {
  const statusMap: Record<OrderStatus, string> = {
    pending: 'قيد الانتظار',
    processing: 'قيد المعالجة',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    refunded: 'مسترجع'
  };
  return statusMap[status];
};

export const getOrderStatusColor = (status: OrderStatus): string => {
  const colorMap: Record<OrderStatus, string> = {
    pending: 'bg-yellow-500',
    processing: 'bg-blue-500',
    completed: 'bg-green-500',
    cancelled: 'bg-red-500',
    refunded: 'bg-purple-500'
  };
  return colorMap[status];
};
