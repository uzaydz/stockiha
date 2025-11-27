import { useMemo } from 'react';
import { Customer, CustomerFilter, CustomerStats } from '@/types/customer';

export function useCustomerFiltering(dataSource: Customer[], searchQuery: string, filter: CustomerFilter, activeTab: string) {
  const filtered = useMemo(() => {
    let result = [...dataSource];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (!!c.phone && c.phone.includes(searchQuery))
      ));
    }

    if (filter.hasPhone) {
      result = result.filter(c => !!c.phone);
    }
    if (filter.hasEmail) {
      result = result.filter(c => !!c.email);
    }

    if (activeTab === 'new' || filter.newOnly) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      result = result.filter(c => new Date(c.created_at) >= thirtyDaysAgo);
    }

    if (filter.sortBy && filter.sortOrder) {
      result.sort((a, b) => {
        let cmp = 0;
        if (filter.sortBy === 'name') cmp = a.name.localeCompare(b.name);
        else if (filter.sortBy === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        else if (filter.sortBy === 'orders_count') cmp = ((a as any).orders_count || 0) - ((b as any).orders_count || 0);
        else if (filter.sortBy === 'total_spent') cmp = ((a as any).total_spent || 0) - ((b as any).total_spent || 0);
        return filter.sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [dataSource, searchQuery, filter, activeTab]);

  const stats: CustomerStats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const newLast30Days = filtered.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length;
    return {
      total: filtered.length,
      newLast30Days,
      activeLast30Days: newLast30Days,
    };
  }, [filtered]);

  return { filtered, stats };
}
