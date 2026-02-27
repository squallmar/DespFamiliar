import { useEffect, useState } from 'react';
import type { FamilyMember } from '@/types';

export function useFamilyMembers() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch('/api/family-members', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch');
        const { members } = await res.json();
        setMembers(members);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar membros');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  return { members, loading, error };
}
