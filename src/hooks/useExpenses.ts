import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useExpenseCategories } from '@/context/AppInitializationContext';
import { 
  Expense, 
  ExpenseWithRecurring, 
  ExpenseCategory, 
  ExpenseFormData, 
  ExpenseCategoryFormData,
  ExpenseFilters,
  ExpenseSummary,
  RecurringFrequency
} from '../types/expenses';

export const useExpenses = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [expenses, setExpenses] = useState<ExpenseWithRecurring[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ استخدام expense_categories من AppInitializationContext
  const cachedExpenseCategories = useExpenseCategories();

  const supabase = getSupabaseClient();

  // Get all expenses with pagination and filters
  const getExpenses = async (
    page = 1, 
    pageSize = 10, 
    filters: ExpenseFilters = {}
  ): Promise<{ data: ExpenseWithRecurring[], count: number }> => {
    try {
      // Obtenemos el ID de la organización actual desde localStorage
      const organizationId = localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id');
      
      let query = supabase
        .from('expenses')
        .select(`
          *,
          recurring:recurring_expenses(*)
        `, { count: 'exact' });
      
      // Añadimos el filtro por organization_id
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      
      // Apply filters
      if (filters.startDate) {
        query = query.gte('expense_date', filters.startDate.toISOString().split('T')[0]);
      }
      
      if (filters.endDate) {
        query = query.lte('expense_date', filters.endDate.toISOString().split('T')[0]);
      }
      
      if (filters.categories && filters.categories.length > 0) {
        query = query.in('category', filters.categories);
      }
      
      if (filters.minAmount !== undefined) {
        query = query.gte('amount', filters.minAmount);
      }
      
      if (filters.maxAmount !== undefined) {
        query = query.lte('amount', filters.maxAmount);
      }
      
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      
      if (filters.isRecurring !== undefined) {
        query = query.eq('is_recurring', filters.isRecurring);
      }
      
      if (filters.searchTerm) {
        query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
      }
      
      // Apply pagination
      const { from, to } = getPaginationRange(page, pageSize);
      query = query.range(from, to).order('expense_date', { ascending: false });
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // إذا كانت البيانات متوفرة، احصل على أسماء الفئات لعرضها بدلاً من المعرف
      let processedData = data || [];
      
      // جمع كل معرفات الفئات من المصروفات
      const categoryIds = processedData
        .map(expense => expense.category)
        .filter(id => id); // استبعاد القيم الفارغة

      if (categoryIds.length > 0) {
        // استعلام عن جميع الفئات المطلوبة دفعة واحدة
        const { data: categoriesData } = await supabase
          .from('expense_categories')
          .select('id, name')
          .in('id', categoryIds);

        // إنشاء قاموس للفئات للوصول السريع باستخدام المعرف
        const categoriesMap = new Map();
        if (categoriesData) {
          categoriesData.forEach(cat => {
            categoriesMap.set(cat.id, cat.name);
          });
        }

        // تحديث بيانات المصروفات باسم الفئة
        processedData = processedData.map(expense => ({
          ...expense,
          category: expense.category && categoriesMap.has(expense.category)
            ? categoriesMap.get(expense.category)
            : 'غير مصنف'
        }));
      }
      
      return { 
        data: processedData as ExpenseWithRecurring[], 
        count: count || 0 
      };
    } catch (error) {
      throw error;
    }
  };

  // Get expense by ID
  const getExpenseById = async (id: string): Promise<ExpenseWithRecurring> => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          recurring:recurring_expenses(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return data as ExpenseWithRecurring;
    } catch (error) {
      throw error;
    }
  };

  // Create a new expense
  const createExpense = async (
    expenseData: ExpenseFormData
  ): Promise<Expense> => {
    try {
      // Obtenemos el ID de la organización desde localStorage con fallback
      const organizationId = localStorage.getItem('currentOrganizationId') || 
                             localStorage.getItem('bazaar_organization_id') || 
                             '11111111-1111-1111-1111-111111111111';
      
      // Create the expense with explicit organization_id
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          title: expenseData.title,
          amount: expenseData.amount,
          expense_date: expenseData.expense_date,
          description: expenseData.notes,
          category: expenseData.category,
          payment_method: 'cash', // قيمة افتراضية لطريقة الدفع
          status: expenseData.status,
          is_recurring: expenseData.is_recurring,
          organization_id: organizationId // Usamos el ID de organización obtenido
        })
        .select()
        .single();
      
      if (expenseError) throw expenseError;
      
      // If this is a recurring expense, create the recurring configuration
      if (expenseData.recurring && expense) {
        const { frequency, start_date, day_of_month, day_of_week } = expenseData.recurring;
        
        // Calculate next due date based on frequency
        let nextDue = new Date(start_date);
        
        const { error: recurringError } = await supabase
          .from('recurring_expenses')
          .insert({
            expense_id: expense.id,
            frequency,
            start_date,
            next_due: nextDue.toISOString(),
            day_of_month,
            day_of_week,
            status: 'active'
          });
        
        if (recurringError) throw recurringError;
      }
      
      return expense as Expense;
    } catch (error) {
      throw error;
    }
  };

  // Update an existing expense
  const updateExpense = async (
    id: string,
    expenseData: ExpenseFormData
  ): Promise<Expense> => {
    try {
      // Obtenemos el ID de la organización desde localStorage con fallback
      const organizationId = localStorage.getItem('currentOrganizationId') || 
                             localStorage.getItem('bazaar_organization_id') || 
                             '11111111-1111-1111-1111-111111111111';
      
      // Update the expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .update({
          title: expenseData.title,
          amount: expenseData.amount,
          expense_date: expenseData.expense_date,
          description: expenseData.notes,
          category: expenseData.category,
          payment_method: 'cash', // قيمة افتراضية لطريقة الدفع
          is_recurring: !!expenseData.recurring,
          status: expenseData.status,
          organization_id: organizationId, // Usamos el ID de organización obtenido
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (expenseError) throw expenseError;
      
      // Handle recurring configuration
      if (expenseData.recurring) {
        const { frequency, start_date, end_date, day_of_month, day_of_week } = expenseData.recurring;
        
        // Check if recurring config already exists
        const { data: existingRecurring } = await supabase
          .from('recurring_expenses')
          .select('*')
          .eq('expense_id', id)
          .maybeSingle();
        
        if (existingRecurring) {
          // Update existing recurring config
          const { error: recurringError } = await supabase
            .from('recurring_expenses')
            .update({
              frequency,
              start_date,
              end_date,
              day_of_month,
              day_of_week,
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('expense_id', id);
          
          if (recurringError) throw recurringError;
        } else {
          // Create new recurring config
          let nextDue = new Date(start_date);
          
          const { error: recurringError } = await supabase
            .from('recurring_expenses')
            .insert({
              expense_id: id,
              frequency,
              start_date,
              end_date,
              next_due: nextDue.toISOString(),
              day_of_month,
              day_of_week,
              status: 'active',
            });
          
          if (recurringError) throw recurringError;
        }
      } else {
        // Remove recurring configuration if it exists
        const { error: deleteError } = await supabase
          .from('recurring_expenses')
          .delete()
          .eq('expense_id', id);
        
        if (deleteError) throw deleteError;
      }
      
      return expense as Expense;
    } catch (error) {
      throw error;
    }
  };

  // Delete an expense
  const deleteExpense = async (id: string): Promise<void> => {
    try {
      // Delete recurring configuration first (if exists)
      await supabase
        .from('recurring_expenses')
        .delete()
        .eq('expense_id', id);
      
      // Then delete the expense
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  // ✅ Get all expense categories - استخدام البيانات من AppInitializationContext
  const getExpenseCategories = async (): Promise<ExpenseCategory[]> => {
    try {
      // استخدام البيانات المحفوظة من AppInitializationContext
      if (cachedExpenseCategories && cachedExpenseCategories.length > 0) {
        console.log('✅ [useExpenses] استخدام expense_categories من AppInitializationContext');
        return cachedExpenseCategories as ExpenseCategory[];
      }
      
      // Fallback: جلب من قاعدة البيانات إذا لم تكن متوفرة في Context
      console.log('⚠️ [useExpenses] fallback - جلب expense_categories من قاعدة البيانات');
      const organizationId = localStorage.getItem('currentOrganizationId') || 
                             localStorage.getItem('bazaar_organization_id') || 
                             '11111111-1111-1111-1111-111111111111';
      
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');
      
      if (error) throw error;
      
      const uniqueCategories = data ? Array.from(
        new Map(data.map(item => [item.id, item])).values()
      ) : [];
      
      return uniqueCategories as ExpenseCategory[];
    } catch (error) {
      throw error;
    }
  };

  // Create a new expense category
  const createExpenseCategory = async (
    categoryData: ExpenseCategoryFormData
  ): Promise<ExpenseCategory> => {
    try {
      // Obtenemos el ID de la organización desde localStorage con fallback
      const organizationId = localStorage.getItem('currentOrganizationId') || 
                             localStorage.getItem('bazaar_organization_id') || 
                             '11111111-1111-1111-1111-111111111111';
      
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({
          name: categoryData.name,
          description: categoryData.description,
          organization_id: organizationId // Usamos el ID de organización obtenido
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return data as ExpenseCategory;
    } catch (error) {
      throw error;
    }
  };

  // Update an expense category
  const updateExpenseCategory = async (
    id: string,
    categoryData: ExpenseCategoryFormData
  ): Promise<ExpenseCategory> => {
    try {
      // Obtenemos el ID de la organización desde localStorage con fallback
      const organizationId = localStorage.getItem('currentOrganizationId') || 
                            localStorage.getItem('bazaar_organization_id') || 
                            '11111111-1111-1111-1111-111111111111';
      
      const { data, error } = await supabase
        .from('expense_categories')
        .update({
          name: categoryData.name,
          description: categoryData.description,
          organization_id: organizationId, // Aseguramos que se mantenga la organización correcta
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return data as ExpenseCategory;
    } catch (error) {
      throw error;
    }
  };

  // Delete an expense category
  const deleteExpenseCategory = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  // Get expense summary for dashboard
  const getExpenseSummary = async (): Promise<ExpenseSummary> => {
    try {
      // Obtenemos el ID de la organización desde localStorage con fallback
      const organizationId = localStorage.getItem('currentOrganizationId') || 
                            localStorage.getItem('bazaar_organization_id') || 
                            '11111111-1111-1111-1111-111111111111';
      
      // Obtener fecha del primer día del mes actual
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      // Obtener fecha de hoy
      const today = new Date();
      
      // Obtener fecha dentro de 7 días para gastos próximos
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      
      // Get total expenses for current month
      const { data: currentMonthData, error: currentMonthError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('organization_id', organizationId)
        .gte('expense_date', startOfMonth.toISOString())
        .lte('expense_date', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString());
      
      if (currentMonthError) throw currentMonthError;
      
      const totalCurrentMonth = currentMonthData.reduce((sum, item) => sum + Number(item.amount), 0);
      
      // Get total expenses for last 12 months (for historical data)
      const { data: totalData, error: totalError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('organization_id', organizationId)
        .gte('expense_date', new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString());
      
      if (totalError) throw totalError;
      
      const total = totalData.reduce((sum, item) => sum + Number(item.amount), 0);

      // Get active recurring expenses
      const { data: recurringData, error: recurringError } = await supabase
        .from('recurring_expenses')
        .select(`
          *,
          expense:expenses(amount)
        `)
        .eq('status', 'active');
      
      if (recurringError) throw recurringError;
      
      // Filter recurringData manually to only include those related to the current organization
      const filteredRecurringData = recurringData.filter(item => {
        // Get the expense object
        const expense = item.expense as any;
        // Check if expense exists and has the correct organization_id
        return expense && expense.organization_id === organizationId;
      });
      
      // Calculate total monthly recurring expenses using filtered data
      const recurringTotal = filteredRecurringData.reduce((sum, item) => {
        const expenseAmount = Number((item.expense as any)?.amount || 0);
        return sum + expenseAmount;
      }, 0);
      
      const recurringCount = filteredRecurringData.length;
      
      // Get upcoming expenses for next 7 days
      const { data: upcomingWeekData, error: upcomingWeekError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('organization_id', organizationId)
        .gte('expense_date', today.toISOString())
        .lte('expense_date', nextWeek.toISOString());
      
      if (upcomingWeekError) throw upcomingWeekError;
      
      const upcomingTotal = upcomingWeekData.reduce((sum, item) => sum + Number(item.amount), 0);
      const upcomingCount = upcomingWeekData.length;
      
      // Get expenses by category
      const { data: categoryData, error: categoryError } = await supabase
        .from('expenses')
        .select('category, amount')
        .eq('organization_id', organizationId)
        .gte('expense_date', startOfMonth.toISOString())
        .lte('expense_date', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString());
      
      if (categoryError) throw categoryError;
      
      // Obtener todas las categorías para mapear IDs a nombres
      const { data: allCategories, error: categoriesError } = await supabase
        .from('expense_categories')
        .select('id, name')
        .eq('organization_id', organizationId);
        
      if (categoriesError) throw categoriesError;
      
      // Crear un mapa de IDs a nombres de categoría
      const categoryMap = new Map<string, string>();
      if (allCategories) {
        allCategories.forEach(cat => {
          categoryMap.set(cat.id, cat.name);
        });
      }
      
      // Procesar los gastos por categoría con nombres en lugar de IDs
      const byCategory: { [category: string]: number } = {};
      const categories: { [category: string]: number } = {};
      
      categoryData.forEach(item => {
        const categoryId = item.category;
        const categoryName = categoryMap.has(categoryId) ? categoryMap.get(categoryId)! : 'غير مصنف';
        byCategory[categoryName] = (byCategory[categoryName] || 0) + Number(item.amount);
        categories[categoryName] = (categories[categoryName] || 0) + Number(item.amount);
      });
      
      // Get expenses by month
      const { data: monthData, error: monthError } = await supabase
        .from('expenses')
        .select('expense_date, amount')
        .eq('organization_id', organizationId)
        .gte('expense_date', new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString());
      
      if (monthError) throw monthError;
      
      const byMonth: { [month: string]: number } = {};
      monthData.forEach(item => {
        const month = new Date(item.expense_date).toISOString().slice(0, 7); // YYYY-MM format
        byMonth[month] = (byMonth[month] || 0) + Number(item.amount);
      });
      
      // Get recent expenses
      const { data: recentData, error: recentError } = await supabase
        .from('expenses')
        .select(`
          *,
          recurring:recurring_expenses(*)
        `)
        .eq('organization_id', organizationId)
        .order('expense_date', { ascending: false })
        .limit(5);
      
      if (recentError) throw recentError;
      
      // Procesar los gastos recientes para reemplazar IDs con nombres de categoría
      const processedRecentData = recentData ? recentData.map(expense => ({
        ...expense,
        category: categoryMap.has(expense.category) ? categoryMap.get(expense.category)! : 'غير مصنف'
      })) : [];
      
      // Get upcoming recurring expenses
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('recurring_expenses')
        .select(`
          *,
          expense:expenses(*)
        `)
        .eq('status', 'active')
        .gte('next_due', new Date().toISOString())
        .order('next_due')
        .limit(10);  // Increased limit to account for filtering
      
      if (upcomingError) throw upcomingError;
      
      // Filter upcomingData to only include those related to the current organization
      const filteredUpcomingData = upcomingData.filter(item => {
        // Get the expense object
        const expense = item.expense as Expense;
        // Check if expense exists and has the correct organization_id
        return expense && expense.organization_id === organizationId;
      }).slice(0, 5); // Limit to first 5 after filtering
      
      // Reformat upcoming expenses to match ExpenseWithRecurring format
      const upcomingExpenses: ExpenseWithRecurring[] = filteredUpcomingData.map(item => {
        const expense = item.expense as Expense;
        return {
          ...expense,
          // Reemplazar el ID de categoría con el nombre de la categoría
          category: categoryMap.has(expense.category) ? categoryMap.get(expense.category)! : 'غير مصنف',
          recurring: {
            id: item.id,
            expense_id: item.expense_id,
            frequency: item.frequency,
            start_date: item.start_date,
            end_date: item.end_date,
            next_due: item.next_due,
            created_at: item.created_at,
          },
        };
      });
      
      // Calcular el cambio porcentual del mes anterior
      // Obtener el mes anterior
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
      
      const { data: lastMonthData, error: lastMonthError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('organization_id', organizationId)
        .gte('expense_date', startOfLastMonth.toISOString())
        .lte('expense_date', endOfLastMonth.toISOString());
      
      if (lastMonthError) throw lastMonthError;
      
      const totalLastMonth = lastMonthData.reduce((sum, item) => sum + Number(item.amount), 0);
      
      let previousMonthChange = 0;
      if (totalLastMonth > 0) {
        previousMonthChange = Math.round(((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100);
      }
      
      return {
        total_expenses: totalCurrentMonth,
        previous_month_change: previousMonthChange,
        recurring_expenses: recurringTotal,
        recurring_count: recurringCount,
        upcoming_total: upcomingTotal,
        upcoming_count: upcomingCount,
        by_category: byCategory,
        by_month: byMonth,
        categories,
        recent_expenses: processedRecentData as ExpenseWithRecurring[],
        upcoming_expenses: upcomingExpenses,
      };
    } catch (error) {
      throw error;
    }
  };

  // React Query hooks
  const useExpensesQuery = (page = 1, pageSize = 10) => {
    return useQuery({
      queryKey: ['expenses', page, pageSize, filters],
      queryFn: () => getExpenses(page, pageSize, filters),
    });
  };

  const useExpenseByIdQuery = (id: string) => {
    return useQuery({
      queryKey: ['expense', id],
      queryFn: () => getExpenseById(id),
      enabled: !!id,
    });
  };

  const useExpenseCategoriesQuery = () => {
    return useQuery({
      queryKey: ['expenseCategories'],
      queryFn: getExpenseCategories,
    });
  };

  const useExpenseSummaryQuery = () => {
    return useQuery({
      queryKey: ['expenseSummary'],
      queryFn: getExpenseSummary,
    });
  };

  const useCreateExpenseMutation = () => {
    return useMutation({
      mutationFn: createExpense,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['expenseSummary'] });
      },
    });
  };

  const useUpdateExpenseMutation = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: ExpenseFormData }) => 
        updateExpense(id, data),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['expense', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['expenseSummary'] });
      },
    });
  };

  const useDeleteExpenseMutation = () => {
    return useMutation({
      mutationFn: deleteExpense,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['expenseSummary'] });
      },
    });
  };

  const useCreateExpenseCategoryMutation = () => {
    return useMutation({
      mutationFn: createExpenseCategory,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      },
    });
  };

  const useUpdateExpenseCategoryMutation = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: ExpenseCategoryFormData }) => 
        updateExpenseCategory(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      },
    });
  };

  const useDeleteExpenseCategoryMutation = () => {
    return useMutation({
      mutationFn: deleteExpenseCategory,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      },
    });
  };

  return {
    filters,
    setFilters,
    useExpensesQuery,
    useExpenseByIdQuery,
    useExpenseCategoriesQuery,
    useExpenseSummaryQuery,
    useCreateExpenseMutation,
    useUpdateExpenseMutation,
    useDeleteExpenseMutation,
    useCreateExpenseCategoryMutation,
    useUpdateExpenseCategoryMutation,
    useDeleteExpenseCategoryMutation,
  };
};

// Helper functions

function getPaginationRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}

function calculateNextDueDate(baseDate: Date, frequency: RecurringFrequency): string {
  const nextDate = new Date(baseDate);
  
  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'bi_weekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1);
  }
  
  return nextDate.toISOString().split('T')[0];
}
