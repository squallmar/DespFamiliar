import { useState, useEffect, useCallback } from 'react';
import { Category, Expense, AlertItem } from '@/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/categories`, { credentials: 'include' });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch categories');
      }
      
      setCategories(data.categories);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (categoryData: Omit<Category, 'id'>) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...categoryData })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create category');
      }
      
      setCategories(prev => [...prev, data.category]);
      return data.category;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  return { categories, loading, error, createCategory, refetch: fetchCategories };
}


export function useExpenses(year?: number, month?: number) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async (y = year, m = month) => {
    try {
      setLoading(true);
      let url = `/api/expenses`;
      if (y && m) {
        url += `?year=${y}&month=${m}`;
      }
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch expenses');
      }
      setExpenses(data.expenses);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchExpenses(year, month);
  }, [fetchExpenses, year, month]);

  type CreateExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'userId' | 'date'> & { date: string | Date };
  const createExpense = async (expenseData: CreateExpenseInput) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...expenseData })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create expense');
      }
      
      setExpenses(prev => [data.expense, ...prev]);
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:data-changed'));
        }
      } catch (err) {
        console.error('Error dispatching data-changed event:', err);
      }
      return data.expense;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  type UpdateExpenseInput = Partial<Omit<Expense, 'date'>> & { date?: string | Date };
  const updateExpense = async (id: string, expenseData: UpdateExpenseInput) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, ...expenseData })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update expense');
      }
      
      setExpenses(prev => prev.map(exp => exp.id === id ? data.expense : exp));
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:data-changed'));
        }
      } catch (err) {
        console.error('Error dispatching data-changed event:', err);
      }
      return data.expense;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const response = await fetch(`/api/expenses?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete expense');
      }
      
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:data-changed'));
        }
      } catch (err) {
        console.error('Error dispatching data-changed event:', err);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  return { 
    expenses, 
    loading, 
    error, 
    createExpense, 
    updateExpense, 
    deleteExpense, 
    refetch: fetchExpenses 
  };
}

interface StatsData {
  totalThisMonth: number;
  totalLastMonth: number;
  percentageChange: number;
  dailyAverage: number;
  projectedMonthlyTotal: number;
  categoryStats: Array<{
    id: string;
    name: string;
    color: string;
    icon: string;
    total: number;
    count: number;
  }>;
  recentExpenses: Expense[];
  topCategories: Array<{
    categoryId: string;
    name: string;
    amount: number;
    percentage: number;
    color: string;
    icon: string;
  }>;
}

export function useStats(year?: number, month?: number) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (year) params.append('year', year.toString());
      if (month) params.append('month', month.toString());
      
      const url = `/api/stats${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats');
      }
      
      // Normalizar valores retornados pela API para evitar campos undefined/null
      const defaults: StatsData = {
        totalThisMonth: 0,
        totalLastMonth: 0,
        percentageChange: 0,
        dailyAverage: 0,
        projectedMonthlyTotal: 0,
        categoryStats: [],
        recentExpenses: [],
        topCategories: []
      };

      setStats({ ...defaults, ...data });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/alerts', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao buscar alertas');
      }
      setAlerts(data.alerts || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { alerts, loading, error, refetch: fetchAlerts };
}