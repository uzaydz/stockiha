import { useState, useEffect, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import { SubscriptionServicesAPI } from './api';
import { 
  SubscriptionService, 
  SubscriptionServiceCategory, 
  SubscriptionTransaction,
  ServiceStats,
  TransactionStats 
} from './types';

// مسح cache للفئات القديمة
const clearOldSubscriptionCache = () => {
  const keysToRemove = [
    'subscription_services_cache',
    'subscription_categories_cache', 
    'subscription_transactions_cache',
    'subscription_stats_cache'
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
};

export const useSubscriptionServices = (organizationId: string | undefined) => {
  // مسح cache عند التحميل الأولي
  useEffect(() => {
    clearOldSubscriptionCache();
  }, []);

  // Services state
  const [services, setServices] = useState<SubscriptionService[]>([]);
  const [categories, setCategories] = useState<SubscriptionServiceCategory[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStats | null>(null);
  const [servicesLoading, setServicesLoading] = useState(true);

  // Transactions state
  const [transactions, setTransactions] = useState<SubscriptionTransaction[]>([]);
  const [transactionStats, setTransactionStats] = useState<TransactionStats | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Filters state
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedServiceStatus, setSelectedServiceStatus] = useState<string>('all');
  
  const [transactionSearchTerm, setTransactionSearchTerm] = useState('');
  const [selectedTransactionStatus, setSelectedTransactionStatus] = useState<string>('all');
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>('all');

  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeTab, setActiveTab] = useState<'services' | 'transactions'>('services');

  // Fetch categories
  const fetchCategories = async () => {
    if (!organizationId) return;
    
    try {
      const data = await SubscriptionServicesAPI.fetchCategories(organizationId);
      setCategories(data);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب فئات الخدمات",
        variant: "destructive",
      });
    }
  };

  // Fetch services
  const fetchServices = async () => {
    if (!organizationId) return;
    
    try {
      setServicesLoading(true);
      const data = await SubscriptionServicesAPI.fetchServices(organizationId);
      setServices(data);
      
      // Calculate stats
      const stats = SubscriptionServicesAPI.calculateServiceStats(data);
      setServiceStats(stats);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب خدمات الاشتراكات",
        variant: "destructive",
      });
    } finally {
      setServicesLoading(false);
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!organizationId) return;
    
    try {
      setTransactionsLoading(true);
      const data = await SubscriptionServicesAPI.fetchTransactions(organizationId);
      setTransactions(data);
      
      // Calculate stats
      const stats = SubscriptionServicesAPI.calculateTransactionStats(data);
      setTransactionStats(stats);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب معاملات الاشتراكات",
        variant: "destructive",
      });
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Filter services
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = service.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
                           service.provider.toLowerCase().includes(serviceSearchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || service.category_id === selectedCategory;
      const matchesStatus = selectedServiceStatus === 'all' || 
                           (selectedServiceStatus === 'active' && service.is_active) ||
                           (selectedServiceStatus === 'inactive' && !service.is_active);
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [services, serviceSearchTerm, selectedCategory, selectedServiceStatus]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = 
        transaction.service_name?.toLowerCase().includes(transactionSearchTerm.toLowerCase()) ||
        transaction.customer_name?.toLowerCase().includes(transactionSearchTerm.toLowerCase()) ||
        transaction.provider?.toLowerCase().includes(transactionSearchTerm.toLowerCase());
      
      const matchesStatus = selectedTransactionStatus === 'all' || transaction.payment_status === selectedTransactionStatus;
      const matchesType = selectedTransactionType === 'all' || transaction.transaction_type === selectedTransactionType;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [transactions, transactionSearchTerm, selectedTransactionStatus, selectedTransactionType]);

  // Initial data fetch
  useEffect(() => {
    if (organizationId) {
      fetchCategories();
      fetchServices();
    }
  }, [organizationId]);

  // Fetch transactions when switching to transactions tab
  useEffect(() => {
    if (organizationId && activeTab === 'transactions' && transactions.length === 0) {
      fetchTransactions();
    }
  }, [organizationId, activeTab]);

  return {
    // Services
    services: filteredServices,
    categories,
    serviceStats,
    servicesLoading,
    
    // Transactions
    transactions: filteredTransactions,
    transactionStats,
    transactionsLoading,
    
    // Filters
    serviceSearchTerm,
    setServiceSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectedServiceStatus,
    setSelectedServiceStatus,
    
    transactionSearchTerm,
    setTransactionSearchTerm,
    selectedTransactionStatus,
    setSelectedTransactionStatus,
    selectedTransactionType,
    setSelectedTransactionType,
    
    // UI
    viewMode,
    setViewMode,
    activeTab,
    setActiveTab,
    
    // Actions
    fetchServices,
    fetchTransactions,
    refetchAll: () => {
      fetchServices();
      fetchTransactions();
    }
  };
};
