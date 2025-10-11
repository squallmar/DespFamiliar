import useSWR from 'swr';

export function useAchievements() {
  const { data, error, isLoading } = useSWR('/api/achievements', async (url) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Erro ao buscar conquistas');
    return res.json();
  });
  return {
    achievements: data?.achievements || [],
    isLoading,
    error,
  };
}
