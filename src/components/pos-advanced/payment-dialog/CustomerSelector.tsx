import React, { useMemo } from 'react';
import { User as AppUser } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, UserPlus, Phone, User, Check, X } from 'lucide-react';

interface CustomerSelectorProps {
  customers: AppUser[];
  selectedCustomerId: string;
  onSelectCustomer: (customerId: string) => void;
  onOpenCreateForm: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showList: boolean;
  onToggleList: (show: boolean) => void;
  isPartialPayment?: boolean;
  considerRemainingAsPartial?: boolean;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onOpenCreateForm,
  searchQuery,
  onSearchChange,
  showList,
  onToggleList,
  isPartialPayment,
  considerRemainingAsPartial
}) => {
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    
    const query = searchQuery.toLowerCase().trim();
    return customers.filter(customer => 
      customer.name?.toLowerCase().includes(query) ||
      customer.phone?.includes(query) ||
      customer.email?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2 text-sm">
          <User className="h-4 w-4" />
          العميل {isPartialPayment && considerRemainingAsPartial && <span className="text-red-500">*</span>}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenCreateForm}
          className="h-8 px-2 text-xs"
        >
          <UserPlus className="h-3 w-3 mr-1" />
          جديد
        </Button>
      </div>

      <div className="space-y-2">
        {/* العميل المحدد حالياً */}
        <div 
          className="flex items-center justify-between p-2 border rounded-lg cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/20"
          onClick={() => onToggleList(true)}
        >
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium text-sm">
                {selectedCustomerId === 'anonymous' ? 'عميل مجهول' : selectedCustomer?.name || 'اختر عميل'}
              </div>
              {selectedCustomer?.phone && (
                <div className="text-xs text-muted-foreground flex items-center">
                  <Phone className="h-3 w-3 mr-1" />
                  {selectedCustomer.phone}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {selectedCustomerId !== 'anonymous' && selectedCustomer && (
              <Check className="h-4 w-4 text-green-600" />
            )}
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* قائمة البحث والاختيار */}
        {showList && (
          <div className="border rounded-lg bg-background dark:bg-muted/5 max-h-60 overflow-hidden">
            {/* شريط البحث */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
                <Input
                  placeholder="ابحث بالاسم أو الهاتف..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pr-8 h-8 text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* قائمة العملاء */}
            <div className="max-h-48 overflow-y-auto">
              <div className="p-1">
                {/* عميل مجهول */}
                <div
                  className={cn(
                    "flex items-center p-2 rounded cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/20",
                    selectedCustomerId === 'anonymous' && "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
                  )}
                  onClick={() => {
                    onSelectCustomer('anonymous');
                    onToggleList(false);
                  }}
                >
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">عميل مجهول</span>
                  {selectedCustomerId === 'anonymous' && (
                    <Check className="h-3 w-3 mr-auto text-green-600" />
                  )}
                </div>

                {/* العملاء المفلترين */}
                {filteredCustomers.map(customer => (
                  <div
                    key={customer.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/20",
                      selectedCustomerId === customer.id && "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
                    )}
                    onClick={() => {
                      onSelectCustomer(customer.id);
                      onToggleList(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{customer.name}</div>
                        {customer.phone && (
                          <div className="text-xs text-muted-foreground flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedCustomerId === customer.id && (
                      <Check className="h-3 w-3 text-green-600" />
                    )}
                  </div>
                ))}

                {/* لا توجد نتائج */}
                {searchQuery && filteredCustomers.length === 0 && (
                  <div className="p-2 text-center">
                    <p className="text-muted-foreground text-sm mb-2">
                      لم يتم العثور على عميل
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onOpenCreateForm}
                      className="w-full h-8"
                    >
                      <UserPlus className="h-3 w-3 mr-2" />
                      إنشاء "{searchQuery}"
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* زر إغلاق */}
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleList(false)}
                className="w-full h-8"
              >
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
