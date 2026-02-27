"use client";

import { useEffect, useState } from 'react';
import ProventosAdvancedCard from '@/components/ProventosAdvancedCard';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import translations, { resolveLanguage } from '@/lib/translations';
import { Loader2 } from 'lucide-react';

export default function IncomePage() {
  const { language } = useLocation();
  const langKey = resolveLanguage(language);
  const t = translations[langKey] || translations['pt-BR'];
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [currentPeriod] = useState<{ month: number; year: number }>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [totalExpenses, setTotalExpenses] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchExpensesTotal = async () => {
      if (!user) return;
      try {
        const res = await fetch(`/api/stats?year=${currentPeriod.year}&month=${currentPeriod.month}`, { credentials: 'include' });
        const json = await res.json();
        if (res.ok) {
          setTotalExpenses(Number(json.totalThisMonth || 0));
        }
      } catch (error) {
        console.error('Erro ao buscar despesas do mes:', error);
      }
    };

    fetchExpensesTotal();
  }, [user, currentPeriod.year, currentPeriod.month]);

  // Salvar proventos no localStorage
  const handleProventosChange = (value: number) => {
    if (typeof window !== 'undefined') {
      const key = `proventos_bills_${currentPeriod.year}-${String(currentPeriod.month).padStart(2, '0')}`;
      window.localStorage.setItem(key, String(value));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">💰 {t.monthlyIncome || 'Proventos'}</h1>
          <p className="text-gray-600">{t.manageMonthlyIncome || 'Gerencie seus proventos (renda) mensais'}</p>
        </div>

        {/* Componente Avançado de Proventos */}
        <ProventosAdvancedCard 
          period={currentPeriod} 
          totalExpenses={totalExpenses}
          onTotalChange={handleProventosChange}
        />
      </div>
    </div>
  );
}
