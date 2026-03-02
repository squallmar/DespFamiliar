import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

export interface CategoryComparison {
  category: string;
  current: number;
  userAverage: number;
  nationalAverage?: number;
  variance: number; // percentual vs user average
  comparison: 'below' | 'average' | 'above';
}

export function useCategoryComparison(month: string) {
  const { user } = useAuth();

  const { data, error, isLoading } = useSWR(
    user ? `/api/stats/comparison?month=${month}` : null,
    async (url) => {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load comparison');
      return res.json();
    }
  );

  return {
    comparisons: (data?.comparisons || []) as CategoryComparison[],
    isLoading,
    error,
  };
}

export function useExpenseInsights() {
  const { user } = useAuth();

  const { data, error, isLoading } = useSWR(
    user ? '/api/insights' : null,
    async (url) => {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load insights');
      return res.json();
    }
  );

  return {
    insights: data?.insights || [],
    isLoading,
    error,
  };
}
