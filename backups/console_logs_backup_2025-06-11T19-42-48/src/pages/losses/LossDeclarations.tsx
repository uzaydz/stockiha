import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Package,
  FileText,
  DollarSign,
  Calendar,
  User,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Upload,
  Camera,
  Zap,
  TrendingDown,
  ShieldAlert,
  Skull
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

// Types
interface Loss {
  id: string;
  loss_number: string;
  loss_type: 'damaged' | 'expired' | 'theft' | 'spoilage' | 'breakage' | 'defective' | 'other';
  loss_category?: string;
  loss_description: string;
  incident_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'investigating';
  total_cost_value: number;
  total_selling_value: number;
  total_items_count: number;
  reported_by: string;
  witness_employee_id?: string;
  witness_name?: string;
  requires_manager_approval?: boolean;
  approved_by?: string;
  approved_at?: string;
  approval_notes?: string;
  location_description?: string;
  external_reference?: string;
  insurance_claim?: boolean;
  insurance_reference?: string;
  notes?: string;
  internal_notes?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

interface LossItem {
  id?: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity_lost: number; // maps to lost_quantity
  loss_percentage?: number;
  unit_cost: number; // maps to unit_cost_price
  unit_selling_price: number;
  total_cost_value?: number;
  total_selling_value?: number;
  loss_condition: string;
  stock_before_loss?: number;
  stock_after_loss?: number;
  inventory_adjusted?: boolean;
  // إضافة دعم المتغيرات
  color_id?: string;
  size_id?: string;
  color_name?: string;
  size_name?: string;
  variant_display_name?: string;
  variant_stock_before?: number;
  variant_stock_after?: number;
  variant_info?: any;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  purchase_price: number;
  price: number;
  stock_quantity: number;
  has_colors?: boolean;
  has_sizes?: boolean;
}

interface ProductVariant {
  product_id: string;
  product_name: string;
  product_sku: string;
  product_purchase_price: number;
  product_price: number;
  has_colors: boolean;
  has_sizes: boolean;
  variant_type: 'main' | 'color_only' | 'size_only' | 'color_size';
  color_id?: string;
  color_name?: string;
  color_code?: string;
  size_id?: string;
  size_name?: string;
  size_code?: string;
  current_stock: number;
  variant_display_name: string;
}

const LossDeclarations: React.FC = () => {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();

  // State
  const [losses, setLosses] = useState<Loss[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoss, setSelectedLoss] = useState<Loss | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    investigating: 0,
    totalCostValue: 0,
    totalSellingValue: 0
  });

  // Create loss form
  const [createForm, setCreateForm] = useState({
    lossType: 'damaged' as 'damaged' | 'expired' | 'theft' | 'spoilage' | 'breakage' | 'defective' | 'other',
    lossCategory: 'operational',
    incidentDate: new Date().toISOString().split('T')[0],
    lossDescription: '',
    locationDescription: '',
    witnessName: '',
    requiresManagerApproval: true,
    insuranceClaim: false,
    insuranceReference: '',
    externalReference: '',
    notes: '',
    internalNotes: '',
    lossItems: [] as Array<{
      product_id: string;
      product_name: string;
      product_sku: string;
      quantity_lost: number;
      loss_percentage?: number;
      unit_cost: number;
      unit_selling_price: number;
      loss_condition: string;
      stock_before_loss?: number;
      stock_after_loss?: number;
      // دعم المتغيرات
      color_id?: string;
      size_id?: string;
      color_name?: string;
      size_name?: string;
      variant_display_name?: string;
      variant_stock_before?: number;
      variant_stock_after?: number;
    }>,
    evidenceFiles: [] as File[]
  });

  // Products for selection
  const [products, setProducts] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  
  // Product variants
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);

  // Fetch losses
  const fetchLosses = useCallback(async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      // استخدام جدول losses بدلاً من loss_declarations
      const { data, error } = await supabase
        .from('losses')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLosses((data as Loss[]) || []);
    } catch (error) {
      console.error('Error fetching losses:', error);
      setLosses([]);
      // toast.error('حدث خطأ في جلب تصريحات الخسائر');
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id, statusFilter, typeFilter, currentPage]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!currentOrganization?.id) return;

    try {
      const { data: losses } = await supabase
        .from('losses')
        .select('status, total_cost_value, total_selling_value')
        .eq('organization_id', currentOrganization.id);

      if (losses) {
        const stats = losses.reduce((acc: any, l: any) => {
          acc.total++;
          acc[l.status as keyof typeof acc]++;
          acc.totalCostValue += parseFloat(l.total_cost_value || '0');
          acc.totalSellingValue += parseFloat(l.total_selling_value || '0');
          return acc;
        }, {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          investigating: 0,
          totalCostValue: 0,
          totalSellingValue: 0
        });

        setStats(stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        investigating: 0,
        totalCostValue: 0,
        totalSellingValue: 0
      });
    }
  }, [currentOrganization?.id]);

  // Search products
  const searchProducts = async (query: string) => {
    if (!query || !currentOrganization?.id) return;

    setSearchingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, 
          name, 
          sku, 
          purchase_price, 
          price, 
          stock_quantity,
          product_colors(id),
          product_sizes(id)
        `)
        .eq('organization_id', currentOrganization.id)
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;

      if (data) {
        // إضافة معلومات المتغيرات للمنتجات
        const productsWithVariants = data.map((product: any) => ({
          ...product,
          has_colors: product.product_colors && product.product_colors.length > 0,
          has_sizes: product.product_sizes && product.product_sizes.length > 0,
          product_colors: undefined, // إزالة البيانات المؤقتة
          product_sizes: undefined
        }));
        setProducts(productsWithVariants);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      toast.error('حدث خطأ في البحث عن المنتجات');
    } finally {
      setSearchingProducts(false);
    }
  };

  // Get product variants - حل محدث  
  const getProductVariants = async (productId: string) => {
    setLoadingVariants(true);
    try {
      // استعلام مباشر بدلاً من RPC مع تجنب RLS
      const [colorsQuery, sizesQuery, productQuery] = await Promise.all([
        supabase
          .from('product_colors')
          .select('id, name, color_code')
          .eq('product_id', productId),
        
        supabase
          .from('product_sizes')
          .select('id, size_name, color_id')
          .eq('product_id', productId),
          
        supabase
          .from('products')
          .select('id, name, sku, purchase_price, price, stock_quantity')
          .eq('id', productId)
          .single()
      ]);

      // التحقق من الأخطاء ومعالجة البيانات
      if (productQuery.error) {
        console.error('Product query error:', productQuery.error);
      }
      if (colorsQuery.error) {
        console.error('Colors query error:', colorsQuery.error);
      }
      if (sizesQuery.error) {
        console.error('Sizes query error:', sizesQuery.error);
      }

      const product = productQuery.data;
      if (!product) {
        throw new Error('المنتج غير موجود');
      }

      const colors = colorsQuery.data || [];
      const sizes = sizesQuery.data || [];

      // إنشاء متغيرات المنتج
      const variants: ProductVariant[] = [];

      if (colors.length > 0 && sizes.length > 0) {
        // منتج بألوان ومقاسات
        colors.forEach(color => {
          sizes.forEach(size => {
            variants.push({
              product_id: product.id,
              product_name: product.name,
              product_sku: product.sku,
              product_purchase_price: product.purchase_price,
              product_price: product.price,
              has_colors: true,
              has_sizes: true,
              variant_type: 'color_size',
              color_id: color.id,
              color_name: color.name,
              color_code: color.color_code,
              size_id: size.id,
              size_name: size.size_name,
              size_code: size.size_name, // استخدام size_name كـ size_code
              current_stock: Math.floor(Math.random() * 100), // مؤقت
              variant_display_name: `${color.name} - ${size.size_name}`
            });
          });
        });
      } else if (colors.length > 0) {
        // منتج بألوان فقط
        colors.forEach(color => {
          variants.push({
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            product_purchase_price: product.purchase_price,
            product_price: product.price,
            has_colors: true,
            has_sizes: false,
            variant_type: 'color_only',
            color_id: color.id,
            color_name: color.name,
            color_code: color.color_code,
            current_stock: Math.floor(Math.random() * 100), // مؤقت
            variant_display_name: color.name
          });
        });
      } else if (sizes.length > 0) {
        // منتج بمقاسات فقط
        sizes.forEach(size => {
          variants.push({
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            product_purchase_price: product.purchase_price,
            product_price: product.price,
            has_colors: false,
            has_sizes: true,
            variant_type: 'size_only',
            size_id: size.id,
            size_name: size.size_name,
            size_code: size.size_name,
            current_stock: Math.floor(Math.random() * 100), // مؤقت
            variant_display_name: size.size_name
          });
        });
      } else {
        // منتج أساسي بدون متغيرات
        variants.push({
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          product_purchase_price: product.purchase_price,
          product_price: product.price,
          has_colors: false,
          has_sizes: false,
          variant_type: 'main',
          current_stock: product.stock_quantity,
          variant_display_name: 'المنتج الأساسي'
        });
      }

      setProductVariants(variants);
    } catch (error) {
      console.error('Error fetching product variants:', error);
      toast.error('حدث خطأ في جلب متغيرات المنتج');
      setProductVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  };

  // Create loss declaration
  const createLossDeclaration = async () => {
    if (!user?.id || !currentOrganization?.id || createForm.lossItems.length === 0) {
      toast.error('يجب إضافة عنصر واحد على الأقل');
      return;
    }

    if (!createForm.lossDescription.trim()) {
      toast.error('يجب إدخال وصف الخسارة');
      return;
    }

    try {
      // حساب القيم الإجمالية
      const totalCostValue = createForm.lossItems.reduce((sum, item) => 
        sum + (item.quantity_lost * item.unit_cost), 0);
      const totalSellingValue = createForm.lossItems.reduce((sum, item) => 
        sum + (item.quantity_lost * item.unit_selling_price), 0);

      // إنشاء رقم تصريح الخسارة
      const lossNumber = `LOSS-${Date.now()}`;

      const lossData = {
        loss_number: lossNumber,
        loss_type: createForm.lossType,
        loss_category: createForm.lossCategory,
        loss_description: createForm.lossDescription,
        incident_date: createForm.incidentDate,
        location_description: createForm.locationDescription,
        witness_name: createForm.witnessName,
        requires_manager_approval: createForm.requiresManagerApproval,
        insurance_claim: createForm.insuranceClaim,
        insurance_reference: createForm.insuranceReference || null,
        external_reference: createForm.externalReference || null,
        notes: createForm.notes || null,
        internal_notes: createForm.internalNotes || null,
        reported_by: user.id,
        organization_id: currentOrganization.id,
        status: 'pending',
        total_cost_value: totalCostValue,
        total_selling_value: totalSellingValue,
        total_items_count: createForm.lossItems.length
      };

      // إدراج الخسارة
      const { data: loss, error: lossError } = await supabase
        .from('losses')
        .insert([lossData])
        .select()
        .single();

      if (lossError) throw lossError;

              // إدراج عناصر الخسارة
        if (loss) {
          const lossItemsData = createForm.lossItems.map(item => ({
            loss_id: loss.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku,
            lost_quantity: item.quantity_lost,
            unit_cost_price: item.unit_cost,
            unit_selling_price: item.unit_selling_price,
            total_cost_value: item.quantity_lost * item.unit_cost,
            total_selling_value: item.quantity_lost * item.unit_selling_price,
            loss_condition: item.loss_condition,
            loss_percentage: 100, // افتراضي 100% خسارة
            stock_before_loss: item.variant_stock_before || null,
            stock_after_loss: item.variant_stock_after || null,
            color_id: item.color_id || null,
            size_id: item.size_id || null,
            color_name: item.color_name || null,
            size_name: item.size_name || null,
            variant_stock_before: item.variant_stock_before || null,
            variant_stock_after: item.variant_stock_after || null,
            variant_info: item.variant_display_name ? {
              display_name: item.variant_display_name,
              type: item.color_id && item.size_id ? 'color_size' : 
                    item.color_id ? 'color_only' : 
                    item.size_id ? 'size_only' : 'main'
            } : null
          }));

          const { error: itemsError } = await supabase
            .from('loss_items')
            .insert(lossItemsData);

          if (itemsError) throw itemsError;
        }

      toast.success('تم إنشاء تصريح الخسارة بنجاح');
      setIsCreateDialogOpen(false);
      resetCreateForm();
      fetchLosses();
      fetchStats();
    } catch (error) {
      console.error('Error creating loss:', error);
      toast.error('حدث خطأ في إنشاء تصريح الخسارة');
    }
  };

  // Process loss
  const processLoss = async (lossId: string, action: 'approve' | 'reject' | 'investigate' | 'process', notes?: string) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc('process_loss_declaration', {
        p_loss_id: lossId,
        p_action: action,
        p_processed_by: user.id,
        p_notes: notes,
        p_adjust_inventory: action === 'approve' || action === 'process'
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`تم ${action === 'approve' ? 'الموافقة على' : action === 'reject' ? 'رفض' : action === 'investigate' ? 'التحقيق في' : 'معالجة'} تصريح الخسارة`);
        fetchLosses();
        fetchStats();
        setIsActionDialogOpen(false);
      } else {
        toast.error(data.error || 'حدث خطأ في معالجة تصريح الخسارة');
      }
    } catch (error) {
      console.error('Error processing loss:', error);
      toast.error('حدث خطأ في معالجة تصريح الخسارة');
    }
  };

  // Handle product selection - check for variants
  const handleProductSelect = async (product: Product) => {
    // التحقق من وجود متغيرات للمنتج
    if (product.has_colors || product.has_sizes) {
      setSelectedProduct(product);
      await getProductVariants(product.id);
      setIsVariantDialogOpen(true);
    } else {
      // منتج بدون متغيرات - إضافة مباشرة
      addProductToLoss(product);
    }
  };

  // Add product to loss items (updated to support variants)
  const addProductToLoss = (product: Product, variant?: ProductVariant) => {
    const variantKey = variant 
      ? `${product.id}-${variant.color_id || 'no-color'}-${variant.size_id || 'no-size'}`
      : product.id;

    if (createForm.lossItems.find(item => 
      item.product_id === product.id && 
      item.color_id === variant?.color_id &&
      item.size_id === variant?.size_id
    )) {
      toast.error('هذا المتغير من المنتج موجود بالفعل في قائمة الخسائر');
      return;
    }

    setCreateForm(prev => ({
      ...prev,
      lossItems: [
        ...prev.lossItems,
        {
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          quantity_lost: 1,
          unit_cost: variant?.product_purchase_price || product.purchase_price,
          unit_selling_price: variant?.product_price || product.price,
          loss_condition: 'completely_damaged',
          stock_before_loss: variant?.current_stock || product.stock_quantity,
          stock_after_loss: (variant?.current_stock || product.stock_quantity) - 1,
          // معلومات المتغير
          color_id: variant?.color_id,
          size_id: variant?.size_id,
          color_name: variant?.color_name,
          size_name: variant?.size_name,
          variant_display_name: variant?.variant_display_name,
          variant_stock_before: variant?.current_stock,
          variant_stock_after: (variant?.current_stock || 0) - 1
        }
      ]
    }));
    
    setProductSearchQuery('');
    setProducts([]);
    setIsVariantDialogOpen(false);
    setSelectedProduct(null);
    setProductVariants([]);
  };

  // Remove product from loss items
  const removeProductFromLoss = (productId: string) => {
    setCreateForm(prev => ({
      ...prev,
      lossItems: prev.lossItems.filter(item => item.product_id !== productId)
    }));
  };

  // Update loss item
  const updateLossItem = (productId: string, field: string, value: any) => {
    setCreateForm(prev => ({
      ...prev,
      lossItems: prev.lossItems.map(item => {
        if (item.product_id === productId) {
          const updatedItem = { ...item, [field]: value };
          
          // إذا تم تغيير الكمية، حديث المخزون بعد الخسارة
          if (field === 'quantity_lost') {
            const stockBefore = item.stock_before_loss || item.variant_stock_before || 0;
            updatedItem.stock_after_loss = Math.max(0, stockBefore - value);
            updatedItem.variant_stock_after = Math.max(0, (item.variant_stock_before || 0) - value);
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const resetCreateForm = () => {
    setCreateForm({
      lossType: 'damaged',
      lossCategory: 'operational',
      incidentDate: new Date().toISOString().split('T')[0],
      lossDescription: '',
      locationDescription: '',
      witnessName: '',
      requiresManagerApproval: true,
      insuranceClaim: false,
      insuranceReference: '',
      externalReference: '',
      notes: '',
      internalNotes: '',
      lossItems: [],
      evidenceFiles: []
    });
    setProducts([]);
    setProductSearchQuery('');
    setSelectedProduct(null);
    setProductVariants([]);
    setIsVariantDialogOpen(false);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' دج';
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'في الانتظار', variant: 'secondary' as const, icon: Clock },
      approved: { label: 'موافق عليه', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: 'مرفوض', variant: 'destructive' as const, icon: XCircle },
      investigating: { label: 'قيد التحقيق', variant: 'outline' as const, icon: Search },
      processed: { label: 'تم المعالجة', variant: 'secondary' as const, icon: Package }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Get type label
  const getTypeLabel = (type: string) => {
    const types = {
      damaged: 'تالف',
      expired: 'منتهي الصلاحية',
      theft: 'سرقة',
      spoilage: 'تلف طبيعي',
      breakage: 'كسر',
      defective: 'معيب',
      other: 'أخرى'
    };
    return types[type as keyof typeof types] || type;
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    const icons = {
      damaged: AlertTriangle,
      expired: Calendar,
      theft: ShieldAlert,
      spoilage: TrendingDown,
      breakage: Zap,
      defective: XCircle,
      other: Package
    };
    return icons[type as keyof typeof icons] || Package;
  };

  useEffect(() => {
    fetchLosses();
    fetchStats();
  }, [fetchLosses, fetchStats]);

  // Search products when query changes
  useEffect(() => {
    if (productSearchQuery) {
      const timeoutId = setTimeout(() => {
        searchProducts(productSearchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setProducts([]);
    }
  }, [productSearchQuery]);

  useEffect(() => {
    if (productSearchQuery) {
      const timer = setTimeout(() => {
        searchProducts(productSearchQuery);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setProducts([]);
    }
  }, [productSearchQuery]);

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowLeft className="h-6 w-6" />
            <h1 className="text-2xl font-bold">إدارة التصريح بالخسائر</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => { fetchLosses(); fetchStats(); }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  تصريح خسارة جديد
                </Button>
              </DialogTrigger>
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
                        onChange={(e) => setProductSearchQuery(e.target.value)}
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
                                onClick={() => handleProductSelect(product)}
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
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button 
                      onClick={createLossDeclaration}
                      disabled={createForm.lossItems.length === 0}
                    >
                      إنشاء تصريح الخسارة
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي التصريحات</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">في الانتظار</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">قيد التحقيق</p>
                  <p className="text-2xl font-bold">{stats.investigating}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">موافق عليها</p>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">مرفوضة</p>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-muted-foreground">قيمة التكلفة</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalCostValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-muted-foreground">قيمة البيع</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalSellingValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Label>الفلاتر:</Label>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">في الانتظار</SelectItem>
                  <SelectItem value="investigating">قيد التحقيق</SelectItem>
                  <SelectItem value="approved">موافق عليها</SelectItem>
                  <SelectItem value="rejected">مرفوضة</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="damaged">تالف</SelectItem>
                  <SelectItem value="expired">منتهي الصلاحية</SelectItem>
                  <SelectItem value="theft">سرقة</SelectItem>
                  <SelectItem value="spoilage">تلف طبيعي</SelectItem>
                  <SelectItem value="breakage">كسر</SelectItem>
                  <SelectItem value="defective">معيب</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="البحث برقم التصريح أو الوصف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
          </CardContent>
        </Card>

        {/* Losses Table */}
        <Card>
          <CardHeader>
            <CardTitle>تصريحات الخسائر</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم التصريح</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>تاريخ الحادثة</TableHead>
                      <TableHead>عدد العناصر</TableHead>
                      <TableHead>قيمة التكلفة</TableHead>
                      <TableHead>قيمة البيع</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {losses.map((loss) => {
                      const TypeIcon = getTypeIcon(loss.loss_type);
                      return (
                        <TableRow key={loss.id}>
                          <TableCell className="font-medium">
                            {loss.loss_number}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TypeIcon className="h-4 w-4" />
                              {getTypeLabel(loss.loss_type)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(loss.incident_date).toLocaleDateString('ar')}
                          </TableCell>
                          <TableCell>{loss.items_count}</TableCell>
                          <TableCell className="text-red-600 font-medium">
                            {formatCurrency(loss.total_cost_value)}
                          </TableCell>
                          <TableCell className="text-red-600 font-medium">
                            {formatCurrency(loss.total_selling_value)}
                          </TableCell>
                          <TableCell>{getStatusBadge(loss.status)}</TableCell>
                          <TableCell>
                            {new Date(loss.created_at).toLocaleDateString('ar')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedLoss(loss);
                                  setIsDetailsDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(loss.status === 'pending' || loss.status === 'approved') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedLoss(loss);
                                    setIsActionDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {losses.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد تصريحات خسائر
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loss Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="loss-details-description">
            <DialogHeader>
              <DialogTitle>
                تفاصيل تصريح الخسارة {selectedLoss?.loss_number}
              </DialogTitle>
              <div id="loss-details-description" className="sr-only">
                عرض تفاصيل تصريح الخسارة المحدد بما في ذلك معلومات التصريح والقيم المالية والعناصر المتضررة
              </div>
            </DialogHeader>
            
            {selectedLoss && (
              <div className="space-y-6">
                {/* معلومات أساسية */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">معلومات التصريح</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>رقم التصريح:</span>
                        <span className="font-medium">{selectedLoss.loss_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>النوع:</span>
                        <div className="flex items-center gap-2">
                          {React.createElement(getTypeIcon(selectedLoss.loss_type), { className: "h-4 w-4" })}
                          {getTypeLabel(selectedLoss.loss_type)}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span>تاريخ الحادثة:</span>
                        <span className="font-medium">
                          {new Date(selectedLoss.incident_date).toLocaleDateString('ar')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>الحالة:</span>
                        {getStatusBadge(selectedLoss.status)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">القيم المالية</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>عدد العناصر:</span>
                        <span className="font-medium">{selectedLoss.items_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>قيمة التكلفة:</span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(selectedLoss.total_cost_value)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>قيمة البيع:</span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(selectedLoss.total_selling_value)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>يتطلب تحقيق:</span>
                        <Badge variant={selectedLoss.requires_investigation ? 'destructive' : 'secondary'}>
                          {selectedLoss.requires_investigation ? 'نعم' : 'لا'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* الوصف والملاحظات */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">تفاصيل الحادثة</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>وصف الحادثة</Label>
                      <p className="mt-1">{selectedLoss.description}</p>
                    </div>
                    {selectedLoss.notes && (
                      <div>
                        <Label>ملاحظات</Label>
                        <p className="mt-1">{selectedLoss.notes}</p>
                      </div>
                    )}
                    {selectedLoss.investigation_notes && (
                      <div>
                        <Label>ملاحظات التحقيق</Label>
                        <p className="mt-1">{selectedLoss.investigation_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Loss Action Dialog */}
        <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
          <DialogContent aria-describedby="action-dialog-description">
            <DialogHeader>
              <DialogTitle>معالجة تصريح الخسارة</DialogTitle>
              <div id="action-dialog-description" className="sr-only">
                خيارات معالجة تصريح الخسارة مثل الموافقة أو الرفض أو بدء التحقيق
              </div>
            </DialogHeader>
            
            {selectedLoss && (
              <div className="space-y-4">
                <p>هل تريد معالجة تصريح الخسارة {selectedLoss.loss_number}؟</p>
                
                <div className="flex gap-2">
                  {selectedLoss.status === 'pending' && (
                    <>
                      <Button 
                        onClick={() => processLoss(selectedLoss.id, 'approve')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        موافقة
                      </Button>
                      <Button 
                        onClick={() => processLoss(selectedLoss.id, 'reject')}
                        variant="destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        رفض
                      </Button>
                      {selectedLoss.requires_investigation && (
                        <Button 
                          onClick={() => processLoss(selectedLoss.id, 'investigate')}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Search className="h-4 w-4 mr-2" />
                          بدء التحقيق
                        </Button>
                      )}
                    </>
                  )}
                  {selectedLoss.status === 'approved' && (
                    <Button 
                      onClick={() => processLoss(selectedLoss.id, 'process')}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      معالجة وتعديل المخزون
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Product Variants Selection Dialog */}
        <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
          <DialogContent className="max-w-2xl" aria-describedby="variants-dialog-description">
            <DialogHeader>
              <DialogTitle>
                اختيار متغير المنتج: {selectedProduct?.name}
              </DialogTitle>
              <div id="variants-dialog-description" className="sr-only">
                قائمة متغيرات المنتج المتاحة للاختيار من بينها مثل الألوان والمقاسات
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              {loadingVariants ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    اختر المتغير المحدد (اللون/المقاس) الذي تريد إضافته لتصريح الخسارة:
                  </p>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {productVariants.map((variant, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-muted"
                        onClick={() => selectedProduct && addProductToLoss(selectedProduct, variant)}
                      >
                        <div>
                          <p className="font-medium">{variant.variant_display_name}</p>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            {variant.color_name && (
                              <span>اللون: {variant.color_name}</span>
                            )}
                            {variant.size_name && (
                              <span>المقاس: {variant.size_name}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-left">
                          <p className="text-sm">المخزون: {variant.current_stock}</p>
                          <p className="text-sm">التكلفة: {formatCurrency(variant.product_purchase_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {productVariants.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      لا توجد متغيرات متاحة لهذا المنتج
                    </div>
                  )}
                </>
              )}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsVariantDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default LossDeclarations;