import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
import { 
  getAllLocalLossDeclarations, 
  createLocalLossDeclaration, 
  approveLocalLossDeclaration, 
  rejectLocalLossDeclaration,
  calculateLossTotals,
  type LocalLossDeclaration 
} from '@/api/localLossDeclarationService';
import { syncPendingLossDeclarations, fetchLossDeclarationsFromServer } from '@/api/syncLossDeclarations';
import { inventoryDB, type LocalLossItem } from '@/database/localDb';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

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
  items_count: number;
  reported_by: string;
  witness_employee_id?: string;
  witness_name?: string;
  requires_manager_approval?: boolean;
  requires_investigation?: boolean;
  approved_by?: string;
  approved_at?: string;
  approval_notes?: string;
  investigation_notes?: string;
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

interface LossDeclarationsProps extends POSSharedLayoutControls {}

const LossDeclarations: React.FC<LossDeclarationsProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}) => {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  const { isOnline } = useNetworkStatus();

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

  // State إضافي للحذف والتعديل
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [lossToDelete, setLossToDelete] = useState<Loss | null>(null);
  const [lossToEdit, setLossToEdit] = useState<Loss | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Loss>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // State لعرض تفاصيل الخسارة والمنتجات
  const [selectedLossItems, setSelectedLossItems] = useState<LossItem[]>([]);
  const [loadingLossItems, setLoadingLossItems] = useState(false);

  // دالة مساعدة لتحويل loss_type
  const convertLossType = (formType: 'damaged' | 'expired' | 'theft' | 'spoilage' | 'breakage' | 'defective' | 'other'): 'damage' | 'theft' | 'expiry' | 'other' => {
    switch (formType) {
      case 'damaged': return 'damage';
      case 'expired': return 'expiry';
      case 'theft': return 'theft';
      case 'spoilage':
      case 'breakage':
      case 'defective':
      case 'other':
      default:
        return 'other';
    }
  };

  // Fetch losses - محدث لاستخدام الخدمات المحلية
  const fetchLosses = useCallback(async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      // جلب الخسائر من IndexedDB
      const localLosses = await getAllLocalLossDeclarations(currentOrganization.id);

      // جلب عدد المنتجات لكل خسارة من IndexedDB
      const lossesWithItemCount = await Promise.all(
        localLosses.map(async (loss) => {
          const items = await inventoryDB.lossItems
            .where('loss_id')
            .equals(loss.id)
            .toArray();

          return {
            ...loss,
            items_count: items.length,
            total_items_count: loss.total_items_count || items.length
          };
        })
      );

      setLosses(lossesWithItemCount as Loss[]);
    } catch (error) {
      console.error('خطأ في جلب تصريحات الخسائر:', error);
      setLosses([]);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id, statusFilter, typeFilter, currentPage]);

  // Fetch stats - محدث لاستخدام الخدمات المحلية
  const fetchStats = useCallback(async () => {
    if (!currentOrganization?.id) return;

    try {
      // جلب الخسائر من IndexedDB
      const losses = await getAllLocalLossDeclarations(currentOrganization.id);

      if (losses) {
        const stats = losses.reduce((acc: any, l: any) => {
          acc.total++;
          acc[l.status as keyof typeof acc]++;
          acc.totalCostValue += parseFloat(l.total_cost_value?.toString() || '0');
          acc.totalSellingValue += parseFloat(l.total_selling_value?.toString() || '0');
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
      console.error('خطأ في جلب الإحصائيات:', error);
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

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchLosses(), fetchStats()]);
  }, [fetchLosses, fetchStats]);

  useEffect(() => {
    if (!onRegisterRefresh) return;
    onRegisterRefresh(handleRefresh);
    return () => onRegisterRefresh(null);
  }, [handleRefresh, onRegisterRefresh]);

  useEffect(() => {
    if (!onLayoutStateChange) return;
    onLayoutStateChange({
      isRefreshing: loading,
      connectionStatus: isOnline ? 'connected' : 'disconnected'
    });
  }, [loading, onLayoutStateChange, isOnline]);

  // جلب الخسائر عند التحميل
  useEffect(() => {
    fetchLosses();
    fetchStats();
  }, [fetchLosses, fetchStats]);

  // مزامنة تلقائية عند الاتصال بالإنترنت
  useEffect(() => {
    const syncData = async () => {
      if (!isOnline || !currentOrganization?.id) return;

      try {
        // مزامنة الخسائر المعلقة
        const syncResult = await syncPendingLossDeclarations();
        
        if (syncResult.success > 0) {
          console.log(`✅ تمت مزامنة ${syncResult.success} تصريح خسارة`);
        }

        // جلب الخسائر من السيرفر وتحديث الحالة مباشرة
        await fetchLossDeclarationsFromServer(currentOrganization.id);
        
        // تحديث البيانات محلياً بدون إعادة تشغيل fetchLosses (لتجنب infinite loop)
        const localLosses = await getAllLocalLossDeclarations(currentOrganization.id);
        const lossesWithItemCount = await Promise.all(
          localLosses.map(async (loss) => {
            const items = await inventoryDB.lossItems
              .where('loss_id')
              .equals(loss.id)
              .toArray();

            return {
              ...loss,
              items_count: items.length,
              total_items_count: loss.total_items_count || items.length
            };
          })
        );
        setLosses(lossesWithItemCount as Loss[]);
        
        // تحديث الإحصائيات محلياً
        const stats = localLosses.reduce((acc: any, loss: any) => {
          acc.total++;
          acc.totalValue += loss.total_value || 0;
          if (loss.status === 'pending') acc.pending++;
          if (loss.status === 'approved') acc.approved++;
          if (loss.status === 'rejected') acc.rejected++;
          return acc;
        }, { total: 0, totalValue: 0, pending: 0, approved: 0, rejected: 0 });
        setStats(stats);
      } catch (error) {
        console.error('خطأ في المزامنة:', error);
      }
    };

    syncData();
  }, [isOnline, currentOrganization?.id]);

  const renderWithLayout = (
    children: React.ReactNode,
    overrides?: {
      isRefreshing?: boolean;
      connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
    }
  ) => {
    if (!useStandaloneLayout) {
      return children;
    }

    return (
      <POSPureLayout
        onRefresh={handleRefresh}
        isRefreshing={overrides?.isRefreshing ?? loading}
        connectionStatus={overrides?.connectionStatus ?? 'connected'}
      >
        {children}
      </POSPureLayout>
    );
  };

  // Search products - محدث لاستخدام IndexedDB مع Supabase للمتغيرات
  const searchProducts = async (query: string) => {
    if (!query || !currentOrganization?.id) return;

    setSearchingProducts(true);
    try {
      // البحث في IndexedDB
      const allProducts = await inventoryDB.products
        .where('organization_id')
        .equals(currentOrganization.id)
        .toArray();

      // فلترة بالاسم أو SKU
      const lowerQuery = query.toLowerCase();
      const filteredProducts = allProducts
        .filter(p => 
          p.name.toLowerCase().includes(lowerQuery) || 
          p.sku.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 20);

      // جلب معلومات المتغيرات من Supabase (لأنها غير محفوظة في IndexedDB)
      const productsWithVariants = await Promise.all(
        filteredProducts.map(async (product) => {
          try {
            const [colorsRes, sizesRes] = await Promise.all([
              supabase
                .from('product_colors')
                .select('id')
                .eq('product_id', product.id)
                .limit(1),
              supabase
                .from('product_sizes')
                .select('id')
                .eq('product_id', product.id)
                .limit(1)
            ]);

            return {
              ...product,
              has_colors: (colorsRes.data?.length || 0) > 0,
              has_sizes: (sizesRes.data?.length || 0) > 0
            };
          } catch (err) {
            // في حالة الفشل، نعتبر المنتج بدون متغيرات
            return {
              ...product,
              has_colors: false,
              has_sizes: false
            };
          }
        })
      );

      setProducts(productsWithVariants as Product[]);
    } catch (error) {
      console.error('خطأ في البحث عن المنتجات:', error);
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
          .select('id, name, color_code, quantity')
          .eq('product_id', productId),
        
        supabase
          .from('product_sizes')
          .select('id, size_name, color_id, quantity')
          .eq('product_id', productId),
          
        supabase
          .from('products')
          .select('id, name, sku, purchase_price, price, stock_quantity')
          .eq('id', productId)
          .single()
      ]);

      // التحقق من الأخطاء ومعالجة البيانات
      if (productQuery.error) {
      }
      if (colorsQuery.error) {
      }
      if (sizesQuery.error) {
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
              current_stock: color.quantity || 0,
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
            current_stock: color.quantity || 0,
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
            current_stock: size.quantity || 0,
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
      toast.error('حدث خطأ في جلب متغيرات المنتج');
      setProductVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  };

  // Create loss declaration - محدث لاستخدام الخدمات المحلية
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
      const { totalCostValue, totalSellingValue, totalItemsCount } = calculateLossTotals(
        createForm.lossItems.map(item => ({
          lost_quantity: item.quantity_lost,
          unit_cost_price: item.unit_cost,
          unit_selling_price: item.unit_selling_price,
          total_cost_value: item.quantity_lost * item.unit_cost,
          total_selling_value: item.quantity_lost * item.unit_selling_price
        } as any))
      );

      // إنشاء رقم تصريح الخسارة
      const lossNumber = `LOSS-${Date.now()}`;

      // إعداد بيانات الخسارة
      // ملاحظة: بعض الحقول من الفورم تُخزن في notes لأنها غير موجودة في LocalLossDeclaration
      const additionalNotes = [
        createForm.locationDescription && `الموقع: ${createForm.locationDescription}`,
        createForm.witnessName && `الشاهد: ${createForm.witnessName}`,
        createForm.insuranceReference && `مرجع التأمين: ${createForm.insuranceReference}`,
        createForm.externalReference && `مرجع خارجي: ${createForm.externalReference}`,
        createForm.internalNotes && `ملاحظات داخلية: ${createForm.internalNotes}`,
        createForm.notes
      ].filter(Boolean).join('\n');

      const lossData: Omit<LocalLossDeclaration, 'id' | 'created_at' | 'updated_at' | 'synced' | 'syncStatus' | 'pendingOperation'> = {
        loss_number: lossNumber,
        loss_type: convertLossType(createForm.lossType), // تحويل النوع ليتطابق مع LocalLossDeclaration,
        loss_category: createForm.lossCategory,
        loss_description: createForm.lossDescription,
        incident_date: new Date(createForm.incidentDate).toISOString(),
        notes: additionalNotes || undefined,
        reported_by: user.id,
        organization_id: currentOrganization.id,
        status: 'pending',
        total_cost_value: totalCostValue,
        total_selling_value: totalSellingValue,
        total_items_count: totalItemsCount
      };

      // إعداد عناصر الخسارة
      const items = createForm.lossItems.map(item => {
        // التحقق من صحة البيانات
        if (typeof item.stock_before_loss !== 'number' || item.stock_before_loss < 0) {
          throw new Error(`خطأ في بيانات المخزون للمنتج ${item.product_name}`);
        }
        if (typeof item.stock_after_loss !== 'number' || item.stock_after_loss < 0) {
          throw new Error(`خطأ في بيانات المخزون بعد الخسارة للمنتج ${item.product_name}`);
        }

        return {
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          lost_quantity: item.quantity_lost,
          unit_cost_price: item.unit_cost,
          unit_selling_price: item.unit_selling_price,
          total_cost_value: item.quantity_lost * item.unit_cost,
          total_selling_value: item.quantity_lost * item.unit_selling_price,
          loss_condition: item.loss_condition,
          loss_percentage: 100,
          stock_before_loss: item.stock_before_loss,
          stock_after_loss: item.stock_after_loss,
          inventory_adjusted: false,
          color_id: item.color_id,
          color_name: item.color_name,
          size_id: item.size_id,
          size_name: item.size_name
        } as Omit<LocalLossItem, 'id' | 'loss_id' | 'created_at' | 'synced'>;
      });

      // إنشاء الخسارة محلياً
      await createLocalLossDeclaration({ lossData, items });

      toast.success('تم إنشاء تصريح الخسارة بنجاح ✅');
      setIsCreateDialogOpen(false);
      resetCreateForm();
      await fetchLosses();
      await fetchStats();
    } catch (error) {
      console.error('خطأ في إنشاء تصريح الخسارة:', error);
      toast.error('حدث خطأ في إنشاء تصريح الخسارة');
    }
  };

  // Process loss - محدث لاستخدام الخدمات المحلية
  const processLoss = async (lossId: string, action: 'approve' | 'reject' | 'investigate' | 'process', notes?: string) => {
    if (!user?.id) return;

    try {
      let result;
      
      if (action === 'approve' || action === 'process') {
        // الموافقة على الخسارة وتحديث المخزون
        result = await approveLocalLossDeclaration(lossId, user.id);
      } else if (action === 'reject') {
        // رفض الخسارة
        result = await rejectLocalLossDeclaration(lossId);
      } else if (action === 'investigate') {
        // تحديث الحالة للتحقيق - نستخدم pending كحالة مؤقتة
        const { updateLocalLossDeclaration } = await import('@/api/localLossDeclarationService');
        result = await updateLocalLossDeclaration(lossId, {
          status: 'pending' // investigating غير مدعومة في النوع، نستخدم pending
        });
      }

      if (result) {
        toast.success(`تم ${action === 'approve' ? 'الموافقة على' : action === 'reject' ? 'رفض' : action === 'investigate' ? 'التحقيق في' : 'معالجة'} تصريح الخسارة ✅`);
        await fetchLosses();
        await fetchStats();
        setIsActionDialogOpen(false);
      } else {
        toast.error('حدث خطأ في معالجة تصريح الخسارة');
      }
    } catch (error) {
      console.error('خطأ في معالجة تصريح الخسارة:', error);
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

    // تحديد المخزون الحالي بشكل صحيح
    const currentStock = variant ? (variant.current_stock || 0) : (product.stock_quantity || 0);
    const initialQuantity = 1;
    
    // التحقق من وجود مخزون كافي
    if (currentStock <= 0) {
      toast.error(`لا يوجد مخزون متاح لهذا المنتج. المخزون الحالي: ${currentStock}`);
      return;
    }
    
    // التأكد من أن المخزون بعد الخسارة لا يصبح سالباً
    const stockAfterLoss = Math.max(0, currentStock - initialQuantity);
    
    // تسجيل للتتبع (فقط في التطوير)
    if (process.env.NODE_ENV === 'development') {
    }

    setCreateForm(prev => ({
      ...prev,
      lossItems: [
        ...prev.lossItems,
        {
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          quantity_lost: initialQuantity,
          unit_cost: variant?.product_purchase_price || product.purchase_price,
          unit_selling_price: variant?.product_price || product.price,
          loss_condition: 'completely_damaged',
          stock_before_loss: currentStock,
          stock_after_loss: stockAfterLoss,
          // معلومات المتغير
          color_id: variant?.color_id,
          size_id: variant?.size_id,
          color_name: variant?.color_name,
          size_name: variant?.size_name,
          variant_display_name: variant?.variant_display_name,
          variant_stock_before: variant?.current_stock || currentStock,
          variant_stock_after: variant?.current_stock ? Math.max(0, variant.current_stock - initialQuantity) : stockAfterLoss
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
            const newQuantity = Math.max(0, parseInt(value) || 0); // التأكد من أن الكمية موجبة
            
            // التأكد من أن الكمية المفقودة لا تتجاوز المخزون المتاح
            const maxLossQuantity = stockBefore;
            const validQuantity = Math.min(newQuantity, maxLossQuantity);
            
            if (newQuantity > maxLossQuantity) {
              toast.error(`الكمية المفقودة لا يمكن أن تتجاوز المخزون المتاح (${maxLossQuantity})`);
            }
            
            updatedItem.quantity_lost = validQuantity;
            updatedItem.stock_after_loss = Math.max(0, stockBefore - validQuantity);
            updatedItem.variant_stock_after = Math.max(0, (item.variant_stock_before || stockBefore) - validQuantity);
            
            // تسجيل للتتبع (فقط في التطوير)
            if (process.env.NODE_ENV === 'development') {
            }
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

  // دالة حذف الخسارة مع إعادة المنتجات للمخزون
  const deleteLoss = async (lossId: string) => {
    setIsDeleting(true);
    try {
      // 1. جلب عناصر الخسارة
      const { data: lossItems, error: itemsError } = await (supabase as any)
        .from('loss_items')
        .select('*')
        .eq('loss_id', lossId);

      if (itemsError) {
        throw new Error(`خطأ في جلب عناصر الخسارة: ${itemsError.message}`);
      }

      // 2. إعادة المنتجات للمخزون
      if (lossItems && lossItems.length > 0) {
        for (const item of lossItems) {
          if (item.color_id || item.size_id) {
            // التعامل مع المتغيرات
            if (item.size_id && item.color_id) {
              // متغير كامل (لون + مقاس)
              const { error: sizeError } = await (supabase as any)
                .from('product_sizes')
                .update({ 
                  quantity: (supabase as any).raw(`quantity + ${item.quantity_lost}`) 
                })
                .eq('id', item.size_id);

              if (sizeError) {
              }
            } else if (item.color_id) {
              // متغير لون فقط
              const { error: colorError } = await (supabase as any)
                .from('product_colors')
                .update({ 
                  quantity: (supabase as any).raw(`quantity + ${item.quantity_lost}`) 
                })
                .eq('id', item.color_id);

              if (colorError) {
              }
            }
          } else {
            // منتج أساسي
            const { error: productError } = await (supabase as any)
              .from('products')
              .update({ 
                stock_quantity: (supabase as any).raw(`stock_quantity + ${item.quantity_lost}`) 
              })
              .eq('id', item.product_id);

            if (productError) {
            }
          }

          // إضافة سجل في inventory_log
          await (supabase as any)
            .from('inventory_log')
            .insert({
              product_id: item.product_id,
              type: 'loss_reversal',
              quantity: item.quantity_lost,
              previous_stock: (item.stock_before_loss || 0) - item.quantity_lost,
              new_stock: item.stock_before_loss || 0,
              notes: `إلغاء خسارة: ${lossToDelete?.loss_number}`,
              reference_id: lossId,
              reference_type: 'loss_deletion',
              organization_id: currentOrganization?.id
            });
        }
      }

              // 3. حذف عناصر الخسارة
        const { error: deleteItemsError } = await (supabase as any)
          .from('loss_items')
          .delete()
          .eq('loss_id', lossId);

        if (deleteItemsError) {
          throw new Error(`خطأ في حذف عناصر الخسارة: ${deleteItemsError.message}`);
        }

        // 4. حذف الخسارة
        const { error: deleteLossError } = await (supabase as any)
          .from('losses')
          .delete()
          .eq('id', lossId);

      if (deleteLossError) {
        throw new Error(`خطأ في حذف الخسارة: ${deleteLossError.message}`);
      }

      toast.success('تم حذف الخسارة بنجاح وإعادة المنتجات للمخزون');
      
      // تحديث القائمة
      fetchLosses();
      fetchStats();
      
      // إغلاق النافذة
      setIsDeleteDialogOpen(false);
      setLossToDelete(null);

    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء حذف الخسارة');
    } finally {
      setIsDeleting(false);
    }
  };

    // دالة تعديل الخسارة
  const updateLoss = async () => {
    if (!lossToEdit || !editFormData) return;

    setIsUpdating(true);
    try {
      const { error } = await (supabase as any)
        .from('losses')
        .update({
          loss_type: editFormData.loss_type || lossToEdit.loss_type,
          loss_description: editFormData.loss_description || lossToEdit.loss_description,
          incident_date: editFormData.incident_date || lossToEdit.incident_date,
          notes: editFormData.notes || lossToEdit.notes,
          requires_investigation: editFormData.requires_investigation ?? lossToEdit.requires_investigation,
          updated_at: new Date().toISOString()
        })
        .eq('id', lossToEdit.id);

      if (error) {
        throw new Error(`خطأ في تحديث الخسارة: ${error.message}`);
      }

      toast.success('تم تحديث الخسارة بنجاح');
      
      // تحديث القائمة
      fetchLosses();
      
      // إغلاق النافذة
      setIsEditDialogOpen(false);
      setLossToEdit(null);
      setEditFormData({});

    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء تحديث الخسارة');
    } finally {
      setIsUpdating(false);
    }
  };

  // دالة جلب المنتجات المرتبطة بتصريح خسارة
  const fetchLossItems = async (lossId: string) => {
    setLoadingLossItems(true);
    try {
      const { data, error } = await (supabase as any)
        .from('loss_items')
        .select(`
          *,
          products:product_id (
            name,
            sku,
            stock_quantity
          )
        `)
        .eq('loss_id', lossId);

      if (error) {
        throw new Error(`خطأ في جلب عناصر الخسارة: ${error.message}`);
      }

      // تحويل البيانات لتطابق interface LossItem
      const formattedItems: LossItem[] = (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.products?.name || item.product_name,
        product_sku: item.products?.sku || item.product_sku,
        quantity_lost: item.lost_quantity,
        loss_percentage: item.loss_percentage,
        unit_cost: item.unit_cost_price,
        unit_selling_price: item.unit_selling_price,
        total_cost_value: item.total_cost_value,
        total_selling_value: item.total_selling_value,
        loss_condition: item.loss_condition,
        stock_before_loss: item.stock_before_loss ?? (item.products?.stock_quantity || 0),
        stock_after_loss: item.stock_after_loss ?? Math.max(0, (item.products?.stock_quantity || 0) - item.lost_quantity),
        inventory_adjusted: item.inventory_adjusted,
        color_id: item.color_id,
        size_id: item.size_id,
        color_name: item.color_name,
        size_name: item.size_name,
        variant_display_name: item.variant_info?.display_name,
        variant_stock_before: item.variant_stock_before,
        variant_stock_after: item.variant_stock_after,
        variant_info: item.variant_info
      }));

      setSelectedLossItems(formattedItems);
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في جلب عناصر الخسارة');
      setSelectedLossItems([]);
    } finally {
      setLoadingLossItems(false);
    }
  };

  const pageContent = (
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
              onClick={handleRefresh}
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
                          <TableCell>{loss.total_items_count || loss.items_count || 0}</TableCell>
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
                                  fetchLossItems(loss.id);
                                  setIsDetailsDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              {/* زر التعديل */}
                              {loss.status !== 'rejected' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setLossToEdit(loss);
                                    setEditFormData({
                                      loss_type: loss.loss_type,
                                      loss_description: loss.loss_description,
                                      incident_date: loss.incident_date,
                                      notes: loss.notes,
                                      requires_investigation: loss.requires_investigation
                                    });
                                    fetchLossItems(loss.id);
                                    setIsEditDialogOpen(true);
                                  }}
                                  title="تعديل الخسارة"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {/* زر المعالجة */}
                              {(loss.status === 'pending' || loss.status === 'approved') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedLoss(loss);
                                    setIsActionDialogOpen(true);
                                  }}
                                  title="معالجة الخسارة"
                                >
                                  <Package className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {/* زر الحذف */}
                              {(loss.status === 'pending' || loss.status === 'approved') && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setLossToDelete(loss);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  title="حذف الخسارة وإعادة المنتجات للمخزون"
                                >
                                  <Trash2 className="h-4 w-4" />
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
                      <p className="mt-1">{selectedLoss.loss_description}</p>
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

        {/* Loss Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
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
                            {selectedLossItems.map((item) => (
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
                                <TableCell className="font-medium">{item.quantity_lost}</TableCell>
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
                            ))}
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
                  <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                    إغلاق
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Loss Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent aria-describedby="delete-dialog-description">
            <DialogHeader>
              <DialogTitle>حذف تصريح الخسارة</DialogTitle>
              <div id="delete-dialog-description" className="sr-only">
                تأكيد حذف تصريح الخسارة وإعادة المنتجات للمخزون
              </div>
            </DialogHeader>
            
            {lossToDelete && (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">تحذير هام</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        سيتم حذف تصريح الخسارة نهائياً وإعادة جميع المنتجات المفقودة إلى المخزون.
                        هذا الإجراء لا يمكن التراجع عنه.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p><strong>رقم التصريح:</strong> {lossToDelete.loss_number}</p>
                  <p><strong>النوع:</strong> {getTypeLabel(lossToDelete.loss_type)}</p>
                  <p><strong>قيمة التكلفة:</strong> {formatCurrency(lossToDelete.total_cost_value)}</p>
                  <p><strong>عدد العناصر:</strong> {lossToDelete.total_items_count || lossToDelete.items_count || 0}</p>
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsDeleteDialogOpen(false);
                      setLossToDelete(null);
                    }}
                    disabled={isDeleting}
                  >
                    إلغاء
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => deleteLoss(lossToDelete.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        جاري الحذف...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        حذف نهائي
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Loss Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl" aria-describedby="edit-dialog-description">
            <DialogHeader>
              <DialogTitle>تعديل تصريح الخسارة</DialogTitle>
              <div id="edit-dialog-description" className="sr-only">
                نموذج تعديل تفاصيل تصريح الخسارة
              </div>
            </DialogHeader>
            
            {lossToEdit && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-loss-type">نوع الخسارة</Label>
                    <Select
                      value={editFormData.loss_type || lossToEdit.loss_type}
                      onValueChange={(value) => setEditFormData(prev => ({ ...prev, loss_type: value as any }))}
                    >
                      <SelectTrigger id="edit-loss-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="damaged">تلف</SelectItem>
                        <SelectItem value="expired">انتهاء صلاحية</SelectItem>
                        <SelectItem value="theft">سرقة</SelectItem>
                        <SelectItem value="spoilage">فساد</SelectItem>
                        <SelectItem value="breakage">كسر</SelectItem>
                        <SelectItem value="defective">معيب</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-incident-date">تاريخ الحادثة</Label>
                    <Input
                      id="edit-incident-date"
                      type="date"
                      value={editFormData.incident_date || lossToEdit.incident_date?.split('T')[0]}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, incident_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-description">وصف الحادثة</Label>
                  <Textarea
                    id="edit-description"
                    value={editFormData.loss_description || lossToEdit.loss_description}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, loss_description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-notes">ملاحظات</Label>
                  <Textarea
                    id="edit-notes"
                    value={editFormData.notes || lossToEdit.notes || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-requires-investigation"
                    checked={editFormData.requires_investigation ?? lossToEdit.requires_investigation}
                    onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, requires_investigation: checked as boolean }))}
                  />
                  <Label htmlFor="edit-requires-investigation">يتطلب تحقيق</Label>
                </div>

                {/* عرض المنتجات المرتبطة */}
                <div className="space-y-2">
                  <Label>المنتجات المرتبطة بهذا التصريح:</Label>
                  {loadingLossItems ? (
                    <div className="flex justify-center py-4">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                  ) : selectedLossItems.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto border rounded p-2">
                      {selectedLossItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center py-1 text-sm">
                          <div>
                            <span className="font-medium">{item.product_name}</span>
                            {item.variant_display_name && (
                              <span className="text-blue-600 ml-2">({item.variant_display_name})</span>
                            )}
                          </div>
                          <span className="text-muted-foreground">الكمية: {item.quantity_lost}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">لا توجد منتجات مرتبطة</p>
                  )}
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setLossToEdit(null);
                      setEditFormData({});
                    }}
                    disabled={isUpdating}
                  >
                    إلغاء
                  </Button>
                  <Button 
                    onClick={updateLoss}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        جاري التحديث...
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4 mr-2" />
                        حفظ التغييرات
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );

  return renderWithLayout(pageContent, { isRefreshing: loading });
};

export default LossDeclarations;
