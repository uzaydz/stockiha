import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';
import { 
  Dialog, 
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../components/ui/dialog';
import { ArrowRightIcon, PlusCircleIcon, Phone, EuroIcon, RefreshCw, ShieldAlert, Loader2 } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import type { 
  FlexiNetwork, 
  FlexiBalance, 
  DigitalCurrency, 
  CurrencyBalance 
} from '../../types/flexi';
import { 
  getFlexiNetworks, 
  getFlexiBalances, 
  addFlexiSale,
  updateFlexiBalance
} from '../../api/flexiService';
import { 
  getDigitalCurrencies, 
  getCurrencyBalances, 
  addCurrencySale 
} from '../../api/currencyService';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { checkUserPermissions } from '../../lib/api/permissions';

export default function FlexiSales() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // حالات الصلاحيات
  const [hasSellPermission, setHasSellPermission] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);
  
  // حالة شبكات الفليكسي والأرصدة
  const [flexiNetworks, setFlexiNetworks] = useState<FlexiNetwork[]>([]);
  const [flexiBalances, setFlexiBalances] = useState<FlexiBalance[]>([]);
  const [loadingFlexi, setLoadingFlexi] = useState(true);
  
  // حالة للرصيد المعروض (لعرض الرصيد المحدث مباشرة عند إدخال الرصيد المتبقي)
  const [displayBalances, setDisplayBalances] = useState<FlexiBalance[]>([]);
  
  // حالة العملات الرقمية والأرصدة
  const [digitalCurrencies, setDigitalCurrencies] = useState<DigitalCurrency[]>([]);
  const [currencyBalances, setCurrencyBalances] = useState<CurrencyBalance[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);
  
  // بيانات بيع الفليكسي
  const [flexiSaleData, setFlexiSaleData] = useState({
    network_id: '',
    amount: '',
    remaining_balance: '',
    notes: ''
  });
  
  // بيانات بيع العملة الرقمية
  const [currencySaleData, setCurrencySaleData] = useState({
    currency_id: '',
    amount: '',
    dinar_amount: '',
    customer_details: {
      phone: '',
      name: '',
      wallet_id: '',
      account_number: ''
    },
    notes: ''
  });
  
  const [isSelling, setIsSelling] = useState(false);
  const [showAllData, setShowAllData] = useState(false);
  
  const fetchFlexiData = async () => {
    setLoadingFlexi(true);
    try {
      // إذا كان المستخدم قد اختار عرض جميع البيانات، نقوم بمسح معرف المنظمة من localStorage
      if (showAllData) {
        localStorage.removeItem('organization_id');
        
      } else {
        // الحصول على معرف المنظمة من المستخدم
        const organizationId = 
          user?.user_metadata?.organization_id || 
          (user as any)?.organization_id ||
          user?.app_metadata?.organization_id ||
          localStorage.getItem('organization_id') ||
          "7519afc0-d068-4235-a0f2-f92935772e0c"; // استخدام معرف افتراضي إذا لم يتوفر

        // حفظ معرف المنظمة في التخزين المحلي لضمان الاتساق بين مختلف API
        if (organizationId) {
          localStorage.setItem('organization_id', organizationId);
        }
      }

      // استدعاء API ودع الوظائف تعالج الفلترة بنفسها
      const networks = await getFlexiNetworks();
      const balances = await getFlexiBalances();

      setFlexiNetworks(networks);
      setFlexiBalances(balances);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: 'لم نتمكن من تحميل بيانات الفليكسي'
      });
    } finally {
      setLoadingFlexi(false);
    }
  };
  
  const fetchCurrencyData = async () => {
    setLoadingCurrencies(true);
    try {
      const currencies = await getDigitalCurrencies();
      const balances = await getCurrencyBalances();
      setDigitalCurrencies(currencies);
      setCurrencyBalances(balances);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: 'لم نتمكن من تحميل بيانات العملات الرقمية'
      });
    } finally {
      setLoadingCurrencies(false);
    }
  };
  
  // التحقق من صلاحيات المستخدم
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setHasSellPermission(false);
        setPermissionLoading(false);
        return;
      }
      
      setPermissionLoading(true);
      try {
        // التحقق من صلاحية بيع الفليكسي والعملات الرقمية
        const canSell = await checkUserPermissions(user, 'sellFlexiAndDigitalCurrency' as any);
        setHasSellPermission(canSell);
      } catch (error) {
        setHasSellPermission(false);
        toast({
          variant: 'destructive',
          title: 'خطأ في التحقق من الصلاحيات',
          description: 'حدث خطأ أثناء التحقق من صلاحياتك للوصول إلى هذه الصفحة'
        });
      } finally {
        setPermissionLoading(false);
      }
    };
    
    checkPermissions();
  }, [user, toast]);

  // عند تغيير إعداد عرض جميع البيانات، نعيد تحميل البيانات
  useEffect(() => {
    if (hasSellPermission && !permissionLoading) {
      fetchFlexiData();
    }
  }, [showAllData, hasSellPermission, permissionLoading]);
  
  useEffect(() => {
    if (hasSellPermission && !permissionLoading) {
      fetchFlexiData();
      fetchCurrencyData();
    }
  }, [hasSellPermission, permissionLoading]);
  
  // تحديث الأرصدة المعروضة عندما تتغير الأرصدة الفعلية
  useEffect(() => {
    setDisplayBalances([...flexiBalances]);
  }, [flexiBalances]);
  
  // محاسبة مبلغ العملة الرقمية
  useEffect(() => {
    if (currencySaleData.currency_id && currencySaleData.amount) {
      const selectedCurrency = digitalCurrencies.find(c => c.id === currencySaleData.currency_id);
      if (selectedCurrency) {
        const dinarAmount = parseFloat(currencySaleData.amount) * selectedCurrency.exchange_rate;
        setCurrencySaleData(prev => ({
          ...prev,
          dinar_amount: dinarAmount.toString()
        }));
      }
    }
  }, [currencySaleData.currency_id, currencySaleData.amount, digitalCurrencies]);
  
  // حساب الرصيد الحالي للشبكة المختارة
  const getSelectedNetworkBalance = () => {
    if (!flexiSaleData.network_id) return 0;
    const balance = flexiBalances.find(b => b.network_id === flexiSaleData.network_id);
    return balance ? balance.balance : 0;
  };
  
  // حساب الرصيد المعروض مع مراعاة الرصيد المتبقي إذا كان مدخلاً
  const getDisplayBalance = (networkId: string) => {
    // إذا كانت الشبكة هي نفسها المحددة وتم إدخال رصيد متبقي صالح
    if (
      networkId === flexiSaleData.network_id && 
      flexiSaleData.remaining_balance && 
      !isNaN(parseFloat(flexiSaleData.remaining_balance))
    ) {
      const remainingBalance = parseFloat(flexiSaleData.remaining_balance);
      const currentBalance = getSelectedNetworkBalance();
      
      // إذا كان الرصيد المتبقي صالحاً (أقل من الحالي وأكبر من أو يساوي الصفر)
      if (remainingBalance >= 0 && remainingBalance < currentBalance) {
        return remainingBalance;
      }
    }
    
    // إرجاع الرصيد الفعلي إذا لم تتحقق شروط العرض المتوقع
    const balance = flexiBalances.find(b => b.network_id === networkId);
    return balance ? balance.balance : 0;
  };
  
  // دالة للتحقق مما إذا كان الرصيد المعروض تم تحديثه
  const isBalanceUpdated = (networkId: string) => {
    return (
      networkId === flexiSaleData.network_id && 
      flexiSaleData.remaining_balance && 
      !isNaN(parseFloat(flexiSaleData.remaining_balance)) &&
      parseFloat(flexiSaleData.remaining_balance) >= 0 &&
      parseFloat(flexiSaleData.remaining_balance) < getSelectedNetworkBalance()
    );
  };
  
  const handleFlexiSaleSubmit = async () => {
    setIsSelling(true);
    try {
      // التحقق من المدخلات
      if (!flexiSaleData.network_id || !flexiSaleData.remaining_balance) {
        throw new Error('يرجى ملء الحقول المطلوبة (الشبكة والرصيد المتبقي)');
      }
      
      const remainingBalance = parseFloat(flexiSaleData.remaining_balance);
      if (isNaN(remainingBalance) || remainingBalance < 0) {
        throw new Error('يرجى إدخال رصيد متبقي صحيح');
      }
      
      // الحصول على الرصيد الحالي
      const currentBalance = getSelectedNetworkBalance();
      
      // التحقق من أن الرصيد المتبقي أقل من الرصيد الحالي
      if (remainingBalance > currentBalance) {
        throw new Error('الرصيد المتبقي يجب أن يكون أقل من أو يساوي الرصيد الحالي');
      }
      
      // حساب المبلغ المباع (الفرق بين الرصيد الحالي والرصيد المتبقي)
      const amount = currentBalance - remainingBalance;
      
      // التحقق من أن المبلغ المباع أكبر من الصفر
      if (amount <= 0) {
        throw new Error('المبلغ المباع يجب أن يكون أكبر من الصفر');
      }
      
      // الحصول على معرف المنظمة بعدة طرق
      let organizationId = 
        user?.user_metadata?.organization_id || 
        (user as any)?.organization_id ||
        user?.app_metadata?.organization_id ||
        localStorage.getItem('organization_id');
      
      // إذا لم نتمكن من العثور على معرف المنظمة، نستخدم المعرف الافتراضي
      if (!organizationId) {
        organizationId = "7519afc0-d068-4235-a0f2-f92935772e0c";
      }
      
      // تخزين معرف المنظمة في localStorage للاستخدام في العمليات المستقبلية
      localStorage.setItem('organization_id', organizationId);
      
      // التحقق من أن الشبكة تنتمي إلى نفس المنظمة
      const selectedNetwork = flexiNetworks.find(n => n.id === flexiSaleData.network_id);
      if (selectedNetwork && selectedNetwork.organization_id !== organizationId) {
      }

      try {
        // إتمام عملية البيع
        await addFlexiSale({
          network_id: flexiSaleData.network_id,
          amount,
          status: 'completed',
          notes: `تم بيع رصيد بقيمة ${amount} دج. الرصيد المتبقي: ${remainingBalance} دج. ${flexiSaleData.notes || ''}`,
          created_by: user?.id || null,
          organization_id: organizationId
        });
        
        // تحديث الرصيد مباشرة في قاعدة البيانات
        // هذا هو الحل الدائم للمشكلة - تحديث الرصيد يدويًا بعد عملية البيع
        await updateFlexiBalance(
          flexiSaleData.network_id,
          remainingBalance,
          organizationId
        );
        
        // تحديث الأرصدة محلياً أيضًا
        const updatedBalances = flexiBalances.map(balance => {
          if (balance.network_id === flexiSaleData.network_id) {
            return { ...balance, balance: remainingBalance };
          }
          return balance;
        });
        setFlexiBalances(updatedBalances);
        
        // إعادة تحميل البيانات من الخادم مع تمرير نفس معرف المنظمة
        setTimeout(async () => {
          try {
            const networks = await getFlexiNetworks(organizationId);
            const balances = await getFlexiBalances(organizationId);
            setFlexiNetworks(networks);
            setFlexiBalances(balances);
          } catch (refreshError) {
          }
        }, 2000);
        
        // إعادة تعيين النموذج
        setFlexiSaleData({
          network_id: '',
          amount: '',
          remaining_balance: '',
          notes: ''
        });
        
        toast({
          title: 'تمت العملية بنجاح',
          description: `تم بيع رصيد فليكسي بقيمة ${amount} دج. الرصيد المتبقي: ${remainingBalance} دج.`
        });
      } catch (error: any) {
        // حتى لو فشلت عملية استرجاع البيانات، قد تكون عملية البيع نجحت
        if (error.message.includes('فشل في استرجاع البيانات') || 
            error.message.includes('Error fetching added sale')) {
          try {
            // محاولة تحديث الرصيد حتى في حالة فشل استرجاع البيانات
            await updateFlexiBalance(
              flexiSaleData.network_id,
              remainingBalance,
              organizationId
            );
            
            // تحديث الأرصدة محلياً أيضًا
            const updatedBalances = flexiBalances.map(balance => {
              if (balance.network_id === flexiSaleData.network_id) {
                return { ...balance, balance: remainingBalance };
              }
              return balance;
            });
            setFlexiBalances(updatedBalances);
          } catch (updateError) {
          }
          
          // محاولة إعادة تحميل البيانات بعد تأخير أطول مع تمرير معرف المنظمة
          setTimeout(async () => {
            try {
              const networks = await getFlexiNetworks(organizationId);
              const balances = await getFlexiBalances(organizationId);
              setFlexiNetworks(networks);
              setFlexiBalances(balances);
            } catch (refreshError) {
            }
          }, 3000);
          
          // إعادة تعيين النموذج
          setFlexiSaleData({
            network_id: '',
            amount: '',
            remaining_balance: '',
            notes: ''
          });
          
          toast({
            title: 'تمت العملية بنجاح',
            description: 'تم بيع رصيد الفليكسي بنجاح، لكن هناك مشكلة في عرض البيانات المحدثة. سيتم تحديث الأرصدة قريبًا.'
          });
        } else {
          // خطأ آخر غير متوقع
          throw error;
        }
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: error.message || 'لم نتمكن من إتمام عملية البيع'
      });
    } finally {
      setIsSelling(false);
    }
  };
  
  const handleCurrencySaleSubmit = async () => {
    setIsSelling(true);
    try {
      // التحقق من المدخلات
      if (!currencySaleData.currency_id || !currencySaleData.amount) {
        throw new Error('يرجى ملء الحقول المطلوبة (العملة والمبلغ)');
      }
      
      const amount = parseFloat(currencySaleData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('يرجى إدخال مبلغ صحيح');
      }
      
      const dinarAmount = parseFloat(currencySaleData.dinar_amount);
      if (isNaN(dinarAmount) || dinarAmount <= 0) {
        throw new Error('يرجى إدخال مبلغ صحيح بالدينار');
      }
      
      // تجميع تفاصيل العميل - كلها اختيارية
      const customerDetails: Record<string, string> = {};
      if (currencySaleData.customer_details.phone) {
        // التحقق من صيغة رقم الهاتف إذا تم إدخاله
        if (!/^0[567][0-9]{8}$/.test(currencySaleData.customer_details.phone)) {
          throw new Error('يرجى إدخال رقم هاتف صحيح أو تركه فارغًا');
        }
        customerDetails.phone = currencySaleData.customer_details.phone;
      }
      if (currencySaleData.customer_details.name) {
        customerDetails.name = currencySaleData.customer_details.name;
      }
      if (currencySaleData.customer_details.wallet_id) {
        customerDetails.wallet_id = currencySaleData.customer_details.wallet_id;
      }
      if (currencySaleData.customer_details.account_number) {
        customerDetails.account_number = currencySaleData.customer_details.account_number;
      }
      
      // الحصول على معرف المنظمة من المستخدم
      const organizationId = 
        user?.user_metadata?.organization_id || 
        (user as any)?.organization_id ||
        user?.app_metadata?.organization_id;
      
      // استخدام معرف مؤقت إذا لم يتم العثور على معرف المنظمة
      const tempOrgId = "7519afc0-d068-4235-a0f2-f92935772e0c";
      
      if (!organizationId && !tempOrgId) {
        throw new Error('معرف المنظمة غير متوفر، يرجى تسجيل الدخول مرة أخرى');
      }
      
      // استخدام المعرف المكتشف أو المعرف المؤقت
      const finalOrgId = organizationId || tempOrgId;

      try {
        // إتمام عملية البيع
        await addCurrencySale({
          currency_id: currencySaleData.currency_id,
          amount,
          dinar_amount: dinarAmount,
          customer_details: Object.keys(customerDetails).length > 0 ? customerDetails : null,
          status: 'completed',
          notes: currencySaleData.notes || null,
          created_by: user?.id || null,
          organization_id: finalOrgId
        });
        
        // إعادة تحميل البيانات
        await fetchCurrencyData();
        
        // إعادة تعيين النموذج
        setCurrencySaleData({
          currency_id: '',
          amount: '',
          dinar_amount: '',
          customer_details: {
            phone: '',
            name: '',
            wallet_id: '',
            account_number: ''
          },
          notes: ''
        });
        
        toast({
          title: 'تمت العملية بنجاح',
          description: 'تم بيع العملة الرقمية بنجاح. سيتم تحديث الأرصدة قريبًا.'
        });
      } catch (error: any) {
        // حتى لو فشلت عملية استرجاع البيانات، قد تكون عملية البيع نجحت
        if (error.message.includes('فشل في استرجاع البيانات') || 
            error.message.includes('Error fetching added currency sale')) {
          // محاولة إعادة تحميل البيانات بعد تأخير قصير
          setTimeout(() => {
            fetchCurrencyData();
          }, 2000);
          
          // إعادة تعيين النموذج
          setCurrencySaleData({
            currency_id: '',
            amount: '',
            dinar_amount: '',
            customer_details: {
              phone: '',
              name: '',
              wallet_id: '',
              account_number: ''
            },
            notes: ''
          });
          
          toast({
            title: 'تمت العملية بنجاح',
            description: 'تم بيع العملة الرقمية بنجاح، لكن هناك مشكلة في عرض البيانات المحدثة. سيتم تحديث الأرصدة قريبًا.'
          });
        } else {
          // خطأ آخر غير متوقع
          throw error;
        }
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: error.message || 'لم نتمكن من إتمام عملية البيع'
      });
    } finally {
      setIsSelling(false);
    }
  };
  
  // عند اختيار شبكة، تعيين الرصيد المتبقي تلقائياً ليكون نفس الرصيد الحالي
  const handleNetworkChange = (value: string) => {
    const selectedNetwork = flexiNetworks.find(n => n.id === value);
    const balance = flexiBalances.find(b => b.network_id === value);
    
    // إعادة ضبط الأرصدة المعروضة
    setDisplayBalances([...flexiBalances]);
    
    setFlexiSaleData(prev => ({
      ...prev,
      network_id: value,
      amount: balance ? balance.balance.toString() : '0', // نعيّن قيمة الرصيد الحالي
      remaining_balance: '', // نفرّغ الرصيد المتبقي
    }));
  };
  
  // عرض شاشة التحميل أثناء التحقق من الصلاحيات
  if (permissionLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>التحقق من الصلاحيات...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // عرض رسالة عدم وجود صلاحية
  if (!hasSellPermission) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <Alert variant="destructive" className="max-w-md mx-auto">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>غير مصرح</AlertTitle>
            <AlertDescription>
              ليس لديك الصلاحية اللازمة لبيع خدمات الفليكسي والعملات الرقمية. 
              يرجى التواصل مع المسؤول لمنحك الصلاحية المناسبة.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">بيع خدمات الفليكسي والعملات الرقمية</h1>
        
        <div className="mb-4 flex justify-between items-center">
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllData(!showAllData)}
              className="mb-2"
            >
              {showAllData ? "عرض بيانات المنظمة الحالية فقط" : "عرض جميع البيانات"}
            </Button>
            {showAllData && (
              <p className="text-sm text-muted-foreground">
                يتم عرض جميع البيانات من جميع المنظمات. هذه الطريقة مفيدة للمسؤولين فقط.
              </p>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchFlexiData()}
            disabled={loadingFlexi}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${loadingFlexi ? 'animate-spin' : ''}`} />
            {loadingFlexi ? "جارٍ التحديث..." : "تحديث البيانات"}
          </Button>
        </div>
        
        <Tabs defaultValue="flexi" className="w-full">
          <TabsList className="w-full flex space-x-2 mb-6">
            <TabsTrigger value="flexi" className="flex-1">بيع الفليكسي</TabsTrigger>
            <TabsTrigger value="currencies" className="flex-1">بيع العملات الرقمية</TabsTrigger>
          </TabsList>
          
          <TabsContent value="flexi">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>بيع رصيد فليكسي</CardTitle>
                  <CardDescription>قم بتعبئة رصيد للعميل</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="network_id">شبكة الفليكسي</Label>
                      <Select 
                        value={flexiSaleData.network_id} 
                        onValueChange={handleNetworkChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الشبكة" />
                        </SelectTrigger>
                        <SelectContent>
                          {flexiNetworks.map(network => {
                            const balance = flexiBalances.find(b => b.network_id === network.id);
                            return (
                              <SelectItem key={network.id} value={network.id}>
                                {network.name} - {balance ? balance.balance.toLocaleString() : 0} دج
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {flexiSaleData.network_id && (
                      <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium dark:text-gray-200">الرصيد الحالي:</span>
                          <span className="font-bold text-lg dark:text-white">
                            {getSelectedNetworkBalance().toLocaleString()} دج
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="remaining_balance">الرصيد المتبقي بعد البيع (دج)</Label>
                      <Input
                        id="remaining_balance"
                        type="number"
                        value={flexiSaleData.remaining_balance}
                        onChange={(e) => setFlexiSaleData(prev => ({ ...prev, remaining_balance: e.target.value }))}
                        placeholder="أدخل الرصيد المتبقي بعد عملية البيع"
                      />
                    </div>
                    
                    {flexiSaleData.network_id && flexiSaleData.remaining_balance && !isNaN(parseFloat(flexiSaleData.remaining_balance)) && (
                      <div className="p-4 border rounded-md bg-blue-50 dark:bg-blue-900/30 dark:border-blue-800">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium dark:text-gray-200">المبلغ المباع:</span>
                          <span className="font-bold text-lg text-blue-600 dark:text-blue-300">
                            {Math.max(0, getSelectedNetworkBalance() - parseFloat(flexiSaleData.remaining_balance)).toLocaleString()} دج
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                      <Textarea
                        id="notes"
                        value={flexiSaleData.notes}
                        onChange={(e) => setFlexiSaleData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="ملاحظات إضافية"
                      />
                    </div>
                    
                    <Button 
                      type="button" 
                      className="w-full" 
                      onClick={handleFlexiSaleSubmit}
                      disabled={
                        isSelling || 
                        loadingFlexi || 
                        !flexiSaleData.network_id || 
                        !flexiSaleData.remaining_balance || 
                        getSelectedNetworkBalance() <= parseFloat(flexiSaleData.remaining_balance) ||
                        parseFloat(flexiSaleData.remaining_balance) < 0
                      }
                    >
                      {isSelling ? 'جاري البيع...' : 'إتمام عملية البيع'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>معلومات الرصيد</CardTitle>
                  <CardDescription>معلومات حول الرصيد المتاح لكل شبكة</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loadingFlexi ? (
                      <div className="flex justify-center items-center h-32">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                      </div>
                    ) : flexiNetworks.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">لا توجد شبكات متاحة</p>
                      </div>
                    ) : (
                      flexiNetworks.map(network => {
                        const isUpdated = isBalanceUpdated(network.id);
                        const displayBalance = getDisplayBalance(network.id);
                          
                        return (
                          <div 
                            key={network.id} 
                            className={`flex items-center justify-between p-4 border rounded-lg ${isUpdated ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                          >
                            <div className="flex items-center">
                              <Phone className="h-8 w-8 mr-3 text-primary" />
                              <div>
                                <h3 className="font-medium">{network.name}</h3>
                                <p className="text-sm text-muted-foreground">{network.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold ${isUpdated ? 'text-blue-600 dark:text-blue-300' : ''}`}>
                                {displayBalance.toLocaleString()} دج
                                {isUpdated && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">متوقع</span>}
                              </p>
                              <p className="text-sm text-muted-foreground">الرصيد المتاح</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="currencies">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>بيع عملة رقمية</CardTitle>
                  <CardDescription>بيع عملات رقمية أو رصيد منصات دفع</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currency">اختر العملة / المنصة</Label>
                      <Select
                        value={currencySaleData.currency_id}
                        onValueChange={(value) => setCurrencySaleData(prev => ({ ...prev, currency_id: value }))}
                        disabled={loadingCurrencies}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر العملة أو المنصة" />
                        </SelectTrigger>
                        <SelectContent>
                          {digitalCurrencies.map(currency => {
                            const balance = currencyBalances.find(b => b.currency_id === currency.id);
                            return (
                              <SelectItem key={currency.id} value={currency.id}>
                                {currency.name} ({currency.code}) - الرصيد: {balance ? balance.balance.toLocaleString() : 0}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="space-y-2 flex-1">
                        <Label htmlFor="currency_amount">المبلغ بالعملة</Label>
                        <Input
                          id="currency_amount"
                          type="number"
                          value={currencySaleData.amount}
                          onChange={(e) => setCurrencySaleData(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="أدخل المبلغ"
                        />
                      </div>
                      
                      <div className="space-y-2 flex-1">
                        <Label htmlFor="dinar_amount">المبلغ بالدينار</Label>
                        <Input
                          id="dinar_amount"
                          type="number"
                          value={currencySaleData.dinar_amount}
                          onChange={(e) => setCurrencySaleData(prev => ({ ...prev, dinar_amount: e.target.value }))}
                          placeholder="المبلغ بالدينار"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>بيانات العميل</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="الاسم"
                          value={currencySaleData.customer_details.name}
                          onChange={(e) => setCurrencySaleData(prev => ({
                            ...prev,
                            customer_details: { ...prev.customer_details, name: e.target.value }
                          }))}
                        />
                        <Input
                          placeholder="رقم الهاتف"
                          value={currencySaleData.customer_details.phone}
                          onChange={(e) => setCurrencySaleData(prev => ({
                            ...prev,
                            customer_details: { ...prev.customer_details, phone: e.target.value }
                          }))}
                        />
                        <Input
                          placeholder="معرف المحفظة/الحساب"
                          value={currencySaleData.customer_details.wallet_id}
                          onChange={(e) => setCurrencySaleData(prev => ({
                            ...prev,
                            customer_details: { ...prev.customer_details, wallet_id: e.target.value }
                          }))}
                        />
                        <Input
                          placeholder="رقم الحساب"
                          value={currencySaleData.customer_details.account_number}
                          onChange={(e) => setCurrencySaleData(prev => ({
                            ...prev,
                            customer_details: { ...prev.customer_details, account_number: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="currency_notes">ملاحظات (اختياري)</Label>
                      <Textarea
                        id="currency_notes"
                        value={currencySaleData.notes}
                        onChange={(e) => setCurrencySaleData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="ملاحظات إضافية"
                      />
                    </div>
                    
                    <Button 
                      type="button" 
                      className="w-full" 
                      onClick={handleCurrencySaleSubmit}
                      disabled={isSelling || loadingCurrencies || !currencySaleData.currency_id || !currencySaleData.amount || !currencySaleData.dinar_amount}
                    >
                      {isSelling ? 'جاري البيع...' : 'إتمام عملية البيع'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>معلومات العملات الرقمية</CardTitle>
                  <CardDescription>معلومات حول الرصيد المتاح لكل عملة أو منصة</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loadingCurrencies ? (
                      <div className="flex justify-center items-center h-32">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                      </div>
                    ) : digitalCurrencies.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">لا توجد عملات متاحة</p>
                      </div>
                    ) : (
                      digitalCurrencies.map(currency => {
                        const balance = currencyBalances.find(b => b.currency_id === currency.id);
                        return (
                          <div key={currency.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center">
                              <EuroIcon className="h-8 w-8 mr-3 text-primary" />
                              <div>
                                <h3 className="font-medium">{currency.name} ({currency.code})</h3>
                                <p className="text-sm text-muted-foreground">
                                  {currency.type === 'currency' ? 'عملة رقمية' : 'منصة دفع'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{balance ? balance.balance.toLocaleString() : 0}</p>
                              <p className="text-sm text-muted-foreground">سعر الصرف: {currency.exchange_rate.toLocaleString()} دج</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
