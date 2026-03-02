import useSWR from 'swr';
import { useCallback } from 'react';

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  icon?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export function useGoals() {
  const { data: goals = [], error, isLoading, mutate } = useSWR<FinancialGoal[]>(
    '/api/goals',
    (url) => fetch(url, { credentials: 'include' }).then((r) => r.json()),
    { revalidateOnFocus: false }
  );

  const createGoal = useCallback(
    async (goalData: Omit<FinancialGoal, 'id' | 'currentAmount' | 'createdAt' | 'updatedAt'>) => {
      try {
        const res = await fetch('/api/goals', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...goalData,
            currentAmount: 0,
          }),
        });

        if (!res.ok) throw new Error('Failed to create goal');

        const newGoal = await res.json();
        mutate([...goals, newGoal], false);
        return newGoal;
      } catch (err) {
        console.error('Error creating goal:', err);
        throw err;
      }
    },
    [goals, mutate]
  );

  const updateGoal = useCallback(
    async (goalId: string, updates: Partial<Omit<FinancialGoal, 'id'>>) => {
      try {
        const res = await fetch(`/api/goals/${goalId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!res.ok) throw new Error('Failed to update goal');

        const updatedGoal = await res.json();
        mutate(
          goals.map((g) => (g.id === goalId ? updatedGoal : g)),
          false
        );
        return updatedGoal;
      } catch (err) {
        console.error('Error updating goal:', err);
        throw err;
      }
    },
    [goals, mutate]
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      try {
        const res = await fetch(`/api/goals/${goalId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!res.ok) throw new Error('Failed to delete goal');

        mutate(
          goals.filter((g) => g.id !== goalId),
          false
        );
      } catch (err) {
        console.error('Error deleting goal:', err);
        throw err;
      }
    },
    [goals, mutate]
  );

  const addToGoal = useCallback(
    async (goalId: string, amount: number) => {
      try {
        const goal = goals.find((g) => g.id === goalId);
        if (!goal) throw new Error('Goal not found');

        const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);

        return updateGoal(goalId, { currentAmount: newAmount });
      } catch (err) {
        console.error('Error adding to goal:', err);
        throw err;
      }
    },
    [goals, updateGoal]
  );

  return {
    goals,
    isLoading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    addToGoal,
    mutate,
  };
}
