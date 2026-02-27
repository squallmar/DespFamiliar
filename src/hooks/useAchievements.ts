import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

export function useAchievements() {
  const { user } = useAuth();
  
  const { data, error, isLoading } = useSWR(
    user ? '/api/achievements' : null, 
    async (url) => {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar conquistas');
      const jsonData = await res.json();
      
      // Transform awarded_at to awardedAt for consistency
      const transformedAchievements = jsonData.achievements?.map((ach: any) => ({
        ...ach,
        awardedAt: ach.awarded_at
      })) || [];
      
      return { achievements: transformedAchievements };
    }
  );
  
  return {
    achievements: data?.achievements || [],
    isLoading,
    error,
  };
}
