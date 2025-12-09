/**
 * 🚀 SmartPurchasePage - صفحة المشتريات الذكية
 * ============================================================
 *
 * صفحة متكاملة لإدارة المشتريات مع:
 * - Turbo Mode للسرعة
 * - مصفوفة المتغيرات
 * - التسعير الذكي
 * - توزيع التكاليف
 * - Offline-First
 *
 * ============================================================
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Icons
import {
  Search,
  Plus,
  Trash2,
  Save,
  Send,
  ArrowRight,
  Package,
  Calculator,
  Zap,
  ZapOff,
  Grid3X3,
  ChevronDown,
  Loader2,
  Check,
  Calendar,
  User,
  FileText,
  Printer,
  RotateCcw,
  Info,
  AlertTriangle,
  WifiOff,
  Keyboard,
} from 'lucide-react';

// Context & Hooks
import { useTenant } from '@/context/TenantContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useReactiveProducts } from '@/hooks/powersync';
import { useReactiveSuppliers } from '@/hooks/powersync';

// Feature Hooks
import {
  useReactivePurchases,
  useReactivePurchase,
  useReactivePurchaseStats,
} from '../hooks/useReactivePurchases';
import { useLandedCostDistributor } from '../hooks/useLandedCostDistributor';
import { productToUnitConfig } from '../hooks/useUnitConversion';

// Components
import { SmartPurchaseRow } from './SmartPurchaseRow';
import { VariantMatrix } from './VariantMatrix';
import { LandedCostsPanel, LandedCostsSummary } from './LandedCostsPanel';
import { UnitSelector } from './UnitSelector';

// Types
import type {
  SmartPurchaseItem,
  SmartPurchase,
  LandedCost,
  PurchaseUnitType,
  TurboModeSettings,
  DEFAULT_TURBO_SETTINGS,
} from '../types/smart-purchase.types';

// API
import { createPurchase, updatePurchase } from '@/api/supplierService';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

interface SmartPurchasePageProps {
  /** وضع التعديل (معرف المشتريات) */
  purchaseId?: string;
  /** استخدام Layout مستقل */
  useStandaloneLayout?: boolean;
  /** callback عند النجاح */
  onSuccess?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function SmartPurchasePage({
  purchaseId: propPurchaseId,
  useStandaloneLayout = false,
  onSuccess,
}: SmartPurchasePageProps) {
  const navigate = useNavigate();
  const params = useParams();
  const purchaseId = propPurchaseId || params.purchaseId;
  const isEditMode = !!purchaseId;

  // Context
  const { currentOrganization } = useTenant();
  const { isOnline } = useNetworkStatus();
  const orgId = currentOrganization?.id || '';

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 State
  // ═══════════════════════════════════════════════════════════════════════════

  // Turbo Mode
  const [turboMode, setTurboMode] = useState(false);
  const [turboSettings, setTurboSettings] = useState<TurboModeSettings>({
    enabled: false,
    autoFocusNext: true,
    skipEmptyFields: true,
    soundFeedback: true,
    vibrateOnAdd: true,
    showQuickActions: true,
    compactMode: false,
  });

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseNumber, setPurchaseNumber] = useState('');

  // Items
  const [items, setItems] = useState<SmartPurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productOpen, setProductOpen] = useState(false);

  // Landed Costs
  const [landedCosts, setLandedCosts] = useState<LandedCost[]>([]);
  const [landedCostsOpen, setLandedCostsOpen] = useState(false);

  // Variant Matrix
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [matrixProduct, setMatrixProduct] = useState<any>(null);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 Data Fetching (PowerSync Reactive)
  // ═══════════════════════════════════════════════════════════════════════════

  // الموردين
  const { suppliers, isLoading: suppliersLoading } = useReactiveSuppliers({
    searchTerm: supplierSearch,
    limit: 50,
  });

  // المنتجات
  const { products, isLoading: productsLoading } = useReactiveProducts({
    searchTerm: productSearch,
    limit: 50,
  });

  // المشتريات الحالية (للتعديل)
  const { purchase: existingPurchase, items: existingItems, isLoading: purchaseLoading } =
    useReactivePurchase(purchaseId || null);

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 Calculations
  // ═══════════════════════════════════════════════════════════════════════════

  // المجاميع
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const itemsTotal = items.reduce((sum, item) => sum + item.totalCost, 0);
    const landedTotal = landedCosts.reduce((sum, c) => sum + c.amount, 0);
    const grandTotal = itemsTotal + landedTotal;
    const itemCount = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.baseQuantity, 0);

    return { subtotal, taxAmount, itemsTotal, landedTotal, grandTotal, itemCount, totalQuantity };
  }, [items, landedCosts]);

  // توزيع التكاليف الإضافية
  const { itemsWithCosts } = useLandedCostDistributor({
    items,
    costs: landedCosts,
  });

  // المورد المحدد
  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === supplierId);
  }, [suppliers, supplierId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 Effects
  // ═══════════════════════════════════════════════════════════════════════════

  // توليد رقم المشتريات
  useEffect(() => {
    if (!purchaseNumber && !isEditMode) {
      const date = new Date();
      const num = `PUR-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      setPurchaseNumber(num);
    }
  }, [purchaseNumber, isEditMode]);

  // تحميل بيانات التعديل
  useEffect(() => {
    if (isEditMode && existingPurchase && existingItems) {
      setSupplierId(existingPurchase.supplier_id);
      setPurchaseDate(existingPurchase.purchase_date);
      setDueDate(existingPurchase.due_date || '');
      setNotes(existingPurchase.notes || '');
      setPurchaseNumber(existingPurchase.purchase_number);

      // تحويل العناصر
      const loadedItems: SmartPurchaseItem[] = existingItems.map((item, i) => {
        // ⚡ استخراج إعدادات الوحدات من بيانات المنتج المرفقة
        const productData = item as any;

        return {
          id: item.id,
          tempId: `loaded_${i}`,
          productId: item.product_id,
          productName: item.description || productData.product_name || '',
          productImage: productData.product_image,
          productSku: productData.product_sku,
          variantType: (item.variant_type as any) || 'simple',
          colorId: item.color_id,
          sizeId: item.size_id,
          variantDisplayName: item.variant_display_name || '',
          // ⚡ إعدادات الوحدات من المنتج
          sellByBox: productData.sell_by_box || false,
          unitsPerBox: productData.units_per_box,
          sellByMeter: productData.sell_by_meter || false,
          rollLength: productData.roll_length,
          sellByWeight: productData.sell_by_weight || false,
          // الوحدة
          purchaseUnit: 'piece' as PurchaseUnitType,
          conversionFactor: 1,
          purchaseQuantity: item.quantity,
          baseQuantity: item.quantity,
          unitCost: item.unit_price,
          baseCost: item.unit_price,
          taxRate: item.tax_rate,
          taxAmount: item.tax_amount,
          subtotal: item.quantity * item.unit_price,
          totalCost: item.total_price,
          landedCostShare: 0,
          finalCost: item.total_price,
          finalBaseCost: item.unit_price,
          priceChanged: false,
          currentStock: productData.current_stock || 0,
          newStock: (productData.current_stock || 0) + item.quantity,
          stockDisplay: `${(productData.current_stock || 0) + item.quantity}`,
        };
      });

      setItems(loadedItems);
    }
  }, [isEditMode, existingPurchase, existingItems]);

  // اختصارات لوحة المفاتيح
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + S للحفظ
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSaveDraft();
      }
      // Ctrl + Enter للتأكيد
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
      // Ctrl + T لتبديل Turbo Mode
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        setTurboMode(prev => !prev);
      }
      // Ctrl + L للتكاليف الإضافية
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        setLandedCostsOpen(true);
      }
      // Escape لمسح البحث
      if (e.key === 'Escape') {
        setProductSearch('');
        setSupplierSearch('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 Handlers
  // ═══════════════════════════════════════════════════════════════════════════

  // إضافة منتج
  const handleAddProduct = useCallback((product: any) => {
    // التحقق من وجود متغيرات
    if (product.has_variants && product.colors && product.colors.length > 0) {
      setMatrixProduct(product);
      setMatrixOpen(true);
      return;
    }

    // ⚡ تحديد الوحدة الافتراضية بناءً على إعدادات المنتج
    let defaultUnit: PurchaseUnitType = 'piece';
    let conversionFactor = 1;

    if (product.sell_by_box && product.units_per_box > 1) {
      defaultUnit = 'box';
      conversionFactor = product.units_per_box;
    } else if (product.sell_by_meter) {
      defaultUnit = product.roll_length ? 'roll' : 'meter';
      conversionFactor = product.roll_length || 1;
    } else if (product.sell_by_weight) {
      defaultUnit = 'kg';
      conversionFactor = 1000; // كيلو = 1000 غرام
    }

    // ⚡ سعر الشراء حسب الوحدة
    const unitCost = product.purchase_price || 0;

    // إضافة منتج بسيط
    const newItem: SmartPurchaseItem = {
      id: '',
      tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId: product.id,
      productName: product.name,
      productImage: product.thumbnail_image,
      productSku: product.sku,
      productBarcode: product.barcode,
      variantType: 'simple',
      // ⚡ إعدادات الوحدات من المنتج
      sellByBox: product.sell_by_box || false,
      unitsPerBox: product.units_per_box,
      sellByMeter: product.sell_by_meter || false,
      rollLength: product.roll_length,
      sellByWeight: product.sell_by_weight || false,
      // الوحدة الافتراضية
      purchaseUnit: defaultUnit,
      conversionFactor: conversionFactor,
      purchaseQuantity: 1,
      baseQuantity: conversionFactor,
      unitCost: unitCost,
      baseCost: conversionFactor > 1 ? unitCost / conversionFactor : unitCost,
      taxRate: 0,
      taxAmount: 0,
      subtotal: unitCost,
      totalCost: unitCost,
      landedCostShare: 0,
      finalCost: unitCost,
      finalBaseCost: conversionFactor > 1 ? unitCost / conversionFactor : unitCost,
      currentSellingPrice: product.price,
      priceChanged: false,
      currentStock: product.stock_quantity || 0,
      newStock: (product.stock_quantity || 0) + conversionFactor,
      stockDisplay: `${(product.stock_quantity || 0) + conversionFactor}`,
    };

    setItems(prev => [...prev, newItem]);
    setProductSearch('');
    setProductOpen(false);

    // Turbo Mode - صوت وتركيز
    if (turboMode && turboSettings.soundFeedback) {
      // يمكن إضافة صوت هنا
    }

    toast.success(`تمت إضافة: ${product.name}`);
  }, [turboMode, turboSettings]);

  // إضافة من المصفوفة
  const handleMatrixConfirm = useCallback((matrixItems: SmartPurchaseItem[]) => {
    setItems(prev => [...prev, ...matrixItems]);
    setMatrixOpen(false);
    setMatrixProduct(null);
    toast.success(`تمت إضافة ${matrixItems.length} عناصر`);
  }, []);

  // تحديث عنصر
  const handleUpdateItem = useCallback((index: number, updates: Partial<SmartPurchaseItem>) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, ...updates };
      }
      return item;
    }));
  }, []);

  // حذف عنصر
  const handleRemoveItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  // فتح مصفوفة لمنتج موجود
  const handleOpenMatrix = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setMatrixProduct(product);
      setMatrixOpen(true);
    }
  }, [products]);

  // حفظ كمسودة
  const handleSaveDraft = useCallback(async () => {
    if (!supplierId) {
      toast.error('يرجى اختيار المورد');
      return;
    }

    if (items.length === 0) {
      toast.error('يرجى إضافة عنصر واحد على الأقل');
      return;
    }

    setIsSaving(true);

    try {
      const purchaseData = {
        purchase_number: purchaseNumber,
        supplier_id: supplierId,
        purchase_date: purchaseDate,
        due_date: dueDate || undefined,
        total_amount: totals.grandTotal,
        paid_amount: 0,
        status: 'draft' as const,
        payment_terms: '',
        notes,
      };

      const itemsData = items.map(item => ({
        product_id: item.productId,
        description: item.productName,
        quantity: item.baseQuantity,
        unit_price: item.baseCost,
        tax_rate: item.taxRate,
        color_id: item.colorId || null,
        size_id: item.sizeId || null,
        variant_type: item.variantType,
        variant_display_name: item.variantDisplayName || null,
      }));

      if (isEditMode && purchaseId) {
        await updatePurchase(orgId, purchaseId, purchaseData, itemsData);
        toast.success('تم تحديث المشتريات بنجاح');
      } else {
        await createPurchase(orgId, purchaseData, itemsData);
        toast.success('تم حفظ المشتريات كمسودة');
      }

      // استخدام callback أو navigate
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dashboard/supplier-operations/purchases');
      }
    } catch (error: any) {
      console.error('Error saving purchase:', error);
      toast.error(error.message || 'حدث خطأ في الحفظ');
    } finally {
      setIsSaving(false);
    }
  }, [supplierId, items, purchaseNumber, purchaseDate, dueDate, notes, totals, orgId, isEditMode, purchaseId, navigate, onSuccess]);

  // تأكيد المشتريات
  const handleConfirm = useCallback(async () => {
    if (!supplierId) {
      toast.error('يرجى اختيار المورد');
      return;
    }

    if (items.length === 0) {
      toast.error('يرجى إضافة عنصر واحد على الأقل');
      return;
    }

    setIsSaving(true);

    try {
      const purchaseData = {
        purchase_number: purchaseNumber,
        supplier_id: supplierId,
        purchase_date: purchaseDate,
        due_date: dueDate || undefined,
        total_amount: totals.grandTotal,
        paid_amount: 0,
        status: 'confirmed' as const,
        payment_terms: '',
        notes,
      };

      const itemsData = items.map(item => ({
        product_id: item.productId,
        description: item.productName,
        quantity: item.baseQuantity,
        unit_price: item.baseCost,
        tax_rate: item.taxRate,
        color_id: item.colorId || null,
        size_id: item.sizeId || null,
        variant_type: item.variantType,
        variant_display_name: item.variantDisplayName || null,
      }));

      if (isEditMode && purchaseId) {
        await updatePurchase(orgId, purchaseId, purchaseData, itemsData);
        toast.success('تم تأكيد المشتريات بنجاح');
      } else {
        await createPurchase(orgId, purchaseData, itemsData);
        toast.success('تم تأكيد المشتريات وتحديث المخزون');
      }

      // استخدام callback أو navigate
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dashboard/supplier-operations/purchases');
      }
    } catch (error: any) {
      console.error('Error confirming purchase:', error);
      toast.error(error.message || 'حدث خطأ في التأكيد');
    } finally {
      setIsSaving(false);
    }
  }, [supplierId, items, purchaseNumber, purchaseDate, dueDate, notes, totals, orgId, isEditMode, purchaseId, navigate, onSuccess]);

  // إعادة تعيين
  const handleReset = useCallback(() => {
    if (items.length > 0) {
      if (!confirm('هل أنت متأكد من مسح جميع العناصر؟')) return;
    }
    setItems([]);
    setLandedCosts([]);
    setNotes('');
  }, [items.length]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎨 Render
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* العنوان */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowRight className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">
                  {isEditMode ? 'تعديل فاتورة مشتريات' : 'فاتورة مشتريات جديدة'}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{purchaseNumber}</span>
                  {!isOnline && (
                    <Badge variant="outline" className="gap-1">
                      <WifiOff className="h-3 w-3" />
                      غير متصل
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* الإجراءات */}
            <div className="flex items-center gap-2">
              {/* Turbo Mode */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={turboMode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTurboMode(!turboMode)}
                      className="gap-2"
                    >
                      {turboMode ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
                      <span className="hidden sm:inline">Turbo</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>وضع السرعة (Ctrl+T)</p>
                    <p className="text-xs text-muted-foreground">إدخال سريع بدون تفاصيل</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Separator orientation="vertical" className="h-8" />

              {/* حفظ كمسودة */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isSaving || items.length === 0}
                className="gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span className="hidden sm:inline">حفظ مسودة</span>
              </Button>

              {/* تأكيد */}
              <Button
                onClick={handleConfirm}
                disabled={isSaving || items.length === 0 || !supplierId}
                className="gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                تأكيد المشتريات
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* العمود الأيمن - معلومات الفاتورة */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-2 space-y-6">
            {/* رأس الفاتورة */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  معلومات الفاتورة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* اختيار المورد */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      المورد *
                    </Label>
                    <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={supplierOpen}
                          className="w-full justify-between"
                        >
                          {selectedSupplier ? selectedSupplier.name : 'اختر المورد...'}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput
                            placeholder="ابحث عن مورد..."
                            value={supplierSearch}
                            onValueChange={setSupplierSearch}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {suppliersLoading ? 'جاري البحث...' : 'لا يوجد موردين'}
                            </CommandEmpty>
                            <CommandGroup>
                              {suppliers.map((supplier) => (
                                <CommandItem
                                  key={supplier.id}
                                  value={supplier.id}
                                  onSelect={() => {
                                    setSupplierId(supplier.id);
                                    setSupplierOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      supplierId === supplier.id ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  <div>
                                    <div className="font-medium">{supplier.name}</div>
                                    {supplier.phone && (
                                      <div className="text-xs text-muted-foreground">{supplier.phone}</div>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* تاريخ الشراء */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      تاريخ الشراء *
                    </Label>
                    <Input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                    />
                  </div>

                  {/* تاريخ الاستحقاق */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      تاريخ الاستحقاق
                    </Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>

                  {/* رقم الفاتورة */}
                  <div className="space-y-2">
                    <Label>رقم الفاتورة</Label>
                    <Input
                      value={purchaseNumber}
                      onChange={(e) => setPurchaseNumber(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* بحث المنتجات */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    المنتجات ({items.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <LandedCostsSummary
                      costs={landedCosts}
                      total={totals.landedTotal}
                      onClick={() => setLandedCostsOpen(true)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      disabled={items.length === 0}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* بحث المنتجات */}
                <Popover open={productOpen} onOpenChange={setProductOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        ref={productSearchRef}
                        placeholder="ابحث عن منتج بالاسم أو الباركود..."
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setProductOpen(true);
                        }}
                        onFocus={() => setProductOpen(true)}
                        className="pr-10"
                      />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandList>
                        <CommandEmpty>
                          {productsLoading ? (
                            <div className="flex items-center gap-2 p-4">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              جاري البحث...
                            </div>
                          ) : (
                            'لا توجد منتجات'
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {products.slice(0, 10).map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.id}
                              onSelect={() => handleAddProduct(product)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-3 w-full">
                                {product.thumbnail_image && (
                                  <img
                                    src={product.thumbnail_image}
                                    alt=""
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{product.name}</div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{product.sku}</span>
                                    {product.purchase_price && (
                                      <Badge variant="secondary" className="px-1.5 py-0">
                                        {product.purchase_price.toLocaleString('ar-DZ')} د.ج
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {product.has_variants && (
                                  <Badge variant="outline" className="gap-1">
                                    <Grid3X3 className="h-3 w-3" />
                                    متغيرات
                                  </Badge>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* قائمة العناصر */}
                {turboMode ? (
                  // جدول مضغوط في Turbo Mode
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-right text-xs font-medium">المنتج</th>
                          <th className="p-2 text-center text-xs font-medium w-20">الوحدة</th>
                          <th className="p-2 text-center text-xs font-medium w-20">الكمية</th>
                          <th className="p-2 text-center text-xs font-medium w-24">السعر</th>
                          <th className="p-2 text-left text-xs font-medium w-24">الإجمالي</th>
                          <th className="p-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <SmartPurchaseRow
                            key={item.tempId}
                            item={item}
                            index={index}
                            onUpdate={handleUpdateItem}
                            onRemove={handleRemoveItem}
                            onOpenMatrix={handleOpenMatrix}
                            compact={true}
                            turboMode={turboMode}
                          />
                        ))}
                      </tbody>
                    </table>
                    {items.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground">
                        ابحث عن منتج لإضافته
                      </div>
                    )}
                  </div>
                ) : (
                  // عرض كامل
                  <div className="space-y-4">
                    {items.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>لا توجد منتجات</p>
                        <p className="text-sm">ابحث عن منتج أعلاه لإضافته</p>
                      </div>
                    ) : (
                      items.map((item, index) => (
                        <SmartPurchaseRow
                          key={item.tempId}
                          item={item}
                          index={index}
                          onUpdate={handleUpdateItem}
                          onRemove={handleRemoveItem}
                          onOpenMatrix={handleOpenMatrix}
                          compact={false}
                          turboMode={false}
                        />
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ملاحظات */}
            <Card>
              <CardContent className="pt-6">
                <Label>ملاحظات</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أضف ملاحظات على الفاتورة..."
                  className="mt-2 w-full min-h-[100px] p-3 rounded-md border bg-background resize-none"
                />
              </CardContent>
            </Card>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* العمود الأيسر - الملخص */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            {/* ملخص الفاتورة */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  ملخص الفاتورة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* إحصائيات */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-muted-foreground">عدد العناصر</div>
                    <div className="text-xl font-bold">{totals.itemCount}</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-muted-foreground">إجمالي الكمية</div>
                    <div className="text-xl font-bold">{totals.totalQuantity}</div>
                  </div>
                </div>

                <Separator />

                {/* التفاصيل المالية */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المجموع الجزئي</span>
                    <span>{totals.subtotal.toLocaleString('ar-DZ')} د.ج</span>
                  </div>

                  {totals.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الضريبة</span>
                      <span>{totals.taxAmount.toLocaleString('ar-DZ')} د.ج</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">مجموع العناصر</span>
                    <span>{totals.itemsTotal.toLocaleString('ar-DZ')} د.ج</span>
                  </div>

                  {totals.landedTotal > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>التكاليف الإضافية</span>
                      <span>+{totals.landedTotal.toLocaleString('ar-DZ')} د.ج</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* الإجمالي */}
                <div className="flex justify-between items-center">
                  <span className="font-semibold">الإجمالي</span>
                  <span className="text-2xl font-bold text-primary">
                    {totals.grandTotal.toLocaleString('ar-DZ')} د.ج
                  </span>
                </div>

                {/* أزرار الإجراءات */}
                <div className="space-y-2 pt-4">
                  <Button
                    onClick={handleConfirm}
                    disabled={isSaving || items.length === 0 || !supplierId}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    تأكيد وتحديث المخزون
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={isSaving || items.length === 0}
                    className="w-full gap-2"
                  >
                    <Save className="h-4 w-4" />
                    حفظ كمسودة
                  </Button>
                </div>

                {/* اختصارات لوحة المفاتيح */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Keyboard className="h-3 w-3" />
                    اختصارات
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div><kbd className="px-1 bg-muted rounded">Ctrl+S</kbd> حفظ</div>
                    <div><kbd className="px-1 bg-muted rounded">Ctrl+Enter</kbd> تأكيد</div>
                    <div><kbd className="px-1 bg-muted rounded">Ctrl+T</kbd> Turbo</div>
                    <div><kbd className="px-1 bg-muted rounded">Ctrl+L</kbd> تكاليف</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {/* مصفوفة المتغيرات */}
      {matrixProduct && (
        <VariantMatrix
          open={matrixOpen}
          onOpenChange={setMatrixOpen}
          product={matrixProduct}
          defaultUnitCost={matrixProduct.purchase_price || 0}
          onConfirm={handleMatrixConfirm}
        />
      )}

      {/* التكاليف الإضافية */}
      <LandedCostsPanel
        open={landedCostsOpen}
        onOpenChange={setLandedCostsOpen}
        costs={landedCosts}
        onCostsChange={setLandedCosts}
        purchaseTotal={totals.itemsTotal}
      />
    </div>
  );
}

export default SmartPurchasePage;
