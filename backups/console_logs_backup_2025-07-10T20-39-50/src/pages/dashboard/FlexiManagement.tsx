import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { 
  Dialog, 
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';
import { 
  PlusCircleIcon, 
  RefreshCwIcon, 
  EditIcon,
  EuroIcon, 
  Phone
} from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import type { FlexiNetwork, FlexiBalance, DigitalCurrency, CurrencyBalance } from '../../types/flexi';
import { getFlexiNetworks, getFlexiBalances, updateFlexiBalance, addFlexiNetwork, updateFlexiNetwork, deleteFlexiNetwork } from '../../api/flexiService';
import { getDigitalCurrencies, getCurrencyBalances, updateCurrencyBalance, addDigitalCurrency, updateDigitalCurrency, deleteDigitalCurrency } from '../../api/currencyService';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';

export default function FlexiManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // حالة شبكات الفليكسي والأرصدة
  const [flexiNetworks, setFlexiNetworks] = useState<FlexiNetwork[]>([]);
  const [flexiBalances, setFlexiBalances] = useState<FlexiBalance[]>([]);
  const [loadingFlexi, setLoadingFlexi] = useState(true);
  
  // حالة العملات الرقمية والأرصدة
  const [digitalCurrencies, setDigitalCurrencies] = useState<DigitalCurrency[]>([]);
  const [currencyBalances, setCurrencyBalances] = useState<CurrencyBalance[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);
  
  // حالة تحديث الرصيد
  const [isUpdatingFlexi, setIsUpdatingFlexi] = useState(false);
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);
  const [selectedFlexiNetwork, setSelectedFlexiNetwork] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState('');
  
  // حالة إضافة شبكة فليكسي جديدة
  const [isAddingFlexiNetwork, setIsAddingFlexiNetwork] = useState(false);
  const [newFlexiNetwork, setNewFlexiNetwork] = useState({
    name: '',
    description: '',
    icon: 'Phone'
  });
  
  // حالة إضافة عملة رقمية جديدة
  const [isAddingCurrency, setIsAddingCurrency] = useState(false);
  const [newCurrency, setNewCurrency] = useState({
    name: '',
    code: '',
    type: 'currency',
    icon: 'EuroIcon',
    exchange_rate: '1'
  });
  
  // حالة تعديل شبكة فليكسي
  const [isEditingFlexiNetwork, setIsEditingFlexiNetwork] = useState(false);
  const [editFlexiNetwork, setEditFlexiNetwork] = useState<FlexiNetwork | null>(null);
  
  // حالة تعديل عملة رقمية
  const [isEditingCurrency, setIsEditingCurrency] = useState(false);
  const [editCurrency, setEditCurrency] = useState<DigitalCurrency | null>(null);
  
  // حالة تأكيد الحذف
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteType, setDeleteType] = useState<'flexi' | 'currency'>('flexi');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const fetchFlexiData = async () => {
    setLoadingFlexi(true);
    try {
      const networks = await getFlexiNetworks();
      
      setFlexiNetworks(networks);
      
      // جلب الأرصدة بعد تأخير قصير للتأكد من استكمال أي عمليات سابقة
      await new Promise(resolve => setTimeout(resolve, 500));
      const balances = await getFlexiBalances();
      
      setFlexiBalances(balances);
      
      // التحقق مما إذا كانت هناك شبكات بدون أرصدة
      const networksWithoutBalances = networks.filter(
        network => !balances.some(balance => balance.network_id === network.id)
      );

      if (networksWithoutBalances.length > 0) {
      }
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
  
  useEffect(() => {
    fetchFlexiData();
    fetchCurrencyData();
  }, []);
  
  const openFlexiBalanceDialog = (networkId: string) => {
    setSelectedFlexiNetwork(networkId);
    const balance = flexiBalances.find(b => b.network_id === networkId);
    setNewBalance(balance ? balance.balance.toString() : '0');
    setIsUpdatingFlexi(true);
  };
  
  const openCurrencyBalanceDialog = (currencyId: string) => {
    setSelectedCurrency(currencyId);
    const balance = currencyBalances.find(b => b.currency_id === currencyId);
    setNewBalance(balance ? balance.balance.toString() : '0');
    setIsUpdatingCurrency(true);
  };
  
  const handleFlexiBalanceUpdate = async () => {
    if (!selectedFlexiNetwork) return;
    
    try {
      // محاولة العثور على معرف المنظمة من أماكن مختلفة
      const organizationId = 
        user?.user_metadata?.organization_id || 
        (user as any)?.organization_id ||
        user?.app_metadata?.organization_id;
      
      // استخدام معرف المنظمة الذي وجدناه في AuthContext 
      const storedOrgId = localStorage.getItem('bazaar_organization_id');
      const finalOrgId = storedOrgId || organizationId;
      
      if (!finalOrgId) {
        console.error('لا يوجد معرف مؤسسة صالح');
        return;
      }

      await updateFlexiBalance(selectedFlexiNetwork, parseFloat(newBalance), finalOrgId);
      
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث رصيد الفليكسي بنجاح'
      });
      
      // إضافة تأخير قبل إعادة تحميل البيانات
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // إعادة تحميل البيانات
      await fetchFlexiData();
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: 'لم نتمكن من تحديث رصيد الفليكسي'
      });
    } finally {
      setIsUpdatingFlexi(false);
    }
  };
  
  const handleCurrencyBalanceUpdate = async () => {
    if (!selectedCurrency) return;
    
    try {
      // محاولة العثور على معرف المنظمة من أماكن مختلفة
      const organizationId = 
        user?.user_metadata?.organization_id || 
        (user as any)?.organization_id ||
        user?.app_metadata?.organization_id;
      
      // استخدام معرف المنظمة الذي وجدناه في AuthContext 
      const storedOrgId = localStorage.getItem('bazaar_organization_id');
      const finalOrgId = storedOrgId || organizationId;
      
      if (!finalOrgId) {
        console.error('لا يوجد معرف مؤسسة صالح');
        return;
      }

      await updateCurrencyBalance(selectedCurrency, parseFloat(newBalance), finalOrgId);
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث رصيد العملة بنجاح'
      });
      fetchCurrencyData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: 'لم نتمكن من تحديث رصيد العملة'
      });
    } finally {
      setIsUpdatingCurrency(false);
    }
  };
  
  const handleAddFlexiNetwork = async () => {
    try {
      if (!newFlexiNetwork.name) {
        throw new Error('يرجى إدخال اسم الشبكة');
      }
      
      // محاولة العثور على معرف المنظمة من أماكن مختلفة
      const organizationId = 
        user?.user_metadata?.organization_id || 
        (user as any)?.organization_id ||
        user?.app_metadata?.organization_id;
      
      // استخدام معرف المنظمة الذي وجدناه في AuthContext 
      const storedOrgId = localStorage.getItem('bazaar_organization_id');
      const finalOrgId = storedOrgId || organizationId;
      
      if (!finalOrgId) {
        console.error('لا يوجد معرف مؤسسة صالح');
        return;
      }

      // إضافة شبكة فليكسي جديدة باستخدام وظيفة RPC الآمنة مع تمرير معرف المؤسسة
      await addFlexiNetwork({
        ...newFlexiNetwork,
        organization_id: finalOrgId
      });
      
      toast({
        title: 'تمت الإضافة',
        description: 'تم إضافة شبكة فليكسي جديدة بنجاح'
      });
      
      // إعادة تعيين النموذج
      setNewFlexiNetwork({
        name: '',
        description: '',
        icon: 'Phone'
      });
      
      // إعادة تحميل البيانات
      fetchFlexiData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: error instanceof Error ? error.message : 'لم نتمكن من إضافة شبكة فليكسي جديدة'
      });
    } finally {
      setIsAddingFlexiNetwork(false);
    }
  };
  
  const handleAddCurrency = async () => {
    try {
      if (!newCurrency.name || !newCurrency.code) {
        throw new Error('يرجى إدخال اسم ورمز العملة');
      }
      
      // محاولة العثور على معرف المنظمة من أماكن مختلفة
      const organizationId = 
        user?.user_metadata?.organization_id || 
        (user as any)?.organization_id ||
        user?.app_metadata?.organization_id;
      
      // استخدام معرف المنظمة الذي وجدناه في AuthContext 
      const storedOrgId = localStorage.getItem('bazaar_organization_id');
      const finalOrgId = storedOrgId || organizationId;
      
      if (!finalOrgId) {
        console.error('لا يوجد معرف مؤسسة صالح');
        return;
      }

      await addDigitalCurrency({
        ...newCurrency,
        type: newCurrency.type as "currency" | "platform",
        exchange_rate: parseFloat(newCurrency.exchange_rate),
        organization_id: finalOrgId
      });
      
      toast({
        title: 'تمت الإضافة',
        description: 'تم إضافة عملة رقمية جديدة بنجاح'
      });
      
      // إعادة تعيين النموذج
      setNewCurrency({
        name: '',
        code: '',
        type: 'currency',
        icon: 'EuroIcon',
        exchange_rate: '1'
      });
      
      // إعادة تحميل البيانات
      fetchCurrencyData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: error instanceof Error ? error.message : 'لم نتمكن من إضافة عملة رقمية جديدة'
      });
    } finally {
      setIsAddingCurrency(false);
    }
  };
  
  const handleEditFlexiNetwork = (network: FlexiNetwork) => {
    setEditFlexiNetwork(network);
    setIsEditingFlexiNetwork(true);
  };
  
  const handleUpdateFlexiNetwork = async () => {
    if (!editFlexiNetwork) return;
    
    try {
      await updateFlexiNetwork(editFlexiNetwork.id, editFlexiNetwork);
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث شبكة الفليكسي بنجاح'
      });
      fetchFlexiData();
      setIsEditingFlexiNetwork(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: 'لم نتمكن من تحديث شبكة الفليكسي'
      });
    }
  };
  
  const handleDeleteFlexiNetwork = (id: string) => {
    setDeleteType('flexi');
    setDeleteId(id);
    setIsConfirmingDelete(true);
  };
  
  const handleEditCurrency = (currency: DigitalCurrency) => {
    setEditCurrency(currency);
    setIsEditingCurrency(true);
  };
  
  const handleUpdateCurrency = async () => {
    if (!editCurrency) return;
    
    try {
      await updateDigitalCurrency(editCurrency.id, editCurrency);
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث العملة الرقمية بنجاح'
      });
      fetchCurrencyData();
      setIsEditingCurrency(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: 'لم نتمكن من تحديث العملة الرقمية'
      });
    }
  };
  
  const handleDeleteCurrency = (id: string) => {
    setDeleteType('currency');
    setDeleteId(id);
    setIsConfirmingDelete(true);
  };
  
  const confirmDelete = async () => {
    if (!deleteId) return;
    
    try {
      if (deleteType === 'flexi') {
        await deleteFlexiNetwork(deleteId);
        toast({
          title: 'تم الحذف',
          description: 'تم حذف شبكة الفليكسي بنجاح'
        });
        fetchFlexiData();
      } else {
        await deleteDigitalCurrency(deleteId);
        toast({
          title: 'تم الحذف',
          description: 'تم حذف العملة الرقمية بنجاح'
        });
        fetchCurrencyData();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: `لم نتمكن من حذف ${deleteType === 'flexi' ? 'شبكة الفليكسي' : 'العملة الرقمية'}`
      });
    } finally {
      setIsConfirmingDelete(false);
      setDeleteId(null);
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">إدارة الفليكسي والعملات الرقمية</h1>
        
        <Tabs defaultValue="flexi" className="w-full">
          <TabsList className="w-full flex space-x-2 mb-6">
            <TabsTrigger value="flexi" className="flex-1">الفليكسي</TabsTrigger>
            <TabsTrigger value="currencies" className="flex-1">العملات الرقمية</TabsTrigger>
          </TabsList>
          
          <TabsContent value="flexi">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>أرصدة الفليكسي</CardTitle>
                    <CardDescription>إدارة أرصدة شبكات الفليكسي (جيزي، أوريدو، موبيليس)</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsAddingFlexiNetwork(true)}>
                      <PlusCircleIcon className="h-4 w-4 mr-2" />
                      إضافة شبكة جديدة
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchFlexiData} disabled={loadingFlexi}>
                      <RefreshCwIcon className={`h-4 w-4 mr-2 ${loadingFlexi ? 'animate-spin' : ''}`} />
                      تحديث
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingFlexi ? (
                  <div className="flex justify-center items-center h-32">
                    <RefreshCwIcon className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الشبكة</TableHead>
                        <TableHead>الرصيد (دج)</TableHead>
                        <TableHead>آخر تحديث</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flexiNetworks.map(network => {
                        const balance = flexiBalances.find(b => b.network_id === network.id);
                        
                        return (
                          <TableRow key={network.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <Phone className="mr-2 h-5 w-5" />
                                {network.name}
                              </div>
                            </TableCell>
                            <TableCell>{balance ? Number(balance.balance).toLocaleString() : 0} دج</TableCell>
                            <TableCell>
                              {balance
                                ? new Date(balance.updated_at).toLocaleString('ar-DZ')
                                : 'لم يتم التحديث'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openFlexiBalanceDialog(network.id)}
                                >
                                  <EditIcon className="h-4 w-4 mr-2" />
                                  تعديل الرصيد
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditFlexiNetwork(network)}
                                >
                                  <EditIcon className="h-4 w-4" />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => handleDeleteFlexiNetwork(network.id)}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="currencies">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>أرصدة العملات الرقمية</CardTitle>
                    <CardDescription>إدارة أرصدة العملات الرقمية والمنصات المالية (يورو، USDT، منصات الدفع)</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsAddingCurrency(true)}>
                      <PlusCircleIcon className="h-4 w-4 mr-2" />
                      إضافة عملة جديدة
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchCurrencyData} disabled={loadingCurrencies}>
                      <RefreshCwIcon className={`h-4 w-4 mr-2 ${loadingCurrencies ? 'animate-spin' : ''}`} />
                      تحديث
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingCurrencies ? (
                  <div className="flex justify-center items-center h-32">
                    <RefreshCwIcon className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>العملة / المنصة</TableHead>
                        <TableHead>الرمز</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>الرصيد</TableHead>
                        <TableHead>سعر الصرف (دج)</TableHead>
                        <TableHead>آخر تحديث</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {digitalCurrencies.map(currency => {
                        const balance = currencyBalances.find(b => b.currency_id === currency.id);
                        
                        return (
                          <TableRow key={currency.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <EuroIcon className="mr-2 h-5 w-5" />
                                {currency.name}
                              </div>
                            </TableCell>
                            <TableCell>{currency.code}</TableCell>
                            <TableCell>
                              {currency.type === 'currency' ? 'عملة' : 'منصة'}
                            </TableCell>
                            <TableCell>{balance ? Number(balance.balance).toLocaleString() : 0} {currency.code}</TableCell>
                            <TableCell>{currency.exchange_rate.toLocaleString()} دج</TableCell>
                            <TableCell>
                              {balance
                                ? new Date(balance.updated_at).toLocaleString('ar-DZ')
                                : 'لم يتم التحديث'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openCurrencyBalanceDialog(currency.id)}
                                >
                                  <EditIcon className="h-4 w-4 mr-2" />
                                  تعديل الرصيد
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditCurrency(currency)}
                                >
                                  <EditIcon className="h-4 w-4" />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => handleDeleteCurrency(currency.id)}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* نافذة تحديث رصيد الفليكسي */}
        <Dialog open={isUpdatingFlexi} onOpenChange={setIsUpdatingFlexi}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل رصيد الفليكسي</DialogTitle>
              <DialogDescription>
                {selectedFlexiNetwork && flexiNetworks.find(n => n.id === selectedFlexiNetwork)?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="balance">الرصيد الجديد (دج)</Label>
                <Input
                  id="balance"
                  type="number"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsUpdatingFlexi(false)}>إلغاء</Button>
              <Button onClick={handleFlexiBalanceUpdate}>تحديث الرصيد</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* نافذة تحديث رصيد العملة */}
        <Dialog open={isUpdatingCurrency} onOpenChange={setIsUpdatingCurrency}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل رصيد العملة</DialogTitle>
              <DialogDescription>
                {selectedCurrency && digitalCurrencies.find(c => c.id === selectedCurrency)?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="currency-balance">الرصيد الجديد</Label>
                <Input
                  id="currency-balance"
                  type="number"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsUpdatingCurrency(false)}>إلغاء</Button>
              <Button onClick={handleCurrencyBalanceUpdate}>تحديث الرصيد</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* نافذة إضافة شبكة فليكسي جديدة */}
        <Dialog open={isAddingFlexiNetwork} onOpenChange={setIsAddingFlexiNetwork}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة شبكة فليكسي جديدة</DialogTitle>
              <DialogDescription>
                أدخل معلومات شبكة الفليكسي الجديدة
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="network-name">اسم الشبكة *</Label>
                <Input
                  id="network-name"
                  value={newFlexiNetwork.name}
                  onChange={(e) => setNewFlexiNetwork(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: جيزي، أوريدو، موبيليس"
                />
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="network-description">وصف الشبكة</Label>
                <Input
                  id="network-description"
                  value={newFlexiNetwork.description}
                  onChange={(e) => setNewFlexiNetwork(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="وصف اختياري للشبكة"
                />
              </div>
            </div>
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsAddingFlexiNetwork(false)}>إلغاء</Button>
              <Button onClick={handleAddFlexiNetwork}>إضافة الشبكة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* نافذة إضافة عملة رقمية جديدة */}
        <Dialog open={isAddingCurrency} onOpenChange={setIsAddingCurrency}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة عملة رقمية جديدة</DialogTitle>
              <DialogDescription>
                أدخل معلومات العملة الرقمية أو المنصة المالية الجديدة
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="currency-name">اسم العملة / المنصة *</Label>
                <Input
                  id="currency-name"
                  value={newCurrency.name}
                  onChange={(e) => setNewCurrency(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: يورو، دولار، بايسيرا"
                />
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="currency-code">رمز العملة *</Label>
                <Input
                  id="currency-code"
                  value={newCurrency.code}
                  onChange={(e) => setNewCurrency(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="مثال: EUR, USD, PAYSR"
                />
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="currency-type">نوع العملة</Label>
                <Select 
                  value={newCurrency.type}
                  onValueChange={(value) => setNewCurrency(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="currency">عملة رقمية</SelectItem>
                    <SelectItem value="platform">منصة دفع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="currency-rate">سعر الصرف (دج)</Label>
                <Input
                  id="currency-rate"
                  type="number"
                  value={newCurrency.exchange_rate}
                  onChange={(e) => setNewCurrency(prev => ({ ...prev, exchange_rate: e.target.value }))}
                  placeholder="سعر الصرف مقابل الدينار الجزائري"
                />
              </div>
            </div>
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsAddingCurrency(false)}>إلغاء</Button>
              <Button onClick={handleAddCurrency}>إضافة العملة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* نافذة تأكيد الحذف */}
        <AlertDialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من عملية الحذف؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف {deleteType === 'flexi' ? 'شبكة الفليكسي' : 'العملة الرقمية'} بشكل نهائي.
                هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-row justify-end gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-red-500 hover:bg-red-600"
                onClick={confirmDelete}
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* نافذة تعديل شبكة الفليكسي */}
        <Dialog open={isEditingFlexiNetwork} onOpenChange={setIsEditingFlexiNetwork}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل شبكة الفليكسي</DialogTitle>
              <DialogDescription>
                قم بتعديل تفاصيل شبكة الفليكسي
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-flexi-name">اسم الشبكة</Label>
                <Input 
                  id="edit-flexi-name" 
                  value={editFlexiNetwork?.name || ''} 
                  onChange={e => setEditFlexiNetwork(prev => prev ? {...prev, name: e.target.value} : prev)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-flexi-description">الوصف</Label>
                <Input 
                  id="edit-flexi-description" 
                  value={editFlexiNetwork?.description || ''}
                  onChange={e => setEditFlexiNetwork(prev => prev ? {...prev, description: e.target.value} : prev)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-flexi-icon">الأيقونة</Label>
                <Select 
                  value={editFlexiNetwork?.icon || 'Phone'} 
                  onValueChange={value => setEditFlexiNetwork(prev => prev ? {...prev, icon: value} : prev)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الأيقونة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Phone">هاتف</SelectItem>
                    <SelectItem value="Globe">عالمي</SelectItem>
                    <SelectItem value="Wifi">واي فاي</SelectItem>
                    <SelectItem value="Signal">إشارة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-flexi-active">الحالة</Label>
                <Select 
                  value={editFlexiNetwork?.is_active ? 'true' : 'false'} 
                  onValueChange={value => setEditFlexiNetwork(prev => prev ? {...prev, is_active: value === 'true'} : prev)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">مفعل</SelectItem>
                    <SelectItem value="false">معطل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditingFlexiNetwork(false)}>إلغاء</Button>
              <Button onClick={handleUpdateFlexiNetwork}>حفظ التغييرات</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* نافذة تعديل العملة الرقمية */}
        <Dialog open={isEditingCurrency} onOpenChange={setIsEditingCurrency}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل العملة الرقمية</DialogTitle>
              <DialogDescription>
                قم بتعديل تفاصيل العملة الرقمية
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-currency-name">اسم العملة</Label>
                <Input 
                  id="edit-currency-name" 
                  value={editCurrency?.name || ''} 
                  onChange={e => setEditCurrency(prev => prev ? {...prev, name: e.target.value} : prev)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-currency-code">رمز العملة</Label>
                <Input 
                  id="edit-currency-code" 
                  value={editCurrency?.code || ''}
                  onChange={e => setEditCurrency(prev => prev ? {...prev, code: e.target.value} : prev)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-currency-type">النوع</Label>
                <Select 
                  value={editCurrency?.type || 'currency'} 
                  onValueChange={value => setEditCurrency(prev => prev ? {...prev, type: value as 'currency' | 'platform'} : prev)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="currency">عملة رقمية</SelectItem>
                    <SelectItem value="platform">منصة مالية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-currency-icon">الأيقونة</Label>
                <Select 
                  value={editCurrency?.icon || 'EuroIcon'} 
                  onValueChange={value => setEditCurrency(prev => prev ? {...prev, icon: value} : prev)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الأيقونة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EuroIcon">يورو</SelectItem>
                    <SelectItem value="DollarSign">دولار</SelectItem>
                    <SelectItem value="CreditCard">بطاقة ائتمان</SelectItem>
                    <SelectItem value="Landmark">بنك</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-currency-rate">سعر الصرف</Label>
                <Input 
                  id="edit-currency-rate" 
                  type="number"
                  value={editCurrency?.exchange_rate || 1} 
                  onChange={e => setEditCurrency(prev => prev ? {...prev, exchange_rate: parseFloat(e.target.value)} : prev)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-currency-active">الحالة</Label>
                <Select 
                  value={editCurrency?.is_active ? 'true' : 'false'} 
                  onValueChange={value => setEditCurrency(prev => prev ? {...prev, is_active: value === 'true'} : prev)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">مفعل</SelectItem>
                    <SelectItem value="false">معطل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditingCurrency(false)}>إلغاء</Button>
              <Button onClick={handleUpdateCurrency}>حفظ التغييرات</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
